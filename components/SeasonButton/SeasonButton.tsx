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
      aria-label="Season X"
      className={`
        relative group px-5 py-3
        rounded-xl bg-white/5 backdrop-blur-md
        border border-cyan-400/30
        text-white font-semibold tracking-wide text-sm
        transition-all duration-300 ease-out
        shadow-[0_0_10px_rgba(0,255,255,0.15)]
        hover:shadow-[0_0_15px_3px_rgba(0,255,255,0.4)]
        hover:border-cyan-400/60
        hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        overflow-hidden
        ${className}
      `}
      disabled={isTransitioning}
      onClick={onClick}
    >
      {/* Иконка + текст */}
      <div className="relative z-10 flex items-center gap-2 justify-center">
        <span className="text-cyan-300 text-lg">🔥</span>
        <span className="text-white font-bold">SEASON 0</span>
      </div>

      {/* Светящийся фон, усиливается при ховере */}
      <div className="absolute inset-0 z-0 bg-cyan-400/10 blur-lg rounded-xl opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none" />

      {/* Пульс при неактивном состоянии */}
      {!isTransitioning && (
        <div className="absolute inset-0 z-0 rounded-xl animate-pulse bg-cyan-400/5 pointer-events-none" />
      )}

      {/* Спиннер при переходе */}
      {isTransitioning && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-t-transparent border-cyan-300 rounded-full animate-spin z-10" />
      )}
    </button>
  );
}
