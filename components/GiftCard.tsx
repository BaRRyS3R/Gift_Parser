// src/components/GiftCard.tsx

import React from 'react';
import { Card, CardBody, CardFooter, Chip, Button } from '@nextui-org/react';
import { Gift } from '@/types/gift';
import GiftImage from '@/components/GiftImage';

interface GiftCardProps {
  gift: Gift;
  onViewDetails?: (gift: Gift) => void;
}

export const GiftCard: React.FC<GiftCardProps> = ({ gift, onViewDetails }) => {
  const extractMainName = (text: string): string => {
    return text.split(' (')[0].trim();
  };

  const extractRarityPercentage = (text: string): string => {
    const match = text.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
  };

  return (
    <Card className="bg-slate-800 border-slate-600 hover:bg-slate-750 transition-all duration-200 hover:border-slate-500 hover:shadow-lg">
      <CardBody className="p-4">
        <div className="flex flex-col items-center space-y-3">
          {/* Изображение подарка */}
          <GiftImage
            gift={gift}
            width={96}
            height={96}
            className="shadow-md"
            fallbackEmoji="🎁"
          />

          {/* Название подарка */}
          <div className="text-center">
            <h3 className="font-semibold text-lg text-white line-clamp-2">{gift.name}</h3>
            <p className="text-sm text-gray-400">#{gift.gift_num || gift.num}</p>
          </div>

          {/* Характеристики */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Модель:</span>
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-white">
                  {extractMainName(gift.model)}
                </span>
                {extractRarityPercentage(gift.model) && (
                  <span className="text-xs text-gray-500">
                    {extractRarityPercentage(gift.model)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Фон:</span>
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-white">
                  {extractMainName(gift.backdrop)}
                </span>
                {extractRarityPercentage(gift.backdrop) && (
                  <span className="text-xs text-gray-500">
                    {extractRarityPercentage(gift.backdrop)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Символ:</span>
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-white">
                  {extractMainName(gift.symbol)}
                </span>
                {extractRarityPercentage(gift.symbol) && (
                  <span className="text-xs text-gray-500">
                    {extractRarityPercentage(gift.symbol)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Статус */}
          <div className="flex items-center justify-center">
            <Chip size="sm" color="success" variant="flat">
              {gift.status === 'forsale' ? 'В продаже' : gift.status}
            </Chip>
          </div>
        </div>
      </CardBody>

      <CardFooter className="pt-0 pb-4 px-4">
        <div className="w-full flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-blue-400">
              {gift.price.toLocaleString()} {gift.asset}
            </span>
            {gift.export_at && (
              <span className="text-xs text-gray-500">
                {new Date(gift.export_at).toLocaleDateString('ru-RU')}
              </span>
            )}
          </div>

          {onViewDetails && (
            <Button
              color="primary"
              variant="flat"
              size="sm"
              onPress={() => onViewDetails(gift)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Подробнее
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default GiftCard;