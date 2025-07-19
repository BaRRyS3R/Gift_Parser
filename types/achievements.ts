// src/types/achievements.ts - Achievement type definitions

import type { ComponentType } from 'react';

export interface Achievement {
    id: string;
    titleKey: string;
    descriptionKey: string;
    icon: ComponentType<any>;
    color: string;
    bgColor: string;
    isUnlocked: boolean;
    progress?: number;
    maxProgress?: number;
    category: AchievementCategory;
}

export enum AchievementCategory {
    GENERAL = 'general',
    REFERRAL = 'referral',
    REACTION = 'reaction',
    SURVIVAL = 'survival',
    PHYSICS = 'physics',
    ROTATION = 'rotation',
    RANKING = 'ranking',
}

export interface AchievementProgress {
    achievementId: string;
    isUnlocked: boolean;
    progress?: number;
    unlockedAt?: string;
}

export interface UserAchievements {
    achievements: Achievement[];
    unlockedCount: number;
    totalCount: number;
    recentlyUnlocked: Achievement[];
}