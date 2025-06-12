// src/components/GameGrid.tsx

"use client";

import React, { useEffect, useRef, useState } from 'react';
import { GameEffect, PowerUpType, type Circle } from '@/types/game';
import { getGridDimensions } from '@/utils/gameUtils';

interface GameGridProps {
  circles: Circle[];
  onCircleClick: (id: number) => void;
  effects: GameEffect[];
  isPowerUpActive: (type: PowerUpType) => boolean;
  config: {
    effectsEnabled?: GameEffect[];
    powerUpsEnabled?: PowerUpType[];
  };
  isGameActive?: boolean;
  showCircles?: boolean;
}

export default function GameGrid({ 
  circles, 
  onCircleClick, 
  effects, 
  isPowerUpActive, 
  config,
  isGameActive = true,
  showCircles = true
}: GameGridProps) {
  const { cols, rows } = getGridDimensions(circles.length);

  const getCircleSize = () => {
    const minSize = 40;
    const maxSize = 80;
    const baseSize = Math.min(window.innerWidth / (cols * 2), window.innerHeight / (rows * 2));
    return Math.max(minSize, Math.min(maxSize, baseSize));
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
      onClick: () => isGameActive && onCircleClick(circle.id)
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
    if (effects.includes(GameEffect.EARTHQUAKE)) {
      effects.push(
        <div
          key="earthquake-effect"
          className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-full animate-pulse"
        />
      );
    }

    if (effects.includes(GameEffect.TORNADO)) {
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

  // Visual effects
  const visualEffects: React.ReactNode[] = [];
  
  if (effects.includes(GameEffect.EARTHQUAKE)) {
    visualEffects.push(
      <div
        key="earthquake-effect"
        className="absolute inset-0 pointer-events-none"
        style={{
          animation: 'earthquake 0.5s infinite',
        }}
      />
    );
  }

  if (effects.includes(GameEffect.TORNADO)) {
    visualEffects.push(
      <div
        key="tornado-effect"
        className="absolute inset-0 pointer-events-none"
        style={{
          animation: 'tornado 2s infinite linear',
        }}
      />
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Game circles */}
      {circles.map((circle) => (
        <div
          key={circle.id}
          className={`
            absolute rounded-full cursor-pointer transition-all duration-300
            ${circle.isActive && showCircles ? 'opacity-100' : 'opacity-0'}
            ${circle.isDecoy ? 'bg-red-500' : 'bg-white'}
            ${isPowerUpActive(PowerUpType.FREEZE) ? 'freeze-effect' : ''}
            ${isPowerUpActive(PowerUpType.SLOW_TIME) ? 'slow-time-effect' : ''}
            ${isPowerUpActive(PowerUpType.SHIELD) ? 'shield-effect' : ''}
            ${isPowerUpActive(PowerUpType.VISION) ? 'vision-effect' : ''}
          `}
          style={{
            width: getCircleSize(),
            height: getCircleSize(),
            left: `${circle.x}%`,
            top: `${circle.y}%`,
            transform: `translate(-50%, -50%) ${circle.rotationAngle ? `rotate(${circle.rotationAngle}deg)` : ''}`,
            ...(circle.shakeOffset && {
              transform: `translate(calc(-50% + ${circle.shakeOffset.x}px), calc(-50% + ${circle.shakeOffset.y}px))`,
            }),
          }}
          onClick={() => isGameActive && onCircleClick(circle.id)}
        />
      ))}

      {/* Visual effects */}
      {visualEffects}

      {/* Mode info */}
      {config.effectsEnabled && config.effectsEnabled.length > 0 && (
        <div className="bg-orange-500/20 border border-orange-400/50 rounded-lg p-2">
          <div className="text-orange-300 font-bpdots text-xs font-bold text-center">
            🌪️ EFFECTS: {config.effectsEnabled.map(effect => effect.toString().toUpperCase()).join(', ')}
          </div>
        </div>
      )}

      {config.powerUpsEnabled && config.powerUpsEnabled.length > 0 && (
        <div className="bg-cyan-500/20 border border-cyan-400/50 rounded-lg p-2">
          <div className="text-cyan-300 font-bpdots text-xs font-bold text-center">
            ⚡ POWER-UPS: {config.powerUpsEnabled.map(powerUp => powerUp.toString().toUpperCase()).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}