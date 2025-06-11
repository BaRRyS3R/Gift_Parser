// src/components/GameGrid.tsx

"use client";

import { Circle } from "../types/game";
import { getGridDimensions } from "../utils/gameUtils";

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

  const getCircleSize = () => {
    if (circles.length <= 4) return "w-24 h-24 sm:w-28 sm:h-28";
    if (circles.length <= 8) return "w-20 h-20 sm:w-24 sm:h-24";
    if (circles.length <= 12) return "w-16 h-16 sm:w-20 sm:h-20";
    if (circles.length <= 40) return "w-16 h-16 sm:w-20 sm:h-20";
    if (circles.length <= 60) return "w-12 h-12 sm:w-14 sm:h-14";
    return "w-10 h-10 sm:w-12 sm:h-12";
  };

  const getGapSize = () => {
    if (circles.length <= 4) return "gap-8";
    if (circles.length <= 8) return "gap-6";
    if (circles.length <= 12) return "gap-4";
    if (circles.length <= 40) return "gap-2";
    if (circles.length <= 60) return "gap-1";
    return "gap-1";
  };

  const getCircleStyles = (circle: Circle) => {
    const baseClasses = `${getCircleSize()} rounded-full border-2 transition-all duration-700 ease-out relative`;

    // State-based styling for visibility and animation
    const visibilityClasses = showCircles
      ? "opacity-100 transform scale-100"
      : "opacity-0 transform scale-0";

    const animationClasses = circle.isAnimating
      ? "opacity-0 scale-75 transition-all duration-300"
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

  const getInteractionProps = (circle: Circle) => {
    return {
      disabled: !isGameActive,
      style: {
        transitionDelay: showCircles ? `${circle.id * 50}ms` : "0ms",
        transition: circle.isActive && !circle.isAnimating
          ? "transform 0.3s ease-out, box-shadow 0.3s ease-out, border-color 0.3s ease-out"
          : "all 0.7s ease-out",
      },
      onClick: () => onCircleClick(circle.id)
    };
  };

  const renderPulseEffect = (circle: Circle) => {
    if (!circle.isActive || circle.isAnimating) return null;

    const pulseColor = circle.isDecoy ? "border-red-400" : "border-white";
    const animationDuration = circle.isDecoy ? "1.5s" : "1s";

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
        }}
      >
        {circles.map((circle) => (
          <button
            key={circle.id}
            className={`${getCircleStyles(circle)} disabled:cursor-not-allowed`}
            {...getInteractionProps(circle)}
          >
            {renderPulseEffect(circle)}
          </button>
        ))}
      </div>
    </div>
  );
}