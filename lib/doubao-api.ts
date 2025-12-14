const ARK_API_KEY = process.env.ARK_API_KEY || 'd3c412ec-e817-415d-b896-6803f29a639a';
const ARK_ENDPOINT_ID = process.env.ARK_ENDPOINT_ID || 'ep-20251214002916-lthkj';
const ARK_API_URL = process.env.ARK_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/responses';

/**
 * 将图片转换为base64 data URL
 */
function imageToBase64(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): string {
  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
}

/**
 * 调用豆包API进行食物识别
 */
export async function analyzeFoodWithDoubao(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<any> {
  try {
    // 将图片转换为base64 data URL
    const imageBase64 = imageToBase64(imageBuffer, mimeType);
    
    // 构建请求体
    const requestBody = {
      model: ARK_ENDPOINT_ID,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: imageBase64
            },
            {
              type: 'input_text',
              text: `分析图片中的食物，返回JSON格式结果。

要求：
1. 识别实际可食用食物（食材本身），不要识别容器、盘子、装饰物、背景
2. 分析每个食物的嘌呤含量（mg/100g）
3. 分类：高嘌呤>150，中嘌呤50-150，低嘌呤<50
4. 坐标要求（重要）：
   - 格式：{x1, y1, x2, y2}，基于图片原始尺寸（像素）
   - 必须框选食物本身，不要框选容器、装饰物、背景
   - 如果食物在容器中，只框选食物部分
   - 同一类食物多个区域，分别返回坐标

请返回JSON格式：
{
  "high_purine_foods": [
    {
      "food_name": "食物名称",
      "purine_value": 180,
      "coordinates": {
        "x1": 100,
        "y1": 150,
        "x2": 300,
        "y2": 250
      },
      "description": "食物详细介绍"
    }
  ],
  "medium_purine_foods": [
    {
      "food_name": "食物名称",
      "purine_value": 120,
      "coordinates": {
        "x1": 350,
        "y1": 200,
        "x2": 500,
        "y2": 350
      },
      "description": "食物详细介绍"
    }
  ],
  "low_purine_foods": [
    {
      "food_name": "食物名称",
      "purine_value": 30,
      "coordinates": {
        "x1": 100,
        "y1": 150,
        "x2": 300,
        "y2": 250
      },
      "description": "食物详细介绍（可选）"
    }
  ]
}

只返回JSON，不要其他文字说明。`
            }
          ]
        }
      ]
    };

    // 调用API
    const requestStartTime = Date.now();
    console.log('正在调用豆包API...');
    console.log('API URL:', ARK_API_URL);
    console.log('Endpoint ID:', ARK_ENDPOINT_ID);
    console.log('图片大小:', `${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    console.log('Base64大小:', `${(imageBase64.length / 1024 / 1024).toFixed(2)}MB`);
    
    // 创建带超时的 fetch 请求
    // 区分本地和Vercel环境：本地使用30秒，Vercel使用9秒（10秒限制）
    const isVercel = process.env.VERCEL === '1';
    const timeoutDuration = isVercel ? 9000 : 30000; // Vercel: 9秒，本地: 30秒
    console.log(`超时设置: ${timeoutDuration / 1000}秒 (${isVercel ? 'Vercel环境' : '本地环境'})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    let response: Response;
    try {
      response = await fetch(ARK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ARK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      const elapsedTime = Date.now() - requestStartTime;
      if (error.name === 'AbortError') {
        console.error(`API请求超时 (${timeoutDuration / 1000}秒限制，实际耗时: ${(elapsedTime / 1000).toFixed(2)}秒)`);
        console.error(`图片大小: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        throw new Error(`API请求超时（${timeoutDuration / 1000}秒）。建议：1) 使用更小的图片 2) 压缩图片后再上传 3) ${isVercel ? '考虑升级Vercel Pro计划' : '检查网络连接'}`);
      }
      throw error;
    }

    const responseTime = Date.now() - requestStartTime;
    console.log('API响应状态:', response.status, response.statusText);
    console.log(`API响应时间: ${(responseTime / 1000).toFixed(2)}秒`);

    if (!response.ok) {
      // 尝试读取错误响应体
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error('API错误响应:', errorBody);
      } catch (e) {
        console.error('无法读取错误响应体');
      }
      
      throw new Error(`API请求失败: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody.substring(0, 200)}` : ''}`);
    }

    // 读取响应体（可能需要一些时间，但通常比请求本身快）
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // 如果 JSON 解析失败，尝试读取文本
      const text = await response.text();
      console.error('JSON解析失败，响应文本:', text.substring(0, 500));
      throw new Error(`API返回的数据格式错误，无法解析为JSON`);
    }
    
    // 记录原始响应以便调试
    console.log('豆包API原始响应:', JSON.stringify(data, null, 2));
    
    // 解析模型返回的文本（可能是JSON字符串）
    let result;
    let responseText = '';
    
    // 优先处理豆包API的output数组格式
    if (data.output && Array.isArray(data.output)) {
      console.log('检测到output数组格式，尝试提取message内容');
      // 从output数组中查找最后一个message类型的对象
      for (let i = data.output.length - 1; i >= 0; i--) {
        const item = data.output[i];
        if (item.type === 'message' && item.content && Array.isArray(item.content)) {
          // 查找output_text类型的内容
          for (const contentItem of item.content) {
            if (contentItem.type === 'output_text' && contentItem.text) {
              responseText = contentItem.text;
              console.log('从output数组的message中提取到文本');
              break;
            }
          }
          if (responseText) break;
        }
      }
    }
    
    // 如果还没有提取到文本，尝试其他格式
    if (!responseText) {
      if (data.output && typeof data.output === 'string') {
        responseText = data.output;
      } else if (data.choices && data.choices[0] && data.choices[0].message) {
        responseText = data.choices[0].message.content || '';
      } else if (data.text) {
        responseText = data.text;
      } else if (data.content) {
        responseText = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
      } else if (typeof data === 'string') {
        responseText = data;
      } else {
        responseText = JSON.stringify(data);
      }
    }

    console.log('提取的响应文本:', responseText.substring(0, 500)); // 只记录前500个字符

    // 尝试提取JSON部分
    if (responseText) {
      // 尝试直接解析
      try {
        result = JSON.parse(responseText);
        console.log('直接解析JSON成功');
      } catch (parseError) {
        console.log('直接解析失败，尝试提取JSON部分');
        // 如果直接解析失败，尝试提取JSON部分（支持markdown代码块）
        // 先尝试提取 ```json ... ``` 中的内容
        const markdownJsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (markdownJsonMatch) {
          try {
            result = JSON.parse(markdownJsonMatch[1]);
            console.log('从markdown代码块中提取JSON成功');
          } catch {
            // 继续尝试其他方法
          }
        }
        
        // 如果markdown提取失败，尝试提取第一个完整的JSON对象
        if (!result) {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              result = JSON.parse(jsonMatch[0]);
              console.log('从文本中提取JSON成功');
            } catch {
              // 如果还是失败，尝试提取多个可能的JSON对象
              const jsonMatches = responseText.match(/\{[\s\S]*?\}/g);
              if (jsonMatches && jsonMatches.length > 0) {
                // 尝试解析每个匹配，找到第一个有效的JSON
                for (let i = jsonMatches.length - 1; i >= 0; i--) {
                  try {
                    result = JSON.parse(jsonMatches[i]);
                    console.log(`从第${i + 1}个JSON匹配中解析成功`);
                    break;
                  } catch {
                    continue;
                  }
                }
                if (!result) {
                  throw new Error(`无法解析模型返回的JSON数据。原始文本前500字符: ${responseText.substring(0, 500)}`);
                }
              } else {
                throw new Error(`模型返回的数据中未找到JSON格式。原始文本前500字符: ${responseText.substring(0, 500)}`);
              }
            }
          } else {
            throw new Error(`模型返回的数据中未找到JSON格式。原始文本前500字符: ${responseText.substring(0, 500)}`);
          }
        }
      }
    } else {
      // 如果没有文本响应，尝试直接使用data
      console.log('没有文本响应，尝试直接使用data');
      result = data;
    }

    console.log('解析后的结果:', JSON.stringify(result, null, 2));

    // 验证结果格式
    if (!result || (typeof result !== 'object')) {
      throw new Error(`模型返回的数据格式错误: 期望对象，实际得到 ${typeof result}`);
    }

    // 检查是否有预期的字段
    const hasHighPurine = Array.isArray(result.high_purine_foods);
    const hasMediumPurine = Array.isArray(result.medium_purine_foods);
    const hasLowPurine = Array.isArray(result.low_purine_foods);

    if (!hasHighPurine && !hasMediumPurine && !hasLowPurine) {
      // 检查是否有其他可能的字段名
      const allKeys = Object.keys(result);
      console.warn('模型返回的数据格式可能不正确。可用字段:', allKeys);
      console.warn('完整响应:', JSON.stringify(result, null, 2));
      
      // 尝试查找可能的字段名变体
      const possibleHighFields = ['high_purine_foods', 'highPurineFoods', 'high_purine', 'highPurine'];
      const possibleMediumFields = ['medium_purine_foods', 'mediumPurineFoods', 'medium_purine', 'mediumPurine'];
      const possibleLowFields = ['low_purine_foods', 'lowPurineFoods', 'low_purine', 'lowPurine'];
      
      let foundHigh = false, foundMedium = false, foundLow = false;
      
      for (const key of possibleHighFields) {
        if (Array.isArray(result[key])) {
          result.high_purine_foods = result[key];
          foundHigh = true;
          break;
        }
      }
      
      for (const key of possibleMediumFields) {
        if (Array.isArray(result[key])) {
          result.medium_purine_foods = result[key];
          foundMedium = true;
          break;
        }
      }
      
      for (const key of possibleLowFields) {
        if (Array.isArray(result[key])) {
          result.low_purine_foods = result[key];
          foundLow = true;
          break;
        }
      }
      
      // 如果仍然没有找到任何有效字段，抛出错误
      if (!foundHigh && !foundMedium && !foundLow) {
        throw new Error(`模型返回的数据格式不正确。期望包含 high_purine_foods、medium_purine_foods 或 low_purine_foods 字段，但实际字段为: ${allKeys.join(', ')}`);
      }
    }

    // 规范化结果，确保所有字段都是数组
    const normalizedResult = {
      high_purine_foods: Array.isArray(result.high_purine_foods) ? result.high_purine_foods : [],
      medium_purine_foods: Array.isArray(result.medium_purine_foods) ? result.medium_purine_foods : [],
      low_purine_foods: Array.isArray(result.low_purine_foods) ? result.low_purine_foods : [],
    };

    // 检查是否至少识别到一些食物
    const totalFoods = normalizedResult.high_purine_foods.length + 
                       normalizedResult.medium_purine_foods.length + 
                       normalizedResult.low_purine_foods.length;
    
    if (totalFoods === 0) {
      console.warn('模型未识别到任何食物');
      // 不抛出错误，返回空结果，让前端判断是否显示"未识别到食物"的提示
    } else {
      console.log(`识别成功: 高嘌呤${normalizedResult.high_purine_foods.length}个, 中嘌呤${normalizedResult.medium_purine_foods.length}个, 低嘌呤${normalizedResult.low_purine_foods.length}个`);
      
      // 检查坐标合理性（简单检查：如果所有坐标都集中在图片的很小区域内，可能是识别错误）
      const allFoods = [
        ...normalizedResult.high_purine_foods,
        ...normalizedResult.medium_purine_foods,
        ...normalizedResult.low_purine_foods
      ].filter(food => food.coordinates);
      
      if (allFoods.length > 0) {
        // 检查坐标是否都在合理范围内（假设图片至少是100x100像素）
        const hasInvalidCoords = allFoods.some(food => {
          const coords = food.coordinates!;
          // 检查坐标是否明显不合理（比如都是0或负数，或者x2 < x1, y2 < y1）
          if (coords.x1 < 0 || coords.y1 < 0 || coords.x2 <= coords.x1 || coords.y2 <= coords.y1) {
            console.warn(`食物 "${food.food_name}" 的坐标可能无效:`, coords);
            return true;
          }
          return false;
        });
        
        if (hasInvalidCoords) {
          console.warn('检测到部分食物的坐标可能无效，请检查识别结果');
        }
      }
    }

    return normalizedResult;
  } catch (error: any) {
    console.error('豆包API调用失败:', error);
    throw new Error(`模型识别失败: ${error.message}`);
  }
}

