// src/components/GiftCard.tsx

import React from 'react';
import { Card, CardBody, CardFooter, Chip, Button, Image } from '@nextui-org/react';
import { Gift } from '@/types/gift';

interface GiftCardProps {
  gift: Gift;
  onViewDetails?: (gift: Gift) => void;
}

export const GiftCard: React.FC<GiftCardProps> = ({ gift, onViewDetails }) => {
  const getRarityColor = (rarity: string): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
    const rarityPercentage = parseFloat(rarity.match(/\d+\.?\d*/)?.[0] || '0');
    
    if (rarityPercentage < 1) return 'danger';
    if (rarityPercentage < 5) return 'warning';
    if (rarityPercentage < 15) return 'secondary';
    if (rarityPercentage < 30) return 'primary';
    return 'default';
  };

  const extractRarityPercentage = (text: string): string => {
    const match = text.match(/\(([^)]+)\)/);
    return match ? match[1] : text;
  };

  return (
    <Card className="gift-card w-full">
      <CardBody className="p-4">
        <div className="flex flex-col items-center space-y-3">
          {/* Изображение подарка */}
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-3xl">
            {gift.customEmojiId ? (
              <div className="emoji-container">
                🎁
              </div>
            ) : (
              <span>🎁</span>
            )}
          </div>

          {/* Название подарка */}
          <div className="text-center">
            <h3 className="font-semibold text-lg line-clamp-2">{gift.name}</h3>
            <p className="text-small text-gray-500">#{gift.num}</p>
          </div>

          {/* Характеристики */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-small text-gray-400">Модель:</span>
              <Chip 
                size="sm" 
                color={getRarityColor(gift.model)}
                variant="flat"
              >
                {extractRarityPercentage(gift.model)}
              </Chip>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-small text-gray-400">Фон:</span>
              <Chip 
                size="sm" 
                color={getRarityColor(gift.backdrop)}
                variant="flat"
              >
                {extractRarityPercentage(gift.backdrop)}
              </Chip>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-small text-gray-400">Символ:</span>
              <Chip 
                size="sm" 
                color={getRarityColor(gift.symbol)}
                variant="flat"
              >
                {extractRarityPercentage(gift.symbol)}
              </Chip>
            </div>
          </div>

          {/* Статус и лимитированность */}
          <div className="flex items-center space-x-2">
            {gift.limited && (
              <Chip size="sm" color="warning" variant="flat">
                Лимитированный
              </Chip>
            )}
            <Chip size="sm" color="success" variant="flat">
              {gift.status === 'forsale' ? 'В продаже' : gift.status}
            </Chip>
          </div>
        </div>
      </CardBody>

      <CardFooter className="pt-0 pb-4 px-4">
        <div className="w-full flex items-center justify-between">
          <div className="flex flex-col">
            <span className="gift-price text-2xl font-bold">
              {gift.price.toLocaleString()} {gift.asset}
            </span>
            {gift.export_at && (
              <span className="text-tiny text-gray-400">
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