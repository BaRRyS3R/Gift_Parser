// src/lib/achievementService.ts - Achievement calculation and management

import type { User } from "@/lib/supabase";
import type { Achievement, AchievementCategory } from "@/types/achievements";

import leagueService from "@/lib/league_service";

interface UserRankings {
  overall: number | null;
  reaction: number | null;
  survival: number | null;
  physics?: number | null;
  rotation?: number | null;
}

export class AchievementService {
  static calculateAchievements(
    user: User,
    rankings: UserRankings,
  ): AchievementCategory[] {
    const categories: AchievementCategory[] = [
      this.getGameplayAchievements(user),
      this.getProgressionAchievements(user),
      this.getMasteryAchievements(user, rankings),
      this.getSocialAchievements(user),
      this.getLeagueAchievements(user),
      this.getSpecialAchievements(user, rankings),
    ];

    return categories.filter((category) => category.achievements.length > 0);
  }

  private static getGameplayAchievements(user: User): AchievementCategory {
    const achievements: Achievement[] = [
      {
        id: "first_steps",
        type: "gameplay",
        titleKey: "achievements.gameplay.firstSteps.title",
        descriptionKey: "achievements.gameplay.firstSteps.description",
        icon: "🎮",
        rarity: "common",
        isUnlocked: user.total_games >= 1,
        progress: user.total_games,
        maxProgress: 1,
      },
      {
        id: "getting_started",
        type: "gameplay",
        titleKey: "achievements.gameplay.gettingStarted.title",
        descriptionKey: "achievements.gameplay.gettingStarted.description",
        icon: "🎯",
        rarity: "common",
        isUnlocked: user.total_games >= 10,
        progress: user.total_games,
        maxProgress: 10,
      },
      {
        id: "regular_player",
        type: "gameplay",
        titleKey: "achievements.gameplay.regularPlayer.title",
        descriptionKey: "achievements.gameplay.regularPlayer.description",
        icon: "🎲",
        rarity: "common",
        isUnlocked: user.total_games >= 25,
        progress: user.total_games,
        maxProgress: 25,
      },
      {
        id: "dedicated_player",
        type: "gameplay",
        titleKey: "achievements.gameplay.dedicatedPlayer.title",
        descriptionKey: "achievements.gameplay.dedicatedPlayer.description",
        icon: "🏅",
        rarity: "rare",
        isUnlocked: user.total_games >= 50,
        progress: user.total_games,
        maxProgress: 50,
      },
      {
        id: "experienced_gamer",
        type: "gameplay",
        titleKey: "achievements.gameplay.experiencedGamer.title",
        descriptionKey: "achievements.gameplay.experiencedGamer.description",
        icon: "🎖️",
        rarity: "rare",
        isUnlocked: user.total_games >= 100,
        progress: user.total_games,
        maxProgress: 100,
      },
      {
        id: "serious_competitor",
        type: "gameplay",
        titleKey: "achievements.gameplay.seriousCompetitor.title",
        descriptionKey: "achievements.gameplay.seriousCompetitor.description",
        icon: "🏆",
        rarity: "epic",
        isUnlocked: user.total_games >= 250,
        progress: user.total_games,
        maxProgress: 250,
      },
      {
        id: "elite_player",
        type: "gameplay",
        titleKey: "achievements.gameplay.elitePlayer.title",
        descriptionKey: "achievements.gameplay.elitePlayer.description",
        icon: "👑",
        rarity: "epic",
        isUnlocked: user.total_games >= 500,
        progress: user.total_games,
        maxProgress: 500,
      },
      {
        id: "legendary_gamer",
        type: "gameplay",
        titleKey: "achievements.gameplay.legendaryGamer.title",
        descriptionKey: "achievements.gameplay.legendaryGamer.description",
        icon: "⭐",
        rarity: "legendary",
        isUnlocked: user.total_games >= 1000,
        progress: user.total_games,
        maxProgress: 1000,
      },
      {
        id: "mode_explorer",
        type: "gameplay",
        titleKey: "achievements.gameplay.modeExplorer.title",
        descriptionKey: "achievements.gameplay.modeExplorer.description",
        icon: "🔄",
        rarity: "rare",
        isUnlocked: this.hasPlayedAllModes(user),
      },
    ];

    return {
      type: "gameplay",
      titleKey: "achievements.categories.gameplay",
      achievements: achievements,
    };
  }

