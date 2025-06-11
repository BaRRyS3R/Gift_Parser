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

  // Определяем размер кружков в зависимости от количества
  const getCircleSize = () => {
    if (circles.length <= 4) return "w-24 h-24 sm:w-28 sm:h-28";
    if (circles.length <= 8) return "w-20 h-20 sm:w-24 sm:h-24";
    if (circles.length <= 12) return "w-16 h-16 sm:w-20 sm:h-20";
    if (circles.length <= 40) return "w-16 h-16 sm:w-20 sm:h-20";

    return "w-14 h-14 sm:w-16 sm:h-16";
  };

  const getGapSize = () => {
    if (circles.length <= 4) return "gap-8";
    if (circles.length <= 8) return "gap-6";
    if (circles.length <= 12) return "gap-4";
    if (circles.length <= 40) return "gap-2";

    return "gap-3";
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
        {circles.map((circle, index) => (
          <button
            key={circle.id}
            className={`
                            ${getCircleSize()} 
                            rounded-full border-2 border-white/60
                            transition-all duration-700 ease-out relative
                            ${
                              showCircles
                                ? "opacity-100 transform scale-100"
                                : "opacity-0 transform scale-0"
                            }
                            ${
                              circle.isActive && !circle.isAnimating
                                ? "bg-white shadow-lg shadow-white/50 border-white scale-110"
                                : "bg-transparent hover:border-white hover:scale-105"
                            }
                            ${
                              circle.isAnimating
                                ? "opacity-0 scale-75 transition-all duration-300"
                                : ""
                            }
                            active:scale-95 hover:shadow-md hover:shadow-white/30
                            disabled:cursor-not-allowed
                        `}
            disabled={!isGameActive}
            style={{
              transitionDelay: showCircles ? `${index * 50}ms` : "0ms",
              transition:
                circle.isActive && !circle.isAnimating
                  ? "transform 0.3s ease-out, box-shadow 0.3s ease-out, border-color 0.3s ease-out"
                  : "all 0.7s ease-out",
            }}
            onClick={() => onCircleClick(circle.id)}
          >
            {/* Эффект пульсации для активных кружков */}
            {circle.isActive && !circle.isAnimating && (
              <div
                className="absolute inset-0 rounded-full border-2 border-white opacity-50"
                style={{
                  animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
