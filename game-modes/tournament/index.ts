// src/game-modes/tournament/index.ts - Tournament mode exports

export { default as TournamentGameManager } from './TournamentGameManager';

// Re-export tournament utilities
export {
    formatTournamentSurvivalTime,
    tournamentService
} from '@/lib/supabase_tournament_extension';

// Re-export tournament types
export type {
    Tournament,
    TournamentLeaderboardEntry,
    TournamentResult,
    TournamentStatus,
    TournamentGameResult
} from '@/types/tournaments';