// src/components/GameGrid.tsx

"use client";

import { Circle, GameEffect, PowerUpType } from "../types/game";
import { getGridDimensions } from "../utils/gameUtils";

interface GameGridProps {
  circles: Circle[];
  onCircleClick: (circleId: number) => void;
  isGameActive: boolean;
  showCircles: boolean;
  effects?: GameEffect[]; // Active visual effects
  isPowerUpActive?: (type: PowerUpType) => boolean; // Check if power-up is active
}

export default function GameGrid({
  circles,
  onCircleClick,
  isGameActive,
  showCircles,
  effects = [],
  isPowerUpActive = () => false,
}: GameGridProps) {
  const { cols, rows } = getGridDimensions(circles.length);

  const getCircleSize = () => {
    if (circles.length <= 4) return "w-24 h-24 sm:w-28 sm:h-28";
    if (circles.length <= 8) return "w-20 h-20 sm:w-24 sm:h-24";
    if (circles.length <= 12) return "w-16 h-16 sm:w-20 sm:h-20";
    if (circles.length <= 40) return "w-16 h-16 sm:w-20 sm:h-20";
    if (circles.length <= 60) return "w-12 h-12 sm:w-14 sm:h-14";
    return "w-10 h-10 sm:w-12 sm:h-12";
  };

  const getGapSize = () => {
    if (circles.length <= 4) return "gap-8";
    if (circles.length <= 8) return "gap-6";
    if (circles.length <= 12) return "gap-4";
    if (circles.length <= 40) return "gap-2";
    if (circles.length <= 60) return "gap-1";
    return "gap-1";
  };

  const getCircleStyles = (circle: Circle) => {
    const baseClasses = `${getCircleSize()} rounded-full border-2 transition-all duration-700 ease-out relative overflow-hidden`;

    // State-based styling for visibility and animation
    const visibilityClasses = showCircles
      ? "opacity-100 transform scale-100"
      : "opacity-0 transform scale-0";

    const animationClasses = circle.isAnimating
      ? "opacity-0 scale-75 transition-all duration-300"
      : "";

    // Apply visual effects
    let effectClasses = "";
    let effectTransforms = "";

    // Shake effect (earthquake)
    if (circle.shakeOffset && (circle.shakeOffset.x !== 0 || circle.shakeOffset.y !== 0)) {
      effectTransforms += ` translate(${circle.shakeOffset.x}px, ${circle.shakeOffset.y}px)`;
    }

    // Rotation effect (tornado)
    if (circle.rotationAngle && circle.rotationAngle !== 0) {
      effectTransforms += ` rotate(${circle.rotationAngle}rad)`;
    }

    // Memory mode styling
    if (circle.isMemoryVisible) {
      effectClasses += " ring-4 ring-yellow-400 ring-opacity-75 animate-pulse";
    }

    // Sequence mode styling
    if (circle.sequenceOrder !== undefined) {
      effectClasses += " ring-4 ring-blue-400 ring-opacity-75";
    }

    // Slow time effect
    if (isPowerUpActive(PowerUpType.SLOW_TIME)) {
      effectClasses += " transition-all duration-1000";
    }

    // Freeze effect
    if (isPowerUpActive(PowerUpType.FREEZE)) {
      effectClasses += " animate-pulse";
    }

    // Vision power-up (show future circles)
    if (isPowerUpActive(PowerUpType.VISION) && !circle.isActive) {
      effectClasses += " border-blue-300 border-opacity-50";
    }

    // Interactive state styling based on circle type and activity
    if (circle.isActive && !circle.isAnimating) {
      if (circle.isDecoy) {
        // Decoy circles: red coloring with danger indicators
        return `${baseClasses} ${visibilityClasses} ${animationClasses} ${effectClasses}
                bg-red-500 border-red-400 shadow-lg shadow-red-500/50 scale-110
                hover:scale-115 active:scale-95`;
      } else {
        // Regular active circles: white coloring with positive indicators
        return `${baseClasses} ${visibilityClasses} ${animationClasses} ${effectClasses}
                bg-white shadow-lg shadow-white/50 border-white scale-110
                hover:scale-115 active:scale-95`;
      }
    } else {
      // Inactive circles: standard border styling with hover effects
      return `${baseClasses} ${visibilityClasses} ${animationClasses} ${effectClasses}
              bg-transparent border-white/60 hover:border-white hover:scale-105
              active:scale-95 hover:shadow-md hover:shadow-white/30`;
    }
  };

  const getInteractionProps = (circle: Circle) => {
    // Apply transform effects
    let transform = "";

    if (circle.shakeOffset && (circle.shakeOffset.x !== 0 || circle.shakeOffset.y !== 0)) {
      transform += ` translate(${circle.shakeOffset.x}px, ${circle.shakeOffset.y}px)`;
    }

    if (circle.rotationAngle && circle.rotationAngle !== 0) {
      transform += ` rotate(${circle.rotationAngle}rad)`;
    }

    return {
      disabled: !isGameActive,
      style: {
        transitionDelay: showCircles ? `${circle.id * 50}ms` : "0ms",
        transition: circle.isActive && !circle.isAnimating
          ? "transform 0.3s ease-out, box-shadow 0.3s ease-out, border-color 0.3s ease-out"
          : isPowerUpActive(PowerUpType.SLOW_TIME)
            ? "all 1000ms ease-out"
            : "all 0.7s ease-out",
        transform: transform || undefined,
      },
      onClick: () => onCircleClick(circle.id)
    };
  };

  const renderPulseEffect = (circle: Circle) => {
    if (!circle.isActive || circle.isAnimating) return null;

    const pulseColor = circle.isDecoy ? "border-red-400" : "border-white";
    const animationDuration = circle.isDecoy ? "1.5s" : "1s";

    return (
      <div
        className={`absolute inset-0 rounded-full border-2 ${pulseColor} opacity-50`}
        style={{
          animation: `ping ${animationDuration} cubic-bezier(0, 0, 0.2, 1) infinite`,
        }}
      />
    );
  };

  const renderSpecialEffects = (circle: Circle) => {
    const effects = [];

    // Sequence number indicator
    if (circle.sequenceOrder !== undefined) {
      effects.push(
        <div
          key="sequence-number"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="text-xs font-bold text-white bg-blue-500 rounded-full w-4 h-4 flex items-center justify-center">
            {circle.sequenceOrder + 1}
          </span>
        </div>
      );
    }

    // Memory highlight
    if (circle.isMemoryVisible) {
      effects.push(
        <div
          key="memory-highlight"
          className="absolute inset-0 bg-yellow-400 bg-opacity-30 rounded-full animate-pulse"
        />
      );
    }

    // Power-up indicators
    if (isPowerUpActive(PowerUpType.MAGNET)) {
      effects.push(
        <div
          key="magnet-effect"
          className="absolute -inset-2 border border-blue-300 border-opacity-50 rounded-full animate-spin"
          style={{ animationDuration: '3s' }}
        />
      );
    }

    if (isPowerUpActive(PowerUpType.DOUBLE_SCORE)) {
      effects.push(
        <div
          key="double-score-effect"
          className="absolute -inset-1 border-2 border-yellow-400 border-opacity-75 rounded-full animate-pulse"
        />
      );
    }

    if (isPowerUpActive(PowerUpType.MULTI_HIT)) {
      effects.push(
        <div
          key="multi-hit-effect"
          className="absolute -inset-1 border-2 border-purple-400 border-opacity-75 rounded-full animate-pulse"
        />
      );
    }

    // Visual effects
    if (effects?.includes(GameEffect.EARTHQUAKE)) {
      effects.push(
        <div
          key="earthquake-effect"
          className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-full animate-pulse"
        />
      );
    }

    if (effects?.includes(GameEffect.TORNADO)) {
      effects.push(
        <div
          key="tornado-effect"
          className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-full animate-spin"
          style={{ animationDuration: '2s' }}
        />
      );
    }

    // Freeze effect overlay
    if (isPowerUpActive(PowerUpType.FREEZE)) {
      effects.push(
        <div
          key="freeze-effect"
          className="absolute inset-0 bg-blue-500 bg-opacity-30 rounded-full animate-pulse"
        />
      );
    }

    return effects;
  };

  const renderGridOverlay = () => {
    const overlays = [];

    // Earthquake effect overlay
    if (effects.includes('earthquake')) {
      overlays.push(
        <div
          key="earthquake-overlay"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)',
            animation: 'pulse 0.5s ease-in-out infinite alternate'
          }}
        />
      );
    }

    // Tornado effect overlay
    if (effects.includes('tornado')) {
      overlays.push(
        <div
          key="tornado-overlay"
          className="absolute inset-0 pointer-events-none opacity-20"
        >
          <div
            className="absolute inset-0 border border-white rounded-full"
            style={{
              animation: 'spin 3s linear infinite'
            }}
          />
          <div
            className="absolute inset-4 border border-white rounded-full"
            style={{
              animation: 'spin 2s linear infinite reverse'
            }}
          />
        </div>
      );
    }

    // Freeze effect overlay
    if (isPowerUpActive('FREEZE')) {
      overlays.push(
        <div
          key="freeze-overlay"
          className="absolute inset-0 pointer-events-none bg-blue-400 bg-opacity-10 rounded-lg animate-pulse"
        />
      );
    }

    // Slow time effect overlay
    if (isPowerUpActive('SLOW_TIME')) {
      overlays.push(
        <div
          key="slow-time-overlay"
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-purple-500/20 animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 border border-purple-300 border-opacity-30 rounded-lg"
              style={{
                animation: `ping ${2 + i}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                animationDelay: `${i * 0.5}s`
              }}
            />
          ))}
        </div>
      );
    }

    return overlays.length > 0 ? overlays : null;
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4 relative">
      {/* Grid overlays for effects */}
      {renderGridOverlay()}

      <div
        className={`grid justify-items-center items-center ${getGapSize()} relative z-10`}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {circles.map((circle) => (
          <button
            key={circle.id}
            className={`${getCircleStyles(circle)} disabled:cursor-not-allowed relative`}
            {...getInteractionProps(circle)}
          >
            {/* Pulse effect for active circles */}
            {renderPulseEffect(circle)}

            {/* Special effects and indicators */}
            {renderSpecialEffects(circle)}

            {/* Circle content based on state */}
            {circle.isActive && !circle.isAnimating && (
              <div className="absolute inset-0 flex items-center justify-center">
                {circle.isDecoy ? (
                  <span className="text-white text-xl font-bold">✗</span>
                ) : (
                  <span className="text-black text-xl font-bold">•</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Global effect indicators */}
      {isPowerUpActive('SHIELD') && (
        <div className="absolute top-4 left-4 bg-blue-500 bg-opacity-20 backdrop-blur-sm rounded-lg px-3 py-1 border border-blue-400">
          <span className="text-blue-300 font-bold text-sm">🛡️ SHIELD ACTIVE</span>
        </div>
      )}

      {isPowerUpActive('VISION') && (
        <div className="absolute top-4 right-4 bg-purple-500 bg-opacity-20 backdrop-blur-sm rounded-lg px-3 py-1 border border-purple-400">
          <span className="text-purple-300 font-bold text-sm">👁️ FUTURE SIGHT</span>
        </div>
      )}

      {effects.includes('chaos') && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 bg-opacity-20 backdrop-blur-sm rounded-lg px-3 py-1 border border-red-400">
          <span className="text-red-300 font-bold text-sm animate-pulse">💀 CHAOS MODE</span>
        </div>
      )}
    </div>
  );
}