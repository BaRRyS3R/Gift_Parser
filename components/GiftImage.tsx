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
    const [useStaticFallback, setUseStaticFallback] = useState(false);

    // Формирование URL для Lottie анимации с использованием прокси
    const generateLottieUrl = (gift: Gift): string => {
        const giftName = gift.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        const giftNum = gift.gift_num || gift.num;
        const originalUrl = `https://nft.fragment.com/gift/${giftName}-${giftNum}.lottie.json`;

        // Используем CORS прокси для обхода блокировки
        return `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
    };

    // Альтернативные URL для статических изображений
    const generateStaticImageUrl = (gift: Gift): string => {
        const giftName = gift.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        const giftNum = gift.gift_num || gift.num;

        // Пробуем разные возможные форматы
        const possibleUrls = [
            `https://nft.fragment.com/gift/${giftName}-${giftNum}.png`,
            `https://nft.fragment.com/gift/${giftName}-${giftNum}.jpg`,
            `https://nft.fragment.com/gift/${giftName}-${giftNum}.webp`,
        ];

        return possibleUrls[0]; // Возвращаем первый как основной
    };

    const loadLottieAnimation = async () => {
        try {
            setIsLoading(true);
            setHasError(false);
            setAnimationData(null);

            const lottieUrl = generateLottieUrl(gift);

            // Устанавливаем таймаут для запроса
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд

            const response = await fetch(lottieUrl, {
                signal: controller.signal,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Проверяем, что данные валидны для Lottie
            if (!data || !data.v || !data.layers) {
                throw new Error('Invalid Lottie animation data');
            }

            setAnimationData(data);
            setIsLoading(false);
        } catch (error) {
            console.warn('Failed to load Lottie animation, falling back to static image:', error);
            setUseStaticFallback(true);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Небольшая задержка для предотвращения множественных запросов
        const timeoutId = setTimeout(() => {
            loadLottieAnimation();
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [gift.name, gift.num, gift.gift_num]);

    // Генерация цвета фона на основе названия подарка
    const generateGradientColors = (giftName: string) => {
        const colors = [
            ['from-purple-500', 'to-pink-500'],
            ['from-blue-500', 'to-cyan-500'],
            ['from-green-500', 'to-teal-500'],
            ['from-red-500', 'to-orange-500'],
            ['from-indigo-500', 'to-purple-500'],
            ['from-yellow-500', 'to-red-500'],
            ['from-pink-500', 'to-rose-500'],
            ['from-cyan-500', 'to-blue-500'],
        ];

        const hash = giftName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const [fromColor, toColor] = generateGradientColors(gift.name);

    // Компонент с эмодзи и градиентом
    const FallbackImage = ({ showSpinner = false }: { showSpinner?: boolean }) => (
        <div
            className={`flex items-center justify-center bg-gradient-to-br ${fromColor} ${toColor} rounded-lg text-white shadow-lg relative ${className}`}
            style={{ width, height }}
        >
            <span style={{ fontSize: Math.min(width, height) * 0.4 }}>
                {fallbackEmoji}
            </span>
            {showSpinner && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );

    // Статическое изображение как fallback
    const StaticImageFallback = () => {
        const [imgError, setImgError] = useState(false);

        if (imgError) {
            return <FallbackImage />;
        }

        return (
            <img
                src={generateStaticImageUrl(gift)}
                alt={gift.name}
                className={`object-cover rounded-lg shadow-lg ${className}`}
                style={{ width, height }}
                onError={() => setImgError(true)}
                loading="lazy"
            />
        );
    };

    // Если загрузка в процессе
    if (isLoading) {
        return <FallbackImage showSpinner={true} />;
    }

    // Если нужно использовать статический fallback
    if (useStaticFallback) {
        return <StaticImageFallback />;
    }

    // Если есть ошибка или нет данных анимации
    if (hasError || !animationData) {
        return <FallbackImage />;
    }

    // Отображение Lottie анимации
    return (
        <div
            className={`relative overflow-hidden rounded-lg shadow-lg ${className}`}
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
                    console.warn('Lottie playback error:', error);
                    setUseStaticFallback(true);
                }}
            />

            {/* Hover эффект */}
            <div className="absolute inset-0 bg-transparent hover:bg-black hover:bg-opacity-10 transition-all duration-200 rounded-lg" />
        </div>
    );
};

// Упрощенный компонент для статических изображений
export const StaticGiftImage: React.FC<GiftImageProps> = ({
    gift,
    width = 96,
    height = 96,
    className = '',
    fallbackEmoji = '🎁'
}) => {
    const [hasError, setHasError] = useState(false);

    const generateStaticImageUrl = (gift: Gift): string => {
        const giftName = gift.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        const giftNum = gift.gift_num || gift.num;
        return `https://nft.fragment.com/gift/${giftName}-${giftNum}.png`;
    };

    const generateGradientColors = (giftName: string) => {
        const colors = [
            ['from-purple-500', 'to-pink-500'],
            ['from-blue-500', 'to-cyan-500'],
            ['from-green-500', 'to-teal-500'],
            ['from-red-500', 'to-orange-500'],
            ['from-indigo-500', 'to-purple-500'],
        ];

        const hash = giftName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    if (hasError) {
        const [fromColor, toColor] = generateGradientColors(gift.name);

        return (
            <div
                className={`flex items-center justify-center bg-gradient-to-br ${fromColor} ${toColor} rounded-lg text-white shadow-lg ${className}`}
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
            className={`object-cover rounded-lg shadow-lg ${className}`}
            style={{ width, height }}
            onError={() => setHasError(true)}
            loading="lazy"
        />
    );
};

export default GiftImage;