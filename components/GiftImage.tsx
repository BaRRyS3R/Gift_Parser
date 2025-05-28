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

    const generateImageUrls = (gift: Gift): string[] => {
        const urls: string[] = [];

        // Первый приоритет: modelLink из API (если есть)
        if (gift.modelLink && gift.modelLink.trim()) {
            urls.push(gift.modelLink.trim());
        }

        // Второй приоритет: стандартный формат Fragment.com
        // На основе скриншотов: https://nft.fragment.com/gift/candycane-17735.lottie.json
        const giftNameFormatted = gift.name
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');

        const giftNum = gift.gift_num || gift.num;

        if (giftNum) {
            // Основной формат как в скриншотах
            urls.push(`https://nft.fragment.com/gift/${giftNameFormatted}-${giftNum}.lottie.json`);

            // Альтернативные форматы
            urls.push(`https://nft.fragment.com/gift/${giftNameFormatted}-${giftNum}.tgs`);

            // С пробелами как дефисы
            const giftNameWithDashes = gift.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            urls.push(`https://nft.fragment.com/gift/${giftNameWithDashes}-${giftNum}.lottie.json`);
            urls.push(`https://nft.fragment.com/gift/${giftNameWithDashes}-${giftNum}.tgs`);
        }

        // Удаляем дубликаты
        return Array.from(new Set(urls));
    };

    const loadAnimationFromUrl = async (url: string): Promise<any> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            console.log(`Loading animation from: ${url}`);

            const response = await fetch(url, {
                signal: controller.signal,
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json, */*',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Origin': window.location.origin,
                    'Referer': window.location.href,
                    'Sec-Ch-Ua': '"Chromium";v="134", "Not;A=Brand";v="24", "Opera";v="119"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 ORP/119.0.0.0'
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            console.log(`Content-Type: ${contentType} for URL: ${url}`);

            if (url.endsWith('.lottie.json') || contentType.includes('application/json')) {
                // Обработка Lottie JSON файла
                const animationData = await response.json();

                if (!animationData || typeof animationData !== 'object') {
                    throw new Error('Invalid JSON response');
                }

                if (!animationData.v || !animationData.layers) {
                    throw new Error('Invalid Lottie animation data structure');
                }

                return animationData;
            } else if (url.endsWith('.tgs')) {
                // Обработка TGS файла (если понадобится)
                const arrayBuffer = await response.arrayBuffer();

                // Попытка декомпрессии
                try {
                    if (typeof DecompressionStream !== 'undefined') {
                        const decompressedStream = new Response(arrayBuffer).body?.pipeThrough(
                            new DecompressionStream('gzip')
                        );

                        if (decompressedStream) {
                            const decompressedResponse = new Response(decompressedStream);
                            const jsonText = await decompressedResponse.text();
                            const parsedData = JSON.parse(jsonText);

                            if (parsedData && parsedData.v && parsedData.layers) {
                                return parsedData;
                            }
                        }
                    }
                } catch (decompressionError) {
                    console.warn('TGS decompression failed:', decompressionError);
                }

                // Fallback: попытка прямого парсинга JSON
                try {
                    const decoder = new TextDecoder();
                    const jsonText = decoder.decode(arrayBuffer);
                    const parsedData = JSON.parse(jsonText);

                    if (parsedData && parsedData.v && parsedData.layers) {
                        return parsedData;
                    }
                } catch (parseError) {
                    console.warn('Direct JSON parse failed:', parseError);
                }

                throw new Error('Failed to process TGS file');
            } else {
                throw new Error(`Unsupported content type: ${contentType}`);
            }

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    };

    const loadAnimation = async () => {
        const urls = generateImageUrls(gift);

        if (urls.length === 0) {
            console.warn(`No URLs generated for gift: ${gift.name}`);
            setUseStaticFallback(true);
            setIsLoading(false);
            return;
        }

        console.log(`Starting animation load for gift: ${gift.name}, trying ${urls.length} URLs`);

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            setCurrentAttempt(i + 1);

            try {
                const animationData = await loadAnimationFromUrl(url);

                console.log(`Successfully loaded animation from: ${url}`);
                setAnimationData(animationData);
                setIsLoading(false);
                return;

            } catch (error) {
                console.warn(`Failed to load from ${url}:`, error);

                // Небольшая задержка между попытками
                if (i < urls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        }

        console.log(`All animation loading attempts failed for gift: ${gift.name}, using static fallback`);
        setUseStaticFallback(true);
        setIsLoading(false);
    };

    useEffect(() => {
        setIsLoading(true);
        setAnimationData(null);
        setUseStaticFallback(false);
        setCurrentAttempt(0);

        const timeoutId = setTimeout(() => {
            loadAnimation();
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [gift.name, gift.num, gift.gift_num, gift.modelLink]);

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

    const GradientFallback = ({ showSpinner = false }: { showSpinner?: boolean }) => {
        const urls = generateImageUrls(gift);

        return (
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
                                {currentAttempt}/{urls.length}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const StaticImageFallback = () => {
        const [imgError, setImgError] = useState(false);

        if (imgError) {
            return <GradientFallback />;
        }

        // Пытаемся использовать PNG версию с Fragment.com
        const giftNameFormatted = gift.name
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');

        const giftNum = gift.gift_num || gift.num;
        const pngUrl = `https://nft.fragment.com/gift/${giftNameFormatted}-${giftNum}.png`;

        return (
            <img
                src={pngUrl}
                alt={gift.name}
                className={`object-cover rounded-lg shadow-lg ${className}`}
                style={{ width, height }}
                onError={() => setImgError(true)}
                loading="lazy"
            />
        );
    };

    if (isLoading) {
        return <GradientFallback showSpinner={true} />;
    }

    if (useStaticFallback) {
        return <StaticImageFallback />;
    }

    if (!animationData) {
        return <GradientFallback />;
    }

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
            <div className="absolute inset-0 bg-transparent hover:bg-black hover:bg-opacity-10 transition-all duration-200 rounded-lg" />
        </div>
    );
};

export const StaticGiftImage: React.FC<GiftImageProps> = ({
    gift,
    width = 96,
    height = 96,
    className = '',
    fallbackEmoji = '🎁'
}) => {
    const [hasError, setHasError] = useState(false);

    const generateStaticImageUrl = (gift: Gift): string => {
        const giftNameFormatted = gift.name
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');

        const giftNum = gift.gift_num || gift.num;
        return `https://nft.fragment.com/gift/${giftNameFormatted}-${giftNum}.png`;
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