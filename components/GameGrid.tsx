// src/components/GameGrid.tsx - Добавлена защита от автоматизации через вариации цветов

"use client";

import { useRef, useState, useEffect } from "react";

import { Circle } from "@/types/game-modes/common";

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

interface GameGridProps {
  circles: Circle[];
  onCircleClick: (circleId: number) => void;
  isGameActive: boolean;
  showCircles: boolean;
  // Props for activation pulse notifications
  onActivatedCircles?: number[]; // Array of circle IDs that were just activated
  lastActivationTimestamp?: number; // Timestamp to trigger re-render when activations occur
  gameMode?: "reaction" | "survival" | "physics"; // Game mode for styling differences
  // Props for instant deactivation support
  instantlyDeactivatedCircles?: number[]; // Array of circle IDs that should be instantly deactivated
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

// Utility function to determine grid dimensions based on circle count
const getGridDimensions = (circleCount: number) => {
  switch (circleCount) {
    case 9:
      return { cols: 3, rows: 3 }; // Reaction Mode grid
    case 25:
      return { cols: 5, rows: 5 }; // Standard grid
    case 36:
      return { cols: 6, rows: 6 }; // Advanced grid
    case 49:
      return { cols: 7, rows: 7 }; // Survival Mode grid
    default:
      // Fallback calculation for any other counts
      const cols = Math.ceil(Math.sqrt(circleCount));
      const rows = Math.ceil(circleCount / cols);

      return { cols, rows };
  }
};

export default function GameGrid({
  circles,
  onCircleClick,
  isGameActive,
  showCircles,
  onActivatedCircles = [],
  lastActivationTimestamp = 0,
  gameMode = "reaction",
  instantlyDeactivatedCircles = [],
}: GameGridProps) {
  const { cols, rows } = getGridDimensions(circles.length);
  const touchStartTimeRef = useRef<Map<number, number>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());

  // State for dynamic sizing
  const [circleSize, setCircleSize] = useState(40);
  const [gapSize, setGapSize] = useState(4);

  // State for tracking active activation pulses
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

  // State для хранения назначенных оттенков белого для каждого кружка
  const [circleColorVariants, setCircleColorVariants] = useState<Map<number, number>>(new Map());

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

