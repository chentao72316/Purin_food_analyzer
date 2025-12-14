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

/**
 * POST /api/analyze - 分析食物图片
 */
export async function POST(request: NextRequest) {
  try {
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
    const result = await analyzeFoodWithDoubao(buffer, file.type);

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
    console.error('分析失败:', error);
    console.error('错误堆栈:', error.stack);
    console.error('错误详情:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
    });

    // 判断错误类型
    let errorCode = ErrorCode.MODEL_ERROR;
    let errorMessage = error.message || '识别失败，请稍后重试';

    // 更详细的错误分类
    if (error.message?.includes('网络') || error.message?.includes('fetch') || error.message?.includes('ECONNREFUSED') || error.message?.includes('ETIMEDOUT')) {
      errorCode = ErrorCode.NETWORK_ERROR;
      errorMessage = '网络请求失败，请检查网络连接或API服务是否可用';
    } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorCode = ErrorCode.MODEL_ERROR;
      errorMessage = 'API密钥无效，请检查环境变量配置';
    } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      errorCode = ErrorCode.MODEL_ERROR;
      errorMessage = 'API访问被拒绝，请检查API密钥权限';
    } else if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
      errorCode = ErrorCode.MODEL_ERROR;
      errorMessage = 'API调用频率过高，请稍后再试';
    } else if (error.message?.includes('JSON') || error.message?.includes('解析')) {
      errorCode = ErrorCode.MODEL_ERROR;
      errorMessage = '模型返回数据格式错误，请重试或联系技术支持';
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}

