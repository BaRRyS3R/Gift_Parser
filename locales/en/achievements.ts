// src/locales/en/achievements.ts - English achievements localization

export const achievements = {
  title: "ACHIEVEMENTS",
  subtitle: "Track your progress and unlock rewards",
  loading: "Loading",
  error: {
    title: "Error",
    description: "Some shit happens(((",
  },
  stats: {
    unlocked: "Unlocked",
    locked: "Locked",
    all: "All",
    total: "Total",
    progress: "Progress",
  },

  categories: {
    gameplay: "Gameplay",
    progression: "Progression",
    mastery: "Mastery",
    social: "Social",
    league: "League Advancement",
    special: "Elite Status",
  },

  rarity: {
    common: "Common",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
  },

  gameplay: {
    firstSteps: {
      title: "First Steps",
      description: "Complete your first game session",
    },
    gettingStarted: {
      title: "Getting Started",
      description: "Complete 10 game sessions",
    },
    regularPlayer: {
      title: "Regular Player",
      description: "Complete 25 game sessions",
    },
    dedicatedPlayer: {
      title: "Dedicated Player",
      description: "Complete 50 game sessions",
    },
    experiencedGamer: {
      title: "Experienced Gamer",
      description: "Complete 100 game sessions",
    },
    seriousCompetitor: {
      title: "Serious Competitor",
      description: "Complete 250 game sessions",
    },
    elitePlayer: {
      title: "Elite Player",
      description: "Complete 500 game sessions",
    },
    legendaryGamer: {
      title: "Legendary Gamer",
      description: "Complete 1000 game sessions",
    },
    modeExplorer: {
      title: "Mode Explorer",
      description: "Try all available game modes",
    },
  },

  progression: {
    levelClimber: {
      title: "Level Climber",
      description: "Reach level 5",
    },
    advancedPlayer: {
      title: "Advanced Player",
      description: "Reach level 25",
    },
    eliteLevel: {
      title: "Elite Level",
      description: "Reach level 50",
    },
    veteran: {
      title: "Veteran Player",
      description: "Reach level 75",
    },
    maxLevel: {
      title: "Ultimate Achievement",
      description: "Reach maximum level 100",
    },
  },

  mastery: {
    survivalMaster: {
      title: "Survival Master",
      description: "Survive 2+ minutes and reach level 10",
    },
    reactionDemon: {
      title: "Reaction Demon",
      description: "Achieve sub-100ms reaction time",
    },
    physicsGenius: {
      title: "Physics Genius",
      description: "Score 10000+ points in physics mode",
    },
    rotationLegend: {
      title: "Rotation Legend",
      description: "Survive 3+ minutes in rotation mode",
    },
    perfectionist: {
      title: "Perfectionist",
      description: "Achieve 100 perfect hits in a row",
    },
  },

  social: {
    recruiter: {
      title: "Recruiter",
      description: "Invite your first friend",
    },
    networker: {
      title: "Networker",
      description: "Invite 10 friends",
    },
    influencer: {
      title: "Influencer",
      description: "Invite 100 friends",
    },
    communityBuilder: {
      title: "Community Builder",
      description: "Invite 500 friends",
    },
    communityLeader: {
      title: "Community Leader",
      description: "Invite 1000 friends",
    },
  },

  league: {
    silverTier: {
      title: "Silver Tier",
      description: "Reach Silver League",
    },
    goldTier: {
      title: "Gold Tier",
      description: "Reach Gold League",
    },
    platinumTier: {
      title: "Platinum Tier",
      description: "Reach Platinum League",
    },
    diamondElite: {
      title: "Diamond Elite",
      description: "Reach Diamond League",
    },
  },

  special: {
    eliteSurvivor: {
      title: "Elite Survivor",
      description: "Survive for 5+ minutes in survival mode",
    },
    lightningReflexes: {
      title: "Lightning Reflexes",
      description: "Achieve sub-10ms reaction time",
    },
    physicsMaster: {
      title: "Physics Master",
      description: "Score 1000+ points in physics mode",
    },
  },

  empty: {
    title: "No Achievements Yet",
    description: "Complete games to unlock achievements",
  },
} as const;
