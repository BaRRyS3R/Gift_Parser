// src/components/GameGrid.tsx - Enhanced with comprehensive interaction logging

"use client";

import { useRef, useState, useEffect } from "react";

import { Circle } from "@/types/game-modes/common";
import { GameLogger, GameLogType } from "@/utils/gameLogger";

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
  // NEW: Props for logging support
  logger?: GameLogger; // Optional logger instance for debugging
  gameStartTime?: number; // Game start time for relative timing calculations
}

interface ActivePulse {
  circleId: number;
  isRed: boolean;
  timestamp: number;
}

interface TouchEvent {
  touchId: number;
  circleId: number;
  startTime: number;
  startCoordinates: { x: number; y: number };
  processed: boolean;
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
  logger,
  gameStartTime = Date.now(),
}: GameGridProps) {
  const { cols, rows } = getGridDimensions(circles.length);
  const touchStartTimeRef = useRef<Map<number, number>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());
  const activeTouchEventsRef = useRef<Map<number, TouchEvent>>(new Map());

  // State for dynamic sizing
  const [circleSize, setCircleSize] = useState(40);
  const [gapSize, setGapSize] = useState(4);

  // State for tracking active activation pulses
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

  // NEW: Helper function to log grid events
  const logGridEvent = (type: GameLogType, data: any) => {
    if (logger) {
      logger.addEntry(type, {
        ...data,
        component: "GameGrid",
        gameMode,
        isGameActive,
        activeCircleCount: circles.filter(c => c.isActive).length,
      });
    }
  };

  // NEW: Get circle coordinates for logging
  const getCircleCoordinates = (circleId: number, event: React.TouchEvent | React.MouseEvent) => {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    return {
      circleId,
      circleCenter: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      },
      clickCoordinates: { x: clientX, y: clientY },
      offset: {
        x: clientX - (rect.left + rect.width / 2),
        y: clientY - (rect.top + rect.height / 2),
      },
      circleRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
    };
  };

  // Effect to handle activation pulses
  useEffect(() => {
    if (onActivatedCircles.length > 0 && lastActivationTimestamp > 0) {
      // Log circle activation visual updates
      logGridEvent(GameLogType.CIRCLE_ACTIVATION, {
        message: "Visual activation pulse triggered",
        activatedCircleIds: onActivatedCircles,
        activationTimestamp: lastActivationTimestamp,
        relativeTime: lastActivationTimestamp - gameStartTime,
      });

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
  }, [onActivatedCircles, lastActivationTimestamp, circles, logger, gameStartTime]);

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

      // Log grid initialization
      logGridEvent(GameLogType.GAME_STATE_CHANGE, {
        message: "Grid dimensions calculated",
        screenDimensions: { width: screenWidth, height: screenHeight },
        gridDimensions: { cols, rows },
        circleCount: circles.length,
        calculatedCircleSize: Math.floor(finalSize),
        gapSize: finalGap,
      });
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
  }, [circles.length, cols, rows, logger, gameStartTime]);

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

  // Touch event handlers for mobile compatibility with enhanced logging
  const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) {
      logGridEvent(GameLogType.ERROR, {
        message: "Touch start on inactive game",
        circleId,
        isGameActive,
      });
      return;
    }

    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();

    const currentTime = Date.now();
    const coordinates = getCircleCoordinates(circleId, event);
    const circle = circles.find(c => c.id === circleId);

    // Log touch start event
    logGridEvent(GameLogType.CIRCLE_CLICK, {
      message: "Touch start event",
      eventType: "touchstart",
      circleId,
      touchTime: currentTime,
      relativeTime: currentTime - gameStartTime,
      coordinates,
      circleState: circle ? {
        isActive: circle.isActive,
        isAnimating: circle.isAnimating,
        isDecoy: circle.isDecoy,
      } : null,
      touchCount: event.touches.length,
      activeTouchEvents: activeTouchEventsRef.current.size,
    });

    touchStartTimeRef.current.set(circleId, currentTime);

    // Store touch event details
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      activeTouchEventsRef.current.set(touch.identifier, {
        touchId: touch.identifier,
        circleId,
        startTime: currentTime,
        startCoordinates: { x: touch.clientX, y: touch.clientY },
        processed: false,
      });
    }

    if (!processedTouchesRef.current.has(circleId)) {
      processedTouchesRef.current.add(circleId);
      
      // Log click processing
      logGridEvent(GameLogType.CIRCLE_CLICK, {
        message: "Processing touch click",
        circleId,
        eventType: "click_processing",
        touchTime: currentTime,
        relativeTime: currentTime - gameStartTime,
      });

      onCircleClick(circleId);

      setTimeout(() => {
        processedTouchesRef.current.delete(circleId);
      }, 100);
    } else {
      // Log duplicate touch attempt
      logGridEvent(GameLogType.ERROR, {
        message: "Duplicate touch attempt blocked",
        circleId,
        eventType: "duplicate_touch_blocked",
      });
    }
  };

  const handleTouchEnd = (circleId: number, event: React.TouchEvent) => {
    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();
    
    const currentTime = Date.now();
    const startTime = touchStartTimeRef.current.get(circleId);
    const touchDuration = startTime ? currentTime - startTime : 0;

    // Log touch end event
    logGridEvent(GameLogType.CIRCLE_CLICK, {
      message: "Touch end event",
      eventType: "touchend",
      circleId,
      touchDuration,
      relativeTime: currentTime - gameStartTime,
      changedTouchCount: event.changedTouches.length,
    });

    touchStartTimeRef.current.delete(circleId);

    // Clean up active touch events
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      activeTouchEventsRef.current.delete(touch.identifier);
    }
  };

  const handleClick = (circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) {
      logGridEvent(GameLogType.ERROR, {
        message: "Mouse click on inactive game",
        circleId,
        isGameActive,
      });
      return;
    }

    const touchTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();

    if (touchTime && currentTime - touchTime < 300) {
      // Log blocked mouse click due to recent touch
      logGridEvent(GameLogType.CIRCLE_CLICK, {
        message: "Mouse click blocked due to recent touch",
        eventType: "mouse_click_blocked",
        circleId,
        timeSinceTouch: currentTime - touchTime,
      });
      return;
    }

    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();

    const coordinates = getCircleCoordinates(circleId, event);
    const circle = circles.find(c => c.id === circleId);

    // Log mouse click event
    logGridEvent(GameLogType.CIRCLE_CLICK, {
      message: "Mouse click event",
      eventType: "mouseclick",
      circleId,
      clickTime: currentTime,
      relativeTime: currentTime - gameStartTime,
      coordinates,
      circleState: circle ? {
        isActive: circle.isActive,
        isAnimating: circle.isAnimating,
        isDecoy: circle.isDecoy,
      } : null,
      mouseButton: event.button,
    });

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
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    };
  };

  // Continuous pulse effect (unchanged but respects instant deactivation)
  const renderPulseEffect = (circle: Circle) => {
    // Don't render pulse for instantly deactivated circles
    if (instantlyDeactivatedCircles.includes(circle.id)) return null;
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

  // Fast activation pulse effect (respects instant deactivation)
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

  // Log component mounting
  useEffect(() => {
    logGridEvent(GameLogType.GAME_STATE_CHANGE, {
      message: "GameGrid component mounted",
      circleCount: circles.length,
      gameMode,
      isGameActive,
      showCircles,
    });

    return () => {
      logGridEvent(GameLogType.GAME_STATE_CHANGE, {
        message: "GameGrid component unmounting",
        activeTouchEvents: activeTouchEventsRef.current.size,
      });
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
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
              {/* Debug info for development */}
            </button>
          );
        })}
      </div>
    </div>
  );
}