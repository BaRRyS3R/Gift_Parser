// src/components/PlayerModal.tsx - Modal for displaying player details and prize

import React from 'react';
import { X, Trophy, Star } from 'lucide-react';

interface PlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: {
        position: number;
        first_name: string;
        last_name?: string;
        username?: string;
        survival_best_score: number;
        isCurrentUser?: boolean;
    } | null;
    prize?: string;
}

export default function PlayerModal({ isOpen, onClose, player, prize }: PlayerModalProps) {
    if (!isOpen || !player) return null;

    const displayName = `${player.first_name} ${player.last_name || ''}`.trim();

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
                onClick={onClose}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        onClose();
                    }
                }}
                role="button"
                tabIndex={0}
                aria-label="Close modal"
            />

            {/* Modal */}
            <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
                <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-t border-white/20 rounded-t-3xl p-6 mx-4 mb-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            {player.position <= 3 && (
                                <Trophy
                                    className={
                                        player.position === 1 ? "text-yellow-400" :
                                            player.position === 2 ? "text-gray-300" : "text-amber-600"
                                    }
                                    size={24}
                                />
                            )}
                            <h3 className="text-xl font-bold text-white">
                                #{player.position} Place
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                        >
                            <X className="text-white" size={16} />
                        </button>
                    </div>

                    {/* Player Info */}
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <h4 className="text-2xl font-bold text-white">{displayName}</h4>
                                {player.isCurrentUser && (
                                    <Star className="text-blue-400" size={16} />
                                )}
                            </div>
                            {player.username && (
                                <p className="text-white/60">@{player.username}</p>
                            )}
                        </div>

                        <div className="text-center py-4">
                            <div className="text-3xl font-bold text-white mb-1">
                                {player.survival_best_score}
                            </div>
                            <div className="text-white/60 text-sm">Points</div>
                        </div>

                        {prize && (
                            <div className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 rounded-lg p-4 text-center">
                                <div className="flex items-center justify-center space-x-2 mb-2">
                                    <Trophy className="text-yellow-400" size={16} />
                                    <span className="text-yellow-300 font-bold text-sm">PRIZE</span>
                                </div>
                                <div className="text-white font-medium">{prize}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}