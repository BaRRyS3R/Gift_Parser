// src/components/SeasonButton/SeasonButton.tsx
import React, { useState, useEffect } from "react";

interface SeasonButtonProps {
  isTransitioning?: boolean;
  onClick?: () => void;
  className?: string;
}

interface GridCircle {
  id: number;
  isActive: boolean;
  isRed: boolean;
  activationTime: number;
}

export default function SeasonButton({
  isTransitioning = false,
  onClick,
  className = "",
}: SeasonButtonProps) {
  const [gridCircles, setGridCircles] = useState<GridCircle[]>([]);

  // Initialize grid circles (5x3 grid for button background)
  useEffect(() => {
    const initialCircles: GridCircle[] = Array.from(
      { length: 15 },
      (_, index) => ({
        id: index,
        isActive: false,
        isRed: false,
        activationTime: 0,
      }),
    );

    setGridCircles(initialCircles);
  }, []);

  // Periodic circle activation animation
  useEffect(() => {
    const activateRandomCircles = () => {
      setGridCircles((prev) => {
        const newCircles = [...prev];
        const currentTime = Date.now();

        // Randomly select 2-4 circles to activate
        const numberOfActivations = Math.floor(Math.random() * 3) + 2;
        const availableIndices = Array.from({ length: 15 }, (_, i) => i);

        for (let i = 0; i < numberOfActivations; i++) {
          const randomIndex = Math.floor(
            Math.random() * availableIndices.length,
          );
          const circleIndex = availableIndices[randomIndex];

          availableIndices.splice(randomIndex, 1);

          // 20% chance for red, 80% chance for white
          const isRed = Math.random() < 0.2;

          newCircles[circleIndex] = {
            ...newCircles[circleIndex],
            isActive: true,
            isRed,
            activationTime: currentTime,
          };
        }

        return newCircles;
      });

      // Deactivate circles after animation duration
      setTimeout(() => {
        setGridCircles((prev) => {
          return prev.map((circle) => ({
            ...circle,
            isActive: false,
            isRed: false,
          }));
        });
      }, 800);
    };

    // Start periodic activation
    const interval = setInterval(activateRandomCircles, 2000);

    // Initial activation after short delay
    const initialTimeout = setTimeout(activateRandomCircles, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  const renderBackgroundGrid = () => {
    return (
      <div
        className="absolute inset-0 opacity-20"
        style={{
          clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
        }}
      >
        <div className="grid grid-cols-5 grid-rows-3 gap-0.5 w-full h-full p-1.5">
          {gridCircles.map((circle) => (
            <div
              key={circle.id}
              className={`
                rounded-full border border-white/20 
                transition-all duration-300 ease-out
                aspect-square flex-shrink-0
                ${
                  circle.isActive
                    ? circle.isRed
                      ? "bg-red-500 border-red-400 shadow-sm shadow-red-500/50"
                      : "bg-white border-white shadow-sm shadow-white/50"
                    : "bg-transparent"
                }
              `}
              style={{
                width: "10px",
                height: "10px",
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <button
      aria-label="Season X"
      className={`
        relative group px-6 py-3 rounded-none
        bg-black/80 backdrop-blur-sm text-white border-2 border-white/60
        text-xs font-mono tracking-[0.2em] uppercase
        transition-all duration-300 ease-out
        hover:bg-white/90 hover:text-black hover:border-white/80
        hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]
        active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed
        overflow-hidden
        ${className}
      `}
      disabled={isTransitioning}
      style={{
        clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
      }}
      onClick={onClick}
    >
      {/* Background Grid Animation */}
      {renderBackgroundGrid()}

      {/* Subtle scanning line on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />

      {/* Text Content */}
      <div className="relative flex items-center gap-2 justify-center z-10">
        {!isTransitioning && (
          <>
            <span className="opacity-60">[</span>
            <span>SEASON X</span>
            <span className="opacity-60">]</span>
          </>
        )}
        {isTransitioning && (
          <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin" />
        )}
      </div>
    </button>
  );
}
