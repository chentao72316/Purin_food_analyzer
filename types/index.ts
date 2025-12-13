// 食物识别结果数据结构
export interface FoodItem {
  food_name: string;        // 食物名称
  purine_value: number;     // 嘌呤含量（毫克/100克）
  coordinates?: {           // 坐标（可选，低嘌呤食物可能没有）
    x1: number;            // 左上角x坐标
    y1: number;            // 左上角y坐标
    x2: number;            // 右下角x坐标
    y2: number;            // 右下角y坐标
  };
  description?: string;     // 食物介绍（可选）
}

export interface AnalysisResult {
  high_purine_foods: FoodItem[];    // 高嘌呤食物列表
  medium_purine_foods: FoodItem[];  // 中嘌呤食物列表
  low_purine_foods: FoodItem[];     // 低嘌呤食物列表
}

// API响应数据结构
export interface ApiResponse {
  success: boolean;
  data?: AnalysisResult;
  message?: string;
  error?: string;
  code?: string;
}

// 错误代码
export enum ErrorCode {
  INVALID_IMAGE_FORMAT = 'INVALID_IMAGE_FORMAT',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  MODEL_ERROR = 'MODEL_ERROR',
  NO_FOOD_DETECTED = 'NO_FOOD_DETECTED',
  INVALID_COORDINATES = 'INVALID_COORDINATES',
}

