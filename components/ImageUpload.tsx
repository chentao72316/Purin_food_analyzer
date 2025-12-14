'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  imagePreview: string | null;
}

export default function ImageUpload({ onImageSelect, selectedImage, imagePreview }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 压缩图片
   * @param file 原始图片文件
   * @param maxWidth 最大宽度（默认1920）
   * @param maxHeight 最大高度（默认1920）
   * @param quality 压缩质量 0-1（默认0.8）
   * @returns 压缩后的File对象
   */
  const compressImage = useCallback((file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          // 计算新尺寸，保持宽高比
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          // 创建canvas进行压缩
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('无法创建canvas上下文'));
            return;
          }

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片压缩失败'));
                return;
              }

              // 如果压缩后比原图大，使用原图
              if (blob.size >= file.size) {
                resolve(file);
                return;
              }

              // 创建新的File对象
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('不支持的图片格式，请上传 JPG、PNG 或 WEBP 格式的图片');
      return;
    }

    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert(`图片大小超过限制，最大支持 10MB，当前文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    // 如果图片大于1MB，进行压缩
    if (file.size > 1 * 1024 * 1024) {
      setIsCompressing(true);
      try {
        // 根据文件大小调整压缩参数
        let maxWidth = 1920;
        let maxHeight = 1920;
        let quality = 0.8;

        if (file.size > 5 * 1024 * 1024) {
          // 大于5MB，更激进的压缩
          maxWidth = 1280;
          maxHeight = 1280;
          quality = 0.7;
        } else if (file.size > 2 * 1024 * 1024) {
          // 大于2MB，中等压缩
          maxWidth = 1600;
          maxHeight = 1600;
          quality = 0.75;
        }

        const compressedFile = await compressImage(file, maxWidth, maxHeight, quality);
        console.log(`图片压缩: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
        onImageSelect(compressedFile);
      } catch (error) {
        console.error('图片压缩失败，使用原图:', error);
        onImageSelect(file);
      } finally {
        setIsCompressing(false);
      }
    } else {
      // 小于1MB，直接使用原图
      onImageSelect(file);
    }
  }, [onImageSelect, compressImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCameraClick = useCallback(() => {
    // 移动端优先使用摄像头
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // 使用后置摄像头
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          handleFile(file);
        }
      };
      input.click();
    } else {
      // 降级到普通文件选择
      handleClick();
    }
  }, [handleClick, handleFile]);

  return (
    <div className="w-full">
      {!imagePreview ? (
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="flex flex-col items-center space-y-4">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div>
              <p className="text-lg font-medium text-gray-700">
                点击或拖拽图片到此处上传
              </p>
              <p className="text-sm text-gray-500 mt-2">
                支持 JPG、PNG、WEBP 格式，最大 10MB
              </p>
              <p className="text-xs text-gray-400 mt-1">
                大图片将自动压缩以加快处理速度
              </p>
            </div>
            {isCompressing && (
              <div className="text-sm text-blue-600">
                正在压缩图片...
              </div>
            )}
            <div className="flex gap-4 mt-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                选择文件
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCameraClick();
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                拍照
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full">
          <div className="relative w-full h-auto rounded-lg overflow-hidden border-2 border-gray-200">
            <Image
              src={imagePreview}
              alt="预览图片"
              width={800}
              height={600}
              className="w-full h-auto"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onImageSelect(null as any);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="mt-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            重新选择
          </button>
        </div>
      )}
    </div>
  );
}

