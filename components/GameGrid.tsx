// src/components/GameGrid.tsx - Исправлено для устранения race conditions на iOS

"use client";

import { useRef, useState, useEffect } from "react";

import { Circle } from "@/types/game-modes/common";

interface GameGridProps {
  circles: Circle[];
  onCircleClick: (circleId: number) => void;
  isGameActive: boolean;
  showCircles: boolean;
  // Props for activation pulse notifications
  onActivatedCircles?: number[]; // Array of circle IDs that were just activated
  lastActivationTimestamp?: number; // Timestamp to trigger re-render when activations occur
  gameMode?: "reaction" | "survival" | "physics"; // Game mode for styling differences
  // НОВОЕ: Props для pending активаций
  pendingActivations?: Set<number>; // Круги, которые ожидают активации
  pendingRedCircles?: Set<number>; // Круги, которые ожидают активации как красные
}

interface ActivePulse {
  circleId: number;
  isRed: boolean;
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
  pendingActivations = new Set(),
  pendingRedCircles = new Set(),
}: GameGridProps) {
  const { cols, rows } = getGridDimensions(circles.length);
  
  // ИСПРАВЛЕНО: Улучшенное управление touch событиями для iOS
  const touchStartTimeRef = useRef<Map<number, number>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());
  const lastClickTimeRef = useRef<Map<number, number>>(new Map());
  const activeTouchesRef = useRef<Set<number>>(new Set()); // НОВОЕ: Отслеживание активных касаний
  const touchIdentifierRef = useRef<Map<number, number>>(new Map()); // НОВОЕ: Уникальные идентификаторы касаний

  // State for dynamic sizing
  const [circleSize, setCircleSize] = useState(40);
  const [gapSize, setGapSize] = useState(4);

  // State for tracking active activation pulses
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

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
      const maxCircleWidthByColumns = (availableWidth - (cols - 1) * 8) / cols; // 8px gap between circles
      const maxCircleHeightByRows = (availableHeight - (rows - 1) * 8) / rows;

      // Use the smaller dimension to ensure circles fit in both directions
      const calculatedSize = Math.min(
        maxCircleWidthByColumns,
        maxCircleHeightByRows,
      );

      // Apply size constraints based on device type and circle count
      let finalSize: number;
      let finalGap: number;

      if (circles.length <= 16) {
        // Smaller grids can have larger circles
        finalSize = Math.max(60, Math.min(calculatedSize, 120));
        finalGap = 8;
      } else if (circles.length <= 25) {
        finalSize = Math.max(48, Math.min(calculatedSize, 80));
        finalGap = 6;
      } else if (circles.length <= 48) {
        // Large grids with moderate circle count
        finalSize = Math.max(36, Math.min(calculatedSize, 64));
        finalGap = 4;
      } else {
        // Largest grids need smaller circles
        finalSize = Math.max(32, Math.min(calculatedSize, 48));
        finalGap = 4;
      }

      // Additional adjustments for very small screens
      if (screenWidth < 400) {
        finalSize = finalSize * 0.85;
        finalGap = Math.max(2, finalGap - 2);
      }

      setCircleSize(Math.floor(finalSize));
      setGapSize(finalGap);
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

  // ИСПРАВЛЕНО: Улучшенная функция определения активности круга
  const isCircleEffectivelyActive = (circle: Circle): boolean => {
    return circle.isActive || pendingActivations.has(circle.id);
  };

  // ИСПРАВЛЕНО: Улучшенная функция определения цвета круга
  const isCircleEffectivelyRed = (circle: Circle): boolean => {
    return circle.isDecoy || pendingRedCircles.has(circle.id);
  };

  const getCircleStyles = (circle: Circle) => {
    const baseStyles = {
      width: `${circleSize}px`,
      height: `${circleSize}px`,
      minWidth: `${circleSize}px`,
      minHeight: `${circleSize}px`,
    };

    const baseClasses =
      "rounded-full border-2 transition-all duration-300 ease-out relative";

    // State-based styling for visibility and animation
    const visibilityClasses = showCircles
      ? "opacity-100 transform scale-100"
      : "opacity-0 transform scale-0";

    const animationClasses = circle.isAnimating
      ? "opacity-0 scale-75 transition-all duration-200"
      : "";

    // ИСПРАВЛЕНО: Используем эффективные проверки активности
    const isEffectivelyActive = isCircleEffectivelyActive(circle);
    const isEffectivelyRed = isCircleEffectivelyRed(circle);

    // Interactive state styling based on circle type and activity
    if (isEffectivelyActive && !circle.isAnimating) {
      if (isEffectivelyRed) {
        // Decoy circles: red coloring with danger indicators
        return {
          className: `${baseClasses} ${visibilityClasses} ${animationClasses} 
                      bg-red-500 border-red-400 shadow-lg shadow-red-500/50 scale-110
                      hover:scale-115 active:scale-95`,
          style: baseStyles,
        };
      } else {
        // Regular active circles: white coloring with positive indicators
        return {
          className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                      bg-white shadow-lg shadow-white/50 border-white scale-110
                      hover:scale-115 active:scale-95`,
          style: baseStyles,
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

  // ИСПРАВЛЕНО: Оптимизированная обработка touch событий для быстрого геймплея
  const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) return;

    // Prevent event from bubbling and default behaviors
    event.preventDefault();
    event.stopPropagation();

    const currentTime = Date.now();
    const touch = event.touches[0]; // Получаем первое касание
    const touchId = touch?.identifier || 0; // Уникальный идентификатор касания

    // ОПТИМИЗИРОВАНО: Проверяем, не является ли это тем же самым касанием (защита от удержания)
    const existingTouchId = touchIdentifierRef.current.get(circleId);
    if (existingTouchId === touchId && activeTouchesRef.current.has(circleId)) {
      return; // Это повторное срабатывание того же касания
    }

    // ОПТИМИЗИРОВАНО: Блокируем если касание уже активно для этого круга
    if (activeTouchesRef.current.has(circleId)) {
      return;
    }

    // ОПТИМИЗИРОВАНО: Уменьшенная временная блокировка только для предотвращения bounce-эффекта
    const lastClick = lastClickTimeRef.current.get(circleId) || 0;
    if (currentTime - lastClick < 30) { // Уменьшено до 100ms для быстрого геймплея
      return;
    }

    // ОПТИМИЗИРОВАНО: Более короткая проверка глобальной блокировки
    if (processedTouchesRef.current.has(circleId)) {
      const touchStartTime = touchStartTimeRef.current.get(circleId) || 0;
      if (currentTime - touchStartTime < 30) { // Короткая блокировка только для текущего касания
        return;
      }
    }

    // Регистрируем активное касание
    activeTouchesRef.current.add(circleId);
    touchIdentifierRef.current.set(circleId, touchId);
    touchStartTimeRef.current.set(circleId, currentTime);
    processedTouchesRef.current.add(circleId);
    lastClickTimeRef.current.set(circleId, currentTime);

    // Выполняем клик
    onCircleClick(circleId);

    // ОПТИМИЗИРОВАНО: Короткая блокировка только для предотвращения bounce
    setTimeout(() => {
      processedTouchesRef.current.delete(circleId);
    }, 50); // Уменьшено до 150ms для обеспечения быстрого геймплея
  };

  const handleTouchEnd = (circleId: number, event: React.TouchEvent) => {
    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();
    
    // ОПТИМИЗИРОВАНО: Немедленная очистка активного касания для возможности быстрого повторного нажатия
    setTimeout(() => {
      activeTouchesRef.current.delete(circleId);
      touchIdentifierRef.current.delete(circleId);
      touchStartTimeRef.current.delete(circleId);
    }, 30); // Минимальная задержка для стабильности
  };

  // Добавляем обработчик touchcancel для полной очистки
  const handleTouchCancel = (circleId: number, event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Немедленная очистка при отмене касания
    activeTouchesRef.current.delete(circleId);
    touchIdentifierRef.current.delete(circleId);
    touchStartTimeRef.current.delete(circleId);
    processedTouchesRef.current.delete(circleId);
  };

  // ИСПРАВЛЕНО: Улучшенная обработка mouse событий
  const handleClick = (circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) return;

    const touchTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();
    const lastClick = lastClickTimeRef.current.get(circleId) || 0;

    // ИСПРАВЛЕНО: Проверяем не только touch время, но и последний клик
    if (touchTime && currentTime - touchTime < 30) {
      return;
    }

    if (currentTime - lastClick < 30) {
      return;
    }

    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();
    
    lastClickTimeRef.current.set(circleId, currentTime);
    onCircleClick(circleId);
  };

  // ИСПРАВЛЕНО: Обновленные props для взаимодействия с защитой от множественных касаний
  const getInteractionProps = (circle: Circle) => {
    return {
      disabled: !isGameActive,
      style: {
        transitionDelay: showCircles ? `${circle.id * 12}ms` : "0ms",
        transition:
          isCircleEffectivelyActive(circle) && !circle.isAnimating
            ? "transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out"
            : "all 0.3s ease-out",
        touchAction: "manipulation" as const, // ИСПРАВЛЕНО: Оптимизировано для iOS
        userSelect: "none" as const,
        WebkitUserSelect: "none" as const,
        WebkitTouchCallout: "none" as const,
      } as React.CSSProperties,
      onTouchStart: (event: React.TouchEvent) =>
        handleTouchStart(circle.id, event),
      onTouchEnd: (event: React.TouchEvent) => handleTouchEnd(circle.id, event),
      onTouchCancel: (event: React.TouchEvent) => handleTouchCancel(circle.id, event), // НОВОЕ: Обработка отмены касания
      onClick: (event: React.MouseEvent) => handleClick(circle.id, event),
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    };
  };

  // Existing continuous pulse effect (unchanged)
  const renderPulseEffect = (circle: Circle) => {
    const isEffectivelyActive = isCircleEffectivelyActive(circle);
    const isEffectivelyRed = isCircleEffectivelyRed(circle);

    if (!isEffectivelyActive || circle.isAnimating) return null;

    const pulseColor = isEffectivelyRed ? "border-red-400" : "border-white";
    const animationDuration = isEffectivelyRed ? "1.2s" : "0.8s";

    return (
      <div
        className={`absolute inset-0 rounded-full border-2 ${pulseColor} opacity-50`}
        style={{
          animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite`,
        }}
      />
    );
  };

  // Fast activation pulse effect (single burst on activation)
  const renderActivationPulse = (circle: Circle) => {
    const activePulse = activePulses.find(
      (pulse) => pulse.circleId === circle.id,
    );

    if (!activePulse) return null;

    const pulseClass = activePulse.isRed
      ? "activation-pulse-red"
      : "activation-pulse";
    const pulseColor = activePulse.isRed ? "border-red-400" : "border-white";

    // Different z-index for different game modes
    const zIndex = gameMode === "survival" ? -1 : 10;

    return (
      <div
        className={`absolute inset-0 rounded-full border-2 ${pulseColor} ${pulseClass} pointer-events-none`}
        style={{
          zIndex: zIndex,
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
          touchAction: "none", // ИСПРАВЛЕНО: Критично для предотвращения прокрутки на iOS
          overscrollBehavior: "none", // ИСПРАВЛЕНО: Убираем резиновое прокручивание
          maxWidth,
          maxHeight,
        }}
      >
        {circles.map((circle) => {
          const circleStyleConfig = getCircleStyles(circle);
          const interactionProps = getInteractionProps(circle);

          return (
            <button
              key={circle.id}
              aria-label={`Game circle ${circle.id + 1}${
                isCircleEffectivelyActive(circle)
                  ? isCircleEffectivelyRed(circle)
                    ? " - trap target"
                    : " - active target"
                  : ""
              }`}
              className={`${circleStyleConfig.className} disabled:cursor-not-allowed select-none`}
              data-circle-id={circle.id}
              disabled={interactionProps.disabled}
              style={{
                ...circleStyleConfig.style,
                ...interactionProps.style,
              }}
              type="button"
              onClick={interactionProps.onClick}
              onContextMenu={interactionProps.onContextMenu}
              onTouchEnd={interactionProps.onTouchEnd}
              onTouchStart={interactionProps.onTouchStart}
            >
              {/* Continuous pulse effect */}
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