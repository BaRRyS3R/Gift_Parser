// src/components/EasterEggs/CatEasterEgg.tsx

"use client";

import React, { useState, useEffect } from "react";

interface CatEasterEggProps {
  isVisible: boolean;
  onComplete: () => void;
}

export default function CatEasterEgg({ isVisible, onComplete }: CatEasterEggProps) {
  const [showComponent, setShowComponent] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'start' | 'slideUp' | 'visible' | 'slideDown' | 'complete'>('start');

  useEffect(() => {
    if (isVisible && !showComponent) {
      console.log("CatEasterEgg: Starting full animation sequence");
      setShowComponent(true);
      setAnimationPhase('start');
      
      // Фаза 1: Показать компонент в исходной позиции (внизу экрана)
      const startSlide = setTimeout(() => {
        console.log("CatEasterEgg: Starting slide up animation");
        setAnimationPhase('slideUp');
      }, 50);
      
      // Фаза 2: Показать полностью (3 секунды спустя)
      const showComplete = setTimeout(() => {
        console.log("CatEasterEgg: Animation complete, showing cat");
        setAnimationPhase('visible');
      }, 3050);

      // Фаза 3: Начать скрытие (6 секунд спустя)
      const startHide = setTimeout(() => {
        console.log("CatEasterEgg: Starting slide down animation");
        setAnimationPhase('slideDown');
      }, 6050);

      // Фаза 4: Полностью скрыть (9 секунд спустя)
      const hideComplete = setTimeout(() => {
        console.log("CatEasterEgg: Hiding component completely");
        setAnimationPhase('complete');
        setShowComponent(false);
        onComplete();
      }, 9050);

      return () => {
        clearTimeout(startSlide);
        clearTimeout(showComplete);
        clearTimeout(startHide);
        clearTimeout(hideComplete);
      };
    }
  }, [isVisible, showComponent, onComplete]);

  if (!showComponent) {
    return null;
  }

  const getContainerTransform = () => {
    switch (animationPhase) {
      case 'start':
        return 'translateY(100%)'; // Полностью скрыт снизу
      case 'slideUp':
        return 'translateY(0%)'; // Плавно поднимается
      case 'visible':
        return 'translateY(0%)'; // Полностью видим
      case 'slideDown':
        return 'translateY(100%)'; // Плавно опускается
      case 'complete':
        return 'translateY(100%)'; // Полностью скрыт
      default:
        return 'translateY(100%)';
    }
  };

  const getTransitionDuration = () => {
    if (animationPhase === 'slideUp' || animationPhase === 'slideDown') {
      return '3s';
    }
    return '0s';
  };

  console.log("CatEasterEgg: Current phase:", animationPhase, "Transform:", getContainerTransform());

  return (
    <>
      {/* Debug indicator */}
      <div 
        className="fixed top-4 right-4 z-50 bg-green-500 text-white p-2 text-xs rounded"
        style={{ pointerEvents: 'none' }}
      >
        Cat Phase: {animationPhase}
      </div>
      
      {/* Main container */}
      <div 
        className="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
        style={{
          height: '100vh',
          transform: getContainerTransform(),
          transition: `transform ${getTransitionDuration()} ease-out`,
          backgroundColor: 'rgba(0,255,0,0.1)', // Зеленый фон для отладки
        }}
      >
        <div className="flex items-end justify-center h-full pb-20">
          <div className="relative">
            {/* Cat image */}
            <img
              src="https://notfren.com/circusle/ee/cat.png"
              alt=""
              style={{
                width: '250px',
                height: '250px',
                objectFit: 'contain',
                display: 'block',
                border: '3px solid lime', // Яркая граница для видимости
              }}
              onLoad={() => console.log("CatEasterEgg: Image loaded successfully")}
              onError={(e) => {
                console.error("CatEasterEgg: Image failed to load");
                // Fallback to colored rectangle
                const target = e.target as HTMLImageElement;
                target.style.backgroundColor = 'magenta';
                target.style.minWidth = '250px';
                target.style.minHeight = '250px';
              }}
            />
            
            {/* Shadow */}
            <div 
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
              style={{
                width: '200px',
                height: '50px',
                background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)',
                filter: 'blur(10px)',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}