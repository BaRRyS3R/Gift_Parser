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

const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?";
const ANIMATION_DURATION = 7000; // 7 seconds total
const CLICK_TIMEOUT = 2000; // 2 seconds timeout for triple click

enum AnimationPhase {
    INACTIVE = "inactive",
    ACTIVATION = "activation",     // 0.5s
    TRANSFORMATION = "transformation", // 2s
    PEAK = "peak",                // 3s
    RESTORATION = "restoration"    // 1.5s
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
    const originalTextsRef = useRef<Map<Element, string>>(new Map());

    const [currentPhase, setCurrentPhase] = useState<AnimationPhase>(AnimationPhase.INACTIVE);
    const [clickCount, setClickCount] = useState(0);
    const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

    // Initialize Matrix columns
    const initializeColumns = useCallback((canvasWidth: number, canvasHeight: number) => {
        const columns: MatrixColumn[] = [];
        const columnWidth = 20;
        const numColumns = Math.floor(canvasWidth / columnWidth);

        for (let i = 0; i < numColumns; i++) {
            columns.push({
                x: i * columnWidth,
                y: Math.random() * canvasHeight,
                speed: Math.random() * 3 + 1,
                chars: Array.from({ length: 20 }, () =>
                    MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
                ),
                opacity: Math.random() * 0.5 + 0.5,
                length: Math.floor(Math.random() * 15) + 5
            });
        }

        columnsRef.current = columns;
    }, []);

    // Draw Matrix effect on canvas
    const drawMatrix = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const columns = columnsRef.current;
        const fontSize = 14;
        ctx.font = `${fontSize}px 'Courier New', monospace`;

