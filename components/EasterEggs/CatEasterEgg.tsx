// src/components/EasterEggs/CatEasterEgg.tsx

"use client";

import React, { useState, useEffect } from "react";

interface CatEasterEggProps {
  isVisible: boolean;
  onComplete: () => void;
}

export default function CatEasterEgg({ isVisible, onComplete }: CatEasterEggProps) {
  const [animationState, setAnimationState] = useState<'hidden' | 'entering' | 'visible' | 'exiting'>('hidden');
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    console.log("CatEasterEgg: isVisible changed to:", isVisible, "animationState:", animationState);
    
    if (isVisible && animationState === 'hidden') {
      console.log("CatEasterEgg: Starting animation sequence");
      // Начинаем показ компонента в скрытом состоянии
      setAnimationState('entering');
      setShouldAnimate(false);
      
      // Через небольшую задержку запускаем анимацию
      const startAnimation = setTimeout(() => {
        console.log("CatEasterEgg: Starting slide animation");
        setShouldAnimate(true);
      }, 100);
      
      // Через 3 секунды показываем полностью
      const showTimer = setTimeout(() => {
        console.log("CatEasterEgg: Setting to visible state");
        setAnimationState('visible');
      }, 3100);

      // Через 6 секунд начинаем скрывать
      const hideTimer = setTimeout(() => {
        console.log("CatEasterEgg: Starting exit animation");
        setAnimationState('exiting');
        setShouldAnimate(false);
      }, 6100);

      // Через 9 секунд полностью скрываем и вызываем callback
      const completeTimer = setTimeout(() => {
        console.log("CatEasterEgg: Animation complete, hiding");
        setAnimationState('hidden');
        setShouldAnimate(false);
        onComplete();
      }, 9100);

      return () => {
        clearTimeout(startAnimation);
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isVisible, animationState, onComplete]);

  if (animationState === 'hidden') {
    console.log("CatEasterEgg: Component hidden, returning null");
    return null;
  }

  const getTransformValue = () => {
    if (animationState === 'entering') {
      return shouldAnimate ? 'translateY(0%)' : 'translateY(100%)';
    }
    if (animationState === 'visible') {
      return 'translateY(0%)';
    }
    if (animationState === 'exiting') {
      return 'translateY(100%)';
    }
    return 'translateY(100%)';
  };

  const getTransitionDuration = () => {
    if (animationState === 'entering' && shouldAnimate) {
      return '3000ms';
    }
    if (animationState === 'exiting') {
      return '3000ms';
    }
    return '0ms';
  };

  console.log("CatEasterEgg: Rendering - state:", animationState, "shouldAnimate:", shouldAnimate, "transform:", getTransformValue());

  return (
    <>
      {/* Временный индикатор для отладки */}
      <div 
        className="fixed top-4 right-4 z-50 bg-red-500 text-white p-2 text-xs"
        style={{ pointerEvents: 'none' }}
      >
        Easter Egg Active: {animationState} | Animate: {shouldAnimate.toString()}
      </div>
      
      <div 
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          backgroundColor: 'rgba(255,0,0,0.1)', // Временный цветной фон для отладки
        }}
      >
        <div 
          className="absolute bottom-0 left-0 right-0 flex items-end justify-center"
          style={{
            height: '100vh',
            transform: getTransformValue(),
            transition: `transform ${getTransitionDuration()} cubic-bezier(0.4, 0.0, 0.2, 1)`,
          }}
        >
          <div className="relative mb-8">
            {/* Основная картинка кота */}
            <img
              src="https://notfren.com/circusle/ee/cat.png"
              alt=""
              className="block"
              style={{
                width: '200px',
                height: '200px',
                objectFit: 'contain',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                border: '2px solid yellow', // Временная граница для отладки
              }}
              draggable={false}
              onLoad={() => console.log("CatEasterEgg: Image loaded successfully")}
              onError={(e) => {
                console.error("CatEasterEgg: Failed to load image", e);
                // Показываем заглушку при ошибке загрузки
                (e.target as HTMLImageElement).style.backgroundColor = 'purple';
                (e.target as HTMLImageElement).style.minHeight = '200px';
                (e.target as HTMLImageElement).style.minWidth = '200px';
              }}
            />
            
            {/* Тень */}
            <div 
              className="absolute inset-0 -z-10"
              style={{
                filter: 'blur(15px)',
                background: 'radial-gradient(ellipse at center bottom, rgba(0,0,0,0.5) 0%, transparent 70%)',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}