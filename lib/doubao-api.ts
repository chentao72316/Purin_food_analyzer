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
    // 检查环境变量
    if (!ARK_API_KEY) {
      throw new Error('ARK_API_KEY 环境变量未配置');
    }
    if (!ARK_ENDPOINT_ID) {
      throw new Error('ARK_ENDPOINT_ID 环境变量未配置');
    }
    if (!ARK_API_URL) {
      throw new Error('ARK_API_URL 环境变量未配置');
    }

    console.log('环境变量检查通过:', {
      hasApiKey: !!ARK_API_KEY,
      endpointId: ARK_ENDPOINT_ID,
      apiUrl: ARK_API_URL,
    });

    // 将图片转换为base64 data URL
    const imageBase64 = imageToBase64(imageBuffer, mimeType);
    console.log('图片已转换为base64，长度:', imageBase64.length);
    
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
              text: `分析食物，返回JSON。要求：
1. 识别所有食物
2. 每个食物的嘌呤值（mg/100g）
3. 分类：高嘌呤>150，中嘌呤50-150，低嘌呤<50
4. 高/中嘌呤食物返回坐标{x1,y1,x2,y2}和介绍

返回JSON格式：
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
      "purine_value": 30
    }
  ]
}

只返回JSON，不要其他文字说明。`
            }
          ]
        }
      ]
    };


    // 调用API（增加超时设置）
    // 注意：Vercel免费版函数超时是10秒，Pro版可以到60秒
    console.log('准备调用豆包API，URL:', ARK_API_URL);
    const controller = new AbortController();
    // 设置超时为8秒，确保在Vercel免费版10秒限制内完成
    // 如果需要更长时间，需要升级到Vercel Pro
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时（Vercel免费版限制）
    
    const response = await fetch(ARK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ARK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });
    
    console.log('豆包API响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('豆包API错误响应:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`API请求失败: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    
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
    }

    return normalizedResult;
  } catch (error: any) {
    console.error('豆包API调用失败 - 详细错误:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // 如果是AbortError（超时），抛出特定错误
    if (error.name === 'AbortError') {
      throw new Error('请求超时：豆包API响应时间过长，请稍后重试');
    }

    // 如果是网络错误
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      throw new Error(`网络错误: ${error.message}`);
    }

    // 其他错误
    throw new Error(`模型识别失败: ${error.message || '未知错误'}`);
  }
}

