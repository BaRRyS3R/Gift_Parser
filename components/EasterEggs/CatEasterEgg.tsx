// src/components/EasterEggs/CatEasterEgg.tsx

"use client";

import React, { useState, useEffect } from "react";

interface CatEasterEggProps {
    isVisible: boolean;
    onComplete: () => void;
}

export default function CatEasterEgg({ isVisible, onComplete }: CatEasterEggProps) {
    const [animationState, setAnimationState] = useState<'hidden' | 'entering' | 'visible' | 'exiting'>('hidden');

    useEffect(() => {
        if (isVisible && animationState === 'hidden') {
            // Начинаем анимацию появления
            setAnimationState('entering');

            // Через 3 секунды показываем полностью
            const showTimer = setTimeout(() => {
                setAnimationState('visible');
            }, 3000);

            // Через 6 секунд начинаем скрывать
            const hideTimer = setTimeout(() => {
                setAnimationState('exiting');
            }, 6000);

            // Через 9 секунд полностью скрываем и вызываем callback
            const completeTimer = setTimeout(() => {
                setAnimationState('hidden');
                onComplete();
            }, 9000);

            return () => {
                clearTimeout(showTimer);
                clearTimeout(hideTimer);
                clearTimeout(completeTimer);
            };
        }
    }, [isVisible, animationState, onComplete]);

    if (animationState === 'hidden') {
        return null;
    }

    const getTransformStyle = () => {
        switch (animationState) {
            case 'entering':
                return 'translateY(100%)';
            case 'visible':
                return 'translateY(0%)';
            case 'exiting':
                return 'translateY(100%)';
            default:
                return 'translateY(100%)';
        }
    };

    const getTransitionDuration = () => {
        switch (animationState) {
            case 'entering':
                return '3000ms';
            case 'exiting':
                return '3000ms';
            default:
                return '0ms';
        }
    };

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
            style={{
                transform: getTransformStyle(),
                transition: `transform ${getTransitionDuration()} cubic-bezier(0.4, 0.0, 0.2, 1)`,
            }}
        >
            <div className="relative w-full h-screen flex items-end justify-center">
                <div className="relative">
                    {/* Основная картинка кота */}
                    <img
                        src="https://notfren.com/circusle/ee/cat.png"
                        alt=""
                        className="w-80 h-80 object-contain select-none"
                        style={{
                            maxWidth: '80vw',
                            maxHeight: '50vh',
                            width: 'auto',
                            height: 'auto',
                        }}
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                    />

                    {/* Дополнительные эффекты для мобильных устройств */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                    {/* Тень для лучшей видимости на мобильных */}
                    <div
                        className="absolute inset-0 -z-10"
                        style={{
                            filter: 'blur(20px)',
                            background: 'radial-gradient(ellipse at center bottom, rgba(0,0,0,0.3) 0%, transparent 70%)',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}