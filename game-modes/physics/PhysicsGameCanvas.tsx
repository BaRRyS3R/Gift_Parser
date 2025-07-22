// src/game-modes/physics/PhysicsGameCanvas.tsx - Optimized implementation with dirty checking

"use client";

import React, { useRef, useEffect, useCallback, useMemo } from "react";

import { PhysicsGameState } from "@/types/game-modes/physics";
import { PhysicsCircle } from "@/types/game-modes/common";

interface PhysicsGameCanvasProps {
  gameState: PhysicsGameState;
  onCircleClick: (circleId: number, event: React.MouseEvent) => void;
  isGameActive: boolean;
  showCanvas: boolean;
}

interface CircleRenderState {
  id: number;
  x: number;
  y: number;
  radius: number;
  isActive: boolean;
  isDecoy: boolean;
  isAnimating: boolean;
}

export default function PhysicsGameCanvas({
  gameState,
  onCircleClick,
  isGameActive,
  showCanvas,
}: PhysicsGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastRenderStateRef = useRef<CircleRenderState[]>([]);
  const needsRedrawRef = useRef<boolean>(true);

  // Touch handling refs for preventing multiple touches
  const activeTouchesRef = useRef<
    Map<
      number,
      {
        startTime: number;
        startPosition: { x: number; y: number };
        currentPosition: { x: number; y: number };
        circleId?: number;
        processed: boolean;
      }
    >
  >(new Map());

  // Spatial indexing for efficient circle lookup
  const spatialGridRef = useRef<Map<string, PhysicsCircle[]>>(new Map());
  const gridSizeRef = useRef<number>(100);

  // Build spatial grid for efficient circle lookup
  const buildSpatialGrid = useCallback((circles: PhysicsCircle[]) => {
    spatialGridRef.current.clear();
    const gridSize = gridSizeRef.current;

    circles.forEach((circle) => {
      const gridX = Math.floor(circle.x / gridSize);
      const gridY = Math.floor(circle.y / gridSize);
      const key = `${gridX},${gridY}`;

      if (!spatialGridRef.current.has(key)) {
        spatialGridRef.current.set(key, []);
      }
      spatialGridRef.current.get(key)!.push(circle);
    });
  }, []);

  // Function to get click position relative to canvas
  const getClickPosition = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  // Optimized function to check if click hit a circle using spatial indexing
  const getClickedCircle = useCallback(
    (clickX: number, clickY: number, circles: PhysicsCircle[]): PhysicsCircle | null => {
      const gridSize = gridSizeRef.current;
      const gridX = Math.floor(clickX / gridSize);
      const gridY = Math.floor(clickY / gridSize);

      // Check current grid cell and surrounding cells
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${gridX + dx},${gridY + dy}`;
          const cellCircles = spatialGridRef.current.get(key);

          if (cellCircles) {
            for (const circle of cellCircles) {
              const distance = Math.sqrt(
                Math.pow(clickX - circle.x, 2) + Math.pow(clickY - circle.y, 2),
              );
              if (distance <= circle.radius) {
                return circle;
              }
            }
          }
        }
      }

      return null;
    },
    [],
  );

  // Canvas click handler
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isGameActive) return;

      const clickPos = getClickPosition(event);
      if (!clickPos) return;

      const clickedCircle = getClickedCircle(
        clickPos.x,
        clickPos.y,
        gameState.circles,
      );

      if (clickedCircle) {
        onCircleClick(clickedCircle.id, event);
      }
    },
    [
      isGameActive,
      getClickPosition,
      getClickedCircle,
      gameState.circles,
      onCircleClick,
    ],
  );

  // Enhanced touch handler with optimized lookup
  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      if (!isGameActive) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const currentTime = Date.now();

      // Clean up old touches (prevent memory leaks)
      const touchesToRemove: number[] = [];
      activeTouchesRef.current.forEach((touchData, touchId) => {
        if (currentTime - touchData.startTime > 5000) {
          touchesToRemove.push(touchId);
        }
      });
      touchesToRemove.forEach(touchId => {
        activeTouchesRef.current.delete(touchId);
      });

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

        const clickedCircle = getClickedCircle(
          touchPosition.x,
          touchPosition.y,
          gameState.circles,
        );

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
    },
    [isGameActive, getClickedCircle, gameState.circles, onCircleClick],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
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
    },
    [isGameActive],
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault();

      // Clean up ended touches
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchId = touch.identifier;
        activeTouchesRef.current.delete(touchId);
      }
    },
    [],
  );

  const handleTouchCancel = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault();

      // Clean up cancelled touches
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchId = touch.identifier;
        activeTouchesRef.current.delete(touchId);
      }
    },
    [],
  );

  // Memoized render state to detect changes
  const currentRenderState = useMemo<CircleRenderState[]>(() => {
    return gameState.circles.map((circle) => ({
      id: circle.id,
      x: Math.round(circle.x * 10) / 10, // Round to reduce unnecessary redraws
      y: Math.round(circle.y * 10) / 10,
      radius: circle.radius,
      isActive: circle.isActive,
      isDecoy: circle.isDecoy,
      isAnimating: circle.isAnimating,
    }));
  }, [gameState.circles]);

  // Check if redraw is needed (dirty checking)
  const checkNeedsRedraw = useCallback(() => {
    const lastState = lastRenderStateRef.current;
    const currentState = currentRenderState;

    if (lastState.length !== currentState.length) {
      return true;
    }

    for (let i = 0; i < currentState.length; i++) {
      const current = currentState[i];
      const last = lastState[i];

      if (
        current.x !== last?.x ||
        current.y !== last?.y ||
        current.isActive !== last?.isActive ||
        current.isDecoy !== last?.isDecoy ||
        current.isAnimating !== last?.isAnimating
      ) {
        return true;
      }
    }

    return false;
  }, [currentRenderState]);

  // Optimized drawing function with dirty checking
  const draw = useCallback(() => {
    if (!needsRedrawRef.current && !checkNeedsRedraw()) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw circles only - no boundaries
    currentRenderState.forEach((circle) => {
      // Skip circles that are being deactivated immediately
      if (circle.isAnimating) return;

      ctx.save();

      // Determine circle color and style
      if (circle.isActive) {
        if (circle.isDecoy) {
          // Red trap circle - fully red when active
          ctx.fillStyle = "#ef4444";
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 3;
          ctx.globalAlpha = 1;
        } else {
          // White active circle - fully white when active
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.globalAlpha = 1;
        }
      } else {
        // Inactive circle - only border, no fill
        if (circle.isDecoy) {
          ctx.fillStyle = "transparent";
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7;
        } else {
          ctx.fillStyle = "transparent";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7;
        }
      }

      // Draw circle
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);

      // Fill only if active
      if (circle.isActive) {
        ctx.fill();
      }
      ctx.stroke();

      ctx.restore();
    });

    // Update last render state
    lastRenderStateRef.current = [...currentRenderState];
    needsRedrawRef.current = false;
  }, [currentRenderState, checkNeedsRedraw]);

  // Animation loop with optimized redraw logic
  const animate = useCallback(() => {
    draw();
    if (showCanvas && isGameActive) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [draw, showCanvas, isGameActive]);

  // Force redraw when game state changes significantly
  useEffect(() => {
    needsRedrawRef.current = true;
    buildSpatialGrid(gameState.circles);
  }, [gameState.circles, buildSpatialGrid]);

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
      spatialGridRef.current.clear();
    };
  }, []);

  // Start/stop animation based on game state
  useEffect(() => {
    if (showCanvas && isGameActive) {
      needsRedrawRef.current = true;
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
    needsRedrawRef.current = true;
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
        className={`
                    w-full h-full cursor-crosshair transition-all duration-300 bg-transparent
                    ${isGameActive ? "opacity-100" : "opacity-50"}
                    ${showCanvas ? "scale-100" : "scale-95"}
                `}
        height={gameState.config.containerHeight}
        style={{
          touchAction: "none",
          display: "block",
        }}
        width={gameState.config.containerWidth}
        onClick={handleCanvasClick}
        onTouchCancel={handleTouchCancel}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      />
    </div>
  );
}