  private static getProgressionAchievements(user: User): AchievementCategory {
    const currentLevel = leagueService.calculateLevel(user.total_games);

    const achievements: Achievement[] = [
      {
        id: "level_climber",
        type: "progression",
        titleKey: "achievements.progression.levelClimber.title",
        descriptionKey: "achievements.progression.levelClimber.description",
        icon: "📈",
        rarity: "common",
        isUnlocked: currentLevel >= 5,
        progress: currentLevel,
        maxProgress: 5,
      },
      {
        id: "advanced_player",
        type: "progression",
        titleKey: "achievements.progression.advancedPlayer.title",
        descriptionKey: "achievements.progression.advancedPlayer.description",
        icon: "🎯",
        rarity: "rare",
        isUnlocked: currentLevel >= 25,
        progress: currentLevel,
        maxProgress: 25,
      },
      {
        id: "elite_level",
        type: "progression",
        titleKey: "achievements.progression.eliteLevel.title",
        descriptionKey: "achievements.progression.eliteLevel.description",
        icon: "⭐",
        rarity: "epic",
        isUnlocked: currentLevel >= 50,
        progress: currentLevel,
        maxProgress: 50,
      },
      {
        id: "veteran",
        type: "progression",
        titleKey: "achievements.progression.veteran.title",
        descriptionKey: "achievements.progression.veteran.description",
        icon: "🏅",
        rarity: "epic",
        isUnlocked: currentLevel >= 75,
        progress: currentLevel,
        maxProgress: 75,
      },
      {
        id: "max_level",
        type: "progression",
        titleKey: "achievements.progression.maxLevel.title",
        descriptionKey: "achievements.progression.maxLevel.description",
        icon: "💎",
        rarity: "legendary",
        isUnlocked: currentLevel >= leagueService.MAX_LEVEL,
        progress: currentLevel,
        maxProgress: leagueService.MAX_LEVEL,
      },
    ];

    return {
      type: "progression",
      titleKey: "achievements.categories.progression",
      achievements: achievements,
    };
  }

  private static getMasteryAchievements(
    user: User,
    rankings: UserRankings,
  ): AchievementCategory {
    const achievements: Achievement[] = [
      {
        id: "survival_master",
        type: "mastery",
        titleKey: "achievements.mastery.survivalMaster.title",
        descriptionKey: "achievements.mastery.survivalMaster.description",
        icon: "⚔️",
        rarity: "epic",
        isUnlocked:
          user.survival_best_time >= 120000 && user.survival_max_level >= 10,
      },
      {
        id: "reaction_demon",
        type: "mastery",
        titleKey: "achievements.mastery.reactionDemon.title",
        descriptionKey: "achievements.mastery.reactionDemon.description",
        icon: "⚡",
        rarity: "legendary",
        isUnlocked:
          user.reaction_best_time > 0 && user.reaction_best_time <= 100,
      },
      {
        id: "physics_genius",
        type: "mastery",
        titleKey: "achievements.mastery.physicsGenius.title",
        descriptionKey: "achievements.mastery.physicsGenius.description",
        icon: "🧠",
        rarity: "legendary",
        isUnlocked:
          user.physics_best_score >= 10000 && user.physics_games >= 20,
        progress: user.physics_best_score,
        maxProgress: 10000,
      },
      {
        id: "rotation_legend",
        type: "mastery",
        titleKey: "achievements.mastery.rotationLegend.title",
        descriptionKey: "achievements.mastery.rotationLegend.description",
        icon: "🌀",
        rarity: "epic",
        isUnlocked:
          user.rotation_best_time >= 180000 && user.rotation_max_level >= 8,
      },
      {
        id: "perfectionist",
        type: "mastery",
        titleKey: "achievements.mastery.perfectionist.title",
        descriptionKey: "achievements.mastery.perfectionist.description",
        icon: "✨",
        rarity: "legendary",
        isUnlocked: user.survival_best_streak >= 100,
        progress: user.survival_best_streak,
        maxProgress: 100,
      },
    ];

    return {
      type: "mastery",
      titleKey: "achievements.categories.mastery",
      achievements: achievements,
    };
  }

  private static getSocialAchievements(user: User): AchievementCategory {
    const achievements: Achievement[] = [
      {
        id: "recruiter",
        type: "social",
        titleKey: "achievements.social.recruiter.title",
        descriptionKey: "achievements.social.recruiter.description",
        icon: "👥",
        rarity: "common",
        isUnlocked: user.referral_count >= 1,
        progress: user.referral_count,
        maxProgress: 1,
      },
      {
        id: "networker",
        type: "social",
        titleKey: "achievements.social.networker.title",
        descriptionKey: "achievements.social.networker.description",
        icon: "🤝",
        rarity: "common",
        isUnlocked: user.referral_count >= 10,
        progress: user.referral_count,
        maxProgress: 10,
      },
      {
        id: "influencer",
        type: "social",
        titleKey: "achievements.social.influencer.title",
        descriptionKey: "achievements.social.influencer.description",
        icon: "📢",
        rarity: "rare",
        isUnlocked: user.referral_count >= 100,
        progress: user.referral_count,
        maxProgress: 100,
      },
      {
        id: "community_builder",
        type: "social",
        titleKey: "achievements.social.communityBuilder.title",
        descriptionKey: "achievements.social.communityBuilder.description",
        icon: "🏗️",
        rarity: "epic",
        isUnlocked: user.referral_count >= 500,
        progress: user.referral_count,
        maxProgress: 500,
      },
      {
        id: "community_leader",
        type: "social",
        titleKey: "achievements.social.communityLeader.title",
        descriptionKey: "achievements.social.communityLeader.description",
        icon: "🌟",
        rarity: "legendary",
        isUnlocked: user.referral_count >= 1000,
        progress: user.referral_count,
        maxProgress: 1000,
      },
    ];

    return {
      type: "social",
      titleKey: "achievements.categories.social",
      achievements: achievements,
    };
  }

