// src/components/RotatingCircleGrid.tsx - Исправленная версия с логикой защиты от Survival Mode

"use client";

import { useRef, useState, useEffect, useCallback } from "react";

import { RotationCircle } from "@/types/game-modes/rotation";

// Array of white color variants for automation protection
const WHITE_COLOR_VARIANTS = [
  "rgb(255, 255, 255)", // Pure white
  "rgb(255, 255, 254)", // White with minimal tint
  "rgb(254, 255, 255)", // White with red channel tint
  "rgb(255, 254, 255)", // White with green channel tint
  "rgb(254, 254, 255)", // White with double tint
  "rgb(255, 254, 254)", // White with green and blue tints
  "rgb(254, 255, 254)", // White with red and blue tints
  "rgb(253, 255, 255)", // White with more noticeable red tint
  "rgb(255, 253, 255)", // White with more noticeable green tint
  "rgb(255, 255, 253)", // White with more noticeable blue tint
];

// Corresponding border color variants
const WHITE_BORDER_VARIANTS = [
  "rgb(255, 255, 255)",
  "rgb(255, 255, 254)",
  "rgb(254, 255, 255)",
  "rgb(255, 254, 255)",
  "rgb(254, 254, 255)",
  "rgb(255, 254, 254)",
  "rgb(254, 255, 254)",
  "rgb(253, 255, 255)",
  "rgb(255, 253, 255)",
  "rgb(255, 255, 253)",
];

// Function to get random white variant index
const getRandomWhiteVariantIndex = (): number => {
  return Math.floor(Math.random() * WHITE_COLOR_VARIANTS.length);
};

// Function to create CSS variables for specific variant
const createWhiteVariantStyle = (variantIndex: number) => {
  return {
    "--white-bg": WHITE_COLOR_VARIANTS[variantIndex],
    "--white-border": WHITE_BORDER_VARIANTS[variantIndex],
  } as React.CSSProperties;
};

interface RotatingCircleGridProps {
  circles: RotationCircle[];
  onCircleClick: (circleId: number) => void;
  isGameActive: boolean;
  showCircles: boolean;
  rotationSpeed: number;
  radius: number;
  onActivatedCircles?: number[];
  lastActivationTimestamp?: number;
  instantlyDeactivatedCircles?: number[];
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

export default function RotatingCircleGrid({
  circles,
  onCircleClick,
  isGameActive,
  showCircles,
  rotationSpeed,
  onActivatedCircles = [],
  lastActivationTimestamp = 0,
  instantlyDeactivatedCircles = [],
}: RotatingCircleGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotatingContainerRef = useRef<HTMLDivElement>(null);

  // Simplified protection refs using Survival Mode logic
  const touchStartTimeRef = useRef<Map<number, number>>(new Map());
  const processedTouchesRef = useRef<Set<number>>(new Set());

  // Animation state management with race condition protection
  const currentRotationRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);
  const currentSpeedRef = useRef<number>(rotationSpeed);
  const targetSpeedRef = useRef<number>(rotationSpeed);
  const isAnimatingRef = useRef<boolean>(false);

  // Enhanced sizing for larger circles with fewer count
  const [circleSize, setCircleSize] = useState(60);
  const [containerSize, setContainerSize] = useState(400);
  const [effectiveRadius, setEffectiveRadius] = useState(150);

  // State for storing assigned white variants for each circle
  const [circleColorVariants, setCircleColorVariants] = useState<
    Map<number, number>
  >(new Map());

  // State for tracking active activation pulses
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

  // Function to generate new variant for circle on activation
  const generateColorVariantForCircle = (circleId: number): number => {
    const variantIndex = getRandomWhiteVariantIndex();

    setCircleColorVariants((prev) => new Map(prev).set(circleId, variantIndex));

    return variantIndex;
  };

  // Effect to update variants when new circles are activated
  useEffect(() => {
    if (onActivatedCircles.length > 0) {
      onActivatedCircles.forEach((circleId) => {
        // Generate new variant only if circle is activated and not a trap
        const circle = circles.find((c) => c.id === circleId);

        if (circle && circle.isActive && !circle.isDecoy) {
          generateColorVariantForCircle(circleId);
        }
      });
    }
  }, [onActivatedCircles, circles]);

