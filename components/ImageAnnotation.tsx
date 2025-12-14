'use client';

import { useEffect, useRef, useState } from 'react';
import { FoodItem } from '@/types';

interface ImageAnnotationProps {
  imageUrl: string;
  highPurineFoods: FoodItem[];
  mediumPurineFoods: FoodItem[];
  lowPurineFoods: FoodItem[];
}

export default function ImageAnnotation({ imageUrl, highPurineFoods, mediumPurineFoods, lowPurineFoods }: ImageAnnotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1 });
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });

  /**
   * 验证和修正坐标
   * @param coords 原始坐标
   * @param imgWidth 原始图片宽度
   * @param imgHeight 原始图片高度
   * @returns 修正后的坐标，如果坐标无效则返回null
   */
  const validateAndFixCoordinates = (
    coords: { x1: number; y1: number; x2: number; y2: number },
    imgWidth: number,
    imgHeight: number
  ): { x1: number; y1: number; x2: number; y2: number } | null => {
    if (!coords || typeof coords.x1 !== 'number' || typeof coords.y1 !== 'number' || 
        typeof coords.x2 !== 'number' || typeof coords.y2 !== 'number') {
      console.warn('坐标格式无效:', coords);
      return null;
    }

    let { x1, y1, x2, y2 } = coords;

    // 确保 x1 < x2 和 y1 < y2
    if (x1 > x2) [x1, x2] = [x2, x1];
    if (y1 > y2) [y1, y2] = [y2, y1];

    // 检查坐标是否在合理范围内（允许一定的容差，因为可能是基于不同尺寸的图片）
    // 如果坐标明显超出范围，进行修正
    const tolerance = 0.1; // 10%的容差
    const minX = -imgWidth * tolerance;
    const maxX = imgWidth * (1 + tolerance);
    const minY = -imgHeight * tolerance;
    const maxY = imgHeight * (1 + tolerance);

    // 如果坐标完全超出范围，返回null
    if (x1 < minX && x2 < minX) return null;
    if (x1 > maxX && x2 > maxX) return null;
    if (y1 < minY && y2 < minY) return null;
    if (y1 > maxY && y2 > maxY) return null;

    // 修正坐标到图片范围内
    x1 = Math.max(0, Math.min(x1, imgWidth));
    y1 = Math.max(0, Math.min(y1, imgHeight));
    x2 = Math.max(0, Math.min(x2, imgWidth));
    y2 = Math.max(0, Math.min(y2, imgHeight));

    // 确保框有最小尺寸
    const minSize = 10;
    if (Math.abs(x2 - x1) < minSize) {
      const centerX = (x1 + x2) / 2;
      x1 = Math.max(0, centerX - minSize / 2);
      x2 = Math.min(imgWidth, centerX + minSize / 2);
    }
    if (Math.abs(y2 - y1) < minSize) {
      const centerY = (y1 + y2) / 2;
      y1 = Math.max(0, centerY - minSize / 2);
      y2 = Math.min(imgHeight, centerY + minSize / 2);
    }

    return { x1, y1, x2, y2 };
  };

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      // 保存原始图片尺寸
      setOriginalImageSize({ width: img.width, height: img.height });

      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // 计算缩放比例，保持宽高比
        const imgAspect = img.width / img.height;
        const containerAspect = containerWidth / containerHeight;
        
        let displayWidth, displayHeight;
        if (imgAspect > containerAspect) {
          displayWidth = Math.min(containerWidth, img.width);
          displayHeight = displayWidth / imgAspect;
        } else {
          displayHeight = Math.min(containerHeight, img.height);
          displayWidth = displayHeight * imgAspect;
        }

        setImageSize({ width: displayWidth, height: displayHeight });
        setScale({
          x: displayWidth / img.width,
          y: displayHeight / img.height,
        });

        if (imageRef.current) {
          imageRef.current.width = displayWidth;
          imageRef.current.height = displayHeight;
        }
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || imageSize.width === 0 || imageSize.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸（使用整数避免模糊）
    const canvasWidth = Math.floor(imageSize.width);
    const canvasHeight = Math.floor(imageSize.height);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // 清空画布
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 绘制高嘌呤食物标注框（红色 #FF0000）
    highPurineFoods.forEach((food) => {
      if (food.coordinates && originalImageSize.width > 0 && originalImageSize.height > 0) {
        // 验证和修正坐标
        const validCoords = validateAndFixCoordinates(
          food.coordinates,
          originalImageSize.width,
          originalImageSize.height
        );

        if (!validCoords) {
          console.warn(`食物 "${food.food_name}" 的坐标无效，已跳过绘制`);
          return;
        }

        const { x1, y1, x2, y2 } = validCoords;
        const scaledX1 = x1 * scale.x;
        const scaledY1 = y1 * scale.y;
        const scaledX2 = x2 * scale.x;
        const scaledY2 = y2 * scale.y;

        // 确保坐标在canvas范围内
        const clampedX1 = Math.max(0, Math.min(scaledX1, canvasWidth));
        const clampedY1 = Math.max(0, Math.min(scaledY1, canvasHeight));
        const clampedX2 = Math.max(0, Math.min(scaledX2, canvasWidth));
        const clampedY2 = Math.max(0, Math.min(scaledY2, canvasHeight));

        // 绘制矩形框
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(clampedX1, clampedY1, clampedX2 - clampedX1, clampedY2 - clampedY1);

        // 绘制标签背景
        const labelText = `${food.food_name} (${food.purine_value}mg/100g)`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 20;

        ctx.fillStyle = '#FF0000';
        ctx.fillRect(clampedX1, Math.max(0, clampedY1 - labelHeight), labelWidth, labelHeight);

        // 绘制标签文字
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(labelText, clampedX1 + 4, Math.max(labelHeight - 4, clampedY1 - 4));
      }
    });

    // 绘制中嘌呤食物标注框（黄色 #FFD700）
    mediumPurineFoods.forEach((food) => {
      if (food.coordinates && originalImageSize.width > 0 && originalImageSize.height > 0) {
        // 验证和修正坐标
        const validCoords = validateAndFixCoordinates(
          food.coordinates,
          originalImageSize.width,
          originalImageSize.height
        );

        if (!validCoords) {
          console.warn(`食物 "${food.food_name}" 的坐标无效，已跳过绘制`);
          return;
        }

        const { x1, y1, x2, y2 } = validCoords;
        const scaledX1 = x1 * scale.x;
        const scaledY1 = y1 * scale.y;
        const scaledX2 = x2 * scale.x;
        const scaledY2 = y2 * scale.y;

        // 确保坐标在canvas范围内
        const clampedX1 = Math.max(0, Math.min(scaledX1, canvasWidth));
        const clampedY1 = Math.max(0, Math.min(scaledY1, canvasHeight));
        const clampedX2 = Math.max(0, Math.min(scaledX2, canvasWidth));
        const clampedY2 = Math.max(0, Math.min(scaledY2, canvasHeight));

        // 绘制矩形框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(clampedX1, clampedY1, clampedX2 - clampedX1, clampedY2 - clampedY1);

        // 绘制标签背景
        const labelText = `${food.food_name} (${food.purine_value}mg/100g)`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 20;

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(clampedX1, Math.max(0, clampedY1 - labelHeight), labelWidth, labelHeight);

        // 绘制标签文字（黄色背景用黑色文字更清晰）
        ctx.fillStyle = '#000000';
        ctx.fillText(labelText, clampedX1 + 4, Math.max(labelHeight - 4, clampedY1 - 4));
      }
    });

    // 绘制低嘌呤食物标注框（绿色 #00FF00）
    lowPurineFoods.forEach((food) => {
      if (food.coordinates && originalImageSize.width > 0 && originalImageSize.height > 0) {
        // 验证和修正坐标
        const validCoords = validateAndFixCoordinates(
          food.coordinates,
          originalImageSize.width,
          originalImageSize.height
        );

        if (!validCoords) {
          console.warn(`食物 "${food.food_name}" 的坐标无效，已跳过绘制`);
          return;
        }

        const { x1, y1, x2, y2 } = validCoords;
        const scaledX1 = x1 * scale.x;
        const scaledY1 = y1 * scale.y;
        const scaledX2 = x2 * scale.x;
        const scaledY2 = y2 * scale.y;

        // 确保坐标在canvas范围内
        const clampedX1 = Math.max(0, Math.min(scaledX1, canvasWidth));
        const clampedY1 = Math.max(0, Math.min(scaledY1, canvasHeight));
        const clampedX2 = Math.max(0, Math.min(scaledX2, canvasWidth));
        const clampedY2 = Math.max(0, Math.min(scaledY2, canvasHeight));

        // 绘制矩形框
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.strokeRect(clampedX1, clampedY1, clampedX2 - clampedX1, clampedY2 - clampedY1);

        // 绘制标签背景
        const labelText = `${food.food_name} (${food.purine_value}mg/100g)`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 20;

        ctx.fillStyle = '#00FF00';
        ctx.fillRect(clampedX1, Math.max(0, clampedY1 - labelHeight), labelWidth, labelHeight);

        // 绘制标签文字（绿色背景用黑色文字更清晰）
        ctx.fillStyle = '#000000';
        ctx.fillText(labelText, clampedX1 + 4, Math.max(labelHeight - 4, clampedY1 - 4));
      }
    });
  }, [highPurineFoods, mediumPurineFoods, lowPurineFoods, imageSize, scale, originalImageSize]);

  return (
    <div ref={containerRef} className="relative w-full flex justify-center">
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt="标注图片"
          className="max-w-full h-auto"
          style={{ display: 'block' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
}

