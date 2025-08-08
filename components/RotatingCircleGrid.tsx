// src/components/RotatingCircleGrid.tsx - Исправлено для устранения race conditions на iOS

"use client";

import { useRef, useState, useEffect, useCallback } from "react";

import { RotationCircle } from "@/types/game-modes/rotation";

interface RotatingCircleGridProps {
  circles: RotationCircle[];
  onCircleClick: (circleId: number) => void;
  isGameActive: boolean;
  showCircles: boolean;
  rotationSpeed: number;
  radius: number;
  onActivatedCircles?: number[];
  lastActivationTimestamp?: number;
  // НОВОЕ: Props для pending активаций
  pendingActivations?: Set<number>; // Круги, которые ожидают активации
  pendingRedCircles?: Set<number>; // Круги, которые ожидают активации как красные
}

export default function RotatingCircleGrid({
  circles,
  onCircleClick,
  isGameActive,
  showCircles,
  rotationSpeed,
  pendingActivations = new Set(),
  pendingRedCircles = new Set(),
}: RotatingCircleGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotatingContainerRef = useRef<HTMLDivElement>(null);

  // ИСПРАВЛЕНО: Улучшенное управление touch событиями для iOS
  const touchStartTimeRef = useRef<Map<number, number>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());
  const lastClickTimeRef = useRef<Map<number, number>>(new Map());

  // Animation state management
  const currentRotationRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);
  const currentSpeedRef = useRef<number>(rotationSpeed);
  const targetSpeedRef = useRef<number>(rotationSpeed);

  // State for dynamic sizing - optimized without pulse effects
  const [circleSize, setCircleSize] = useState(40);
  const [containerSize, setContainerSize] = useState(350);
  const [effectiveRadius, setEffectiveRadius] = useState(120);

  // Calculate adaptive sizes without accounting for pulse effects
  useEffect(() => {
    const calculateAdaptiveSizes = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Reserve space for bottom panel
      const bottomPanelHeight = 140;
      // Reserve space for top safe area and margins
      const topReservedSpace = 60;
      // Minimal horizontal margins
      const horizontalMargins = 20;

      const availableWidth = screenWidth - horizontalMargins;
      const availableHeight =
        screenHeight - bottomPanelHeight - topReservedSpace;

      // Use the minimum of available dimensions to ensure square container
      const maxContainerSize = Math.min(availableWidth, availableHeight);

      // Set bounds for usability - can use more space now without pulse overflow concerns
      const calculatedContainerSize = Math.max(
        280,
        Math.min(maxContainerSize, 500),
      );

      // Scale circle size proportionally to container
      const calculatedCircleSize = Math.max(
        32,
        Math.min(calculatedContainerSize / 9, 50),
      );

      // Can use larger radius now without pulse overflow concerns
      const calculatedEffectiveRadius = calculatedContainerSize * 0.4;

      setContainerSize(calculatedContainerSize);
      setCircleSize(calculatedCircleSize);
      setEffectiveRadius(calculatedEffectiveRadius);
    };

    calculateAdaptiveSizes();
    window.addEventListener("resize", calculateAdaptiveSizes);
    window.addEventListener("orientationchange", () => {
      setTimeout(calculateAdaptiveSizes, 100);
    });

    return () => {
      window.removeEventListener("resize", calculateAdaptiveSizes);
      window.removeEventListener("orientationchange", calculateAdaptiveSizes);
    };
  }, []);

  // Smooth rotation animation
  const updateRotation = useCallback(() => {
    if (!isGameActive || !rotatingContainerRef.current) {
      return;
    }

    const now = Date.now();
    const deltaTime = now - lastUpdateTimeRef.current;

    lastUpdateTimeRef.current = now;

    // Smooth speed interpolation for level transitions
    const speedDifference = targetSpeedRef.current - currentSpeedRef.current;
    const interpolationFactor = Math.min(deltaTime * 0.002, 1);

    currentSpeedRef.current += speedDifference * interpolationFactor;

    // Convert rotation speed from radians-per-frame to radians-per-millisecond
    const speedInRadPerMs = currentSpeedRef.current / 16.67;

    // Update rotation based on current speed and delta time
    const rotationIncrement = speedInRadPerMs * deltaTime;

    currentRotationRef.current += rotationIncrement;

    // Apply rotation to container
    rotatingContainerRef.current.style.transform = `rotate(${currentRotationRef.current}rad)`;

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(updateRotation);
  }, [isGameActive]);

  // Handle speed changes
  useEffect(() => {
    targetSpeedRef.current = rotationSpeed;
  }, [rotationSpeed]);

  // Start/stop animation
  useEffect(() => {
    if (isGameActive) {
      lastUpdateTimeRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(updateRotation);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
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

  // ИСПРАВЛЕНО: Улучшенная функция определения активности круга
  const isCircleEffectivelyActive = (circle: RotationCircle): boolean => {
    return circle.isActive || pendingActivations.has(circle.id);
  };

  // ИСПРАВЛЕНО: Улучшенная функция определения цвета круга
  const isCircleEffectivelyRed = (circle: RotationCircle): boolean => {
    return circle.isDecoy || pendingRedCircles.has(circle.id);
  };

  // ИСПРАВЛЕНО: Circle styles with improved pending state detection
  const getCircleStyles = (circle: RotationCircle) => {
    const isDeactivating = circle.isAnimating;

    // Instant transitions for immediate feedback
    const transitionClass = isDeactivating
      ? "transition-all duration-75 ease-out"
      : "transition-all duration-100 ease-in-out";

    const baseClasses = `absolute rounded-full border-3 ${transitionClass}`;

    const visibilityClasses = showCircles
      ? "opacity-100 scale-100"
      : "opacity-0 scale-0";

    const animationClasses = circle.isAnimating ? "opacity-0 scale-50" : "";

    // ИСПРАВЛЕНО: Используем эффективные проверки активности
    const isEffectivelyActive = isCircleEffectivelyActive(circle);
    const isEffectivelyRed = isCircleEffectivelyRed(circle);

    if (isEffectivelyActive && !circle.isAnimating) {
      if (isEffectivelyRed) {
        return {
          className: `${baseClasses} ${visibilityClasses} ${animationClasses} 
                      bg-red-500 border-red-400 scale-110
                      hover:scale-115 active:scale-95 cursor-pointer`,
        };
      } else {
        return {
          className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                      bg-white border-white scale-110
                      hover:scale-115 active:scale-95 cursor-pointer`,
        };
      }
    } else {
      return {
        className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                    bg-transparent border-white/30 hover:border-white/50 hover:scale-105
                    active:scale-95 cursor-pointer`,
      };
    }
  };

  // ИСПРАВЛЕНО: Оптимизированная обработка touch событий для iOS
  const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) return;

    event.preventDefault();
    event.stopPropagation();

    const currentTime = Date.now();
    const lastClick = lastClickTimeRef.current.get(circleId) || 0;

    // ИСПРАВЛЕНО: Увеличенный интервал дебаунсинга для iOS (было 10ms)
    if (currentTime - lastClick < 150) {
      return;
    }

    touchStartTimeRef.current.set(circleId, currentTime);

    if (!processedTouchesRef.current.has(circleId)) {
      processedTouchesRef.current.add(circleId);
      lastClickTimeRef.current.set(circleId, currentTime);

      // ИСПРАВЛЕНО: Немедленный вызов без дополнительных задержек
      onCircleClick(circleId);

      // ИСПРАВЛЕНО: Увеличенный таймаут для iOS (было 10ms)
      setTimeout(() => {
        processedTouchesRef.current.delete(circleId);
      }, 200);
    }
  };

  const handleTouchEnd = (circleId: number, event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    touchStartTimeRef.current.delete(circleId);
  };

  // ИСПРАВЛЕНО: Улучшенная обработка mouse событий
  const handleClick = (circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) return;

    const touchTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();
    const lastClick = lastClickTimeRef.current.get(circleId) || 0;

    // ИСПРАВЛЕНО: Уменьшенная задержка для touch/click конфликтов (было 200ms)
    if (touchTime && currentTime - touchTime < 150) {
      return;
    }

    if (currentTime - lastClick < 150) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    lastClickTimeRef.current.set(circleId, currentTime);
    onCircleClick(circleId);
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-2">
      <div
        ref={containerRef}
        className="relative stable-container"
        style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          touchAction: "none", // ИСПРАВЛЕНО: Критично для iOS
          overscrollBehavior: "none", // ИСПРАВЛЕНО: Убираем резиновое прокручивание
        }}
      >
        {/* Rotating container */}
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
          {/* Circles with instant state changes */}
          {circles.map((circle) => {
            const circleStyleConfig = getCircleStyles(circle);
            const staticPosition = getCircleStaticPosition(circle);

            return (
              <button
                key={circle.id}
                aria-label={`Rotating circle ${circle.id + 1}${isCircleEffectivelyActive(circle)
                    ? isCircleEffectivelyRed(circle)
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
                  transitionDelay: showCircles ? `${circle.id * 25}ms` : "0ms",
                  touchAction: "manipulation", // ИСПРАВЛЕНО: Оптимизировано для iOS
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                }}
                type="button"
                onClick={(event) => handleClick(circle.id, event)}
                onContextMenu={(event) => event.preventDefault()}
                onTouchEnd={(event) => handleTouchEnd(circle.id, event)}
                onTouchStart={(event) => handleTouchStart(circle.id, event)}
              >
                {/* Debug info for development */}
                {process.env.NODE_ENV === "development" &&
                  (isCircleEffectivelyActive(circle) || circle.isActive) && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs font-mono text-white/60">
                      {circle.id}
                      {pendingActivations.has(circle.id) ? "*" : ""}
                    </div>
                  )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}