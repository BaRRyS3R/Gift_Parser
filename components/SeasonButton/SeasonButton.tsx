// src/components/SeasonButton/SeasonButton.tsx
import React from "react";

interface SeasonButtonProps {
    isTransitioning?: boolean;
    onClick?: () => void;
    className?: string;
}

export default function SeasonButton({
    isTransitioning = false,
    onClick,
    className = ""
}: SeasonButtonProps) {
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
        ${className}
      `}
            disabled={isTransitioning}
            onClick={onClick}
            style={{
                clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'
            }}
        >
            <div className="flex items-center gap-2 justify-center">
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