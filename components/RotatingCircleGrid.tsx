// src/components/RotatingCircleGrid.tsx - CSS-based rotation animation

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

    // State for dynamic sizing
    const [circleSize, setCircleSize] = useState(32);
    const [containerSize, setContainerSize] = useState(280);

    // State for tracking active activation pulses
    const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

    // Calculate rotation duration based on speed
    const rotationDurationMs = rotationSpeed > 0 ? (2 * Math.PI / rotationSpeed) * 16 : 10000; // 16ms per frame

    // Effect to handle activation pulses
    useEffect(() => {
        if (onActivatedCircles.length > 0 && lastActivationTimestamp > 0) {
            const newPulses: ActivePulse[] = onActivatedCircles.map(circleId => {
                const circle = circles.find(c => c.id === circleId);
                return {
                    circleId,
                    isRed: circle?.isDecoy || false,
                    timestamp: lastActivationTimestamp,
                };
            });

            setActivePulses(prev => [...prev, ...newPulses]);

            setTimeout(() => {
                setActivePulses(prev =>
                    prev.filter(pulse => pulse.timestamp !== lastActivationTimestamp)
                );
            }, 450);
        }
    }, [onActivatedCircles, lastActivationTimestamp, circles]);

    // Calculate adaptive sizes based on screen dimensions
    useEffect(() => {
        const calculateAdaptiveSizes = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;

            const availableWidth = screenWidth * 0.85;
            const availableHeight = screenHeight * 0.5;
            const maxSize = Math.min(availableWidth, availableHeight);

            const calculatedContainerSize = Math.max(240, Math.min(maxSize, 320));
            const calculatedCircleSize = Math.max(28, Math.min(calculatedContainerSize / 10, 40));

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

    // Update CSS animation when rotation speed changes
    useEffect(() => {
        if (rotatingContainerRef.current && isGameActive) {
            const duration = rotationDurationMs;
            rotatingContainerRef.current.style.animationDuration = `${duration}ms`;
            rotatingContainerRef.current.style.animationPlayState = 'running';
        } else if (rotatingContainerRef.current) {
            rotatingContainerRef.current.style.animationPlayState = 'paused';
        }
    }, [rotationDurationMs, isGameActive]);

    // Calculate static position for each circle (relative to rotating container)
    const getCircleStaticPosition = useCallback((circle: RotationCircle) => {
        const scaledRadius = (containerSize * 0.35);

        // Use initial angle from circle data (static relative to container)
        const x = Math.cos(circle.angle) * scaledRadius - circleSize / 2;
        const y = Math.sin(circle.angle) * scaledRadius - circleSize / 2;

        return { x, y };
    }, [containerSize, circleSize]);

    const getCircleStyles = (circle: RotationCircle) => {
        const baseClasses = "absolute rounded-full border-2 transition-all duration-100 ease-linear";

        const visibilityClasses = showCircles
            ? "opacity-100 scale-100"
            : "opacity-0 scale-0";

        const animationClasses = circle.isAnimating
            ? "opacity-0 scale-75 transition-all duration-200"
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

    // Touch event handlers
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
            }, 100);
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

        if (touchTime && currentTime - touchTime < 300) {
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
        <div className="flex items-center justify-center min-h-[400px] p-4">
            <div
                ref={containerRef}
                className="relative"
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
                        className="w-2 h-2 bg-white/30 rounded-full animate-pulse"
                        style={{
                            animation: `pulse-gentle 2s ease-in-out infinite`,
                        }}
                    />
                </div>

                {/* Rotating container for all circles */}
                <div
                    ref={rotatingContainerRef}
                    className="absolute inset-0"
                    style={{
                        animation: `spin ${rotationDurationMs}ms linear infinite`,
                        animationPlayState: isGameActive ? 'running' : 'paused',
                        transformOrigin: 'center center',
                    }}
                >
                    {/* Circles - positioned statically within rotating container */}
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
                                className={`${circleStyleConfig.className} disabled:cursor-not-allowed select-none`}
                                disabled={!isGameActive}
                                style={{
                                    width: `${circleSize}px`,
                                    height: `${circleSize}px`,
                                    minWidth: `${circleSize}px`,
                                    minHeight: `${circleSize}px`,
                                    // Static position within rotating container
                                    left: `50%`,
                                    top: `50%`,
                                    transform: `translate(calc(-50% + ${staticPosition.x}px), calc(-50% + ${staticPosition.y}px))`,
                                    transitionDelay: showCircles ? `${circle.id * 30}ms` : "0ms",
                                    touchAction: "manipulation",
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

                {/* Rotation direction indicator */}
                <div className="absolute bottom-2 right-2">
                    <div
                        className="w-6 h-6 border-2 border-white/20 rounded-full relative"
                        style={{
                            animation: `spin ${rotationDurationMs}ms linear infinite`,
                        }}
                    >
                        <div className="absolute top-0 left-1/2 w-1 h-1 bg-white/40 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                </div>
            </div>
        </div>
    );
}