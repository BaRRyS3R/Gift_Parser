// src/types/safe-leaderboard.ts - Безопасные типы для leaderboard без sensitive данных

export interface SafeLeaderboardEntry {
    rank: number;
    displayName: string;
    username?: string;
    isPremium: boolean;
    lastPlayedAt?: string;
    isCurrentUser: boolean;
}

export interface SafeReactionLeaderboardEntry extends SafeLeaderboardEntry {
    bestReactionTime: number;
    reactionGames: number;
    bestReactionScore: number;
}

export interface SafeSurvivalLeaderboardEntry extends SafeLeaderboardEntry {
    bestSurvivalTime: number;
    maxLevel: number;
    bestStreak: number;
    survivalGames: number;
}

export interface SafePhysicsLeaderboardEntry extends SafeLeaderboardEntry {
    bestPhysicsScore: number;
    bestPhysicsTime: number;
    bestHits: number;
    leastMistakes: number;
    physicsGames: number;
}

export interface SafeRotationLeaderboardEntry extends SafeLeaderboardEntry {
    bestRotationTime: number;
    maxLevel: number;
    bestStreak: number;
    totalHits: number;
    rotationGames: number;
}

export interface LeaderboardResponse<T> {
    success: boolean;
    leaderboard: T[];
    total: number;
    error?: string;
    message?: string;
}