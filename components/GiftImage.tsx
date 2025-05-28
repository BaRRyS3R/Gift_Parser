// src/components/GiftImage.tsx

import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { Gift } from '@/types/gift';

interface GiftImageProps {
    gift: Gift;
    width?: number;
    height?: number;
    className?: string;
    fallbackEmoji?: string;
}

export const GiftImage: React.FC<GiftImageProps> = ({
    gift,
    width = 96,
    height = 96,
    className = '',
    fallbackEmoji = '🎁'
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [animationData, setAnimationData] = useState<any>(null);

    // Формирование URL для Lottie анимации
    const generateLottieUrl = (gift: Gift): string => {
        // Преобразуем название подарка в формат URL
        const giftName = gift.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        const giftNum = gift.gift_num || gift.num;

        return `https://nft.fragment.com/gift/${giftName}-${giftNum}.lottie.json`;
    };

    const loadLottieAnimation = async () => {
        try {
            setIsLoading(true);
            setHasError(false);
            setAnimationData(null);

            const lottieUrl = generateLottieUrl(gift);

            // Загружаем Lottie данные
            const response = await fetch(lottieUrl);

            if (!response.ok) {
                throw new Error(`Failed to load animation: ${response.status}`);
            }

            const data = await response.json();

            // Проверяем, что данные валидны для Lottie
            if (!data || !data.v || !data.layers) {
                throw new Error('Invalid Lottie animation data');
            }

            setAnimationData(data);
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading gift animation:', error);
            setHasError(true);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLottieAnimation();
    }, [gift.name, gift.num, gift.gift_num]);

    // Fallback компонент для случаев ошибки или отсутствия анимации
    const FallbackImage = () => (
        <div
            className={`flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg text-white ${className}`}
            style={{ width, height }}
        >
            <span style={{ fontSize: Math.min(width, height) * 0.4 }}>
                {fallbackEmoji}
            </span>
        </div>
    );

    // Компонент загрузки
    const LoadingComponent = () => (
        <div
            className={`flex items-center justify-center bg-gray-200 rounded-lg animate-pulse ${className}`}
            style={{ width, height }}
        >
            <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-gray-500">Загрузка...</span>
            </div>
        </div>
    );

    if (hasError || !animationData) {
        return <FallbackImage />;
    }

    if (isLoading) {
        return <LoadingComponent />;
    }

    return (
        <div
            className={`relative overflow-hidden rounded-lg ${className}`}
            style={{ width, height }}
        >
            <Lottie
                animationData={animationData}
                loop={true}
                autoplay={true}
                style={{
                    width: '100%',
                    height: '100%'
                }}
                onLoadedData={() => {
                    setIsLoading(false);
                }}
                onError={(error) => {
                    console.error('Lottie playback error:', error);
                    setHasError(true);
                }}
            />

            {/* Overlay для интерактивности, если необходимо */}
            <div className="absolute inset-0 bg-transparent hover:bg-black hover:bg-opacity-10 transition-all duration-200 rounded-lg" />
        </div>
    );
};

// Упрощенный компонент для статических изображений (если нужен fallback)
export const StaticGiftImage: React.FC<GiftImageProps> = ({
    gift,
    width = 96,
    height = 96,
    className = '',
    fallbackEmoji = '🎁'
}) => {
    const [hasError, setHasError] = useState(false);

    const generateStaticImageUrl = (gift: Gift): string => {
        // Можно добавить логику для получения статических изображений
        // если Fragment предоставляет их в другом формате
        const giftName = gift.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        const giftNum = gift.gift_num || gift.num;

        // Предполагаемый URL для статических изображений
        return `https://nft.fragment.com/gift/${giftName}-${giftNum}.png`;
    };

    if (hasError) {
        return (
            <div
                className={`flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg text-white ${className}`}
                style={{ width, height }}
            >
                <span style={{ fontSize: Math.min(width, height) * 0.4 }}>
                    {fallbackEmoji}
                </span>
            </div>
        );
    }

    return (
        <img
            src={generateStaticImageUrl(gift)}
            alt={gift.name}
            className={`object-cover rounded-lg ${className}`}
            style={{ width, height }}
            onError={() => setHasError(true)}
            loading="lazy"
        />
    );
};

export default GiftImage;