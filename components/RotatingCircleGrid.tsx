// src/components/RotatingCircleGrid.tsx - Simplified without pulse effects

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { RotationCircle } from "@/types/game-modes/rotation";

interface RotatingCircleGridProps {
    circles: RotationCircle[];
    onCircleClick: (circleId: number) => void;
    isGameActive: boolean;
    showCircles: boolean;
    rotationSpeed: number;
    radius: number;
    onActivatedCircles?: number[];
    lastActivationTimestamp?: number;
}

export default function RotatingCircleGrid({
    circles,
    onCircleClick,
    isGameActive,
    showCircles,
    rotationSpeed,
}: RotatingCircleGridProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rotatingContainerRef = useRef<HTMLDivElement>(null);
    const touchStartTimeRef = useRef<Map<number, number>>(new Map());
    const processedTouchesRef = useRef<Set<number>>(new Set());

    // Animation state management
    const currentRotationRef = useRef<number>(0);
    const lastUpdateTimeRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number | null>(null);
    const currentSpeedRef = useRef<number>(rotationSpeed);
    const targetSpeedRef = useRef<number>(rotationSpeed);

    // State for dynamic sizing - now optimized without pulse effects
    const [circleSize, setCircleSize] = useState(40);
    const [containerSize, setContainerSize] = useState(350);
    const [effectiveRadius, setEffectiveRadius] = useState(120);

    // Calculate adaptive sizes without accounting for pulse effects
    useEffect(() => {
        const calculateAdaptiveSizes = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;

            // Reserve space for bottom panel
            const bottomPanelHeight = 140;
            // Reserve space for top safe area and margins
            const topReservedSpace = 60;
            // Minimal horizontal margins
            const horizontalMargins = 20;

            const availableWidth = screenWidth - horizontalMargins;
            const availableHeight = screenHeight - bottomPanelHeight - topReservedSpace;

            // Use the minimum of available dimensions to ensure square container
            const maxContainerSize = Math.min(availableWidth, availableHeight);

            // Set bounds for usability - can use more space now without pulse overflow concerns
            const calculatedContainerSize = Math.max(280, Math.min(maxContainerSize, 500));

            // Scale circle size proportionally to container
            const calculatedCircleSize = Math.max(32, Math.min(calculatedContainerSize / 9, 50));

            // Can use larger radius now without pulse overflow concerns
            const calculatedEffectiveRadius = calculatedContainerSize * 0.40;

            setContainerSize(calculatedContainerSize);
            setCircleSize(calculatedCircleSize);
            setEffectiveRadius(calculatedEffectiveRadius);

            console.log('Simplified container sizing:', {
                screenDimensions: `${screenWidth}x${screenHeight}`,
                availableSpace: `${availableWidth}x${availableHeight}`,
                containerSize: calculatedContainerSize,
                circleSize: calculatedCircleSize,
                effectiveRadius: calculatedEffectiveRadius
            });
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
    }, []);

    // Smooth rotation animation
    const updateRotation = useCallback(() => {
        if (!isGameActive || !rotatingContainerRef.current) {
            return;
        }

        const now = Date.now();
        const deltaTime = now - lastUpdateTimeRef.current;
        lastUpdateTimeRef.current = now;

        // Smooth speed interpolation for level transitions
        const speedDifference = targetSpeedRef.current - currentSpeedRef.current;
        const interpolationFactor = Math.min(deltaTime * 0.002, 1);
        currentSpeedRef.current += speedDifference * interpolationFactor;

        // Convert rotation speed from radians-per-frame to radians-per-millisecond
        const speedInRadPerMs = currentSpeedRef.current / 16.67;

        // Update rotation based on current speed and delta time
        const rotationIncrement = speedInRadPerMs * deltaTime;
        currentRotationRef.current += rotationIncrement;

        // Apply rotation to container
        rotatingContainerRef.current.style.transform =
            `rotate(${currentRotationRef.current}rad)`;

        // Continue animation
        animationFrameRef.current = requestAnimationFrame(updateRotation);
    }, [isGameActive]);

    // Handle speed changes
    useEffect(() => {
        targetSpeedRef.current = rotationSpeed;
    }, [rotationSpeed]);

    // Start/stop animation
    useEffect(() => {
        if (isGameActive) {
            lastUpdateTimeRef.current = Date.now();
            animationFrameRef.current = requestAnimationFrame(updateRotation);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isGameActive, updateRotation]);

    // Calculate static position for each circle
    const getCircleStaticPosition = useCallback((circle: RotationCircle) => {
        const x = Math.cos(circle.angle) * effectiveRadius;
        const y = Math.sin(circle.angle) * effectiveRadius;

        return { x, y };
    }, [effectiveRadius]);

    // Simplified circle styles without pulse effects
    const getCircleStyles = (circle: RotationCircle) => {
        const isDeactivating = circle.isAnimating;
        
        // Instant transitions for immediate feedback
        const transitionClass = isDeactivating
            ? "transition-all duration-75 ease-out"
            : "transition-all duration-100 ease-in-out";

        const baseClasses = `absolute rounded-full border-3 ${transitionClass}`;

        const visibilityClasses = showCircles
            ? "opacity-100 scale-100"
            : "opacity-0 scale-0";

        const animationClasses = circle.isAnimating
            ? "opacity-0 scale-50"
            : "";

        if (circle.isActive && !circle.isAnimating) {
            if (circle.isDecoy) {
                return {
                    className: `${baseClasses} ${visibilityClasses} ${animationClasses} 
                      bg-red-500 border-red-400 shadow-xl shadow-red-500/60 scale-110
                      hover:scale-115 active:scale-95 cursor-pointer`,
                };
            } else {
                return {
                    className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                      bg-white shadow-xl shadow-white/60 border-white scale-110
                      hover:scale-115 active:scale-95 cursor-pointer`,
                };
            }
        } else {
            return {
                className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                    bg-transparent border-white/30 hover:border-white/50 hover:scale-105
                    active:scale-95 cursor-pointer`,
            };
        }
    };

    // Touch event handlers with immediate response
    const handleTouchStart = (circleId: number, event: React.TouchEvent) => {
        if (!isGameActive) return;

        event.preventDefault();
        event.stopPropagation();

        const currentTime = Date.now();
        touchStartTimeRef.current.set(circleId, currentTime);

        if (!processedTouchesRef.current.has(circleId)) {
            processedTouchesRef.current.add(circleId);
            onCircleClick(circleId);

            setTimeout(() => {
                processedTouchesRef.current.delete(circleId);
            }, 50);
        }
    };

    const handleTouchEnd = (circleId: number, event: React.TouchEvent) => {
        event.preventDefault();
        event.stopPropagation();
        touchStartTimeRef.current.delete(circleId);
    };

    const handleClick = (circleId: number, event: React.MouseEvent) => {
        if (!isGameActive) return;

        const touchTime = touchStartTimeRef.current.get(circleId);
        const currentTime = Date.now();

        if (touchTime && currentTime - touchTime < 200) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        onCircleClick(circleId);
    };

    return (
        <div className="flex items-center justify-center min-h-[400px] p-2">
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
                {/* Game area boundary indicator */}
                <div
                    className="absolute border border-white/8 rounded-full"
                    style={{
                        width: `${containerSize - 4}px`,
                        height: `${containerSize - 4}px`,
                        left: '2px',
                        top: '2px',
                        pointerEvents: 'none',
                    }}
                />

                {/* Central rotation indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-white/20 rounded-full border border-white/30" />
                </div>

                {/* Rotating container */}
                <div
                    ref={rotatingContainerRef}
                    className="absolute high-performance-rotation"
                    style={{
                        left: '0',
                        top: '0',
                        width: `${containerSize}px`,
                        height: `${containerSize}px`,
                        transformOrigin: '50% 50%',
                        backfaceVisibility: 'hidden',
                        perspective: '1000px',
                        willChange: 'transform',
                    }}
                >
                    {/* Circles with instant state changes */}
                    {circles.map((circle) => {
                        const circleStyleConfig = getCircleStyles(circle);
                        const staticPosition = getCircleStaticPosition(circle);

                        return (
                            <button
                                key={circle.id}
                                data-circle-id={circle.id}
                                aria-label={`Rotating circle ${circle.id + 1}${circle.isActive
                                    ? (circle.isDecoy ? " - trap target" : " - active target")
                                    : ""
                                    }`}
                                className={`${circleStyleConfig.className} disabled:cursor-not-allowed select-none touch-optimized`}
                                disabled={!isGameActive}
                                style={{
                                    width: `${circleSize}px`,
                                    height: `${circleSize}px`,
                                    minWidth: `${circleSize}px`,
                                    minHeight: `${circleSize}px`,
                                    left: '50%',
                                    top: '50%',
                                    transform: `translate(calc(-50% + ${staticPosition.x}px), calc(-50% + ${staticPosition.y}px))`,
                                    transitionDelay: showCircles ? `${circle.id * 25}ms` : "0ms",
                                    touchAction: "manipulation",
                                    willChange: 'transform',
                                    backfaceVisibility: 'hidden',
                                }}
                                type="button"
                                onClick={(event) => handleClick(circle.id, event)}
                                onContextMenu={(event) => event.preventDefault()}
                                onTouchEnd={(event) => handleTouchEnd(circle.id, event)}
                                onTouchStart={(event) => handleTouchStart(circle.id, event)}
                            >
                                {/* Debug info for development */}
                                {process.env.NODE_ENV === "development" && (
                                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-mono text-white/60">
                                        {circle.id}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Rotation direction indicator */}
                <div className="absolute bottom-3 right-3">
                    <div
                        className="w-8 h-8 border-2 border-white/25 rounded-full relative"
                        style={{
                            transform: `rotate(${currentRotationRef.current}rad)`,
                            transition: 'none',
                        }}
                    >
                        <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-white/50 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </div>
        </div>
    );
}