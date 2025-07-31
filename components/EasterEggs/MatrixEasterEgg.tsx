// src/components/EasterEggs/MatrixEasterEgg.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface MatrixColumn {
    x: number;
    y: number;
    speed: number;
    chars: string[];
    opacity: number;
    length: number;
}

interface MatrixEasterEggProps {
    triggerElementRef: React.RefObject<HTMLElement>;
    isActive: boolean;
    onActivate: () => void;
    onComplete: () => void;
}

const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ANIMATION_DURATION = 6000; // 6 seconds total for mobile
const CLICK_TIMEOUT = 2000;
const MOBILE_COLUMN_WIDTH = 16;
const MOBILE_FONT_SIZE = 12;

enum AnimationPhase {
    INACTIVE = "inactive",
    ACTIVATION = "activation",     // 1s
    PEAK = "peak",                // 4s
    RESTORATION = "restoration"    // 1s
}

export default function MatrixEasterEgg({
    triggerElementRef,
    isActive,
    onActivate,
    onComplete
}: MatrixEasterEggProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const columnsRef = useRef<MatrixColumn[]>([]);
    const startTimeRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const [currentPhase, setCurrentPhase] = useState<AnimationPhase>(AnimationPhase.INACTIVE);
    const [clickCount, setClickCount] = useState(0);
    const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

    // Initialize Matrix columns for mobile
    const initializeColumns = useCallback((canvasWidth: number, canvasHeight: number) => {
        const columns: MatrixColumn[] = [];
        const numColumns = Math.floor(canvasWidth / MOBILE_COLUMN_WIDTH);

        for (let i = 0; i < numColumns; i++) {
            columns.push({
                x: i * MOBILE_COLUMN_WIDTH,
                y: Math.random() * canvasHeight - 200,
                speed: Math.random() * 2 + 1,
                chars: Array.from({ length: 20 }, () =>
                    MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
                ),
                opacity: Math.random() * 0.4 + 0.6,
                length: Math.floor(Math.random() * 12) + 8
            });
        }

        columnsRef.current = columns;
    }, []);

    // Draw Matrix effect optimized for mobile
    const drawMatrix = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number) => {
        // Semi-transparent black overlay for trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const columns = columnsRef.current;
        ctx.font = `${MOBILE_FONT_SIZE}px 'Courier New', monospace`;

        // Calculate phase-based opacity
        let baseOpacity = 0;
        if (currentPhase === AnimationPhase.ACTIVATION) {
            baseOpacity = progress;
        } else if (currentPhase === AnimationPhase.PEAK) {
            baseOpacity = 1;
        } else if (currentPhase === AnimationPhase.RESTORATION) {
            baseOpacity = 1 - progress;
        }

        columns.forEach((column) => {
            for (let i = 0; i < column.length; i++) {
                const charIndex = Math.floor((column.y / MOBILE_FONT_SIZE + i) % column.chars.length);
                const char = column.chars[charIndex];
                const y = column.y + (i * MOBILE_FONT_SIZE);

                if (y > 0 && y < canvas.height) {
                    // Leading character (bright white)
                    if (i === 0) {
                        ctx.fillStyle = `rgba(255, 255, 255, ${baseOpacity * column.opacity})`;
                    } else {
                        // Trailing characters (green with fade)
                        const fade = Math.max(0, 1 - (i / column.length));
                        ctx.fillStyle = `rgba(0, 255, 0, ${baseOpacity * column.opacity * fade * 0.8})`;
                    }

                    ctx.fillText(char, column.x, y);
                }
            }

            // Update column position
            column.y += column.speed;

            // Reset column when it goes off screen
            if (column.y > canvas.height + MOBILE_FONT_SIZE * column.length) {
                column.y = -MOBILE_FONT_SIZE * column.length;
                column.speed = Math.random() * 2 + 1;
                column.opacity = Math.random() * 0.4 + 0.6;

                // Randomize some characters
                for (let i = 0; i < 3; i++) {
                    const randomIndex = Math.floor(Math.random() * column.chars.length);
                    column.chars[randomIndex] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
                }
            }
        });
    }, [currentPhase]);

    // Hide original page content during effect
    const hidePageContent = useCallback(() => {
        const body = document.body;
        const allElements = body.querySelectorAll('*:not(canvas):not([data-matrix-overlay])');

        allElements.forEach((element) => {
            const htmlElement = element as HTMLElement;
            if (htmlElement && htmlElement !== containerRef.current && !containerRef.current?.contains(htmlElement)) {
                htmlElement.style.opacity = '0';
                htmlElement.style.transition = 'opacity 0.3s ease';
            }
        });
    }, []);

    // Restore page content visibility
    const showPageContent = useCallback(() => {
        const body = document.body;
        const allElements = body.querySelectorAll('*:not(canvas):not([data-matrix-overlay])');

        allElements.forEach((element) => {
            const htmlElement = element as HTMLElement;
            if (htmlElement && htmlElement !== containerRef.current && !containerRef.current?.contains(htmlElement)) {
                htmlElement.style.opacity = '1';
                htmlElement.style.transition = 'opacity 0.5s ease';
            }
        });
    }, []);

    // Main animation loop with proper completion
    const animate = useCallback((timestamp: number) => {
        if (!startTimeRef.current) {
            startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const totalProgress = Math.min(elapsed / ANIMATION_DURATION, 1);

        // Determine current phase and progress
        let phase = AnimationPhase.ACTIVATION;
        let phaseProgress = 0;

        if (elapsed < 1000) {
            phase = AnimationPhase.ACTIVATION;
            phaseProgress = elapsed / 1000;
        } else if (elapsed < 5000) {
            phase = AnimationPhase.PEAK;
            phaseProgress = (elapsed - 1000) / 4000;
        } else if (elapsed < 6000) {
            phase = AnimationPhase.RESTORATION;
            phaseProgress = (elapsed - 5000) / 1000;
        }

        setCurrentPhase(phase);

        // Draw Matrix effect
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            drawMatrix(ctx, canvas, phaseProgress);
        }

        // Continue animation or complete
        if (totalProgress < 1) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            // Animation completed - clean up and restore
            setCurrentPhase(AnimationPhase.INACTIVE);
            showPageContent();
            onComplete();
        }
    }, [drawMatrix, showPageContent, onComplete]);

    // Handle triple click detection
    const handleTriggerClick = useCallback(() => {
        if (isActive) return;

        setClickCount(prev => prev + 1);

        if (clickTimeout) {
            clearTimeout(clickTimeout);
        }

        const newTimeout = setTimeout(() => {
            setClickCount(0);
        }, CLICK_TIMEOUT);
        setClickTimeout(newTimeout);

        // Check for triple click
        if (clickCount + 1 >= 3) {
            setClickCount(0);
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                setClickTimeout(null);
            }
            onActivate();
        }
    }, [isActive, clickCount, clickTimeout, onActivate]);

    // Setup canvas and start animation when activated
    useEffect(() => {
        if (!isActive) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Setup canvas for mobile viewport
        const rect = document.body.getBoundingClientRect();
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Set canvas style for mobile
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';

        // Initialize Matrix columns
        initializeColumns(canvas.width, canvas.height);

        // Hide page content
        hidePageContent();

        // Start animation
        startTimeRef.current = 0;
        animationRef.current = requestAnimationFrame(animate);

        // Handle touch events to skip animation
        const handleTouch = () => {
            if (currentPhase === AnimationPhase.PEAK) {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
                setCurrentPhase(AnimationPhase.INACTIVE);
                showPageContent();
                onComplete();
            }
        };

        // Handle escape key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleTouch();
            }
        };

        document.addEventListener('touchstart', handleTouch, { passive: true });
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            document.removeEventListener('touchstart', handleTouch);
            document.removeEventListener('keydown', handleKeyDown);
            showPageContent();
        };
    }, [isActive, initializeColumns, animate, hidePageContent, showPageContent, onComplete, currentPhase]);

    // Setup trigger element click listener
    useEffect(() => {
        const element = triggerElementRef.current;
        if (!element) return;

        element.addEventListener('click', handleTriggerClick);

        return () => {
            element.removeEventListener('click', handleTriggerClick);
        };
    }, [triggerElementRef, handleTriggerClick]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (clickTimeout) {
                clearTimeout(clickTimeout);
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            showPageContent();
        };
    }, [clickTimeout, showPageContent]);

    if (!isActive) return null;

    return createPortal(
        <div
            ref={containerRef}
            data-matrix-overlay="true"
            className="fixed inset-0 z-[9999]"
            style={{
                width: '100vw',
                height: '100vh',
                background: '#000000',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none'
            }}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0"
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    touchAction: 'none'
                }}
            />

            {/* Touch hint for mobile users */}
            {currentPhase === AnimationPhase.PEAK && (
                <div
                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-green-400 text-sm opacity-60 animate-pulse"
                    style={{ fontFamily: 'Courier New, monospace' }}
                >
                    Touch to exit
                </div>
            )}
        </div>,
        document.body
    );
}