  // Effect to handle activation pulses with proper cleanup
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

      // Remove pulses after animation completes
      setTimeout(() => {
        setActivePulses((prev) =>
          prev.filter((pulse) => pulse.timestamp !== lastActivationTimestamp),
        );
      }, 450);
    }
  }, [onActivatedCircles, lastActivationTimestamp, circles]);

  // Calculate adaptive sizes optimized for 8 circles instead of 14
  useEffect(() => {
    const calculateAdaptiveSizes = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Reserve space for bottom panel
      const bottomPanelHeight = 140;
      const topReservedSpace = 60;
      const horizontalMargins = 20;

      const availableWidth = screenWidth - horizontalMargins;
      const availableHeight =
        screenHeight - bottomPanelHeight - topReservedSpace;

      const maxContainerSize = Math.min(availableWidth, availableHeight);

      // Larger container for fewer circles
      const calculatedContainerSize = Math.max(
        320,
        Math.min(maxContainerSize, 600),
      );

      // Larger circles since we have fewer of them (8 instead of 14)
      const calculatedCircleSize = Math.max(
        50,
        Math.min(calculatedContainerSize / 6, 80),
      );

      // Larger radius to accommodate bigger circles
      const calculatedEffectiveRadius = calculatedContainerSize * 0.42;

      setContainerSize(calculatedContainerSize);
      setCircleSize(calculatedCircleSize);
      setEffectiveRadius(calculatedEffectiveRadius);
    };

    calculateAdaptiveSizes();

    const handleResize = () => {
      // Debounce resize events to prevent race conditions
      setTimeout(calculateAdaptiveSizes, 100);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Enhanced rotation animation with race condition protection
  const updateRotation = useCallback(() => {
    if (
      !isGameActive ||
      !rotatingContainerRef.current ||
      isAnimatingRef.current
    ) {
      return;
    }

    isAnimatingRef.current = true;

    const now = Date.now();
    const deltaTime = now - lastUpdateTimeRef.current;

    lastUpdateTimeRef.current = now;

    // Smooth speed interpolation for level transitions
    const speedDifference = targetSpeedRef.current - currentSpeedRef.current;
    const interpolationFactor = Math.min(deltaTime * 0.002, 1);

    currentSpeedRef.current += speedDifference * interpolationFactor;

    // Convert rotation speed from radians-per-frame to radians-per-millisecond
    const speedInRadPerMs = currentSpeedRef.current / 16.67;
    const rotationIncrement = speedInRadPerMs * deltaTime;

    currentRotationRef.current += rotationIncrement;

    // Apply rotation to container
    if (rotatingContainerRef.current) {
      rotatingContainerRef.current.style.transform = `rotate(${currentRotationRef.current}rad)`;
    }

    isAnimatingRef.current = false;

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(updateRotation);
  }, [isGameActive]);

  // Handle speed changes with race condition protection
  useEffect(() => {
    targetSpeedRef.current = rotationSpeed;
  }, [rotationSpeed]);

  // Start/stop animation with proper cleanup
  useEffect(() => {
    if (isGameActive) {
      lastUpdateTimeRef.current = Date.now();
      isAnimatingRef.current = false;
      animationFrameRef.current = requestAnimationFrame(updateRotation);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isAnimatingRef.current = false;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isAnimatingRef.current = false;
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

  // Enhanced circle styles with proper instant deactivation support
  const getCircleStyles = (circle: RotationCircle) => {
    const shouldHideInstantly =
      instantlyDeactivatedCircles?.includes(circle.id) || false;

    // For instant deactivation (successful clicks), no transition
    if (shouldHideInstantly) {
      return {
        className: "absolute rounded-full border-4 circle-instant-deactivate",
        style: {} as React.CSSProperties,
      };
    }

    // Normal transition for other state changes
    const transitionClass = circle.isAnimating
      ? "transition-all duration-75 ease-out circle-deactivate"
      : "transition-all duration-100 ease-in-out circle-state-transition";

    const baseClasses = `absolute rounded-full border-4 ${transitionClass}`;
    const visibilityClasses = showCircles
      ? "opacity-100 scale-100"
      : "opacity-0 scale-0";
    const animationClasses =
      circle.isAnimating && !shouldHideInstantly ? "opacity-0 scale-50" : "";

    if (circle.isActive && !circle.isAnimating && !shouldHideInstantly) {
      if (circle.isDecoy) {
        return {
          className: `${baseClasses} ${visibilityClasses} ${animationClasses} 
                      bg-red-500 border-red-400 scale-110 shadow-lg shadow-red-500/30
                      hover:scale-115 active:scale-95 cursor-pointer circle-active red`,
          style: {} as React.CSSProperties,
        };
      } else {
        // Regular active circles: using variable white tint
        const variantIndex = circleColorVariants.get(circle.id) ?? 0;
        const whiteVariantStyle = createWhiteVariantStyle(variantIndex);

        return {
          className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                      scale-110 shadow-lg hover:scale-115 active:scale-95 cursor-pointer circle-active`,
          style: {
            ...whiteVariantStyle,
            backgroundColor: `var(--white-bg)`,
            borderColor: `var(--white-border)`,
            boxShadow: `0 10px 25px -5px ${WHITE_COLOR_VARIANTS[variantIndex]}30, 0 4px 6px -2px ${WHITE_COLOR_VARIANTS[variantIndex]}20`,
          } as React.CSSProperties,
        };
      }
    } else {
      return {
        className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                    bg-transparent border-white/30 hover:border-white/50 hover:scale-105
                    active:scale-95 cursor-pointer`,
        style: {} as React.CSSProperties,
      };
    }
  };

  // Basic touch event details - simplified from Survival Mode
  const getBasicTouchInfo = (event: React.TouchEvent): TouchEventDetails => {
    const firstTouch =
      event.touches.length > 0 ? event.touches[0] : event.changedTouches[0];

    return {
      touchCount: event.touches.length,
      firstTouchX: firstTouch?.clientX || 0,
      firstTouchY: firstTouch?.clientY || 0,
      timestamp: Date.now(),
    };
  };

  // Touch event handlers using Survival Mode logic
  const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
    if (!isGameActive) {
      return;
    }

    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();

    const currentTime = Date.now();
    const touchInfo = getBasicTouchInfo(event);

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

    const touchStartTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();
    const touchDuration = touchStartTime ? currentTime - touchStartTime : 0;
    const touchInfo = getBasicTouchInfo(event);

    touchStartTimeRef.current.delete(circleId);
  };

  const handleClick = (circleId: number, event: React.MouseEvent) => {
    if (!isGameActive) {
      return;
    }

    const touchTime = touchStartTimeRef.current.get(circleId);
    const currentTime = Date.now();

    // Use Survival Mode timing - 300ms window instead of 100ms
    if (touchTime && currentTime - touchTime < 300) {
      return;
    }

    // Prevent event from bubbling to background click handler
    event.preventDefault();
    event.stopPropagation();

    onCircleClick(circleId);
  };

  const getInteractionProps = (circle: RotationCircle) => {
    const shouldHideInstantly =
      instantlyDeactivatedCircles?.includes(circle.id) || false;

    return {
      disabled: !isGameActive || shouldHideInstantly,
      style: {
        transitionDelay: showCircles ? `${circle.id * 40}ms` : "0ms",
        transition:
          circle.isActive && !circle.isAnimating
            ? "transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out"
            : "all 0.3s ease-out",
        touchAction: "manipulation",
        willChange: "transform",
        backfaceVisibility: "hidden",
        // Enhanced visibility controls for instant deactivation
        opacity: shouldHideInstantly ? 0 : undefined,
        visibility: shouldHideInstantly ? "hidden" : undefined,
        pointerEvents: shouldHideInstantly ? "none" : undefined,
      },
      onTouchStart: (event: React.TouchEvent) =>
        handleTouchStart(circle.id, event),
      onTouchEnd: (event: React.TouchEvent) => handleTouchEnd(circle.id, event),
      onClick: (event: React.MouseEvent) => handleClick(circle.id, event),
      onContextMenu: (event: React.MouseEvent) => {
        event.preventDefault();
      },
    };
  };

  // Enhanced pulse effect with white variant support
  const renderPulseEffect = (circle: RotationCircle) => {
    const shouldHideInstantly =
      instantlyDeactivatedCircles?.includes(circle.id) || false;

    if (!circle.isActive || circle.isAnimating || shouldHideInstantly)
      return null;

    if (circle.isDecoy) {
      const pulseColor = "border-red-400";
      const animationDuration = "1.2s";

      return (
        <div
          className={`absolute inset-0 rounded-full border-2 ${pulseColor} opacity-50`}
          style={{
            animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite`,
          }}
        />
      );
    } else {
      // For white circles use corresponding variant for pulse
      const variantIndex = circleColorVariants.get(circle.id) ?? 0;
      const borderColor = WHITE_BORDER_VARIANTS[variantIndex];
      const animationDuration = "0.8s";

      return (
        <div
          className="absolute inset-0 rounded-full border-2 opacity-50"
          style={{
            borderColor: borderColor,
            animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite`,
          }}
        />
      );
    }
  };

  // Fast activation pulse effect
  const renderActivationPulse = (circle: RotationCircle) => {
    const activePulse = activePulses.find(
      (pulse) => pulse.circleId === circle.id,
    );

    if (!activePulse) return null;

    const pulseClass = activePulse.isRed
      ? "activation-pulse-red"
      : "activation-pulse";

    let borderColor: string;

    if (activePulse.isRed) {
      borderColor = "rgb(248, 113, 113)"; // border-red-400
    } else {
      const variantIndex = circleColorVariants.get(circle.id) ?? 0;

      borderColor = WHITE_BORDER_VARIANTS[variantIndex];
    }

    return (
      <div
        className={`absolute inset-0 rounded-full border-2 ${pulseClass} pointer-events-none`}
        style={{
          zIndex: 10,
          borderColor: borderColor,
        }}
      />
    );
  };

  return (
    <div className="flex items-center justify-center min-h-[450px] p-2">
      <div
        ref={containerRef}
        className="relative stable-container"
        style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      >
        {/* Enhanced rotating container for larger circles */}
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
          {/* Enhanced circles with improved double click protection */}
          {circles.map((circle) => {
            const circleStyleConfig = getCircleStyles(circle);
            const staticPosition = getCircleStaticPosition(circle);
            const shouldHideInstantly =
              instantlyDeactivatedCircles?.includes(circle.id) || false;

            return (
              <button
                key={circle.id}
                aria-label={`Rotating circle ${circle.id + 1}${
                  circle.isActive
                    ? circle.isDecoy
                      ? " - trap target"
                      : " - active target"
                    : ""
                }`}
                className={`${circleStyleConfig.className} disabled:cursor-not-allowed select-none touch-optimized`}
                data-circle-id={circle.id}
                disabled={!isGameActive || shouldHideInstantly}
                style={{
                  width: `${circleSize}px`,
                  height: `${circleSize}px`,
                  minWidth: `${circleSize}px`,
                  minHeight: `${circleSize}px`,
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${staticPosition.x}px), calc(-50% + ${staticPosition.y}px))`,
                  transitionDelay: showCircles ? `${circle.id * 40}ms` : "0ms",
                  transition:
                    circle.isActive && !circle.isAnimating
                      ? "transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out"
                      : "all 0.3s ease-out",
                  touchAction: "manipulation",
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                  // Enhanced visibility controls for instant deactivation
                  opacity: shouldHideInstantly ? 0 : undefined,
                  visibility: shouldHideInstantly ? "hidden" : undefined,
                  pointerEvents: shouldHideInstantly ? "none" : undefined,
                  ...circleStyleConfig.style,
                }}
                type="button"
                onClick={getInteractionProps(circle).onClick}
                onContextMenu={getInteractionProps(circle).onContextMenu}
                onTouchEnd={getInteractionProps(circle).onTouchEnd}
                onTouchStart={getInteractionProps(circle).onTouchStart}
              >
                {/* Continuous pulse effect - only for non-deactivated circles */}
                {renderPulseEffect(circle)}
                {/* Fast activation pulse effect */}
                {renderActivationPulse(circle)}
              </button>
            );
          })}
        </div>

        {/* Enhanced center indicator for larger container */}
        <div
          className="absolute center-indicator"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 100%)",
            boxShadow: "0 0 12px rgba(255, 255, 255, 0.3)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
