// src/game-modes/tournament/index.ts - Tournament mode exports with updated logic

export { default as TournamentGameManager } from "./TournamentGameManager";

// Export tournament-specific game logic
export {
  initializeTournamentGameState,
  updateTournamentLevel,
  activateTournamentCircles,
  handleTournamentCircleClick,
  deactivateTournamentCircle,
  createTournamentGameResult,
  cleanupTournamentGame,
  getTournamentLevelConfig,
  formatTournamentTime,
  TOURNAMENT_CONFIG,
  TOURNAMENT_LEVELS,
} from "./TournamentGameLogic";

// Re-export tournament utilities
export {
  formatTournamentSurvivalTime,
  tournamentService,
} from "@/lib/supabase_tournament_extension";

// Re-export tournament types
export type {
  Tournament,
  TournamentLeaderboardEntry,
  TournamentResult,
  TournamentStatus,
  TournamentGameResult,
} from "@/types/tournaments";
