// src/components/RotatingCircleGrid.tsx - Добавлена защита от автоматизации через вариации цветов

"use client";

import { useRef, useState, useEffect, useCallback } from "react";

import { RotationCircle } from "@/types/game-modes/rotation";

// Массив оттенков белого цвета для защиты от автоматизации
const WHITE_COLOR_VARIANTS = [
  'rgb(255, 255, 255)',     // Чистый белый
  'rgb(255, 255, 254)',     // Белый с минимальным оттенком
  'rgb(254, 255, 255)',     // Белый с оттенком в красном канале
  'rgb(255, 254, 255)',     // Белый с оттенком в зеленом канале
  'rgb(254, 254, 255)',     // Белый с двойным оттенком
  'rgb(255, 254, 254)',     // Белый с оттенками в зеленом и синем
  'rgb(254, 255, 254)',     // Белый с оттенками в красном и синем
  'rgb(253, 255, 255)',     // Белый с более заметным оттенком красного
  'rgb(255, 253, 255)',     // Белый с более заметным оттенком зеленого
  'rgb(255, 255, 253)',     // Белый с более заметным оттенком синего
];

// Соответствующие оттенки для border цветов
const WHITE_BORDER_VARIANTS = [
  'rgb(255, 255, 255)',
  'rgb(255, 255, 254)',
  'rgb(254, 255, 255)',
  'rgb(255, 254, 255)',
  'rgb(254, 254, 255)',
  'rgb(255, 254, 254)',
  'rgb(254, 255, 254)',
  'rgb(253, 255, 255)',
  'rgb(255, 253, 255)',
  'rgb(255, 255, 253)',
];

// Функция для получения случайного индекса оттенка белого
const getRandomWhiteVariantIndex = (): number => {
  return Math.floor(Math.random() * WHITE_COLOR_VARIANTS.length);
};

// Функция для создания CSS-переменных для конкретного оттенка
const createWhiteVariantStyle = (variantIndex: number) => {
  return {
    '--white-bg': WHITE_COLOR_VARIANTS[variantIndex],
    '--white-border': WHITE_BORDER_VARIANTS[variantIndex],
  } as React.CSSProperties;
};

interface RotatingCircleGridProps {
  circles: RotationCircle[];
  onCircleClick: (circleId: number) => void;
  isGameActive: boolean;
  showCircles: boolean;
  rotationSpeed: number;
  radius: number;
  onActivatedCircles?: number[];
  lastActivationTimestamp?: number;
}

interface ActivePulse {
  circleId: number;
  isRed: boolean;
  timestamp: number;
}

interface TouchEventDetails {
  touchCount: number;
  firstTouchX: number;
  firstTouchY: number;
  timestamp: number;
}

