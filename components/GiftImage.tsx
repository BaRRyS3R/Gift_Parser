// src/components/GiftImage.tsx

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

// Глобальный менеджер для контроля количества активных анимаций
class AnimationManager {
  private static instance: AnimationManager;
  private activeAnimations = new Set<string>();
  private maxConcurrentAnimations = 8; // Ограничиваем количество одновременных анимаций

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

  // Intersection Observer для ленивой загрузки
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

  const generateImageUrls = useCallback((gift: Gift): string[] => {
    const urls: string[] = [];

    // Основной формат Fragment.com (убираем пробелы полностью)
    const giftNameFormatted = gift.name
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    const giftNum = gift.gift_num || gift.num;

    if (giftNum) {
      urls.push(
        `https://nft.fragment.com/gift/${giftNameFormatted}-${giftNum}.lottie.json`,
      );
    }

    return urls;
  }, []);

  const loadAnimationFromUrl = useCallback(
    async (url: string): Promise<any> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          method: "GET",
          mode: "cors",
          headers: {
            Accept: "application/json",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const animationData = await response.json();

        if (!animationData || !animationData.v || !animationData.layers) {
          throw new Error("Invalid animation data");
        }

        return animationData;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    [],
  );

  const loadAnimation = useCallback(async () => {
    if (!isVisible) return;

    const urls = generateImageUrls(gift);

    if (urls.length === 0) {
      setUseStaticFallback(true);
      setIsLoading(false);

      return;
    }

    for (const url of urls) {
      try {
        const animationData = await loadAnimationFromUrl(url);

        setAnimationData(animationData);
        setIsLoading(false);

        return;
      } catch (error) {
        console.warn(`Failed to load animation: ${error}`);
      }
    }

    setUseStaticFallback(true);
    setIsLoading(false);
  }, [gift, isVisible, generateImageUrls, loadAnimationFromUrl]);

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

    if (imgError) {
      return <GradientFallback />;
    }

    const giftNameFormatted = gift.name
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    const giftNum = gift.gift_num || gift.num;
    const pngUrl = `https://nft.fragment.com/gift/${giftNameFormatted}-${giftNum}.png`;

    return (
      <div ref={containerRef}>
        <img
          alt={gift.name}
          className={`object-cover rounded-lg shadow-lg ${className}`}
          loading="lazy"
          src={pngUrl}
          style={{ width, height }}
          onError={() => setImgError(true)}
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
          // Пауза после завершения для экономии ресурсов
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

  const generateStaticImageUrl = useCallback((gift: Gift): string => {
    const giftNameFormatted = gift.name
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    const giftNum = gift.gift_num || gift.num;

    return `https://nft.fragment.com/gift/${giftNameFormatted}-${giftNum}.png`;
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

  if (hasError) {
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

  return (
    <img
      alt={gift.name}
      className={`object-cover rounded-lg shadow-lg ${className}`}
      loading="lazy"
      src={generateStaticImageUrl(gift)}
      style={{ width, height }}
      onError={() => setHasError(true)}
    />
  );
};

export default GiftImage;
