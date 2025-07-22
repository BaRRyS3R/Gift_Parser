// src/components/backgrounds/LightRaysHeader.tsx - Enhanced light rays with top 1 player display

import React from 'react';
import { Crown, Star } from 'lucide-react';
import LightRays from './LightRays';

interface TopPlayer {
    position: number;
    first_name: string;
    last_name?: string;
    username?: string;
    survival_best_score: number;
    isCurrentUser?: boolean;
}

interface LightRaysHeaderProps {
    seasonName: string;
    topPlayer?: TopPlayer;
    onTopPlayerClick?: () => void;
    className?: string;
}

export default function LightRaysHeader({
    seasonName,
    topPlayer,
    onTopPlayerClick,
    className = ""
}: LightRaysHeaderProps) {
    const displayName = topPlayer ? `${topPlayer.first_name} ${topPlayer.last_name || ''}`.trim() : '';

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Light Rays Background */}
            <div className="absolute inset-0 z-0">
                <LightRays
                    raysColor="#ffffff"
                    raysSpeed={0.8}
                    lightSpread={1.2}
                    rayLength={1.8}
                    pulsating={false}
                    fadeDistance={1.2}
                    saturation={0.8}
                    noiseAmount={0.05}
                    distortion={0.15}
                />
            </div>

            {/* Gradient Overlay for smooth bottom transition */}
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-black pointer-events-none" />

            {/* Content Layer */}
            <div className="relative z-20 flex flex-col items-center justify-center min-h-[400px] px-4 py-8">

                {/* Season Title */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold tracking-widest text-white drop-shadow-lg animate-fade-in">
                        {seasonName}
                    </h1>
                </div>

                {/* Top 1 Player Display */}
                {topPlayer && (
                    <div className="text-center">
                        <div className="mb-4">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <Crown className="text-yellow-400 drop-shadow-lg" size={28} />
                                <span className="text-yellow-400 font-bold text-xl drop-shadow-lg">
                                    CHAMPION
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={onTopPlayerClick}
                            className="group relative bg-gradient-to-br from-yellow-400/20 to-orange-500/20 backdrop-blur-sm border-2 border-yellow-400/40 rounded-2xl p-6 hover:border-yellow-400/60 hover:from-yellow-400/30 hover:to-orange-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                            {/* Glow Effect */}
                            <div className="absolute -inset-1 bg-gradient-to-br from-yellow-400/30 to-orange-500/30 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />

                            <div className="relative z-10 text-center">
                                <div className="flex items-center justify-center space-x-2 mb-3">
                                    <span className="text-3xl font-bold text-white drop-shadow-lg">
                                        {displayName}
                                    </span>
                                    {topPlayer.isCurrentUser && (
                                        <Star className="text-blue-400 drop-shadow-lg" size={20} />
                                    )}
                                </div>

                                {topPlayer.username && (
                                    <div className="text-yellow-300/80 text-sm mb-3 drop-shadow-sm">
                                        @{topPlayer.username}
                                    </div>
                                )}

                                <div className="bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-lg px-4 py-2">
                                    <div className="text-2xl font-bold text-white drop-shadow-lg">
                                        {topPlayer.survival_best_score}
                                    </div>
                                    <div className="text-xs text-white/70 drop-shadow-sm">
                                        points
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                )}

                {/* No Champion State */}
                {!topPlayer && (
                    <div className="text-center">
                        <div className="mb-4">
                            <Crown className="text-yellow-400/50 drop-shadow-lg mx-auto mb-2" size={28} />
                            <span className="text-yellow-400/70 font-bold text-xl drop-shadow-lg">
                                NO CHAMPION YET
                            </span>
                        </div>
                        <p className="text-white/60 drop-shadow-sm">
                            Be the first to claim the throne!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}