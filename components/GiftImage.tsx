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
    const [animationData, setAnimationData] = useState<any>(null);
    const [useStaticFallback, setUseStaticFallback] = useState(false);
    const [currentAttempt, setCurrentAttempt] = useState(0);

    // Список альтернативных прокси-сервисов и прямых URL
    const getImageUrls = (gift: Gift) => {
        const giftName = gift.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        const giftNum = gift.gift_num || gift.num;

        return {
            // Прямые URL без прокси (попробуем сначала)
            direct: {
                tgs: `https://nft.fragment.com/gift/${giftName}-${giftNum}.tgs`,
                lottie: `https://nft.fragment.com/gift/${giftName}-${giftNum}.lottie.json`,
                png: `https://nft.fragment.com/gift/${giftName}-${giftNum}.png`,
                webp: `https://nft.fragment.com/gift/${giftName}-${giftNum}.webp`
            },
            // Альтернативные прокси (если прямые URL не работают)
            proxied: {
                tgs: [
                    `https://corsproxy.io/?${encodeURIComponent(`https://nft.fragment.com/gift/${giftName}-${giftNum}.tgs`)}`,
                    `https://cors-anywhere.herokuapp.com/https://nft.fragment.com/gift/${giftName}-${giftNum}.tgs`,
                    `https://api.codetabs.com/v1/proxy?quest=https://nft.fragment.com/gift/${giftName}-${giftNum}.tgs`
                ],
                lottie: [
                    `https://corsproxy.io/?${encodeURIComponent(`https://nft.fragment.com/gift/${giftName}-${giftNum}.lottie.json`)}`,
                    `https://cors-anywhere.herokuapp.com/https://nft.fragment.com/gift/${giftName}-${giftNum}.lottie.json`,
                    `https://api.codetabs.com/v1/proxy?quest=https://nft.fragment.com/gift/${giftName}-${giftNum}.lottie.json`
                ]
            }
        };
    };

    // Функция для разархивирования TGS файла
    const decompressTgs = async (tgsData: ArrayBuffer): Promise<any> => {
        try {
            // TGS файлы - это gzip-сжатые JSON файлы
            const decompressedStream = new Response(tgsData).body?.pipeThrough(
                new DecompressionStream('gzip')
            );

            if (!decompressedStream) {
                throw new Error('Failed to create decompression stream');
            }

            const response = new Response(decompressedStream);
            const jsonText = await response.text();
            return JSON.parse(jsonText);
        } catch (error) {
            console.warn('Failed to decompress TGS file:', error);
            throw error;
        }
    };

    // Загрузка анимации с множественными попытками
    const loadAnimation = async () => {
        const urls = getImageUrls(gift);
        const allAttempts = [
            // Сначала пробуем прямой TGS
            { type: 'tgs', url: urls.direct.tgs, direct: true },
            // Затем прямой Lottie JSON
            { type: 'lottie', url: urls.direct.lottie, direct: true },
            // Затем прокси для TGS
            ...urls.proxied.tgs.map(url => ({ type: 'tgs', url, direct: false })),
            // И прокси для Lottie JSON
            ...urls.proxied.lottie.map(url => ({ type: 'lottie', url, direct: false }))
        ];

        for (let i = 0; i < allAttempts.length; i++) {
            const attempt = allAttempts[i];
            setCurrentAttempt(i + 1);

            try {
                console.log(`Attempting to load ${attempt.type} from ${attempt.direct ? 'direct' : 'proxy'}: ${attempt.url}`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const response = await fetch(attempt.url, {
                    signal: controller.signal,
                    method: 'GET',
                    mode: attempt.direct ? 'cors' : 'cors',
                    headers: {
                        'Accept': attempt.type === 'tgs' ? 'application/octet-stream' : 'application/json',
                    },
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                let animationData;

                if (attempt.type === 'tgs') {
                    // Обработка TGS файла
                    const arrayBuffer = await response.arrayBuffer();
                    animationData = await decompressTgs(arrayBuffer);
                } else {
                    // Обработка Lottie JSON
                    animationData = await response.json();
                }

                // Проверяем валидность данных Lottie
                if (!animationData || !animationData.v || !animationData.layers) {
                    throw new Error('Invalid animation data');
                }

                console.log(`Successfully loaded animation from ${attempt.url}`);
                setAnimationData(animationData);
                setIsLoading(false);
                return;

            } catch (error) {
                console.warn(`Failed to load from ${attempt.url}:`, error);

                // Если это последняя попытка, переходим к статическому fallback
                if (i === allAttempts.length - 1) {
                    console.log('All animation loading attempts failed, using static fallback');
                    setUseStaticFallback(true);
                    setIsLoading(false);
                }
            }
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadAnimation();
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [gift.name, gift.num, gift.gift_num]);

    // Генерация градиентных цветов
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

    // Fallback с эмодзи и градиентом
    const GradientFallback = ({ showSpinner = false }: { showSpinner?: boolean }) => (
        <div
            className={`flex items-center justify-center bg-gradient-to-br ${fromColor} ${toColor} rounded-lg text-white shadow-lg relative ${className}`}
            style={{ width, height }}
        >
            <span style={{ fontSize: Math.min(width, height) * 0.4 }}>
                {fallbackEmoji}
            </span>
            {showSpinner && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                    <div className="flex flex-col items-center space-y-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-white opacity-80">
                            {currentAttempt}/8
                        </span>
                    </div>
                </div>
            )}
        </div>
    );

    // Статическое изображение как fallback
    const StaticImageFallback = () => {
        const [imgError, setImgError] = useState(false);
        const urls = getImageUrls(gift);

        if (imgError) {
            return <GradientFallback />;
        }

        return (
            <img
                src={urls.direct.png}
                alt={gift.name}
                className={`object-cover rounded-lg shadow-lg ${className}`}
                style={{ width, height }}
                onError={() => setImgError(true)}
                loading="lazy"
            />
        );
    };

    // Отображение состояний
    if (isLoading) {
        return <GradientFallback showSpinner={true} />;
    }

    if (useStaticFallback) {
        return <StaticImageFallback />;
    }

    if (!animationData) {
        return <GradientFallback />;
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

// Упрощенный компонент только для статических изображений
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