  // Calculate adaptive sizes based on screen dimensions
  useEffect(() => {
    const calculateAdaptiveSizes = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Calculate available space (accounting for UI elements)
      const availableWidth = screenWidth * 0.9; // 90% of screen width
      const availableHeight = screenHeight * 0.6; // 60% of screen height (accounting for top/bottom UI)

      // Calculate maximum circle size based on grid dimensions
      const maxCircleWidthByColumns = (availableWidth - (cols - 1) * 12) / cols; // 12px gap between circles
      const maxCircleHeightByRows = (availableHeight - (rows - 1) * 12) / rows;

      // Use the smaller dimension to ensure circles fit in both directions
      const calculatedSize = Math.min(
        maxCircleWidthByColumns,
        maxCircleHeightByRows,
      );

      // Apply size constraints based on device type and circle count
      let finalSize: number;
      let finalGap: number;

      if (circles.length <= 16) {
        finalSize = Math.max(60, Math.min(calculatedSize, 120));
        finalGap = 12;
      } else if (circles.length <= 25) {
        finalSize = Math.max(48, Math.min(calculatedSize, 80));
        finalGap = 10;
      } else if (circles.length <= 48) {
        finalSize = Math.max(36, Math.min(calculatedSize, 64));
        finalGap = 8;
      } else {
        finalSize = Math.max(32, Math.min(calculatedSize, 48));
        finalGap = 6;
      }

      // Additional adjustments for very small screens
      if (screenWidth < 400) {
        finalSize = finalSize * 0.85;
        finalGap = Math.max(2, finalGap - 2);
      }

      const newCircleSize = Math.floor(finalSize);
      const newGapSize = finalGap;

      setCircleSize(newCircleSize);
      setGapSize(newGapSize);
    };

    // Calculate on mount and window resize
    calculateAdaptiveSizes();
    window.addEventListener("resize", calculateAdaptiveSizes);

    // Handle orientation changes on mobile devices
    window.addEventListener("orientationchange", () => {
      setTimeout(calculateAdaptiveSizes, 100);
    });

    return () => {
      window.removeEventListener("resize", calculateAdaptiveSizes);
      window.removeEventListener("orientationchange", calculateAdaptiveSizes);
    };
  }, [circles.length, cols, rows]);

  const getCircleStyles = (circle: Circle) => {
    const baseStyles = {
      width: `${circleSize}px`,
      height: `${circleSize}px`,
      minWidth: `${circleSize}px`,
      minHeight: `${circleSize}px`,
    };

    const baseClasses =
      "rounded-full border-2 transition-all duration-300 ease-out relative";

    // Check if this circle should be instantly deactivated
    const shouldInstantlyDeactivate = instantlyDeactivatedCircles.includes(circle.id);

    // State-based styling for visibility and animation
    const visibilityClasses = showCircles
      ? "opacity-100 transform scale-100"
      : "opacity-0 transform scale-0";

    // Handle instant deactivation vs normal animation
    let animationClasses = "";
    if (shouldInstantlyDeactivate) {
      animationClasses = "circle-instant-deactivate";
    } else if (circle.isAnimating) {
      animationClasses = "opacity-0 scale-75 transition-all duration-100";
    }

    // Interactive state styling based on circle type and activity
    if (circle.isActive && !circle.isAnimating && !shouldInstantlyDeactivate) {
      if (circle.isDecoy) {
        // Decoy circles: red coloring with danger indicators
        return {
          className: `${baseClasses} ${visibilityClasses} ${animationClasses} 
                      bg-red-500 border-red-400 shadow-lg shadow-red-500/50 scale-110
                      hover:scale-115 active:scale-95`,
          style: baseStyles,
        };
      } else {
        // Regular active circles: использование переменного оттенка белого
        const variantIndex = circleColorVariants.get(circle.id) ?? 0;
        const whiteVariantStyle = createWhiteVariantStyle(variantIndex);

        return {
          className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                      shadow-lg scale-110 hover:scale-115 active:scale-95`,
          style: {
            ...baseStyles,
            ...whiteVariantStyle,
            backgroundColor: `var(--white-bg)`,
            borderColor: `var(--white-border)`,
            boxShadow: `0 10px 25px -5px ${WHITE_COLOR_VARIANTS[variantIndex]}80, 0 4px 6px -2px ${WHITE_COLOR_VARIANTS[variantIndex]}40`,
          },
        };
      }
    } else {
      // Inactive circles: standard border styling with hover effects
      return {
        className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                    bg-transparent border-white/60 hover:border-white hover:scale-105
                    active:scale-95 hover:shadow-md hover:shadow-white/30`,
        style: baseStyles,
      };
    }
  };

  const getBasicTouchInfo = (event: React.TouchEvent): TouchEventDetails => {
    const firstTouch = event.touches.length > 0 ? event.touches[0] : event.changedTouches[0];
    return {
      touchCount: event.touches.length,
      firstTouchX: firstTouch?.clientX || 0,
      firstTouchY: firstTouch?.clientY || 0,
      timestamp: Date.now()
    };
  };

  // Touch event handlers for mobile compatibility
  const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) {
      return;
    }

    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();

    const currentTime = Date.now();
    const touchInfo = getBasicTouchInfo(event);

    touchStartTimeRef.current.set(circleId, currentTime);

    if (!processedTouchesRef.current.has(circleId)) {
      processedTouchesRef.current.add(circleId);

      onCircleClick(circleId);

      setTimeout(() => {
        processedTouchesRef.current.delete(circleId);
      }, 100);
    }
  };

  const handleTouchEnd = (circleId: number, event: React.TouchEvent) => {
    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();

    const touchStartTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();
    const touchDuration = touchStartTime ? currentTime - touchStartTime : 0;
    const touchInfo = getBasicTouchInfo(event);

    touchStartTimeRef.current.delete(circleId);
  };

  const handleClick = (circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) {
      return;
    }

    const touchTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();

    if (touchTime && currentTime - touchTime < 300) {
      return;
    }

    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();

    onCircleClick(circleId);
  };

  const getInteractionProps = (circle: Circle) => {
    return {
      disabled: !isGameActive,
      style: {
        transitionDelay: showCircles ? `${circle.id * 12}ms` : "0ms",
        transition:
          circle.isActive && !circle.isAnimating
            ? "transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out"
            : "all 0.3s ease-out",
        touchAction: "manipulation",
      },
      onTouchStart: (event: React.TouchEvent) =>
        handleTouchStart(circle.id, event),
      onTouchEnd: (event: React.TouchEvent) => handleTouchEnd(circle.id, event),
      onClick: (event: React.MouseEvent) => handleClick(circle.id, event),
      onContextMenu: (event: React.MouseEvent) => {
        event.preventDefault();
      },
    };
  };

  // Continuous pulse effect (обновлен для поддержки вариантов цветов)
  const renderPulseEffect = (circle: Circle) => {
    // Don't render pulse for instantly deactivated circles
    if (instantlyDeactivatedCircles.includes(circle.id)) return null;
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

  // Fast activation pulse effect (обновлен для поддержки вариантов цветов)
  const renderActivationPulse = (circle: Circle) => {
    // Don't render activation pulse for instantly deactivated circles
    if (instantlyDeactivatedCircles.includes(circle.id)) return null;

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

    // Different z-index for different game modes
    // In survival mode, pulse goes behind circles; in reaction mode, it goes above
    const zIndex = gameMode === "survival" ? -1 : 10;

    return (
      <div
        className={`absolute inset-0 rounded-full border-2 ${pulseClass} pointer-events-none`}
        style={{
          zIndex: zIndex,
          borderColor: borderColor,
        }}
      />
    );
  };

  const getContainerMaxDimensions = () => {
    // Calculate container dimensions based on circle count and adaptive sizing
    const containerWidth = circleSize * cols + gapSize * (cols - 1) + 32; // 32px padding
    const containerHeight = circleSize * rows + gapSize * (rows - 1) + 32;

    return {
      maxWidth: `min(95vw, ${containerWidth}px)`,
      maxHeight: `min(70vh, ${containerHeight}px)`,
    };
  };

  const { maxWidth, maxHeight } = getContainerMaxDimensions();

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <div
        className="grid justify-items-center items-center no-drag"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: `${gapSize}px`,
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          touchAction: "none",
          overscrollBehavior: "none",
          maxWidth,
          maxHeight,
        }}
      >
        {circles.map((circle) => {
          const circleStyleConfig = getCircleStyles(circle);

          return (
            <button
              key={circle.id}
              aria-label={`Game circle ${circle.id + 1}${circle.isActive ? (circle.isDecoy ? " - trap target" : " - active target") : ""}`}
              className={`${circleStyleConfig.className} disabled:cursor-not-allowed select-none`}
              data-circle-id={circle.id}
              disabled={getInteractionProps(circle).disabled}
              style={{
                ...circleStyleConfig.style,
                ...getInteractionProps(circle).style,
              }}
              type="button"
              onClick={getInteractionProps(circle).onClick}
              onContextMenu={getInteractionProps(circle).onContextMenu}
              onTouchEnd={getInteractionProps(circle).onTouchEnd}
              onTouchStart={getInteractionProps(circle).onTouchStart}
            >
              {/* Existing continuous pulse effect */}
              {renderPulseEffect(circle)}
              {/* Fast activation pulse effect */}
              {renderActivationPulse(circle)}
            </button>
          );
        })}
      </div>
    </div>
  );
}