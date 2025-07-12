// src/types/achievements.ts - Achievement system types

export type AchievementType =
    | "gameplay"
    | "progression"
    | "mastery"
    | "social"
    | "league"
    | "special";

export interface Achievement {
    id: string;
    type: AchievementType;
    titleKey: string;
    descriptionKey: string;
    icon: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    isUnlocked: boolean;
    progress?: number;
    maxProgress?: number;
    unlockedAt?: string;
}

export interface AchievementCategory {
    type: AchievementType;
    titleKey: string;
    achievements: Achievement[];
}

export interface AchievementProgress {
    achievementId: string;
    progress: number;
    isUnlocked: boolean;
    unlockedAt?: string;
}