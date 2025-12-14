import { NextRequest, NextResponse } from 'next/server';
import { analyzeFoodWithDoubao } from '@/lib/doubao-api';
import { ApiResponse, ErrorCode, AnalysisResult } from '@/types';

// 支持的图片格式
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 验证图片文件
 */
function validateImage(file: File): { valid: boolean; error?: string; code?: ErrorCode } {
  // 检查文件类型
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: '不支持的图片格式，请上传 JPG、PNG 或 WEBP 格式的图片',
      code: ErrorCode.INVALID_IMAGE_FORMAT,
    };
  }

  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `图片大小超过限制，最大支持 10MB，当前文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      code: ErrorCode.IMAGE_TOO_LARGE,
    };
  }

  return { valid: true };
}

// 配置运行时为 Edge Runtime 以获得更好的性能（可选）
// export const runtime = 'edge'; // 如果需要，可以取消注释

/**
 * POST /api/analyze - 分析食物图片
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 检查环境变量
    if (!process.env.ARK_API_KEY || !process.env.ARK_ENDPOINT_ID) {
      console.error('环境变量未配置:', {
        hasApiKey: !!process.env.ARK_API_KEY,
        hasEndpointId: !!process.env.ARK_ENDPOINT_ID,
      });
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: '服务器配置错误：API密钥未配置，请检查Vercel环境变量设置',
          code: ErrorCode.MODEL_ERROR,
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: '请上传图片文件',
          code: ErrorCode.INVALID_IMAGE_FORMAT,
        },
        { status: 400 }
      );
    }

    // 验证图片
    const validation = validateImage(file);
    if (!validation.valid) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: validation.error,
          code: validation.code,
        },
        { status: 400 }
      );
    }

    // 将文件转换为Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`开始处理图片，大小: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
    
    // 调用豆包API进行识别（超时处理已在 analyzeFoodWithDoubao 函数中实现）
    const result = await analyzeFoodWithDoubao(buffer, file.type);
    
    const processingTime = Date.now() - startTime;
    console.log(`处理完成，耗时: ${processingTime}ms`);

    // 验证和规范化返回结果
    const analysisResult: AnalysisResult = {
      high_purine_foods: result.high_purine_foods || [],
      medium_purine_foods: result.medium_purine_foods || [],
      low_purine_foods: result.low_purine_foods || [],
    };

    // 检查是否识别到食物
    const totalFoods = analysisResult.high_purine_foods.length + 
                       analysisResult.medium_purine_foods.length + 
                       analysisResult.low_purine_foods.length;

    if (totalFoods === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '未识别到食物，请上传包含食物的图片',
        code: ErrorCode.NO_FOOD_DETECTED,
      }, { status: 200 }); // 使用200状态码，因为这是业务逻辑错误，不是HTTP错误
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: analysisResult,
      message: '识别成功',
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('分析失败:', error);
    console.error('处理耗时:', `${processingTime}ms`);
    console.error('错误堆栈:', error.stack);
    console.error('错误详情:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
    });

    // 判断错误类型
    let errorCode = ErrorCode.MODEL_ERROR;
    let errorMessage = error.message || '识别失败，请稍后重试';
    let httpStatus = 500;

    // 更详细的错误分类
    if (error.message?.includes('超时') || error.message?.includes('timeout') || error.message?.includes('Timeout') || processingTime > 9000) {
      errorCode = ErrorCode.NETWORK_ERROR;
      errorMessage = '请求超时，Vercel免费版有10秒限制。请尝试：1) 使用更小的图片（建议小于2MB）2) 稍后重试 3) 升级到Vercel Pro计划以获得更长的超时时间';
      httpStatus = 504; // Gateway Timeout
    } else if (error.message?.includes('网络') || error.message?.includes('fetch') || error.message?.includes('ECONNREFUSED') || error.message?.includes('ETIMEDOUT') || error.message?.includes('ERR_CONNECTION_CLOSED')) {
      errorCode = ErrorCode.NETWORK_ERROR;
      errorMessage = '网络请求失败。可能原因：1) API服务不可用 2) 请求超时 3) 网络连接问题。请检查Vercel函数日志获取详细信息。';
      httpStatus = 502; // Bad Gateway
    } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorCode = ErrorCode.MODEL_ERROR;
      errorMessage = 'API密钥无效，请检查Vercel环境变量中的ARK_API_KEY配置';
      httpStatus = 401;
    } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      errorCode = ErrorCode.MODEL_ERROR;
      errorMessage = 'API访问被拒绝，请检查API密钥权限';
      httpStatus = 403;
    } else if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
      errorCode = ErrorCode.MODEL_ERROR;
      errorMessage = 'API调用频率过高，请稍后再试';
      httpStatus = 429;
    } else if (error.message?.includes('JSON') || error.message?.includes('解析')) {
      errorCode = ErrorCode.MODEL_ERROR;
      errorMessage = '模型返回数据格式错误，请重试或联系技术支持';
    } else if (error.message?.includes('服务器配置错误') || error.message?.includes('环境变量')) {
      httpStatus = 500;
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
      },
      { status: httpStatus }
    );
  }
}

