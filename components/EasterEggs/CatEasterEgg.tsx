// src/components/EasterEggs/CatEasterEgg.tsx

"use client";

import React, { useState, useEffect } from "react";

interface CatEasterEggProps {
  isVisible: boolean;
  onComplete: () => void;
}

export default function CatEasterEgg({ isVisible, onComplete }: CatEasterEggProps) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isVisible && !isActive) {
      console.log("CatEasterEgg: Activating animation");
      setIsActive(true);
      
      // Complete animation after 9 seconds
      const completeTimeout = setTimeout(() => {
        console.log("CatEasterEgg: Animation completed");
        setIsActive(false);
        onComplete();
      }, 9000);

      return () => {
        clearTimeout(completeTimeout);
      };
    }
  }, [isVisible, isActive, onComplete]);

  if (!isActive) {
    return null;
  }

  console.log("CatEasterEgg: Rendering active animation");

  return (
    <>
      {/* Debug indicator */}
      <div 
        className="fixed top-4 right-4 z-50 bg-blue-500 text-white p-2 text-xs rounded"
        style={{ pointerEvents: 'none' }}
      >
        Cat Animation: ACTIVE
      </div>
      
      {/* Animation container */}
      <div 
        className="fixed inset-x-0 bottom-0 z-50 pointer-events-none cat-easter-egg-container"
        style={{
          height: '100vh',
          backgroundColor: 'rgba(0,0,255,0.1)', // Blue debug background
        }}
      >
        <div className="flex items-end justify-center h-full pb-16">
          <div className="relative cat-image-container">
            {/* Cat image */}
            <img
              src="https://notfren.com/circusle/ee/cat.png"
              alt=""
              className="cat-image"
              style={{
                width: '280px',
                height: '280px',
                objectFit: 'contain',
                display: 'block',
                border: '4px solid cyan', // Bright border for visibility
              }}
              onLoad={() => console.log("CatEasterEgg: Image loaded successfully")}
              onError={(e) => {
                console.error("CatEasterEgg: Image failed to load");
                const target = e.target as HTMLImageElement;
                target.style.backgroundColor = 'orange';
                target.style.minWidth = '280px';
                target.style.minHeight = '280px';
                target.style.borderRadius = '10px';
              }}
            />
            
            {/* Shadow effect */}
            <div 
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
              style={{
                width: '240px',
                height: '60px',
                background: 'radial-gradient(ellipse, rgba(0,0,0,0.7) 0%, transparent 70%)',
                filter: 'blur(15px)',
                zIndex: -1,
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .cat-easter-egg-container {
          animation: catSlideAnimation 9s ease-in-out forwards;
        }
        
        .cat-image-container {
          animation: catPulseAnimation 9s ease-in-out forwards;
        }

        @keyframes catSlideAnimation {
          0% {
            transform: translateY(100%);
          }
          16.67% {
            transform: translateY(0%);
          }
          83.33% {
            transform: translateY(0%);
          }
          100% {
            transform: translateY(100%);
          }
        }

        @keyframes catPulseAnimation {
          0% {
            opacity: 0.8;
            transform: scale(0.9);
          }
          16.67% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          83.33% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0.8;
            transform: scale(0.9);
          }
        }
      `}</style>
    </>
  );
}