  private static getLeagueAchievements(user: User): AchievementCategory {
    const achievements: Achievement[] = [
      {
        id: "silver_tier",
        type: "league",
        titleKey: "achievements.league.silverTier.title",
        descriptionKey: "achievements.league.silverTier.description",
        icon: "🥈",
        rarity: "common",
        isUnlocked: user.total_games >= 300,
        progress: user.total_games,
        maxProgress: 300,
      },
      {
        id: "gold_tier",
        type: "league",
        titleKey: "achievements.league.goldTier.title",
        descriptionKey: "achievements.league.goldTier.description",
        icon: "🥇",
        rarity: "rare",
        isUnlocked: user.total_games >= 800,
        progress: user.total_games,
        maxProgress: 800,
      },
      {
        id: "platinum_tier",
        type: "league",
        titleKey: "achievements.league.platinumTier.title",
        descriptionKey: "achievements.league.platinumTier.description",
        icon: "💎",
        rarity: "epic",
        isUnlocked: user.total_games >= 2000,
        progress: user.total_games,
        maxProgress: 2000,
      },
      {
        id: "diamond_elite",
        type: "league",
        titleKey: "achievements.league.diamondElite.title",
        descriptionKey: "achievements.league.diamondElite.description",
        icon: "💠",
        rarity: "legendary",
        isUnlocked: user.total_games >= 4000,
        progress: user.total_games,
        maxProgress: 4000,
      },
    ];

    return {
      type: "league",
      titleKey: "achievements.categories.league",
      achievements: achievements,
    };
  }

  private static getSpecialAchievements(
    user: User,
    rankings: UserRankings,
  ): AchievementCategory {
    const achievements: Achievement[] = [
      {
        id: "elite_survivor",
        type: "special",
        titleKey: "achievements.special.eliteSurvivor.title",
        descriptionKey: "achievements.special.eliteSurvivor.description",
        icon: "🏆",
        rarity: "legendary",
        isUnlocked: user.survival_best_time >= 300000, // 5+ minutes survival
        progress: Math.floor(user.survival_best_time / 1000),
        maxProgress: 300,
      },
      {
        id: "lightning_reflexes",
        type: "special",
        titleKey: "achievements.special.lightningReflexes.title",
        descriptionKey: "achievements.special.lightningReflexes.description",
        icon: "⚡",
        rarity: "legendary",
        isUnlocked:
          user.reaction_best_time > 0 && user.reaction_best_time <= 10,
      },
      {
        id: "physics_master",
        type: "special",
        titleKey: "achievements.special.physicsMaster.title",
        descriptionKey: "achievements.special.physicsMaster.description",
        icon: "🧪",
        rarity: "legendary",
        isUnlocked:
          user.physics_best_score >= 10000 && user.physics_games >= 50,
        progress: user.physics_best_score,
        maxProgress: 10000,
      },
    ];

    return {
      type: "special",
      titleKey: "achievements.categories.special",
      achievements: achievements,
    };
  }

  // Remove the calculateTotalPlayTime method as it's no longer needed

  private static hasPlayedAllModes(user: User): boolean {
    return (
      user.reaction_games > 0 &&
      user.survival_games > 0 &&
      user.physics_games > 0 &&
      user.rotation_games > 0
    );
  }

  static getAchievementStats(categories: AchievementCategory[]): {
    total: number;
    unlocked: number;
    percentage: number;
  } {
    let total = 0;
    let unlocked = 0;

    categories.forEach((category) => {
      category.achievements.forEach((achievement) => {
        total++;
        if (achievement.isUnlocked) {
          unlocked++;
        }
      });
    });

    return {
      total,
      unlocked,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
    };
  }

  static getRarityColor(rarity: Achievement["rarity"]): {
    text: string;
    bg: string;
    border: string;
  } {
    switch (rarity) {
      case "common":
        return {
          text: "text-gray-300",
          bg: "bg-gray-500/20",
          border: "border-gray-400/30",
        };
      case "rare":
        return {
          text: "text-blue-300",
          bg: "bg-blue-500/20",
          border: "border-blue-400/30",
        };
      case "epic":
        return {
          text: "text-purple-300",
          bg: "bg-purple-500/20",
          border: "border-purple-400/30",
        };
      case "legendary":
        return {
          text: "text-yellow-300",
          bg: "bg-yellow-500/20",
          border: "border-yellow-400/30",
        };
      default:
        return {
          text: "text-white",
          bg: "bg-white/10",
          border: "border-white/20",
        };
    }
  }
}
