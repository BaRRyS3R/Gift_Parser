// src/components/GameGrid.tsx - Complete Code with Fast Animations & 40 Circles Support

"use client";

import { Circle } from "../types/game";
import { getGridDimensions } from "../utils/gameUtils";
import { useRef } from "react";

interface GameGridProps {
  circles: Circle[];
  onCircleClick: (circleId: number) => void;
  isGameActive: boolean;
  showCircles: boolean;
}

export default function GameGrid({
  circles,
  onCircleClick,
  isGameActive,
  showCircles,
}: GameGridProps) {
  const { cols, rows } = getGridDimensions(circles.length);
  const touchStartTimeRef = useRef<Map<number, number>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());

  const getCircleSize = () => {
    if (circles.length <= 4) return "w-24 h-24 sm:w-28 sm:h-28";
    if (circles.length <= 8) return "w-20 h-20 sm:w-24 sm:h-24";
    if (circles.length <= 12) return "w-16 h-16 sm:w-20 sm:h-20";
    if (circles.length <= 25) return "w-16 h-16 sm:w-20 sm:h-20";
    if (circles.length <= 40) return "w-10 h-10 sm:w-12 sm:h-12"; // Новый размер для 40 кругов
    if (circles.length <= 60) return "w-12 h-12 sm:w-14 sm:h-14";
    return "w-10 h-10 sm:w-12 sm:h-12";
  };

  const getGapSize = () => {
    if (circles.length <= 4) return "gap-8";
    if (circles.length <= 8) return "gap-6";
    if (circles.length <= 12) return "gap-4";
    if (circles.length <= 25) return "gap-2";
    if (circles.length <= 40) return "gap-1"; // Минимальный отступ для 40 кругов
    if (circles.length <= 60) return "gap-1";
    return "gap-1";
  };

  const getCircleStyles = (circle: Circle) => {
    const baseClasses = `${getCircleSize()} rounded-full border-2 transition-all duration-300 ease-out relative`; // Ускорена анимация с 700ms до 300ms

    // State-based styling for visibility and animation
    const visibilityClasses = showCircles
      ? "opacity-100 transform scale-100"
      : "opacity-0 transform scale-0";

    const animationClasses = circle.isAnimating
      ? "opacity-0 scale-75 transition-all duration-200" // Ускорена анимация исчезновения
      : "";

    // Interactive state styling based on circle type and activity
    if (circle.isActive && !circle.isAnimating) {
      if (circle.isDecoy) {
        // Decoy circles: red coloring with danger indicators
        return `${baseClasses} ${visibilityClasses} ${animationClasses} 
                bg-red-500 border-red-400 shadow-lg shadow-red-500/50 scale-110
                hover:scale-115 active:scale-95`;
      } else {
        // Regular active circles: white coloring with positive indicators
        return `${baseClasses} ${visibilityClasses} ${animationClasses}
                bg-white shadow-lg shadow-white/50 border-white scale-110
                hover:scale-115 active:scale-95`;
      }
    } else {
      // Inactive circles: standard border styling with hover effects
      return `${baseClasses} ${visibilityClasses} ${animationClasses}
              bg-transparent border-white/60 hover:border-white hover:scale-105
              active:scale-95 hover:shadow-md hover:shadow-white/30`;
    }
  };

  // Обработка touch событий для мультитача
  const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) return;

    event.preventDefault();
    event.stopPropagation();

    const currentTime = Date.now();
    touchStartTimeRef.current.set(circleId, currentTime);

    // Немедленно обрабатываем касание
    if (!processedTouchesRef.current.has(circleId)) {
      processedTouchesRef.current.add(circleId);
      onCircleClick(circleId);

      // Очищаем обработанное касание через небольшой таймаут
      setTimeout(() => {
        processedTouchesRef.current.delete(circleId);
      }, 100);
    }
  };

  const handleTouchEnd = (circleId: number, event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    touchStartTimeRef.current.delete(circleId);
  };

  // Обработка клика для десктопа (с защитой от дублирования с touch)
  const handleClick = (circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) return;

    // Проверяем, не было ли недавно touch события для этого элемента
    const touchTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();

    if (touchTime && currentTime - touchTime < 300) {
      // Если было touch событие в последние 300ms, игнорируем клик
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onCircleClick(circleId);
  };

  const getInteractionProps = (circle: Circle) => {
    return {
      disabled: !isGameActive,
      style: {
        // ИСПРАВЛЕНИЕ: Ускоренная анимация появления кругов
        transitionDelay: showCircles ? `${circle.id * 15}ms` : "0ms", // Уменьшено с 50ms до 15ms
        transition: circle.isActive && !circle.isAnimating
          ? "transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out" // Ускорено с 0.3s до 0.2s
          : "all 0.3s ease-out", // Ускорено с 0.7s до 0.3s
        touchAction: 'manipulation',
      },
      // Touch события для мобильных устройств
      onTouchStart: (event: React.TouchEvent) => handleTouchStart(circle.id, event),
      onTouchEnd: (event: React.TouchEvent) => handleTouchEnd(circle.id, event),
      // Click события для десктопа с защитой от дублирования
      onClick: (event: React.MouseEvent) => handleClick(circle.id, event),
      // Предотвращаем контекстное меню на длительном нажатии
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    };
  };

  const renderPulseEffect = (circle: Circle) => {
    if (!circle.isActive || circle.isAnimating) return null;

    const pulseColor = circle.isDecoy ? "border-red-400" : "border-white";
    const animationDuration = circle.isDecoy ? "1.2s" : "0.8s"; // Ускорена анимация пульсации

    return (
      <div
        className={`absolute inset-0 rounded-full border-2 ${pulseColor} opacity-50`}
        style={{
          animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite`,
        }}
      />
    );
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <div
        className={`grid justify-items-center items-center ${getGapSize()}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          // Предотвращаем выделение текста при множественных касаниях
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          // Максимальные размеры для разных сеток
          maxWidth: circles.length === 40 ? '95vw' : '80vw', // Увеличена ширина для 40 кругов
          maxHeight: circles.length === 40 ? '50vh' : '70vh', // Уменьшена высота для лучшего fit
        }}
      >
        {circles.map((circle) => (
          <button
            key={circle.id}
            className={`${getCircleStyles(circle)} disabled:cursor-not-allowed select-none`}
            {...getInteractionProps(circle)}
          >
            {renderPulseEffect(circle)}
            {/* Debug info для precision mode (можно убрать в продакшене) */}
            {process.env.NODE_ENV === 'development' && circle.isActive && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs font-mono text-white/60">
                {circle.id}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}