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

// 配置运行时和超时时间
export const runtime = 'nodejs';
export const maxDuration = 60; // 60秒超时（需要Vercel Pro计划，免费版默认10秒）

/**
 * POST /api/analyze - 分析食物图片
 */
export async function POST(request: NextRequest) {
  try {
    // 添加请求日志
    console.log('收到分析请求');
    
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

    // 调用豆包API进行识别
    console.log('开始调用豆包API，图片大小:', buffer.length, 'bytes');
    const result = await analyzeFoodWithDoubao(buffer, file.type);
    console.log('豆包API调用成功，返回结果:', Object.keys(result));

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
    // 详细记录错误信息
    console.error('分析失败 - 详细错误信息:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });

    // 判断错误类型
    let errorCode = ErrorCode.MODEL_ERROR;
    let errorMessage = error.message || '识别失败，请稍后重试';
    let statusCode = 500;

    // 处理超时错误
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      errorCode = ErrorCode.NETWORK_ERROR;
      errorMessage = '请求超时，豆包API响应时间过长。请稍后重试或使用较小的图片。';
      statusCode = 504; // Gateway Timeout
    } 
    // 处理网络错误
    else if (error.message?.includes('网络') || error.message?.includes('fetch') || error.message?.includes('Network')) {
      errorCode = ErrorCode.NETWORK_ERROR;
      errorMessage = '网络请求失败，请检查网络连接或API配置';
      statusCode = 502; // Bad Gateway
    }
    // 处理API错误
    else if (error.message?.includes('API请求失败') || error.message?.includes('401') || error.message?.includes('403')) {
      errorCode = ErrorCode.MODEL_ERROR;
      errorMessage = '豆包API调用失败，请检查API密钥配置';
      statusCode = 502;
    }
    // 处理其他错误
    else {
      // 在生产环境中，不暴露详细的错误堆栈
      if (process.env.NODE_ENV === 'production') {
        errorMessage = '服务器内部错误，请稍后重试。如果问题持续，请联系技术支持。';
      } else {
        // 开发环境中显示详细错误
        errorMessage = `${errorMessage} (${error.name})`;
      }
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
        // 仅在开发环境返回详细错误
        ...(process.env.NODE_ENV !== 'production' && { 
          details: error.stack 
        }),
      },
      { status: statusCode }
    );
  }
}

