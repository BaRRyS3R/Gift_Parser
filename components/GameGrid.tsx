// src/components/GameGrid.tsx - Optimized version with stable memoization

"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import React from "react";

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

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: GameGridProps, nextProps: GameGridProps) => {
  // Quick reference check for arrays
  if (prevProps.circles === nextProps.circles &&
    prevProps.onActivatedCircles === nextProps.onActivatedCircles &&
    prevProps.instantlyDeactivatedCircles === nextProps.instantlyDeactivatedCircles) {
    // Check primitive values
    return (
      prevProps.isGameActive === nextProps.isGameActive &&
      prevProps.showCircles === nextProps.showCircles &&
      prevProps.lastActivationTimestamp === nextProps.lastActivationTimestamp &&
      prevProps.gameMode === nextProps.gameMode &&
      prevProps.onCircleClick === nextProps.onCircleClick
    );
  }

  // Deep comparison for circles if references differ
  if (prevProps.circles.length !== nextProps.circles.length) {
    return false;
  }

  for (let i = 0; i < prevProps.circles.length; i++) {
    const prev = prevProps.circles[i];
    const next = nextProps.circles[i];

    if (prev.id !== next.id ||
      prev.isActive !== next.isActive ||
      prev.isAnimating !== next.isAnimating ||
      prev.isDecoy !== next.isDecoy) {
      return false;
    }
  }

  // Check other array props
  const prevActivated = prevProps.onActivatedCircles || [];
  const nextActivated = nextProps.onActivatedCircles || [];
  const prevDeactivated = prevProps.instantlyDeactivatedCircles || [];
  const nextDeactivated = nextProps.instantlyDeactivatedCircles || [];

  if (prevActivated.length !== nextActivated.length ||
    prevDeactivated.length !== nextDeactivated.length) {
    return false;
  }

  // Check primitive values
  return (
    prevProps.isGameActive === nextProps.isGameActive &&
    prevProps.showCircles === nextProps.showCircles &&
    prevProps.lastActivationTimestamp === nextProps.lastActivationTimestamp &&
    prevProps.gameMode === nextProps.gameMode &&
    prevProps.onCircleClick === nextProps.onCircleClick
  );
};

function GameGrid({
  circles,
  onCircleClick,
  isGameActive,
  showCircles,
  onActivatedCircles = [],
  lastActivationTimestamp = 0,
  gameMode = "reaction",
  instantlyDeactivatedCircles = [],
}: GameGridProps) {
  const { cols, rows } = useMemo(() => getGridDimensions(circles.length), [circles.length]);
  const touchStartTimeRef = useRef<Map<number, number>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());

  // State for dynamic sizing - memoized to prevent recalculation
  const [circleSize, setCircleSize] = useState(40);
  const [gapSize, setGapSize] = useState(4);

  // State for tracking active activation pulses
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

  // Memoized container dimensions calculation
  const containerDimensions = useMemo(() => {
    const containerWidth = circleSize * cols + gapSize * (cols - 1) + 32;
    const containerHeight = circleSize * rows + gapSize * (rows - 1) + 32;

    return {
      maxWidth: `min(95vw, ${containerWidth}px)`,
      maxHeight: `min(70vh, ${containerHeight}px)`,
    };
  }, [circleSize, cols, gapSize, rows]);

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
      const timeoutId = setTimeout(() => {
        setActivePulses((prev) =>
          prev.filter((pulse) => pulse.timestamp !== lastActivationTimestamp),
        );
      }, 450);

      return () => clearTimeout(timeoutId);
    }
  }, [onActivatedCircles, lastActivationTimestamp, circles]);

  // Calculate adaptive sizes based on screen dimensions
  useEffect(() => {
    const resizeTimeoutRef = useRef<NodeJS.Timeout>();

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

    const handleResize = () => {
      // Debounce resize to prevent excessive calculations
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(calculateAdaptiveSizes, 100);
    };

    window.addEventListener("resize", handleResize);

    // Handle orientation changes on mobile devices
    const handleOrientationChange = () => {
      setTimeout(calculateAdaptiveSizes, 100);
    };

    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [circles.length, cols, rows]);

  // Memoized circle styles function
  const getCircleStyles = useCallback((circle: Circle) => {
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
  }, [circleSize, showCircles, instantlyDeactivatedCircles]);

  // Optimized touch info extraction
  const getBasicTouchInfo = useCallback(
    (event: React.TouchEvent): TouchEventDetails => {
      const firstTouch = event.touches.length > 0 ? event.touches[0] : event.changedTouches[0];
      return {
        touchCount: event.touches.length,
        firstTouchX: firstTouch?.clientX || 0,
        firstTouchY: firstTouch?.clientY || 0,
        timestamp: Date.now()
      };
    }, []
  );

  // Stable touch event handlers
  const handleTouchStart = useCallback((circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) {
      return;
    }

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
  }, [isGameActive, onCircleClick]);

  const handleTouchEnd = useCallback((circleId: number, event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    touchStartTimeRef.current.delete(circleId);
  }, []);

  const handleClick = useCallback((circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) {
      return;
    }

    const touchTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();

    if (touchTime && currentTime - touchTime < 300) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onCircleClick(circleId);
  }, [isGameActive, onCircleClick]);

  // Memoized interaction props
  const getInteractionProps = useCallback((circle: Circle) => {
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
  }, [isGameActive, showCircles, handleTouchStart, handleTouchEnd, handleClick]);

  // Continuous pulse effect (optimized)
  const renderPulseEffect = useCallback((circle: Circle) => {
    // Don't render pulse for instantly deactivated circles
    if (instantlyDeactivatedCircles.includes(circle.id)) return null;
    if (!circle.isActive || circle.isAnimating) return null;

    const pulseColor = circle.isDecoy ? "border-red-400" : "border-white";
    const animationDuration = circle.isDecoy ? "1.2s" : "0.8s";

    return (
      <div
        key={`pulse-${circle.id}`}
        className={`absolute inset-0 rounded-full border-2 ${pulseColor} opacity-50`}
        style={{
          animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite`,
        }}
      />
    );
  }, [instantlyDeactivatedCircles]);

  // Fast activation pulse effect (optimized)
  const renderActivationPulse = useCallback((circle: Circle) => {
    // Don't render activation pulse for instantly deactivated circles
    if (instantlyDeactivatedCircles.includes(circle.id)) return null;

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
        key={`activation-pulse-${circle.id}-${activePulse.timestamp}`}
        className={`absolute inset-0 rounded-full border-2 ${pulseColor} ${pulseClass} pointer-events-none`}
        style={{
          zIndex: zIndex,
        }}
      />
    );
  }, [instantlyDeactivatedCircles, activePulses, gameMode]);

  // Memoized grid style
  const gridStyle = useMemo(() => ({
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gap: `${gapSize}px`,
    userSelect: "none" as const,
    WebkitUserSelect: "none" as const,
    WebkitTouchCallout: "none" as const,
    touchAction: "none" as const,
    overscrollBehavior: "none" as const,
    ...containerDimensions,
  }), [cols, rows, gapSize, containerDimensions]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <div
        className="grid justify-items-center items-center no-drag"
        style={gridStyle}
      >
        {circles.map((circle) => {
          const circleStyleConfig = getCircleStyles(circle);
          const interactionProps = getInteractionProps(circle);

          return (
            <button
              key={circle.id}
              aria-label={`Game circle ${circle.id + 1}${circle.isActive ? (circle.isDecoy ? " - trap target" : " - active target") : ""}`}
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

// Export memoized component with custom comparison
export default React.memo(GameGrid, arePropsEqual);