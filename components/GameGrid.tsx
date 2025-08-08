// src/components/GameGrid.tsx - Исправлено с защитой от сдвига и race condition

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
}

interface ActivePulse {
  circleId: number;
  isRed: boolean;
  timestamp: number;
}

// NEW: Interface for tracking click states to prevent race condition
interface ClickState {
  circleId: number;
  clickTime: number;
  wasActiveAtClick: boolean;
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
}: GameGridProps) {
  const { cols, rows } = getGridDimensions(circles.length);
  const touchStartTimeRef = useRef<Map<number, number>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());

  // NEW: Track click states to prevent race condition
  const clickStateRef = useRef<Map<number, ClickState>>(new Map());

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

    // Interactive state styling based on circle type and activity
    if (circle.isActive && !circle.isAnimating) {
      if (circle.isDecoy) {
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

  // NEW: Enhanced touch event handlers with race condition protection
  const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) return;

    // Prevent all default behaviors and bubbling
    event.preventDefault();
    event.stopPropagation();

    const currentTime = Date.now();
    const circle = circles.find((c) => c.id === circleId);

    touchStartTimeRef.current.set(circleId, currentTime);

    // NEW: Record click state at touch start for race condition protection
    if (circle) {
      clickStateRef.current.set(circleId, {
        circleId,
        clickTime: currentTime,
        wasActiveAtClick: circle.isActive && !circle.isAnimating,
      });
    }

    if (!processedTouchesRef.current.has(circleId)) {
      processedTouchesRef.current.add(circleId);
      onCircleClick(circleId);

      setTimeout(() => {
        processedTouchesRef.current.delete(circleId);
        clickStateRef.current.delete(circleId);
      }, 200);
    }
  };

  const handleTouchEnd = (circleId: number, event: React.TouchEvent) => {
    // Prevent all default behaviors and bubbling
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

    // Prevent all default behaviors and bubbling
    event.preventDefault();
    event.stopPropagation();

    onCircleClick(circleId);
  };

  // NEW: Enhanced touch move handler to prevent accidental scrolling
  const handleTouchMove = (event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
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
        touchAction: "none" as const, // Prevent all touch gestures
        userSelect: "none" as const, // Prevent text selection
        WebkitUserSelect: "none" as const, // Prevent text selection on WebKit
        WebkitTouchCallout: "none" as const, // Prevent callout on iOS
        MozUserSelect: "none" as const, // Prevent text selection on Firefox
        msUserSelect: "none" as const, // Prevent text selection on IE/Edge
      } as React.CSSProperties,
      onTouchStart: (event: React.TouchEvent) =>
        handleTouchStart(circle.id, event),
      onTouchEnd: (event: React.TouchEvent) => handleTouchEnd(circle.id, event),
      onTouchMove: handleTouchMove, // Prevent scroll on touch move
      onClick: (event: React.MouseEvent) => handleClick(circle.id, event),
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
      // Additional event handlers to prevent unwanted interactions
      onDragStart: (event: React.DragEvent) => event.preventDefault(),
    };
  };

  // Existing continuous pulse effect (unchanged)
  const renderPulseEffect = (circle: Circle) => {
    if (!circle.isActive || circle.isAnimating) return null;

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
    // In survival mode, pulse goes behind circles; in reaction mode, it goes above
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
    <div
      className="flex items-center justify-center min-h-[400px] p-4"
      // NEW: Container-level scroll prevention
      style={{
        touchAction: "none",
        overscrollBehavior: "none",
        WebkitOverflowScrolling: "touch",
      }}
      onTouchMove={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
    >
      <div
        className="grid justify-items-center items-center"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: `${gapSize}px`,
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          maxWidth,
          maxHeight,
          // NEW: Fixed positioning to prevent movement
          position: "relative",
          touchAction: "none",
          overscrollBehavior: "none",
        }}
        // NEW: Grid-level scroll prevention
        onTouchMove={(e) => e.preventDefault()}
        onTouchStart={(e) => e.preventDefault()}
        onScroll={(e) => e.preventDefault()}
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
              } as React.CSSProperties}
              type="button"
              onClick={getInteractionProps(circle).onClick}
              onContextMenu={getInteractionProps(circle).onContextMenu}
              onTouchEnd={getInteractionProps(circle).onTouchEnd}
              onTouchStart={getInteractionProps(circle).onTouchStart}
              onTouchMove={getInteractionProps(circle).onTouchMove}
              onDragStart={getInteractionProps(circle).onDragStart}
            >
              {/* Existing continuous pulse effect */}
              {renderPulseEffect(circle)}
              {/* Fast activation pulse effect */}
              {renderActivationPulse(circle)}
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