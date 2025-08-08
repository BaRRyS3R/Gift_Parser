// src/components/GameGrid.tsx - Исправление контейнера и восстановление pulse-эффектов

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

// Interface for tracking click states to prevent race condition
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
  
  // Track click states to prevent race condition
  const clickStateRef = useRef<Map<number, ClickState>>(new Map());

  // References for selective scroll prevention
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // State for dynamic sizing
  const [circleSize, setCircleSize] = useState(40);
  const [gapSize, setGapSize] = useState(4);

  // State for tracking active activation pulses
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

  // Selective scroll prevention - only block scroll, preserve touch interactions
  useEffect(() => {
    const preventScrollOnly = (e: TouchEvent) => {
      // Only prevent if this is a scroll gesture (movement with multiple touches or single finger drag)
      if (e.touches.length > 1 || (e.touches.length === 1 && e.type === 'touchmove')) {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Only prevent if not touching a game circle
        if (!target?.closest('[data-circle-id]')) {
          e.preventDefault();
        }
      }
    };

    const preventWheelScroll = (e: WheelEvent) => {
      e.preventDefault();
    };

    // Apply to main container with selective prevention
    const mainContainer = mainContainerRef.current;
    const gridContainer = gridContainerRef.current;

    if (mainContainer) {
      mainContainer.addEventListener('touchmove', preventScrollOnly, { passive: false });
      mainContainer.addEventListener('wheel', preventWheelScroll, { passive: false });
    }

    if (gridContainer) {
      gridContainer.addEventListener('touchmove', preventScrollOnly, { passive: false });
      gridContainer.addEventListener('wheel', preventWheelScroll, { passive: false });
    }

    return () => {
      if (mainContainer) {
        mainContainer.removeEventListener('touchmove', preventScrollOnly);
        mainContainer.removeEventListener('wheel', preventWheelScroll);
      }

      if (gridContainer) {
        gridContainer.removeEventListener('touchmove', preventScrollOnly);
        gridContainer.removeEventListener('wheel', preventWheelScroll);
      }
    };
  }, [isGameActive]);

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

  // Enhanced adaptive size calculation with proper container sizing
  useEffect(() => {
    const calculateAdaptiveSizes = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Calculate available space with more conservative margins for mobile
      const horizontalMargin = screenWidth < 480 ? 40 : 60; // Increased margins
      const verticalMargin = screenHeight < 800 ? 120 : 160; // Account for UI elements
      
      const availableWidth = screenWidth - horizontalMargin;
      const availableHeight = screenHeight - verticalMargin;

      // Calculate circle size with proper spacing
      const effectiveGap = Math.max(4, Math.min(12, screenWidth / 100)); // Responsive gap
      
      const maxCircleWidthByColumns = (availableWidth - (cols - 1) * effectiveGap) / cols;
      const maxCircleHeightByRows = (availableHeight - (rows - 1) * effectiveGap) / rows;

      // Use smaller dimension to ensure everything fits
      const baseSize = Math.min(maxCircleWidthByColumns, maxCircleHeightByRows);

      // Apply size constraints based on circle count and screen size
      let finalSize: number;
      let finalGap: number;

      if (circles.length <= 9) {
        // Reaction mode - larger circles
        finalSize = Math.max(80, Math.min(baseSize, 140));
        finalGap = Math.max(8, effectiveGap);
      } else if (circles.length <= 25) {
        // Medium grids
        finalSize = Math.max(50, Math.min(baseSize, 90));
        finalGap = Math.max(6, effectiveGap);
      } else if (circles.length <= 36) {
        // Survival mode grid
        finalSize = Math.max(38, Math.min(baseSize, 70));
        finalGap = Math.max(4, effectiveGap);
      } else {
        // Largest grids
        finalSize = Math.max(32, Math.min(baseSize, 55));
        finalGap = Math.max(3, effectiveGap);
      }

      // Additional adjustments for very small screens
      if (screenWidth < 380) {
        finalSize = finalSize * 0.9;
        finalGap = Math.max(2, finalGap - 1);
      }

      setCircleSize(Math.floor(finalSize));
      setGapSize(Math.floor(finalGap));
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

  // Enhanced touch event handlers with race condition protection
  const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) return;

    // Allow touch start event to proceed normally for tap detection
    const currentTime = Date.now();
    const circle = circles.find((c) => c.id === circleId);

    touchStartTimeRef.current.set(circleId, currentTime);

    // Record click state at touch start for race condition protection
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
    touchStartTimeRef.current.delete(circleId);
  };

  const handleClick = (circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) return;

    const touchTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();

    if (touchTime && currentTime - touchTime < 300) {
      return;
    }

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
        // Allow tap interactions but prevent pan/zoom/scroll
        touchAction: "manipulation" as const,
        userSelect: "none" as const,
        WebkitUserSelect: "none" as const,
        WebkitTouchCallout: "none" as const,
        MozUserSelect: "none" as const,
        msUserSelect: "none" as const,
        // Layout containment for stability
        contain: "layout style paint" as const,
        willChange: "transform, opacity" as const,
      } as React.CSSProperties,
      onTouchStart: (event: React.TouchEvent) =>
        handleTouchStart(circle.id, event),
      onTouchEnd: (event: React.TouchEvent) => handleTouchEnd(circle.id, event),
      onClick: (event: React.MouseEvent) => handleClick(circle.id, event),
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
      // Prevent drag but allow touch
      onDragStart: (event: React.DragEvent) => event.preventDefault(),
    };
  };

  // RESTORED: Continuous pulse effect for active circles
  const renderPulseEffect = (circle: Circle) => {
    if (!circle.isActive || circle.isAnimating) return null;

    const pulseColor = circle.isDecoy ? "border-red-400" : "border-white";
    const animationDuration = circle.isDecoy ? "1.2s" : "0.8s";

    return (
      <div
        className={`absolute inset-0 rounded-full border-2 ${pulseColor} opacity-50 pointer-events-none`}
        style={{
          animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite`,
        }}
      />
    );
  };

  // RESTORED: Fast activation pulse effect (single burst on activation)
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

  // ENHANCED: Container dimensions calculation with proper padding
  const getContainerDimensions = () => {
    // Calculate actual grid dimensions
    const gridWidth = circleSize * cols + gapSize * (cols - 1);
    const gridHeight = circleSize * rows + gapSize * (rows - 1);
    
    // Add generous padding to prevent clipping
    const horizontalPadding = Math.max(40, circleSize * 0.3); // At least 40px or 30% of circle size
    const verticalPadding = Math.max(40, circleSize * 0.3);
    
    const containerWidth = gridWidth + (horizontalPadding * 2);
    const containerHeight = gridHeight + (verticalPadding * 2);

    return {
      width: `${containerWidth}px`,
      height: `${containerHeight}px`,
      padding: `${verticalPadding}px ${horizontalPadding}px`,
    };
  };

  const containerDimensions = getContainerDimensions();

  return (
    <div 
      ref={mainContainerRef}
      className="flex items-center justify-center min-h-screen w-full"
      style={{
        // Selective scroll prevention - maintain touch functionality
        touchAction: "manipulation",
        overscrollBehavior: "none",
        overflow: "hidden",
        position: "relative",
        // Layout containment for stability
        contain: "layout style paint",
        willChange: "auto",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: containerDimensions.width,
          height: containerDimensions.height,
          padding: containerDimensions.padding,
          // Ensure container doesn't exceed viewport
          maxWidth: "100vw",
          maxHeight: "100vh",
        }}
      >
        <div
          ref={gridContainerRef}
          className="grid justify-items-center items-center"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: `${gapSize}px`,
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            // Enhanced positioning and containment
            position: "relative",
            touchAction: "manipulation", // Allow taps but prevent pan/zoom
            overscrollBehavior: "none",
            overflow: "visible", // IMPORTANT: Allow overflow for effects
            // Layout stability
            contain: "layout style paint",
            isolation: "isolate",
            // GPU acceleration for smoother performance
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
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
                onDragStart={getInteractionProps(circle).onDragStart}
              >
                {/* RESTORED: Continuous pulse effect */}
                {renderPulseEffect(circle)}
                {/* RESTORED: Fast activation pulse effect */}
                {renderActivationPulse(circle)}
                {/* Debug info for development */}
                {circle.isActive && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs font-mono text-white/60">
                    {circle.id}
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