// src/game-modes/physics/PhysicsGameCanvas.tsx - Complete fixed implementation with touch handling and visual boundary updates

"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { PhysicsGameState } from "@/types/game-modes/physics";
import { PhysicsCircle } from "@/types/game-modes/common";

interface PhysicsGameCanvasProps {
    gameState: PhysicsGameState;
    onCircleClick: (circleId: number, event: React.MouseEvent) => void;
    isGameActive: boolean;
    showCanvas: boolean;
}

export default function PhysicsGameCanvas({
    gameState,
    onCircleClick,
    isGameActive,
    showCanvas,
}: PhysicsGameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();

    // Touch handling refs for preventing multiple touches
    const touchProcessedRef = useRef<Set<number>>(new Set());
    const lastTouchTimeRef = useRef<number>(0);

    // Function to get click position relative to canvas
    const getClickPosition = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY,
        };
    }, []);

    // Function to check if click hit a circle
    const getClickedCircle = useCallback((
        clickX: number,
        clickY: number,
        circles: PhysicsCircle[]
    ): PhysicsCircle | null => {
        for (const circle of circles) {
            const distance = Math.sqrt(
                Math.pow(clickX - circle.x, 2) + Math.pow(clickY - circle.y, 2)
            );
            if (distance <= circle.radius) {
                return circle;
            }
        }
        return null;
    }, []);

    const activeTouchesRef = useRef<Map<number, {
        startTime: number;
        startPosition: { x: number; y: number };
        currentPosition: { x: number; y: number };
        circleId?: number;
        processed: boolean;
    }>>(new Map());

    // Canvas click handler
    const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isGameActive) return;

        const clickPos = getClickPosition(event);
        if (!clickPos) return;

        const clickedCircle = getClickedCircle(clickPos.x, clickPos.y, gameState.circles);
        if (clickedCircle) {
            onCircleClick(clickedCircle.id, event);
        }
    }, [isGameActive, getClickPosition, getClickedCircle, gameState.circles, onCircleClick]);

    // Enhanced touch handler with debouncing
    const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
        event.preventDefault();
        if (!isGameActive) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const currentTime = Date.now();

        // Process each new touch
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchId = touch.identifier;

            // Skip if touch is already being tracked
            if (activeTouchesRef.current.has(touchId)) continue;

            const touchPosition = {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };

            const clickedCircle = getClickedCircle(touchPosition.x, touchPosition.y, gameState.circles);

            if (clickedCircle) {
                // Register new touch
                activeTouchesRef.current.set(touchId, {
                    startTime: currentTime,
                    startPosition: touchPosition,
                    currentPosition: touchPosition,
                    circleId: clickedCircle.id,
                    processed: false,
                });

                // Immediately process the touch
                const syntheticEvent = {
                    preventDefault: () => { },
                    stopPropagation: () => { },
                } as React.MouseEvent;

                onCircleClick(clickedCircle.id, syntheticEvent);

                // Mark as processed
                const touchData = activeTouchesRef.current.get(touchId);
                if (touchData) {
                    touchData.processed = true;
                }
            }
        }
    }, [isGameActive, getClickedCircle, gameState.circles, onCircleClick]);

    const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
        event.preventDefault();
        if (!isGameActive) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Update positions for tracked touches
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchId = touch.identifier;
            const touchData = activeTouchesRef.current.get(touchId);

            if (touchData) {
                touchData.currentPosition = {
                    x: (touch.clientX - rect.left) * scaleX,
                    y: (touch.clientY - rect.top) * scaleY,
                };
            }
        }
    }, [isGameActive]);

    const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
        event.preventDefault();

        // Clean up ended touches
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchId = touch.identifier;
            activeTouchesRef.current.delete(touchId);
        }
    }, []);

    const handleTouchCancel = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
        event.preventDefault();

        // Clean up cancelled touches
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchId = touch.identifier;
            activeTouchesRef.current.delete(touchId);
        }
    }, []);



    // Main drawing function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw circles
        gameState.circles.forEach((circle) => {
            if (circle.isAnimating) return; // Skip animating circles

            ctx.save();

            // Determine circle color and style
            if (circle.isActive) {
                if (circle.isDecoy) {
                    // Red trap circle
                    ctx.fillStyle = "#ef4444";
                    ctx.strokeStyle = "#dc2626";
                    ctx.lineWidth = 3;

                    // Pulsing effect for red circles
                    const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 1;
                    ctx.globalAlpha = 0.9;
                    ctx.scale(pulse, pulse);
                    ctx.translate((circle.x * (1 - pulse)) / pulse, (circle.y * (1 - pulse)) / pulse);
                } else {
                    // White active circle
                    ctx.fillStyle = "#ffffff";
                    ctx.strokeStyle = "#e5e5e5";
                    ctx.lineWidth = 3;
                    ctx.globalAlpha = 1;

                    // Subtle glow effect
                    ctx.shadowColor = "#ffffff";
                    ctx.shadowBlur = 10;
                }
            } else {
                // Inactive circle
                ctx.fillStyle = "#ffffff20";
                ctx.strokeStyle = "#ffffff40";
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.7;
            }

            // Draw circle
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Add velocity indicator for moving circles
            if (circle.vx && circle.vy && (Math.abs(circle.vx) > 0.1 || Math.abs(circle.vy) > 0.1)) {
                const velocity = Math.sqrt(circle.vx * circle.vx + circle.vy * circle.vy);
                if (velocity > 0.5) {
                    const trailLength = Math.min(velocity * 3, 30);
                    const angle = Math.atan2(circle.vy, circle.vx);

                    ctx.strokeStyle = circle.isActive
                        ? (circle.isDecoy ? "#ef444460" : "#ffffff60")
                        : "#ffffff30";
                    ctx.lineWidth = 2;
                    ctx.lineCap = "round";

                    ctx.beginPath();
                    ctx.moveTo(
                        circle.x - Math.cos(angle) * trailLength,
                        circle.y - Math.sin(angle) * trailLength
                    );
                    ctx.lineTo(circle.x, circle.y);
                    ctx.stroke();
                }
            }

            ctx.restore();
        });

        // Development debug information
        if (process.env.NODE_ENV === "development") {
            ctx.fillStyle = "#ffffff80";
            ctx.font = "12px monospace";
            ctx.fillText(`Circles: ${gameState.circles.length}`, 10, 20);
            ctx.fillText(`Active: ${gameState.activeCircleIds.length}`, 10, 35);
            ctx.fillText(`Mistakes: ${gameState.stats.currentMistakes}/${gameState.config.maxMistakes}`, 10, 50);

            // Show boundary states
            const boundaries = gameState.boundaries;
            ctx.fillText(
                `Walls: T:${boundaries.top ? "✓" : "✗"} L:${boundaries.left ? "✓" : "✗"} R:${boundaries.right ? "✓" : "✗"} B:${boundaries.bottom ? "✓" : "✗"}`,
                10,
                65
            );
        }
    }, [gameState]);

    // Animation loop
    const animate = useCallback(() => {
        draw();
        if (showCanvas && isGameActive) {
            animationFrameRef.current = requestAnimationFrame(animate);
        }
    }, [draw, showCanvas, isGameActive]);

    useEffect(() => {
        // Clear all active touches when game becomes inactive
        if (!isGameActive) {
            activeTouchesRef.current.clear();
            lastTouchTimeRef.current = 0;
        }
    }, [isGameActive]);

    useEffect(() => {
        return () => {
            // Cleanup on component unmount
            activeTouchesRef.current.clear();
        };
    }, []);

    // Start/stop animation based on game state
    useEffect(() => {
        if (showCanvas && isGameActive) {
            animate();
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [showCanvas, isGameActive, animate]);

    // Update canvas dimensions when configuration changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = gameState.config.containerWidth;
        canvas.height = gameState.config.containerHeight;
    }, [gameState.config.containerWidth, gameState.config.containerHeight]);

    return (
        <div
            className={`
                flex items-center justify-center transition-all duration-300
                ${showCanvas ? "opacity-100" : "opacity-0"}
            `}
            style={{
                width: gameState.config.containerWidth + 40, // +40 for margins
                height: gameState.config.containerHeight + 40,
            }}
        >
            <canvas
                ref={canvasRef}
                width={gameState.config.containerWidth}
                height={gameState.config.containerHeight}
                className={`
    border-2 border-white/20 rounded-lg bg-black/20 backdrop-blur-sm
    cursor-crosshair transition-all duration-300
    ${isGameActive ? "hover:border-white/40" : "opacity-50"}
    ${showCanvas ? "scale-100" : "scale-95"}
  `}
                onClick={handleCanvasClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
                style={{
                    touchAction: "none",
                }}
            />
        </div>
    );
}