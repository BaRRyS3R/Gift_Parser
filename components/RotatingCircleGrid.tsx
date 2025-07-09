// src/components/RotatingCircleGrid.tsx - Adapted to full-screen width & height with preserved adaptive circle sizes

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

    const currentRotationRef = useRef<number>(0);
    const lastUpdateTimeRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number | null>(null);
    const currentSpeedRef = useRef<number>(rotationSpeed);
    const targetSpeedRef = useRef<number>(rotationSpeed);

    const [circleSize, setCircleSize] = useState(40);
    const [containerWidth, setContainerWidth] = useState(350);
    const [containerHeight, setContainerHeight] = useState(350);
    const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);

    useEffect(() => {
        const calculateAdaptiveSizes = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const horizontalMargins = 32;
            const availableWidth = screenWidth - horizontalMargins;

            const calculatedWidth = availableWidth;
            const calculatedHeight = screenHeight;
            const calculatedCircleSize = Math.max(32, Math.min(calculatedWidth / 9, 52));

            setContainerWidth(calculatedWidth);
            setContainerHeight(calculatedHeight);
            setCircleSize(calculatedCircleSize);
        };

        calculateAdaptiveSizes();
        window.addEventListener("resize", calculateAdaptiveSizes);
        window.addEventListener("orientationchange", () => setTimeout(calculateAdaptiveSizes, 100));

        return () => {
            window.removeEventListener("resize", calculateAdaptiveSizes);
            window.removeEventListener("orientationchange", calculateAdaptiveSizes);
        };
    }, []);

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
                    setActivePulses(prev => prev.filter(p => p.timestamp !== newPulses[0]?.timestamp));
                }, 400);
            }, 100);
            return () => clearTimeout(pulseDelay);
        }
    }, [onActivatedCircles, lastActivationTimestamp, circles]);

    const updateRotation = useCallback(() => {
        if (!isGameActive || !rotatingContainerRef.current) return;

        const now = Date.now();
        const deltaTime = now - lastUpdateTimeRef.current;
        lastUpdateTimeRef.current = now;

        const speedDiff = targetSpeedRef.current - currentSpeedRef.current;
        const interpFactor = Math.min(deltaTime * 0.002, 1);
        currentSpeedRef.current += speedDiff * interpFactor;

        const speedInRadPerMs = currentSpeedRef.current / 16.67;
        const rotationIncrement = speedInRadPerMs * deltaTime;
        currentRotationRef.current += rotationIncrement;

        rotatingContainerRef.current.style.transform = `rotate(${currentRotationRef.current}rad)`;
        animationFrameRef.current = requestAnimationFrame(updateRotation);
    }, [isGameActive]);

    useEffect(() => {
        targetSpeedRef.current = rotationSpeed;
    }, [rotationSpeed]);

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

    const getCircleStaticPosition = useCallback((circle: RotationCircle) => {
        const radiusX = containerWidth * 0.42;
        const radiusY = containerHeight * 0.42;
        const x = Math.cos(circle.angle) * radiusX;
        const y = Math.sin(circle.angle) * radiusY;
        return { x, y };
    }, [containerWidth, containerHeight]);

    const getCircleStyles = (circle: RotationCircle) => {
        const isDeactivating = circle.isAnimating;
        const transitionClass = isDeactivating ? "transition-all duration-75" : "transition-colors duration-200 ease-in-out";
        const baseClasses = `absolute rounded-full border-2 ${transitionClass}`;
        const visibilityClasses = showCircles ? "opacity-100 scale-100" : "opacity-0 scale-0";
        const animationClasses = circle.isAnimating ? "opacity-0 scale-75" : "";

        if (circle.isActive && !circle.isAnimating) {
            if (circle.isDecoy) {
                return {
                    className: `${baseClasses} ${visibilityClasses} ${animationClasses} bg-red-500 border-red-400 shadow-lg shadow-red-500/50 scale-110 hover:scale-125 active:scale-95 cursor-pointer`,
                };
            } else {
                return {
                    className: `${baseClasses} ${visibilityClasses} ${animationClasses} bg-white shadow-lg shadow-white/50 border-white scale-110 hover:scale-125 active:scale-95 cursor-pointer`,
                };
            }
        } else {
            return {
                className: `${baseClasses} ${visibilityClasses} ${animationClasses} bg-transparent border-white/40 hover:border-white/60 hover:scale-105 active:scale-95 cursor-pointer`,
            };
        }
    };

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
        if (touchTime && currentTime - touchTime < 200) return;
        event.preventDefault();
        event.stopPropagation();
        onCircleClick(circleId);
    };

    const renderPulseEffect = (circle: RotationCircle) => {
        if (!circle.isActive || circle.isAnimating) return null;
        const pulseColor = circle.isDecoy ? "border-red-400" : "border-white";
        const animationDuration = circle.isDecoy ? "1.2s" : "0.8s";
        return (
            <div
                className={`absolute inset-0 rounded-full border-2 ${pulseColor} opacity-50`}
                style={{ animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite` }}
            />
        );
    };

    const renderActivationPulse = (circle: RotationCircle) => {
        const pulse = activePulses.find(p => p.circleId === circle.id);
        if (!pulse) return null;
        const pulseClass = pulse.isRed ? "activation-pulse-red" : "activation-pulse";
        const pulseColor = pulse.isRed ? "border-red-400" : "border-white";
        return (
            <div
                className={`absolute inset-0 rounded-full border-2 ${pulseColor} ${pulseClass} pointer-events-none`}
                style={{ zIndex: -1 }}
            />
        );
    };

    return (
        <div className="w-full h-screen flex items-center justify-center overflow-visible p-0">
            <div
                ref={containerRef}
                className="relative stable-container"
                style={{
                    width: `${containerWidth}px`,
                    height: `${containerHeight}px`,
                    overflow: "visible",
                }}
            >
                <div
                    ref={rotatingContainerRef}
                    className="absolute high-performance-rotation"
                    style={{
                        width: `${containerWidth}px`,
                        height: `${containerHeight}px`,
                        top: 0,
                        left: 0,
                        transformOrigin: "50% 50%",
                    }}
                >
                    {circles.map(circle => {
                        const { x, y } = getCircleStaticPosition(circle);
                        const styles = getCircleStyles(circle);
                        return (
                            <button
                                key={circle.id}
                                className={`${styles.className} disabled:cursor-not-allowed select-none touch-optimized`}
                                disabled={!isGameActive}
                                style={{
                                    width: `${circleSize}px`,
                                    height: `${circleSize}px`,
                                    left: "50%",
                                    top: "50%",
                                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                    transitionDelay: showCircles ? `${circle.id * 30}ms` : "0ms",
                                }}
                                type="button"
                                onClick={(event) => handleClick(circle.id, event)}
                                onContextMenu={(event) => event.preventDefault()}
                                onTouchEnd={(event) => handleTouchEnd(circle.id, event)}
                                onTouchStart={(event) => handleTouchStart(circle.id, event)}
                            >
                                {renderPulseEffect(circle)}
                                {renderActivationPulse(circle)}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
