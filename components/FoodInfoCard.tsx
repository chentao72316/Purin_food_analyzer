'use client';

import { FoodItem } from '@/types';

interface FoodInfoCardProps {
  foods: FoodItem[];
  title: string;
  bgColor: string;
  borderColor: string;
}

export default function FoodInfoCard({ foods, title, bgColor, borderColor }: FoodInfoCardProps) {
  if (foods.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4" style={{ color: borderColor }}>
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {foods.map((food, index) => (
          <div
            key={index}
            className="rounded-lg p-4 border-2 transition-shadow hover:shadow-lg"
            style={{
              backgroundColor: bgColor,
              borderColor: borderColor,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold" style={{ color: borderColor }}>
                {food.food_name}
              </h3>
              <span
                className="px-2 py-1 rounded text-sm font-semibold text-white"
                style={{ backgroundColor: borderColor }}
              >
                {food.purine_value} mg/100g
              </span>
            </div>
            {food.description && (
              <p className="text-sm mt-2 leading-relaxed" style={{ color: borderColor }}>
                {food.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