        columns.forEach((column, index) => {
            // Calculate opacity based on animation phase
            let baseOpacity = 0;
            if (currentPhase === AnimationPhase.ACTIVATION) {
                baseOpacity = progress * 0.7;
            } else if (currentPhase === AnimationPhase.TRANSFORMATION) {
                baseOpacity = 0.7 + (progress * 0.3);
            } else if (currentPhase === AnimationPhase.PEAK) {
                baseOpacity = 1;
            } else if (currentPhase === AnimationPhase.RESTORATION) {
                baseOpacity = 1 - progress;
            }

            // Draw column characters
            for (let i = 0; i < column.length; i++) {
                const charIndex = Math.floor((column.y / fontSize + i) % column.chars.length);
                const char = column.chars[charIndex];
                const y = (column.y + (i * fontSize)) % canvas.height;

                // Highlight effect for leading character
                if (i === 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${baseOpacity * column.opacity})`;
                } else {
                    const fade = Math.max(0, 1 - (i / column.length));
                    ctx.fillStyle = `rgba(0, 255, 0, ${baseOpacity * column.opacity * fade})`;
                }

                ctx.fillText(char, column.x, y);
            }

            // Update column position
            column.y += column.speed;
            if (column.y > canvas.height) {
                column.y = -fontSize * column.length;
                // Randomize column properties
                column.speed = Math.random() * 3 + 1;
                column.opacity = Math.random() * 0.5 + 0.5;
                column.chars = Array.from({ length: 20 }, () =>
                    MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
                );
            }

            // Random character changes during peak phase
            if (currentPhase === AnimationPhase.PEAK && Math.random() < 0.1) {
                const randomIndex = Math.floor(Math.random() * column.chars.length);
                column.chars[randomIndex] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
            }
        });
    }, [currentPhase]);

    // Transform text elements on the page
    const transformTextElements = useCallback((progress: number) => {
        const elements = document.querySelectorAll('h1, h2, h3, h4, p, span, button, div');

        elements.forEach((element) => {
            const textContent = element.textContent;
            if (!textContent || textContent.trim().length === 0) return;

            // Store original text if not already stored
            if (!originalTextsRef.current.has(element)) {
                originalTextsRef.current.set(element, textContent);
            }

            const originalText = originalTextsRef.current.get(element) || textContent;

            if (currentPhase === AnimationPhase.TRANSFORMATION) {
                // Gradually transform text to Matrix characters
                const transformedText = originalText
                    .split('')
                    .map((char, index) => {
                        const shouldTransform = (index / originalText.length) < progress;
                        if (shouldTransform && char !== ' ') {
                            return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
                        }
                        return char;
                    })
                    .join('');

                element.textContent = transformedText;
                (element as HTMLElement).style.color = progress > 0.5 ? '#00ff00' : '#ffffff';
                (element as HTMLElement).style.textShadow = `0 0 ${progress * 10}px #00ff00`;
            } else if (currentPhase === AnimationPhase.PEAK) {
                // Full Matrix characters with flickering
                if (Math.random() < 0.3) {
                    const matrixText = originalText
                        .split('')
                        .map(char => char === ' ' ? ' ' : MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)])
                        .join('');
                    element.textContent = matrixText;
                }
                (element as HTMLElement).style.color = '#00ff00';
                (element as HTMLElement).style.textShadow = '0 0 10px #00ff00';
            } else if (currentPhase === AnimationPhase.RESTORATION) {
                // Gradually restore original text
                const restoredText = originalText
                    .split('')
                    .map((char, index) => {
                        const shouldRestore = (index / originalText.length) < progress;
                        if (shouldRestore) {
                            return char;
                        }
                        return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
                    })
                    .join('');

                element.textContent = restoredText;
                const greenIntensity = 1 - progress;
                (element as HTMLElement).style.color = `rgb(${progress * 255}, 255, ${progress * 255})`;
                (element as HTMLElement).style.textShadow = `0 0 ${greenIntensity * 10}px #00ff00`;
            }
        });
    }, [currentPhase]);

    // Restore all text elements to original state
    const restoreTextElements = useCallback(() => {
        originalTextsRef.current.forEach((originalText, element) => {
            element.textContent = originalText;
            (element as HTMLElement).style.color = '';
            (element as HTMLElement).style.textShadow = '';
        });
        originalTextsRef.current.clear();
    }, []);

    // Animation loop
    const animate = useCallback((timestamp: number) => {
        if (!startTimeRef.current) {
            startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const totalProgress = Math.min(elapsed / ANIMATION_DURATION, 1);

        // Determine current phase and progress within phase
        let phase = AnimationPhase.ACTIVATION;
        let phaseProgress = 0;

        if (elapsed < 500) {
            phase = AnimationPhase.ACTIVATION;
            phaseProgress = elapsed / 500;
        } else if (elapsed < 2500) {
            phase = AnimationPhase.TRANSFORMATION;
            phaseProgress = (elapsed - 500) / 2000;
        } else if (elapsed < 5500) {
            phase = AnimationPhase.PEAK;
            phaseProgress = (elapsed - 2500) / 3000;
        } else if (elapsed < 7000) {
            phase = AnimationPhase.RESTORATION;
            phaseProgress = (elapsed - 5500) / 1500;
        }

        setCurrentPhase(phase);

        // Draw Matrix effect
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            drawMatrix(ctx, canvas, phaseProgress);
        }

        // Transform text elements
        if (phase !== AnimationPhase.ACTIVATION) {
            transformTextElements(phaseProgress);
        }

        // Continue animation or complete
        if (totalProgress < 1) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            restoreTextElements();
            setCurrentPhase(AnimationPhase.INACTIVE);
            onComplete();
        }
    }, [drawMatrix, transformTextElements, restoreTextElements, onComplete]);

    // Handle triple click detection
    const handleTriggerClick = useCallback(() => {
        if (isActive) return;

        setClickCount(prev => prev + 1);

        // Clear existing timeout
        if (clickTimeout) {
            clearTimeout(clickTimeout);
        }

        // Set new timeout to reset click count
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

    // Set up canvas and start animation when activated
    useEffect(() => {
        if (!isActive) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Initialize Matrix columns
        initializeColumns(canvas.width, canvas.height);

        // Start animation
        startTimeRef.current = 0;
        animationRef.current = requestAnimationFrame(animate);

        // Handle ESC key and click to skip
        const handleSkip = (e: KeyboardEvent | MouseEvent) => {
            if (e instanceof KeyboardEvent && e.key === 'Escape') {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
                restoreTextElements();
                setCurrentPhase(AnimationPhase.INACTIVE);
                onComplete();
            }
        };

        document.addEventListener('keydown', handleSkip);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            document.removeEventListener('keydown', handleSkip);
            restoreTextElements();
        };
    }, [isActive, initializeColumns, animate, restoreTextElements, onComplete]);

    // Set up trigger element click listener
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
        };
    }, [clickTimeout]);

    if (!isActive) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] pointer-events-none"
            style={{
                background: currentPhase === AnimationPhase.PEAK ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                transition: 'background 0.5s ease-inout'
            }}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{
                    mixBlendMode: currentPhase === AnimationPhase.PEAK ? 'screen' : 'normal',
                    opacity: currentPhase === AnimationPhase.INACTIVE ? 0 : 1,
                    transition: 'opacity 0.5s ease-in-out'
                }}
            />

            {/* Glitch effect overlay during peak phase */}
            {currentPhase === AnimationPhase.PEAK && (
                <div
                    className="absolute inset-0 w-full h-full animate-pulse"
                    style={{
                        background: `
              linear-gradient(90deg, transparent 98%, rgba(0, 255, 0, 0.1) 100%),
              linear-gradient(0deg, transparent 98%, rgba(0, 255, 0, 0.1) 100%)
            `,
                        animation: 'matrix-glitch 0.1s infinite'
                    }}
                />
            )}

            <style jsx>{`
        @keyframes matrix-glitch {
          0% { transform: translateX(0); }
          10% { transform: translateX(-2px); }
          20% { transform: translateX(2px); }
          30% { transform: translateX(-1px); }
          40% { transform: translateX(1px); }
          50% { transform: translateX(0); }
          60% { transform: translateX(-1px); }
          70% { transform: translateX(1px); }
          80% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
          100% { transform: translateX(0); }
        }
      `}</style>
        </div>,
        document.body
    );
}