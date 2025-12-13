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

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
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

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制高嘌呤食物标注框（红色 #FF0000）
    highPurineFoods.forEach((food) => {
      if (food.coordinates) {
        const { x1, y1, x2, y2 } = food.coordinates;
        const scaledX1 = x1 * scale.x;
        const scaledY1 = y1 * scale.y;
        const scaledX2 = x2 * scale.x;
        const scaledY2 = y2 * scale.y;

        // 绘制矩形框
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(scaledX1, scaledY1, scaledX2 - scaledX1, scaledY2 - scaledY1);

        // 绘制标签背景
        const labelText = `${food.food_name} (${food.purine_value}mg/100g)`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 20;

        ctx.fillStyle = '#FF0000';
        ctx.fillRect(scaledX1, scaledY1 - labelHeight, labelWidth, labelHeight);

        // 绘制标签文字
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(labelText, scaledX1 + 4, scaledY1 - 4);
      }
    });

    // 绘制中嘌呤食物标注框（黄色 #FFD700）
    mediumPurineFoods.forEach((food) => {
      if (food.coordinates) {
        const { x1, y1, x2, y2 } = food.coordinates;
        const scaledX1 = x1 * scale.x;
        const scaledY1 = y1 * scale.y;
        const scaledX2 = x2 * scale.x;
        const scaledY2 = y2 * scale.y;

        // 绘制矩形框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(scaledX1, scaledY1, scaledX2 - scaledX1, scaledY2 - scaledY1);

        // 绘制标签背景
        const labelText = `${food.food_name} (${food.purine_value}mg/100g)`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 20;

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(scaledX1, scaledY1 - labelHeight, labelWidth, labelHeight);

        // 绘制标签文字（黄色背景用黑色文字更清晰）
        ctx.fillStyle = '#000000';
        ctx.fillText(labelText, scaledX1 + 4, scaledY1 - 4);
      }
    });

    // 绘制低嘌呤食物标注框（绿色 #00FF00）
    lowPurineFoods.forEach((food) => {
      if (food.coordinates) {
        const { x1, y1, x2, y2 } = food.coordinates;
        const scaledX1 = x1 * scale.x;
        const scaledY1 = y1 * scale.y;
        const scaledX2 = x2 * scale.x;
        const scaledY2 = y2 * scale.y;

        // 绘制矩形框
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.strokeRect(scaledX1, scaledY1, scaledX2 - scaledX1, scaledY2 - scaledY1);

        // 绘制标签背景
        const labelText = `${food.food_name} (${food.purine_value}mg/100g)`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 20;

        ctx.fillStyle = '#00FF00';
        ctx.fillRect(scaledX1, scaledY1 - labelHeight, labelWidth, labelHeight);

        // 绘制标签文字（绿色背景用黑色文字更清晰）
        ctx.fillStyle = '#000000';
        ctx.fillText(labelText, scaledX1 + 4, scaledY1 - 4);
      }
    });
  }, [highPurineFoods, mediumPurineFoods, lowPurineFoods, imageSize, scale]);

  return (
    <div ref={containerRef} className="relative w-full flex justify-center">
      <div className="relative inline-block">
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

