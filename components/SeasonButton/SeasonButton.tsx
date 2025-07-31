// src/components/SeasonButton/SeasonButton.tsx

"use client";

import React from "react";

interface SeasonButtonProps {
  isTransitioning?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function SeasonButton({
  isTransitioning = false,
  onClick,
  className = "",
}: SeasonButtonProps) {
  return (
    <button
      aria-label={`Season X`}
      className={`
        group relative px-4 py-2 
        bg-gradient-to-br from-gray-800/80 to-gray-900/90 
        backdrop-blur-sm border-2 border-gray-700/60 
        text-gray-200 rounded-lg 
        hover:border-gray-600/80 hover:from-gray-700/90 hover:to-gray-800/95
        transition-all duration-300 hover:scale-105 active:scale-95 
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-lg shadow-black/20
        ${className}
      `}
      disabled={isTransitioning}
      onClick={onClick}
    >
      <div className="flex items-center justify-center">
        <div className="text-sm font-bold text-gray-200 tracking-wider">
          SEASON 0
        </div>
      </div>
      
      {/* Subtle glow effect on hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-gray-600/20 via-gray-500/10 to-gray-600/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
      
      {/* Subtle pulse effect */}
      <div className="absolute inset-0 rounded-lg bg-gray-700/5 animate-pulse opacity-30" />
    </button>
  );
}