// src/components/RotatingCircleGrid.tsx - Stable position preservation during level changes

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

interface ActivePulse {
    circleId: number;
    isRed: boolean;
    timestamp: number;
}

export default function RotatingCircleGrid({
    circles,
    onCircleClick,
    isGameActive,
    showCircles,
    rotationSpeed,
    radius,
    onActivatedCircles = [],
    lastActivationTimestamp = 0,
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

    // State for dynamic sizing - increased sizes for better visibility
    const [circleSize, setCircleSize] = useState(40); // Increased from 32
    const [containerSize, setContainerSize] = useState(350); // Increased from 280

    // State for tracking active activation pulses
    const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

    // Effect to handle activation pulses AFTER circles are activated
    useEffect(() => {
        if (onActivatedCircles.length > 0 && lastActivationTimestamp > 0) {
            const pulseDelay = setTimeout(() => {
                const newPulses: ActivePulse[] = onActivatedCircles.map(circleId => {
                    const circle = circles.find(c => c.id === circleId);
                    return {
                        circleId,
                        isRed: circle?.isDecoy || false,
                        timestamp: Date.now(),
                    };
                });

                setActivePulses(prev => [...prev, ...newPulses]);

                setTimeout(() => {
                    setActivePulses(prev =>
                        prev.filter(pulse => pulse.timestamp !== newPulses[0]?.timestamp)
                    );
                }, 400);
            }, 100);

            return () => clearTimeout(pulseDelay);
        }
    }, [onActivatedCircles, lastActivationTimestamp, circles]);

    // Calculate adaptive sizes with increased dimensions
    useEffect(() => {
        const calculateAdaptiveSizes = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;

            const availableWidth = screenWidth * 0.9; // Increased from 0.85
            const availableHeight = screenHeight * 0.6; // Increased from 0.5
            const maxSize = Math.min(availableWidth, availableHeight);

            const calculatedContainerSize = Math.max(320, Math.min(maxSize, 400)); // Increased range
            const calculatedCircleSize = Math.max(36, Math.min(calculatedContainerSize / 8, 48)); // Increased range

            setContainerSize(calculatedContainerSize);
            setCircleSize(calculatedCircleSize);
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

    // Smooth rotation animation with preserved positions
    const updateRotation = useCallback(() => {
        if (!isGameActive || !rotatingContainerRef.current) {
            return;
        }

        const now = Date.now();
        const deltaTime = now - lastUpdateTimeRef.current;
        lastUpdateTimeRef.current = now;

        // Smooth speed interpolation for seamless level transitions
        const speedDifference = targetSpeedRef.current - currentSpeedRef.current;
        const interpolationFactor = Math.min(deltaTime * 0.001, 1); // Adjust smoothness
        currentSpeedRef.current += speedDifference * interpolationFactor;

        // Update rotation based on current speed
        const rotationIncrement = currentSpeedRef.current * deltaTime;
        currentRotationRef.current += rotationIncrement;

        // Apply rotation to container
        rotatingContainerRef.current.style.transform =
            `rotate(${currentRotationRef.current}rad)`;

        // Continue animation
        animationFrameRef.current = requestAnimationFrame(updateRotation);
    }, [isGameActive]);

    // Handle speed changes without position jumps
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

    // Calculate precise static position for each circle with increased radius
    const getCircleStaticPosition = useCallback((circle: RotationCircle) => {
        const scaledRadius = (containerSize * 0.42); // Increased from 0.35 for larger axis

        const x = Math.cos(circle.angle) * scaledRadius;
        const y = Math.sin(circle.angle) * scaledRadius;

        return { x, y };
    }, [containerSize]);

    const getCircleStyles = (circle: RotationCircle) => {
        const isDeactivating = circle.isAnimating;
        const transitionClass = isDeactivating
            ? "transition-all duration-75"
            : "transition-colors duration-200 ease-in-out";

        const baseClasses = `absolute rounded-full border-2 ${transitionClass}`;

        const visibilityClasses = showCircles
            ? "opacity-100 scale-100"
            : "opacity-0 scale-0";

        const animationClasses = circle.isAnimating
            ? "opacity-0 scale-75"
            : "";

        if (circle.isActive && !circle.isAnimating) {
            if (circle.isDecoy) {
                return {
                    className: `${baseClasses} ${visibilityClasses} ${animationClasses} 
                      bg-red-500 border-red-400 shadow-lg shadow-red-500/50 scale-110
                      hover:scale-125 active:scale-95 cursor-pointer`,
                };
            } else {
                return {
                    className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                      bg-white shadow-lg shadow-white/50 border-white scale-110
                      hover:scale-125 active:scale-95 cursor-pointer`,
                };
            }
        } else {
            return {
                className: `${baseClasses} ${visibilityClasses} ${animationClasses}
                    bg-transparent border-white/40 hover:border-white/60 hover:scale-105
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

    // Render pulse effect for active circles
    const renderPulseEffect = (circle: RotationCircle) => {
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

    // Render activation pulse effect
    const renderActivationPulse = (circle: RotationCircle) => {
        const activePulse = activePulses.find(pulse => pulse.circleId === circle.id);
        if (!activePulse) return null;

        const pulseClass = activePulse.isRed ? 'activation-pulse-red' : 'activation-pulse';
        const pulseColor = activePulse.isRed ? 'border-red-400' : 'border-white';

        return (
            <div
                className={`absolute inset-0 rounded-full border-2 ${pulseColor} ${pulseClass} pointer-events-none`}
                style={{ zIndex: -1 }}
            />
        );
    };

    return (
        <div className="flex items-center justify-center min-h-[500px] p-4">
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
                {/* Central rotation indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className="w-3 h-3 bg-white/30 rounded-full animate-pulse"
                        style={{
                            animation: `pulse-gentle 2s ease-in-out infinite`,
                        }}
                    />
                </div>

                {/* Rotating container with JavaScript-controlled rotation */}
                <div
                    ref={rotatingContainerRef}
                    className="absolute inset-0 high-performance-rotation"
                    style={{
                        transformOrigin: '50% 50%',
                        backfaceVisibility: 'hidden',
                        perspective: '1000px',
                        willChange: 'transform',
                    }}
                >
                    {/* Circles with increased size and optimized positioning */}
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
                                    transitionDelay: showCircles ? `${circle.id * 30}ms` : "0ms",
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
                                {/* Continuous pulse effect */}
                                {renderPulseEffect(circle)}
                                {/* Activation pulse effect */}
                                {renderActivationPulse(circle)}

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

                {/* Rotation direction indicator with increased size */}
                <div className="absolute bottom-2 right-2">
                    <div
                        className="w-8 h-8 border-2 border-white/20 rounded-full relative"
                        style={{
                            transform: `rotate(${currentRotationRef.current}rad)`,
                            transition: 'none',
                        }}
                    >
                        <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-white/40 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </div>
        </div>
    );
}