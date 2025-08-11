// src/game-modes/physics/PhysicsGameCanvas.tsx - Добавлена защита от автоматизации через вариации цветов

"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";

import { PhysicsGameState } from "@/types/game-modes/physics";
import { PhysicsCircle } from "@/types/game-modes/common";

// Массив оттенков белого цвета для защиты от автоматизации
const WHITE_COLOR_VARIANTS = [
  "rgb(255, 255, 255)", // Чистый белый
  "rgb(255, 255, 254)", // Белый с минимальным оттенком
  "rgb(254, 255, 255)", // Белый с оттенком в красном канале
  "rgb(255, 254, 255)", // Белый с оттенком в зеленом канале
  "rgb(254, 254, 255)", // Белый с двойным оттенком
  "rgb(255, 254, 254)", // Белый с оттенками в зеленом и синем
  "rgb(254, 255, 254)", // Белый с оттенками в красном и синем
  "rgb(253, 255, 255)", // Белый с более заметным оттенком красного
  "rgb(255, 253, 255)", // Белый с более заметным оттенком зеленого
  "rgb(255, 255, 253)", // Белый с более заметным оттенком синего
];

// Функция для получения случайного индекса оттенка белого
const getRandomWhiteVariantIndex = (): number => {
  return Math.floor(Math.random() * WHITE_COLOR_VARIANTS.length);
};

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

  // State для хранения назначенных оттенков белого для каждого кружка
  const [circleColorVariants, setCircleColorVariants] = useState<
    Map<number, number>
  >(new Map());

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

  // Функция для генерации нового оттенка для кружка при активации
  const generateColorVariantForCircle = (circleId: number): number => {
    const variantIndex = getRandomWhiteVariantIndex();

    setCircleColorVariants((prev) => new Map(prev).set(circleId, variantIndex));

    return variantIndex;
  };

  // Effect для отслеживания активации кружков и назначения им оттенков
  useEffect(() => {
    gameState.circles.forEach((circle) => {
      if (
        circle.isActive &&
        !circle.isDecoy &&
        !circleColorVariants.has(circle.id)
      ) {
        generateColorVariantForCircle(circle.id);
      }
    });
  }, [gameState.circles, circleColorVariants]);

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

  // Function to check if click hit a circle
  const getClickedCircle = useCallback(
    (
      clickX: number,
      clickY: number,
      circles: PhysicsCircle[],
    ): PhysicsCircle | null => {
      for (const circle of circles) {
        const distance = Math.sqrt(
          Math.pow(clickX - circle.x, 2) + Math.pow(clickY - circle.y, 2),
        );

        if (distance <= circle.radius) {
          return circle;
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

  // Enhanced touch handler with debouncing
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
            preventDefault: () => {},
            stopPropagation: () => {},
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

  // Main drawing function with white color variants support
  const draw = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw circles with color variants
    gameState.circles.forEach((circle) => {
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
          // White active circle with variant color
          const variantIndex = circleColorVariants.get(circle.id) ?? 0;
          const whiteVariant = WHITE_COLOR_VARIANTS[variantIndex];

          ctx.fillStyle = whiteVariant;
          ctx.strokeStyle = whiteVariant;
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
          // Inactive white circle uses standard white for border
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
  }, [gameState, circleColorVariants]);

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