export default function RotatingCircleGrid({
  circles,
  onCircleClick,
  isGameActive,
  showCircles,
  rotationSpeed,
  onActivatedCircles = [],
  lastActivationTimestamp = 0,
}: RotatingCircleGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotatingContainerRef = useRef<HTMLDivElement>(null);
  const touchStartTimeRef = useRef<Map<number, number>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());

  // Animation state management with race condition protection
  const currentRotationRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);
  const currentSpeedRef = useRef<number>(rotationSpeed);
  const targetSpeedRef = useRef<number>(rotationSpeed);
  const isAnimatingRef = useRef<boolean>(false);

  // Enhanced sizing for larger circles with fewer count
  const [circleSize, setCircleSize] = useState(60);
  const [containerSize, setContainerSize] = useState(400);
  const [effectiveRadius, setEffectiveRadius] = useState(150);

  // State для хранения назначенных оттенков белого для каждого кружка
  const [circleColorVariants, setCircleColorVariants] = useState<Map<number, number>>(new Map());

  // State for tracking active activation pulses
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

  // Функция для генерации нового оттенка для кружка при активации
  const generateColorVariantForCircle = (circleId: number): number => {
    const variantIndex = getRandomWhiteVariantIndex();
    setCircleColorVariants(prev => new Map(prev).set(circleId, variantIndex));
    return variantIndex;
  };

  // Effect для обновления оттенков при активации новых кружков
  useEffect(() => {
    if (onActivatedCircles.length > 0) {
      onActivatedCircles.forEach(circleId => {
        // Генерируем новый оттенок только если кружок активирован и это не ловушка
        const circle = circles.find(c => c.id === circleId);
        if (circle && circle.isActive && !circle.isDecoy) {
          generateColorVariantForCircle(circleId);
        }
      });
    }
  }, [onActivatedCircles, circles]);

  // Effect to handle activation pulses
  useEffect(() => {
    if (onActivatedCircles.length > 0 && lastActivationTimestamp > 0) {
      // Create new pulses for activated circles
      const newPulses: ActivePulse[] = onActivatedCircles.map((circleId) => {
        const circle = circles.find((c) => c.id === circleId);

        return {
          circleId,
          isRed: circle?.isDecoy || false,
          timestamp: lastActivationTimestamp,
        };
      });

      setActivePulses((prev) => [...prev, ...newPulses]);

      // Remove pulses after animation completes (400ms + small buffer)
      setTimeout(() => {
        setActivePulses((prev) =>
          prev.filter((pulse) => pulse.timestamp !== lastActivationTimestamp),
        );
      }, 450);
    }
  }, [onActivatedCircles, lastActivationTimestamp, circles]);

  // Calculate adaptive sizes optimized for 8 circles instead of 14
  useEffect(() => {
    const calculateAdaptiveSizes = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Reserve space for bottom panel
      const bottomPanelHeight = 140;
      const topReservedSpace = 60;
      const horizontalMargins = 20;

      const availableWidth = screenWidth - horizontalMargins;
      const availableHeight =
        screenHeight - bottomPanelHeight - topReservedSpace;

      const maxContainerSize = Math.min(availableWidth, availableHeight);

      // Larger container for fewer circles
      const calculatedContainerSize = Math.max(
        320,
        Math.min(maxContainerSize, 600),
      );

      // Larger circles since we have fewer of them (8 instead of 14)
      const calculatedCircleSize = Math.max(
        50,
        Math.min(calculatedContainerSize / 6, 80),
      );

      // Larger radius to accommodate bigger circles
      const calculatedEffectiveRadius = calculatedContainerSize * 0.42;

      setContainerSize(calculatedContainerSize);
      setCircleSize(calculatedCircleSize);
      setEffectiveRadius(calculatedEffectiveRadius);
    };

    calculateAdaptiveSizes();

    const handleResize = () => {
      // Debounce resize events to prevent race conditions
      setTimeout(calculateAdaptiveSizes, 100);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Enhanced rotation animation with race condition protection
  const updateRotation = useCallback(() => {
    if (!isGameActive || !rotatingContainerRef.current || isAnimatingRef.current) {
      return;
    }

    isAnimatingRef.current = true;

    const now = Date.now();
    const deltaTime = now - lastUpdateTimeRef.current;

    lastUpdateTimeRef.current = now;

    // Smooth speed interpolation for level transitions
    const speedDifference = targetSpeedRef.current - currentSpeedRef.current;
    const interpolationFactor = Math.min(deltaTime * 0.002, 1);

    currentSpeedRef.current += speedDifference * interpolationFactor;

    // Convert rotation speed from radians-per-frame to radians-per-millisecond
    const speedInRadPerMs = currentSpeedRef.current / 16.67;
    const rotationIncrement = speedInRadPerMs * deltaTime;

    currentRotationRef.current += rotationIncrement;

    // Apply rotation to container
    if (rotatingContainerRef.current) {
      rotatingContainerRef.current.style.transform = `rotate(${currentRotationRef.current}rad)`;
    }

    isAnimatingRef.current = false;

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(updateRotation);
  }, [isGameActive]);

  // Handle speed changes with race condition protection
  useEffect(() => {
    targetSpeedRef.current = rotationSpeed;
  }, [rotationSpeed]);

  // Start/stop animation with proper cleanup
  useEffect(() => {
    if (isGameActive) {
      lastUpdateTimeRef.current = Date.now();
      isAnimatingRef.current = false;
      animationFrameRef.current = requestAnimationFrame(updateRotation);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isAnimatingRef.current = false;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isAnimatingRef.current = false;
    };
  }, [isGameActive, updateRotation]);

  // Calculate static position for each circle
  const getCircleStaticPosition = useCallback(
    (circle: RotationCircle) => {
      const x = Math.cos(circle.angle) * effectiveRadius;
      const y = Math.sin(circle.angle) * effectiveRadius;
      return { x, y };
    },
    [effectiveRadius],
  );

  // Enhanced circle styles for larger circles with white variants
  const getCircleStyles = (circle: RotationCircle) => {
    const isDeactivating = circle.isAnimating;

    // Faster transitions for immediate feedback on larger circles
    const transitionClass = isDeactivating
      ? "transition-all duration-75 ease-out"
      : "transition-all duration-100 ease-in-out";

    const baseClasses = `absolute rounded-full border-4 ${transitionClass}`;

    const visibilityClasses = showCircles
      ? "opacity-100 scale-100"
      : "opacity-0 scale-0";

    const animationClasses = circle.isAnimating ? "opacity-0 scale-50" : "";

    if (circle.isActive && !circle.isAnimating) {
      if (circle.isDecoy) {
        return {
          className: `${baseClasses} ${visibilityClasses} ${animationClasses} 
                      bg-red-500 border-red-400 scale-110 shadow-lg shadow-red-500/30
                      hover:scale-115 active:scale-95 cursor-pointer`,
          style: {},
        };
      } else {
        // Regular active circles: использование переменного оттенка белого
        const variantIndex = circleColorVariants.get(circle.id) ?? 0;
        const whiteVariantStyle = createWhiteVariantStyle(variantIndex);

        return {
          className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                      scale-110 shadow-lg hover:scale-115 active:scale-95 cursor-pointer`,
          style: {
            ...whiteVariantStyle,
            backgroundColor: `var(--white-bg)`,
            borderColor: `var(--white-border)`,
            boxShadow: `0 10px 25px -5px ${WHITE_COLOR_VARIANTS[variantIndex]}30, 0 4px 6px -2px ${WHITE_COLOR_VARIANTS[variantIndex]}20`,
          },
        };
      }
    } else {
      return {
        className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                    bg-transparent border-white/30 hover:border-white/50 hover:scale-105
                    active:scale-95 cursor-pointer`,
        style: {},
      };
    }
  };

  // Enhanced touch event handlers with race condition protection
  const handleTouchStart = useCallback((circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) return;

    event.preventDefault();
    event.stopPropagation();

    const currentTime = Date.now();
    const lastTouchTime = touchStartTimeRef.current.get(circleId);

    // Prevent rapid fire touches on the same circle
    if (lastTouchTime && currentTime - lastTouchTime < 150) {
      return;
    }

    touchStartTimeRef.current.set(circleId, currentTime);

    if (!processedTouchesRef.current.has(circleId)) {
      processedTouchesRef.current.add(circleId);
      onCircleClick(circleId);

      // Cleanup processed touches after a short delay
      setTimeout(() => {
        processedTouchesRef.current.delete(circleId);
      }, 200);
    }
  }, [isGameActive, onCircleClick]);

  const handleTouchEnd = useCallback((circleId: number, event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    touchStartTimeRef.current.delete(circleId);
  }, []);

  const handleClick = useCallback((circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) return;

    const touchTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();

    // Prevent double-firing of touch and click events
    if (touchTime && currentTime - touchTime < 200) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onCircleClick(circleId);
  }, [isGameActive, onCircleClick]);

  // Pulse effect для поддержки вариантов цветов
  const renderPulseEffect = (circle: RotationCircle) => {
    if (!circle.isActive || circle.isAnimating) return null;

    if (circle.isDecoy) {
      const pulseColor = "border-red-400";
      const animationDuration = "1.2s";

      return (
        <div
          className={`absolute inset-0 rounded-full border-2 ${pulseColor} opacity-50`}
          style={{
            animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite`,
          }}
        />
      );
    } else {
      // Для белых кружков используем соответствующий оттенок для пульса
      const variantIndex = circleColorVariants.get(circle.id) ?? 0;
      const borderColor = WHITE_BORDER_VARIANTS[variantIndex];
      const animationDuration = "0.8s";

      return (
        <div
          className="absolute inset-0 rounded-full border-2 opacity-50"
          style={{
            borderColor: borderColor,
            animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite`,
          }}
        />
      );
    }
  };

  // Fast activation pulse effect
  const renderActivationPulse = (circle: RotationCircle) => {
    const activePulse = activePulses.find(
      (pulse) => pulse.circleId === circle.id,
    );

    if (!activePulse) return null;

    const pulseClass = activePulse.isRed
      ? "activation-pulse-red"
      : "activation-pulse";

    let borderColor: string;
    if (activePulse.isRed) {
      borderColor = "rgb(248, 113, 113)"; // border-red-400
    } else {
      const variantIndex = circleColorVariants.get(circle.id) ?? 0;
      borderColor = WHITE_BORDER_VARIANTS[variantIndex];
    }

    return (
      <div
        className={`absolute inset-0 rounded-full border-2 ${pulseClass} pointer-events-none`}
        style={{
          zIndex: 10,
          borderColor: borderColor,
        }}
      />
    );
  };

  return (
    <div className="flex items-center justify-center min-h-[450px] p-2">
      <div
        ref={containerRef}
        className="relative stable-container"
        style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      >
        {/* Enhanced rotating container for larger circles */}
        <div
          ref={rotatingContainerRef}
          className="absolute high-performance-rotation"
          style={{
            left: "0",
            top: "0",
            width: `${containerSize}px`,
            height: `${containerSize}px`,
            transformOrigin: "50% 50%",
            backfaceVisibility: "hidden",
            perspective: "1000px",
            willChange: "transform",
          }}
        >
          {/* Enhanced circles with larger touch targets */}
          {circles.map((circle) => {
            const circleStyleConfig = getCircleStyles(circle);
            const staticPosition = getCircleStaticPosition(circle);

            return (
              <button
                key={circle.id}
                aria-label={`Rotating circle ${circle.id + 1}${circle.isActive
                  ? circle.isDecoy
                    ? " - trap target"
                    : " - active target"
                  : ""
                  }`}
                className={`${circleStyleConfig.className} disabled:cursor-not-allowed select-none touch-optimized`}
                data-circle-id={circle.id}
                disabled={!isGameActive}
                style={{
                  width: `${circleSize}px`,
                  height: `${circleSize}px`,
                  minWidth: `${circleSize}px`,
                  minHeight: `${circleSize}px`,
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${staticPosition.x}px), calc(-50% + ${staticPosition.y}px))`,
                  transitionDelay: showCircles ? `${circle.id * 40}ms` : "0ms",
                  touchAction: "manipulation",
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                  ...circleStyleConfig.style,
                }}
                type="button"
                onClick={(event) => handleClick(circle.id, event)}
                onContextMenu={(event) => event.preventDefault()}
                onTouchEnd={(event) => handleTouchEnd(circle.id, event)}
                onTouchStart={(event) => handleTouchStart(circle.id, event)}
              >
                {/* Continuous pulse effect */}
                {renderPulseEffect(circle)}
                {/* Fast activation pulse effect */}
                {renderActivationPulse(circle)}
              </button>
            );
          })}
        </div>

        {/* Enhanced center indicator for larger container */}
        <div
          className="absolute center-indicator"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 100%)",
            boxShadow: "0 0 12px rgba(255, 255, 255, 0.3)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}