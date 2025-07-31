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
        relative group px-3 py-1.5
        rounded-md border border-gray-600
        bg-gradient-to-br from-gray-800 to-gray-900
        text-white text-xs font-semibold tracking-wide
        transition-all duration-200 ease-out
        hover:border-gray-500 hover:bg-gray-800
        hover:scale-[1.03] active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
            disabled={isTransitioning}
            onClick={onClick}
        >
            <div className="flex items-center gap-2 justify-center">
                {!isTransitioning && <span>SEASON X</span>}

                {isTransitioning && (
                    <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin" />
                )}
            </div>
        </button>
    );
}
