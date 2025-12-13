'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import ImageAnnotation from '@/components/ImageAnnotation';
import FoodInfoCard from '@/components/FoodInfoCard';
import { AnalysisResult, ApiResponse, ErrorCode } from '@/types';
import axios from 'axios';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (file: File | null) => {
    setSelectedImage(file);
    setAnalysisResult(null);
    setError(null);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('请先选择图片');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await axios.post<ApiResponse>('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.data) {
        setAnalysisResult(response.data.data);
      } else {
        setError(response.data.error || '识别失败');
      }
    } catch (err: any) {
      console.error('分析失败:', err);
      
      let errorMessage = '识别失败，请稍后重试';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      // 根据错误代码显示不同的提示
      if (err.response?.data?.code === ErrorCode.INVALID_IMAGE_FORMAT) {
        errorMessage = '不支持的图片格式，请上传 JPG、PNG 或 WEBP 格式的图片';
      } else if (err.response?.data?.code === ErrorCode.IMAGE_TOO_LARGE) {
        errorMessage = '图片大小超过限制，最大支持 10MB';
      } else if (err.response?.data?.code === ErrorCode.NETWORK_ERROR) {
        errorMessage = '网络请求失败，请检查网络连接';
      } else if (err.response?.data?.code === ErrorCode.MODEL_ERROR) {
        errorMessage = '模型识别失败，请稍后重试';
      } else if (err.response?.data?.code === ErrorCode.NO_FOOD_DETECTED) {
        errorMessage = '未识别到食物，请上传包含食物的图片';
      }

      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            食物嘌呤识别分析系统
          </h1>
          <p className="text-gray-600">
            通过AI识别食物中的嘌呤含量，辅助饮食管理
          </p>
        </div>

        {/* 图片上传区域 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">上传图片</h2>
          <ImageUpload
            onImageSelect={handleImageSelect}
            selectedImage={selectedImage}
            imagePreview={imagePreview}
          />
          
          {imagePreview && (
            <div className="mt-6">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`
                  w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors
                  ${isAnalyzing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                  }
                `}
              >
                {isAnalyzing ? '识别中...' : '开始识别'}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* 标注图片展示 */}
        {imagePreview && analysisResult && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">识别结果</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <span className="inline-block w-4 h-4 bg-red-500 mr-2 border border-gray-300"></span>
                红色框：高嘌呤食物（&gt;150mg/100g）
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <span className="inline-block w-4 h-4 bg-yellow-500 mr-2 border border-gray-300"></span>
                黄色框：中嘌呤食物（50-150mg/100g）
              </p>
              <p className="text-sm text-gray-600">
                <span className="inline-block w-4 h-4 bg-green-500 mr-2 border border-gray-300"></span>
                绿色框：低嘌呤食物（&lt;50mg/100g）
              </p>
            </div>
            <ImageAnnotation
              imageUrl={imagePreview}
              highPurineFoods={analysisResult.high_purine_foods}
              mediumPurineFoods={analysisResult.medium_purine_foods}
              lowPurineFoods={analysisResult.low_purine_foods}
            />
          </div>
        )}

        {/* 食物信息展示 */}
        {analysisResult && (
          <div className="space-y-8">
            {/* 高嘌呤食物 */}
            <FoodInfoCard
              foods={analysisResult.high_purine_foods}
              title="高嘌呤食物 (>150mg/100g)"
              bgColor="#FFF5F5"
              borderColor="#FF0000"
            />

            {/* 中嘌呤食物 */}
            <FoodInfoCard
              foods={analysisResult.medium_purine_foods}
              title="中嘌呤食物 (50-150mg/100g)"
              bgColor="#FFFACD"
              borderColor="#FFD700"
            />

            {/* 低嘌呤食物（可选展示） */}
            {analysisResult.low_purine_foods.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-700">低嘌呤食物 (&lt;50mg/100g)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {analysisResult.low_purine_foods.map((food, index) => (
                    <div
                      key={index}
                      className="text-center p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <p className="text-sm font-medium text-gray-700">{food.food_name}</p>
                      <p className="text-xs text-gray-500">{food.purine_value} mg/100g</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

