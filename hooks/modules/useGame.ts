// src/hooks/modules/useGame.ts - Centralized game logic module

import { useState, useCallback } from 'react';

// Import game result types
import { ReactionGameResult } from "@/types/game-modes/reaction";
import { SurvivalGameResult } from "@/types/game-modes/survival";
import { PhysicsGameResult } from "@/types/game-modes/physics";
import { RotationGameResult } from "@/types/game-modes/rotation";
import type { TournamentGameResult } from "@/types/tournaments";

// Game result union type
type GameResult = ReactionGameResult | SurvivalGameResult | PhysicsGameResult | RotationGameResult | TournamentGameResult;

// Game save result interface
export interface GameSaveResult {
    success: boolean;
    leagueChanged?: boolean;
    newLeague?: any; // Will be properly typed when league module is created
    levelChanged?: boolean;
    newLevel?: number;
    reward?: any; // Will be properly typed when league module is created
    missedRewards?: any[]; // Will be properly typed when league module is created
    error?: string;
}

// Tournament save response interface
export interface TournamentSaveResponse {
    result_id: string;
    total_score: number;
    game_score: number;
    games_played: number;
    previous_total: number;
}

// Hook state interface
interface GameState {
    isLoading: boolean;
    error: string | null;
}

/**
 * Centralized game logic module
 */
export function useGame(makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>) {
    const [state, setState] = useState<GameState>({
        isLoading: false,
        error: null,
    });

    /**
     * Save regular game result (non-tournament modes)
     */
    const saveGameResult = useCallback(async (gameResult: GameResult): Promise<GameSaveResult> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Saving game result:', {
                mode: gameResult.mode,
                score: gameResult.score,
                duration: gameResult.duration
            });

            const response = await makeAuthenticatedRequest('/api/game/save', {
                method: 'POST',
                body: JSON.stringify({ gameResult }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to save game result');
            }

            setState(prev => ({ ...prev, isLoading: false }));

            console.log('Game result saved successfully:', {
                leagueChanged: result.data.leagueChanged,
                levelChanged: result.data.levelChanged,
                hasReward: !!result.data.reward
            });

            return result.data;
        } catch (error) {
            console.error('Error saving game result:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to save game result';

            setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
            throw error;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Save tournament game result with point accumulation
     */
    const saveTournamentResult = useCallback(async (
        tournamentId: string,
        gameResult: SurvivalGameResult
    ): Promise<TournamentSaveResponse> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('Saving tournament result:', {
                tournamentId,
                score: gameResult.score,
                survivalTime: gameResult.survivalTime
            });

            const response = await makeAuthenticatedRequest('/api/tournament/save', {
                method: 'POST',
                body: JSON.stringify({ tournamentId, gameResult }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to save tournament result');
            }

            setState(prev => ({ ...prev, isLoading: false }));

            console.log('Tournament result saved successfully:', {
                gameScore: result.data.game_score,
                totalScore: result.data.total_score
            });

            return result.data;
        } catch (error) {
            console.error('Error saving tournament result:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to save tournament result';

            setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
            throw error;
        }
    }, [makeAuthenticatedRequest]);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    return {
        // State
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        saveGameResult,
        saveTournamentResult,
        clearError,
    };
}