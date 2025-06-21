// src/game-modes/physics/PhysicsGameCanvas.tsx - Canvas для отрисовки физического режима

"use client";

import React, { useRef, useEffect, useCallback } from "react";
import * as Matter from "matter-js";
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

    // Получение позиции клика относительно canvas
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

    // Проверка клика по кругу
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

    // Обработка клика по canvas
    const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isGameActive) return;

        const clickPos = getClickPosition(event);
        if (!clickPos) return;

        const clickedCircle = getClickedCircle(clickPos.x, clickPos.y, gameState.circles);
        if (clickedCircle) {
            onCircleClick(clickedCircle.id, event);
        }
    }, [isGameActive, getClickPosition, getClickedCircle, gameState.circles, onCircleClick]);

    // Функция отрисовки
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Отрисовка границ контейнера
        ctx.strokeStyle = "#ffffff40";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        // Верхняя граница
        if (gameState.boundaries.top) {
            ctx.strokeStyle = "#ffffff60";
            ctx.setLineDash([]);
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = "#ff444440";
            ctx.setLineDash([10, 10]);
            ctx.lineWidth = 2;
        }
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(canvas.width, 0);
        ctx.stroke();

        // Нижняя граница
        if (gameState.boundaries.bottom) {
            ctx.strokeStyle = "#ffffff60";
            ctx.setLineDash([]);
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = "#ff444440";
            ctx.setLineDash([10, 10]);
            ctx.lineWidth = 2;
        }
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.stroke();

        // Левая граница
        if (gameState.boundaries.left) {
            ctx.strokeStyle = "#ffffff60";
            ctx.setLineDash([]);
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = "#ff444440";
            ctx.setLineDash([10, 10]);
            ctx.lineWidth = 2;
        }
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, canvas.height);
        ctx.stroke();

        // Правая граница
        if (gameState.boundaries.right) {
            ctx.strokeStyle = "#ffffff60";
            ctx.setLineDash([]);
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = "#ff444440";
            ctx.setLineDash([10, 10]);
            ctx.lineWidth = 2;
        }
        ctx.beginPath();
        ctx.moveTo(canvas.width, 0);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.stroke();

        // Сброс настроек линии
        ctx.setLineDash([]);

        // Отрисовка кругов
        gameState.circles.forEach((circle) => {
            if (circle.isAnimating) return; // Не рисуем анимирующиеся круги

            ctx.save();

            // Определяем цвет и стиль круга
            if (circle.isActive) {
                if (circle.isDecoy) {
                    // Красный круг (ловушка)
                    ctx.fillStyle = "#ef4444";
                    ctx.strokeStyle = "#dc2626";
                    ctx.lineWidth = 3;

                    // Эффект пульсации для красных кругов
                    const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 1;
                    ctx.globalAlpha = 0.9;
                    ctx.scale(pulse, pulse);
                    ctx.translate((circle.x * (1 - pulse)) / pulse, (circle.y * (1 - pulse)) / pulse);
                } else {
                    // Белый активный круг
                    ctx.fillStyle = "#ffffff";
                    ctx.strokeStyle = "#e5e5e5";
                    ctx.lineWidth = 3;
                    ctx.globalAlpha = 1;

                    // Легкое свечение
                    ctx.shadowColor = "#ffffff";
                    ctx.shadowBlur = 10;
                }
            } else {
                // Неактивный круг
                ctx.fillStyle = "#ffffff20";
                ctx.strokeStyle = "#ffffff40";
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.7;
            }

            // Рисуем круг
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Добавляем индикатор скорости для движущихся кругов
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

        // Отрисовка отладочной информации (только в dev режиме)
        if (process.env.NODE_ENV === "development") {
            ctx.fillStyle = "#ffffff80";
            ctx.font = "12px monospace";
            ctx.fillText(`Circles: ${gameState.circles.length}`, 10, 20);
            ctx.fillText(`Active: ${gameState.activeCircleIds.length}`, 10, 35);
            ctx.fillText(`Mistakes: ${gameState.stats.currentMistakes}/${gameState.config.maxMistakes}`, 10, 50);

            // Показываем состояние границ
            const boundaries = gameState.boundaries;
            ctx.fillText(
                `Walls: T:${boundaries.top ? "✓" : "✗"} L:${boundaries.left ? "✓" : "✗"} R:${boundaries.right ? "✓" : "✗"} B:${boundaries.bottom ? "✓" : "✗"}`,
                10,
                65
            );
        }
    }, [gameState]);

    // Анимационный цикл
    const animate = useCallback(() => {
        draw();
        if (showCanvas && isGameActive) {
            animationFrameRef.current = requestAnimationFrame(animate);
        }
    }, [draw, showCanvas, isGameActive]);

    // Запуск/остановка анимации
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

    // Обновление размеров canvas при изменении конфигурации
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = gameState.config.containerWidth;
        canvas.height = gameState.config.containerHeight;
    }, [gameState.config.containerWidth, gameState.config.containerHeight]);

    // Обработка touch событий для мобильных устройств
    const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
        event.preventDefault();
        if (!isGameActive || event.touches.length === 0) return;

        const touch = event.touches[0];
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clickPos = {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY,
        };

        const clickedCircle = getClickedCircle(clickPos.x, clickPos.y, gameState.circles);
        if (clickedCircle) {
            // Создаем синтетическое событие мыши для совместимости
            const syntheticEvent = {
                preventDefault: () => { },
                stopPropagation: () => { },
            } as React.MouseEvent;

            onCircleClick(clickedCircle.id, syntheticEvent);
        }
    }, [isGameActive, getClickedCircle, gameState.circles, onCircleClick]);

    return (
        <div
            className={`
        flex items-center justify-center transition-all duration-300
        ${showCanvas ? "opacity-100" : "opacity-0"}
      `}
            style={{
                width: gameState.config.containerWidth + 40, // +40 для отступов
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
                style={{
                    touchAction: "none", // Предотвращает скролл на мобильных
                }}
            />
        </div>
    );
}