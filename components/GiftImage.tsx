// Updated src/components/GiftImage.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import Lottie from "lottie-react";

import { Gift } from "@/types/gift";

interface GiftImageProps {
    gift: Gift;
    width?: number;
    height?: number;
    className?: string;
    fallbackEmoji?: string;
}

// Global animation manager for controlling concurrent animations
class AnimationManager {
    private static instance: AnimationManager;
    private activeAnimations = new Set<string>();
    private maxConcurrentAnimations = 8;

    static getInstance(): AnimationManager {
        if (!AnimationManager.instance) {
            AnimationManager.instance = new AnimationManager();
        }
        return AnimationManager.instance;
    }

    canStartAnimation(id: string): boolean {
        return this.activeAnimations.size < this.maxConcurrentAnimations;
    }

    registerAnimation(id: string): void {
        this.activeAnimations.add(id);
    }

    unregisterAnimation(id: string): void {
        this.activeAnimations.delete(id);
    }

    getActiveCount(): number {
        return this.activeAnimations.size;
    }
}

export const GiftImage: React.FC<GiftImageProps> = ({
    gift,
    width = 96,
    height = 96,
    className = "",
    fallbackEmoji = "🎁",
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [animationData, setAnimationData] = useState<any>(null);
    const [useStaticFallback, setUseStaticFallback] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [shouldPlayAnimation, setShouldPlayAnimation] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const lottieRef = useRef<any>(null);
    const animationManager = AnimationManager.getInstance();
    const giftId = `${gift.name}-${gift.num || gift.gift_num}`;

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
                if (
                    entry.isIntersecting &&
                    animationManager.canStartAnimation(giftId)
                ) {
                    setShouldPlayAnimation(true);
                    animationManager.registerAnimation(giftId);
                }
            },
            { threshold: 0.1, rootMargin: "50px" },
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            observer.disconnect();
            animationManager.unregisterAnimation(giftId);
        };
    }, [giftId]);

    // Load animation from modelLink
    const loadAnimationFromModelLink = useCallback(
        async (modelLink: string): Promise<any> => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                // Use the modelLink directly since it's from the same domain
                const response = await fetch(modelLink, {
                    signal: controller.signal,
                    method: "GET",
                    mode: "cors", // Use cors mode for same-origin requests
                    headers: {
                        Accept: "application/json, application/octet-stream",
                    },
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                // Check if the response is a .tgs file (which is gzipped Lottie)
                const contentType = response.headers.get('content-type');
                const url = response.url.toLowerCase();

                if (url.endsWith('.tgs') || contentType?.includes('application/octet-stream')) {
                    // For .tgs files, we need to decompress them
                    // However, since browser environment doesn't have native gzip decompression for this use case,
                    // we'll try to parse as JSON first, and if that fails, fall back to static image
                    try {
                        const arrayBuffer = await response.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);

                        // Try to decompress using browser's DecompressionStream if available
                        if ('DecompressionStream' in window) {
                            const decompressedStream = new DecompressionStream('gzip');
                            const writer = decompressedStream.writable.getWriter();
                            const reader = decompressedStream.readable.getReader();

                            writer.write(uint8Array);
                            writer.close();

                            const chunks = [];
                            let done = false;

                            while (!done) {
                                const { value, done: readerDone } = await reader.read();
                                done = readerDone;
                                if (value) {
                                    chunks.push(value);
                                }
                            }

                            const decompressedData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                            let offset = 0;
                            for (const chunk of chunks) {
                                decompressedData.set(chunk, offset);
                                offset += chunk.length;
                            }

                            const jsonString = new TextDecoder().decode(decompressedData);
                            const animationData = JSON.parse(jsonString);

                            if (animationData && animationData.v && animationData.layers) {
                                return animationData;
                            }
                        }

                        throw new Error('Cannot decompress .tgs file');
                    } catch (error) {
                        console.warn('Failed to process .tgs file:', error);
                        throw error;
                    }
                } else {
                    // Try to parse as regular JSON (Lottie)
                    const animationData = await response.json();

                    if (!animationData || !animationData.v || !animationData.layers) {
                        throw new Error("Invalid animation data");
                    }

                    return animationData;
                }
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        },
        [],
    );

    // Generate alternative static image URLs
    const generateStaticImageUrls = useCallback((gift: Gift): string[] => {
        const urls: string[] = [];

        if (gift.modelLink) {
            // Try to convert modelLink to static formats
            const baseUrl = gift.modelLink.replace(/\.(tgs|json)$/i, '');
            urls.push(`${baseUrl}.png`);
            urls.push(`${baseUrl}.jpg`);
            urls.push(`${baseUrl}.webp`);
        }

        return urls;
    }, []);

    const loadAnimation = useCallback(async () => {
        if (!isVisible) return;

        try {
            // First, try to load from modelLink if available
            if (gift.modelLink) {
                try {
                    const animationData = await loadAnimationFromModelLink(gift.modelLink);
                    setAnimationData(animationData);
                    setIsLoading(false);
                    return;
                } catch (error) {
                    console.warn(`Failed to load animation from modelLink: ${error}`);
                }
            }

            // If modelLink fails, fall back to static images
            const staticUrls = generateStaticImageUrls(gift);
            for (const url of staticUrls) {
                try {
                    const response = await fetch(url, { method: 'HEAD' });
                    if (response.ok) {
                        // Found a working static image, don't set animationData, let StaticImageFallback handle it
                        setUseStaticFallback(true);
                        setIsLoading(false);
                        return;
                    }
                } catch (error) {
                    console.warn(`Static image not found: ${url}`);
                }
            }

            // If everything fails, use gradient fallback
            setUseStaticFallback(true);
            setIsLoading(false);
        } catch (error) {
            console.error('Animation loading failed:', error);
            setUseStaticFallback(true);
            setIsLoading(false);
        }
    }, [gift, isVisible, loadAnimationFromModelLink, generateStaticImageUrls]);

    useEffect(() => {
        if (isVisible && !animationData && !useStaticFallback) {
            loadAnimation();
        }
    }, [isVisible, loadAnimation, animationData, useStaticFallback]);

    const generateGradientColors = useCallback((giftName: string) => {
        const colors = [
            ["from-purple-600", "to-pink-600"],
            ["from-blue-600", "to-cyan-600"],
            ["from-green-600", "to-teal-600"],
            ["from-red-600", "to-orange-600"],
            ["from-indigo-600", "to-purple-600"],
            ["from-yellow-600", "to-red-600"],
            ["from-pink-600", "to-rose-600"],
            ["from-cyan-600", "to-blue-600"],
        ];

        const hash = giftName
            .split("")
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);

        return colors[hash % colors.length];
    }, []);

    const [fromColor, toColor] = generateGradientColors(gift.name);

    const GradientFallback = ({
        showSpinner = false,
    }: {
        showSpinner?: boolean;
    }) => (
        <div
            ref={containerRef}
            className={`flex items-center justify-center bg-gradient-to-br ${fromColor} ${toColor} rounded-lg text-white shadow-lg relative ${className}`}
            style={{ width, height }}
        >
            <span
                className="select-none"
                style={{ fontSize: Math.min(width, height) * 0.4 }}
            >
                {fallbackEmoji}
            </span>
            {showSpinner && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );

    const StaticImageFallback = () => {
        const [imgError, setImgError] = useState(false);
        const [currentUrlIndex, setCurrentUrlIndex] = useState(0);

        const staticUrls = generateStaticImageUrls(gift);

        if (imgError || staticUrls.length === 0 || currentUrlIndex >= staticUrls.length) {
            return <GradientFallback />;
        }

        const currentUrl = staticUrls[currentUrlIndex];

        return (
            <div ref={containerRef}>
                <img
                    alt={gift.name}
                    className={`object-cover rounded-lg shadow-lg ${className}`}
                    loading="lazy"
                    src={currentUrl}
                    style={{ width, height }}
                    onError={() => {
                        if (currentUrlIndex < staticUrls.length - 1) {
                            setCurrentUrlIndex(prev => prev + 1);
                        } else {
                            setImgError(true);
                        }
                    }}
                />
            </div>
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
            ref={containerRef}
            className={`relative overflow-hidden rounded-lg shadow-lg ${className}`}
            style={{ width, height }}
        >
            <Lottie
                animationData={animationData}
                autoplay={shouldPlayAnimation}
                loop={true}
                lottieRef={lottieRef}
                rendererSettings={{
                    preserveAspectRatio: "xMidYMid slice",
                    progressiveLoad: true,
                    hideOnTransparent: true,
                }}
                style={{
                    width: "100%",
                    height: "100%",
                }}
                onComplete={() => {
                    if (lottieRef.current) {
                        setTimeout(() => {
                            lottieRef.current?.play();
                        }, 1000);
                    }
                }}
                onError={(error) => {
                    console.warn("Lottie error:", error);
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
    className = "",
    fallbackEmoji = "🎁",
}) => {
    const [hasError, setHasError] = useState(false);
    const [currentUrlIndex, setCurrentUrlIndex] = useState(0);

    const generateStaticImageUrls = useCallback((gift: Gift): string[] => {
        const urls: string[] = [];

        if (gift.modelLink) {
            const baseUrl = gift.modelLink.replace(/\.(tgs|json)$/i, '');
            urls.push(`${baseUrl}.png`);
            urls.push(`${baseUrl}.jpg`);
            urls.push(`${baseUrl}.webp`);
        }

        return urls;
    }, []);

    const generateGradientColors = useCallback((giftName: string) => {
        const colors = [
            ["from-purple-600", "to-pink-600"],
            ["from-blue-600", "to-cyan-600"],
            ["from-green-600", "to-teal-600"],
            ["from-red-600", "to-orange-600"],
            ["from-indigo-600", "to-purple-600"],
        ];

        const hash = giftName
            .split("")
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);

        return colors[hash % colors.length];
    }, []);

    const staticUrls = generateStaticImageUrls(gift);

    if (hasError || staticUrls.length === 0 || currentUrlIndex >= staticUrls.length) {
        const [fromColor, toColor] = generateGradientColors(gift.name);

        return (
            <div
                className={`flex items-center justify-center bg-gradient-to-br ${fromColor} ${toColor} rounded-lg text-white shadow-lg ${className}`}
                style={{ width, height }}
            >
                <span
                    className="select-none font-medium"
                    style={{ fontSize: Math.min(width, height) * 0.4 }}
                >
                    {fallbackEmoji}
                </span>
            </div>
        );
    }

    const currentUrl = staticUrls[currentUrlIndex];

    return (
        <img
            alt={gift.name}
            className={`object-cover rounded-lg shadow-lg ${className}`}
            loading="lazy"
            src={currentUrl}
            style={{ width, height }}
            onError={() => {
                if (currentUrlIndex < staticUrls.length - 1) {
                    setCurrentUrlIndex(prev => prev + 1);
                } else {
                    setHasError(true);
                }
            }}
        />
    );
};

export default GiftImage;