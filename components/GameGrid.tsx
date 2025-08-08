// src/components/GameGrid.tsx - Упрощенная версия без анимаций активации

"use client";

import { useRef, useState, useEffect } from "react";

import { Circle } from "@/types/game-modes/common";

interface GameGridProps {
  circles: Circle[];
  onCircleClick: (circleId: number) => void;
  isGameActive: boolean;
  showCircles: boolean;
  gameMode?: "reaction" | "survival" | "physics";
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
  gameMode = "reaction",
}: GameGridProps) {
  const { cols, rows } = getGridDimensions(circles.length);
  const touchStartTimeRef = useRef<Map<number, number>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());

  // State for dynamic sizing
  const [circleSize, setCircleSize] = useState(40);
  const [gapSize, setGapSize] = useState(4);

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

  const getCircleStyles = (circle: Circle) => {
    const baseStyles = {
      width: `${circleSize}px`,
      height: `${circleSize}px`,
      minWidth: `${circleSize}px`,
      minHeight: `${circleSize}px`,
    };

    const baseClasses =
      "rounded-full border-2 transition-all duration-200 ease-out relative";

    // State-based styling for visibility
    const visibilityClasses = showCircles
      ? "opacity-100 transform scale-100"
      : "opacity-0 transform scale-0";

    // Interactive state styling based on circle type and activity
    if (circle.isActive) {
      if (circle.isDecoy) {
        // Decoy circles: red coloring with danger indicators
        return {
          className: `${baseClasses} ${visibilityClasses} 
                      bg-red-500 border-red-400 shadow-lg shadow-red-500/50 scale-110
                      hover:scale-115 active:scale-95`,
          style: baseStyles,
        };
      } else {
        // Regular active circles: white coloring with positive indicators
        return {
          className: `${baseClasses} ${visibilityClasses}
                      bg-white shadow-lg shadow-white/50 border-white scale-110
                      hover:scale-115 active:scale-95`,
          style: baseStyles,
        };
      }
    } else {
      // Inactive circles: standard border styling with hover effects
      return {
        className: `${baseClasses} ${visibilityClasses}
                    bg-transparent border-white/60 hover:border-white hover:scale-105
                    active:scale-95 hover:shadow-md hover:shadow-white/30`,
        style: baseStyles,
      };
    }
  };

  // Touch event handlers for mobile compatibility
  const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) return;

    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();

    const currentTime = Date.now();
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
    touchStartTimeRef.current.delete(circleId);
  };

  const handleClick = (circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) return;

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
        touchAction: "manipulation",
      },
      onTouchStart: (event: React.TouchEvent) =>
        handleTouchStart(circle.id, event),
      onTouchEnd: (event: React.TouchEvent) => handleTouchEnd(circle.id, event),
      onClick: (event: React.MouseEvent) => handleClick(circle.id, event),
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    };
  };

  // Simple pulse effect for active circles only
  const renderPulseEffect = (circle: Circle) => {
    if (!circle.isActive) return null;

    const pulseColor = circle.isDecoy ? "border-red-400" : "border-white";
    const animationDuration = circle.isDecoy ? "1.2s" : "0.8s";

    return (
      <div
        className={`absolute inset-0 rounded-full border-2 ${pulseColor} opacity-50`}
        style={{
          animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite`,
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
              {/* Simple pulse effect for active circles */}
              {renderPulseEffect(circle)}

              {/* Debug info for development */}
              {process.env.NODE_ENV === "development" && circle.isActive && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs font-mono text-white/60">
                  {circle.id}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}