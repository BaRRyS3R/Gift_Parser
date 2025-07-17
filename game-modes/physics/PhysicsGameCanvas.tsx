// src/game-modes/physics/PhysicsGameCanvas.tsx - Updated implementation without visible boundaries and proper screen positioning

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
    const activeTouchesRef = useRef<Map<number, {
        startTime: number;
        startPosition: { x: number; y: number };
        currentPosition: { x: number; y: number };
        circleId?: number;
        processed: boolean;
    }>>(new Map());

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

    // Main drawing function - no boundary drawing, just circles
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw circles only - no boundaries
        gameState.circles.forEach((circle) => {
            // Skip circles that are being deactivated immediately
            if (circle.isAnimating) return;

            ctx.save();

            // Simplified circle rendering without effects
            if (circle.isActive) {
                if (circle.isDecoy) {
                    // Solid red circles for decoys
                    ctx.fillStyle = "#ef4444";
                    ctx.strokeStyle = "#ef4444";
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 1;
                } else {
                    // White active circles with white fill
                    ctx.fillStyle = "#ffffff";
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 1;
                }
            } else {
                // Inactive circles with transparent fill and white border
                ctx.fillStyle = "transparent";
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.8;
            }

            // Draw circle
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        });
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
                w-full h-full transition-all duration-300
                ${showCanvas ? "opacity-100" : "opacity-0"}
            `}
            style={{
                height: `${gameState.config.containerHeight}px`,
                width: `${gameState.config.containerWidth}px`,
            }}
        >
            <canvas
                ref={canvasRef}
                width={gameState.config.containerWidth}
                height={gameState.config.containerHeight}
                className={`
                    w-full h-full cursor-crosshair transition-all duration-300 bg-transparent
                    ${isGameActive ? "opacity-100" : "opacity-50"}
                    ${showCanvas ? "scale-100" : "scale-95"}
                `}
                onClick={handleCanvasClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
                style={{
                    touchAction: "none",
                    display: "block",
                }}
            />
        </div>
    );
}