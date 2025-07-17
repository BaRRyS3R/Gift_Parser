// src/game-modes/physics/PhysicsGameCanvas.tsx - Оптимизированная версия для мобильных устройств

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

// Детекция типа устройства для оптимизации
const isMobileDevice = (): boolean => {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isLowPerformanceDevice = (): boolean => {
    if (typeof navigator === 'undefined') return false;

    const isOldAndroid = /Android [1-6]\./.test(navigator.userAgent);
    const isOldIOS = /OS [1-9]_/.test(navigator.userAgent);

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');

    return isOldAndroid || isOldIOS || isSlowConnection;
};

export default function PhysicsGameCanvas({
    gameState,
    onCircleClick,
    isGameActive,
    showCanvas,
}: PhysicsGameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();
    const lastDrawTimeRef = useRef<number>(0);
    const deviceTypeRef = useRef({
        isMobile: isMobileDevice(),
        isLowPerf: isLowPerformanceDevice()
    });

    // Touch handling refs for preventing multiple touches
    const activeTouchesRef = useRef<Map<number, {
        startTime: number;
        startPosition: { x: number; y: number };
        currentPosition: { x: number; y: number };
        circleId?: number;
        processed: boolean;
    }>>(new Map());

    // Оптимизированная функция получения позиции клика
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

    // Оптимизированная функция проверки попадания
    const getClickedCircle = useCallback((
        clickX: number,
        clickY: number,
        circles: PhysicsCircle[]
    ): PhysicsCircle | null => {
        // Проверяем только активные круги для лучшей производительности
        const activeCircles = circles.filter(circle => circle.isActive && !circle.isAnimating);

        for (const circle of activeCircles) {
            const dx = clickX - circle.x;
            const dy = clickY - circle.y;
            const distanceSquared = dx * dx + dy * dy;
            const radiusSquared = circle.radius * circle.radius;

            if (distanceSquared <= radiusSquared) {
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

    // Optimized touch handlers with better debouncing for mobile
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

    // Высокооптимизированная функция отрисовки для мобильных устройств
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { isMobile, isLowPerf } = deviceTypeRef.current;

        // Настройки оптимизации для разных типов устройств
        if (isMobile) {
            ctx.imageSmoothingEnabled = !isLowPerf; // Отключаем сглаживание на слабых устройствах
        }

        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Группируем круги по типу для оптимизации
        const activeCircles: PhysicsCircle[] = [];
        const inactiveCircles: PhysicsCircle[] = [];
        const decoyCircles: PhysicsCircle[] = [];

        gameState.circles.forEach((circle) => {
            if (circle.isAnimating) return; // Пропускаем анимирующиеся круги

            if (circle.isActive) {
                if (circle.isDecoy) {
                    decoyCircles.push(circle);
                } else {
                    activeCircles.push(circle);
                }
            } else {
                inactiveCircles.push(circle);
            }
        });

        // Рисуем неактивные круги одним проходом (для производительности)
        if (inactiveCircles.length > 0) {
            ctx.save();
            ctx.fillStyle = "#ffffff20";
            ctx.strokeStyle = "#ffffff40";
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;

            ctx.beginPath();
            inactiveCircles.forEach(circle => {
                ctx.moveTo(circle.x + circle.radius, circle.y);
                ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
            });
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Рисуем активные белые круги
        if (activeCircles.length > 0) {
            activeCircles.forEach(circle => {
                ctx.save();
                ctx.fillStyle = "#ffffff";
                ctx.strokeStyle = "#e5e5e5";
                ctx.lineWidth = 3;
                ctx.globalAlpha = 1;

                // Добавляем тонкое свечение только на производительных устройствах
                if (!isLowPerf) {
                    ctx.shadowColor = "#ffffff";
                    ctx.shadowBlur = 10;
                }

                ctx.beginPath();
                ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Отрисовка индикатора скорости (только для быстро движущихся кругов)
                if (!isLowPerf && circle.vx && circle.vy && (Math.abs(circle.vx) > 0.1 || Math.abs(circle.vy) > 0.1)) {
                    const velocity = Math.sqrt(circle.vx * circle.vx + circle.vy * circle.vy);
                    if (velocity > 0.5) {
                        const trailLength = Math.min(velocity * 3, 30);
                        const angle = Math.atan2(circle.vy, circle.vx);

                        ctx.strokeStyle = "#ffffff60";
                        ctx.lineWidth = 2;
                        ctx.lineCap = "round";
                        ctx.shadowBlur = 0; // Отключаем тень для линии

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
        }

        // Рисуем красные круги-ловушки с пульсацией
        if (decoyCircles.length > 0) {
            const currentTime = Date.now();
            const pulse = Math.sin(currentTime * 0.01) * 0.1 + 1;

            decoyCircles.forEach(circle => {
                ctx.save();
                ctx.fillStyle = "#ef4444";
                ctx.strokeStyle = "#dc2626";
                ctx.lineWidth = 3;
                ctx.globalAlpha = 0.9;

                // Эффект пульсации только на производительных устройствах
                if (!isLowPerf) {
                    ctx.scale(pulse, pulse);
                    ctx.translate((circle.x * (1 - pulse)) / pulse, (circle.y * (1 - pulse)) / pulse);
                }

                ctx.beginPath();
                ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            });
        }
    }, [gameState]);

    // Оптимизированная анимационная петля с контролем частоты кадров
    const animate = useCallback(() => {
        if (!showCanvas || !isGameActive) {
            return;
        }

        const currentTime = performance.now();
        const { isMobile, isLowPerf } = deviceTypeRef.current;

        // Ограничиваем FPS на слабых устройствах для лучшей производительности
        const targetFPS = isLowPerf ? 30 : (isMobile ? 45 : 60);
        const frameInterval = 1000 / targetFPS;

        if (currentTime - lastDrawTimeRef.current >= frameInterval) {
            draw();
            lastDrawTimeRef.current = currentTime;
        }

        animationFrameRef.current = requestAnimationFrame(animate);
    }, [draw, showCanvas, isGameActive]);

    // Clear all active touches when game becomes inactive
    useEffect(() => {
        if (!isGameActive) {
            activeTouchesRef.current.clear();
        }
    }, [isGameActive]);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            activeTouchesRef.current.clear();
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // Start/stop animation based on game state
    useEffect(() => {
        if (showCanvas && isGameActive) {
            lastDrawTimeRef.current = performance.now();
            animate();
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = undefined;
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = undefined;
            }
        };
    }, [showCanvas, isGameActive, animate]);

    // Update canvas dimensions when configuration changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Устанавливаем размеры с учетом устройства
        const { isMobile, isLowPerf } = deviceTypeRef.current;

        canvas.width = gameState.config.containerWidth;
        canvas.height = gameState.config.containerHeight;

        // Настройки контекста для оптимизации
        const ctx = canvas.getContext("2d");
        if (ctx) {
            if (isMobile) {
                // Оптимизации для мобильных устройств
                ctx.imageSmoothingEnabled = !isLowPerf;
                if (ctx.imageSmoothingEnabled) {
                    ctx.imageSmoothingQuality = isLowPerf ? 'low' : 'medium';
                }
            }
        }
    }, [gameState.config.containerWidth, gameState.config.containerHeight]);

    // Обработка изменения видимости для экономии ресурсов
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Останавливаем анимацию когда страница не видна
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = undefined;
                }
            } else {
                // Возобновляем анимацию когда страница снова видна
                if (showCanvas && isGameActive) {
                    lastDrawTimeRef.current = performance.now();
                    animate();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [showCanvas, isGameActive, animate]);

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