// src/components/GameGrid.tsx - Исправленная версия с логированием и совместимостью типов

"use client";

import { useRef, useState, useEffect } from "react";

import { Circle } from "@/types/game-modes/common";
import { GameLogger, LogEventType } from "@/types/game-logging";

interface GameGridProps {
  circles: Circle[];
  onCircleClick: (circleId: number) => void;
  isGameActive: boolean;
  showCircles: boolean;
  // Props for activation pulse notifications
  onActivatedCircles?: number[]; // Array of circle IDs that were just activated
  lastActivationTimestamp?: number; // Timestamp to trigger re-render when activations occur
  gameMode?: "reaction" | "survival" | "physics"; // Game mode for styling differences
  // NEW: Optional logger for debugging
  logger?: GameLogger;
}

interface ActivePulse {
  circleId: number;
  isRed: boolean;
  timestamp: number;
}

interface TouchInfo {
  startTime: number;
  startX: number;
  startY: number;
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
  logger,
}: GameGridProps) {
  const { cols, rows } = getGridDimensions(circles.length);
  const touchInfoRef = useRef<Map<number, TouchInfo>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());

  // State for dynamic sizing
  const [circleSize, setCircleSize] = useState(40);
  const [gapSize, setGapSize] = useState(4);

  // State for tracking active activation pulses
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

  // Debug state for development
  const [debugInfo, setDebugInfo] = useState<{
    lastClickTime: number;
    lastClickedCircle: number | null;
    totalClicks: number;
    activeCirclesCount: number;
  }>({
    lastClickTime: 0,
    lastClickedCircle: null,
    totalClicks: 0,
    activeCirclesCount: 0,
  });

  // Log grid state changes
  useEffect(() => {
    if (logger) {
      const activeCount = circles.filter(c => c.isActive).length;

      if (activeCount !== debugInfo.activeCirclesCount) {
        logger.addEntry(LogEventType.ERROR_OCCURRED, {
          errorType: "GRID_STATE_CHANGE",
          message: `Active circles count changed from ${debugInfo.activeCirclesCount} to ${activeCount}`,
          gameState: {
            totalCircles: circles.length,
            activeCircles: activeCount,
            showCircles,
            isGameActive,
          },
        });

        setDebugInfo(prev => ({ ...prev, activeCirclesCount: activeCount }));
      }
    }
  }, [circles, logger, debugInfo.activeCirclesCount, showCircles, isGameActive]);

  // Effect to handle activation pulses
  useEffect(() => {
    if (onActivatedCircles.length > 0 && lastActivationTimestamp > 0) {
      // Log activation pulse event
      if (logger) {
        logger.addEntry(LogEventType.ERROR_OCCURRED, {
          errorType: "GRID_ACTIVATION_PULSE",
          message: `Received activation pulse for ${onActivatedCircles.length} circles`,
          gameState: {
            activatedCircles: onActivatedCircles,
            timestamp: lastActivationTimestamp,
            gameMode,
          },
        });
      }

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

      // Remove pulses after animation completes
      setTimeout(() => {
        setActivePulses((prev) =>
          prev.filter((pulse) => pulse.timestamp !== lastActivationTimestamp),
        );
      }, 450);
    }
  }, [onActivatedCircles, lastActivationTimestamp, circles, logger, gameMode]);

  // Calculate adaptive sizes based on screen dimensions
  useEffect(() => {
    const calculateAdaptiveSizes = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Calculate available space (accounting for UI elements)
      const availableWidth = screenWidth * 0.9; // 90% of screen width
      const availableHeight = screenHeight * 0.6; // 60% of screen height

      // Calculate maximum circle size based on grid dimensions
      const maxCircleWidthByColumns = (availableWidth - (cols - 1) * 8) / cols;
      const maxCircleHeightByRows = (availableHeight - (rows - 1) * 8) / rows;

      // Use the smaller dimension to ensure circles fit
      const calculatedSize = Math.min(maxCircleWidthByColumns, maxCircleHeightByRows);

      // Apply size constraints based on device type and circle count
      let finalSize: number;
      let finalGap: number;

      if (circles.length <= 16) {
        finalSize = Math.max(60, Math.min(calculatedSize, 120));
        finalGap = 8;
      } else if (circles.length <= 25) {
        finalSize = Math.max(48, Math.min(calculatedSize, 80));
        finalGap = 6;
      } else if (circles.length <= 48) {
        finalSize = Math.max(36, Math.min(calculatedSize, 64));
        finalGap = 4;
      } else {
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

      // Log sizing calculation in development
      if (logger) {
        logger.addEntry(LogEventType.ERROR_OCCURRED, {
          errorType: "GRID_SIZE_CALCULATION",
          message: `Grid sizing: ${Math.floor(finalSize)}px circles, ${finalGap}px gap`,
          gameState: {
            screenWidth,
            screenHeight,
            circleCount: circles.length,
            gridCols: cols,
            gridRows: rows,
            calculatedSize,
            finalSize: Math.floor(finalSize),
          },
        });
      }
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
  }, [circles.length, cols, rows, logger]);

  const getCircleStyles = (circle: Circle) => {
    const baseStyles = {
      width: `${circleSize}px`,
      height: `${circleSize}px`,
      minWidth: `${circleSize}px`,
      minHeight: `${circleSize}px`,
    };

    const baseClasses =
      "rounded-full border-2 transition-all duration-300 ease-out relative";

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

  // Enhanced touch event handlers with logging
  const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) return;

    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    const currentTime = Date.now();

    // Store touch information
    touchInfoRef.current.set(circleId, {
      startTime: currentTime,
      startX: touch.clientX,
      startY: touch.clientY,
      processed: false,
    });

    // Log touch start in development mode
    if (logger) {
      const circle = circles.find(c => c.id === circleId);
      logger.addEntry(LogEventType.ERROR_OCCURRED, {
        errorType: "GRID_TOUCH_START",
        message: `Touch start on circle ${circleId}`,
        gameState: {
          circleId,
          isActive: circle?.isActive || false,
          isDecoy: circle?.isDecoy || false,
          coordinates: { x: touch.clientX, y: touch.clientY },
          timestamp: currentTime,
        },
      });
    }

    // Process click if not already processed
    if (!processedTouchesRef.current.has(circleId)) {
      processedTouchesRef.current.add(circleId);

      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        lastClickTime: currentTime,
        lastClickedCircle: circleId,
        totalClicks: prev.totalClicks + 1,
      }));

      onCircleClick(circleId);

      // Clean up processed touch after short delay
      setTimeout(() => {
        processedTouchesRef.current.delete(circleId);
      }, 100);
    }
  };

  const handleTouchEnd = (circleId: number, event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const touchInfo = touchInfoRef.current.get(circleId);

    if (touchInfo && logger) {
      const duration = Date.now() - touchInfo.startTime;
      logger.addEntry(LogEventType.ERROR_OCCURRED, {
        errorType: "GRID_TOUCH_END",
        message: `Touch end on circle ${circleId} after ${duration}ms`,
        gameState: {
          circleId,
          touchDuration: duration,
          wasProcessed: touchInfo.processed,
        },
      });
    }

    touchInfoRef.current.delete(circleId);
  };

  const handleClick = (circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) return;

    const touchTime = touchInfoRef.current.get(circleId)?.startTime;
    const currentTime = Date.now();

    // Avoid duplicate processing if touch event already handled this
    if (touchTime && currentTime - touchTime < 300) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Log mouse click in development mode
    if (logger) {
      const circle = circles.find(c => c.id === circleId);
      logger.addEntry(LogEventType.ERROR_OCCURRED, {
        errorType: "GRID_MOUSE_CLICK",
        message: `Mouse click on circle ${circleId}`,
        gameState: {
          circleId,
          isActive: circle?.isActive || false,
          isDecoy: circle?.isDecoy || false,
          coordinates: { x: event.clientX, y: event.clientY },
          timestamp: currentTime,
        },
      });
    }

    // Update debug info
    setDebugInfo(prev => ({
      ...prev,
      lastClickTime: currentTime,
      lastClickedCircle: circleId,
      totalClicks: prev.totalClicks + 1,
    }));

    onCircleClick(circleId);
  };

  const getInteractionProps = (circle: Circle) => {
    return {
      disabled: !isGameActive,
      style: {
        transitionDelay: showCircles ? `${circle.id * 12}ms` : "0ms",
        transition: circle.isActive
          ? "transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out"
          : "all 0.3s ease-out",
        touchAction: "manipulation",
      },
      onTouchStart: (event: React.TouchEvent) => handleTouchStart(circle.id, event),
      onTouchEnd: (event: React.TouchEvent) => handleTouchEnd(circle.id, event),
      onClick: (event: React.MouseEvent) => handleClick(circle.id, event),
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    };
  };

  // Continuous pulse effect for active circles
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

  // Fast activation pulse effect (single burst on activation)
  const renderActivationPulse = (circle: Circle) => {
    const activePulse = activePulses.find((pulse) => pulse.circleId === circle.id);

    if (!activePulse) return null;

    const pulseClass = activePulse.isRed ? "activation-pulse-red" : "activation-pulse";
    const pulseColor = activePulse.isRed ? "border-red-400" : "border-white";

    // Different z-index for different game modes
    const zIndex = gameMode === "survival" ? -1 : 10;

    return (
      <div
        className={`absolute inset-0 rounded-full border-2 ${pulseColor} ${pulseClass} pointer-events-none`}
        style={{ zIndex: zIndex }}
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
              aria-label={`Game circle ${circle.id + 1}${circle.isActive
                  ? circle.isDecoy
                    ? " - trap target"
                    : " - active target"
                  : ""
                }`}
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
              {/* Continuous pulse effect */}
              {renderPulseEffect(circle)}
              {/* Fast activation pulse effect */}
              {renderActivationPulse(circle)}

              {/* Development debug info */}
              { (
                <>
                  {circle.isActive && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs font-mono text-white/60">
                      {circle.id}
                    </div>
                  )}
                  {debugInfo.lastClickedCircle === circle.id && (
                    <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-xs font-mono text-green-400">
                      ✓
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Development debug panel */}
      {logger && (
        <div className="fixed top-4 right-4 bg-black/80 border border-white/20 rounded p-2 text-xs text-white font-mono z-50">
          <div>Grid: {cols}×{rows} ({circles.length} circles)</div>
          <div>Size: {circleSize}px, Gap: {gapSize}px</div>
          <div>Active: {circles.filter(c => c.isActive).length}</div>
          <div>Clicks: {debugInfo.totalClicks}</div>
          <div>Last: {debugInfo.lastClickedCircle ?? 'none'}</div>
          <div>Game: {isGameActive ? 'active' : 'inactive'}</div>
          <div>Show: {showCircles ? 'yes' : 'no'}</div>
        </div>
      )}
    </div>
  );
}