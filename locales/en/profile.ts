// src/locales/en/profile.ts - Updated English profile translations with Easter Egg achievements

export const profile = {
  title: "PROFILE",
  loadingProfile: "LOADING PROFILE...",
  notFound: "PROFILE NOT FOUND",
  overallStats: "Overall Stats",
  reactionMode: "Reaction",
  survivalMode: "Survival",
  physicsMode: "Physics",
  rotationMode: "Rotation",
  noDataYet: "No data",
  noReactionTestsYet: "No data. Fortunately.",
  testReflexesToSeeStats: "Play reaction mode to see stats",
  noSurvivalAttemptsYet: "No data. Fortunately.",
  enterSurvivalToSeeStats: "Play survival mode to see stats",
  noPhysicsAttemptsYet: "No data. Fortunately.",
  enterPhysicsToSeeStats: "Play physics mode to see stats",
  noRotationAttemptsYet: "No data. Fortunately.",
  enterRotationToSeeStats: "Play rotation mode to see stats",
  totalGames: "Total Games",
  currentAttempts: "Current Attempts",
  totalTests: "Total Tests",
  totalAttempts: "Total Attempts",
  referralButton: "Referrals",
  achievementButton: "Achievements",
  leagueButton: "League",

  // Achievement header display
  attempts: "attempts",
  achievementsUnlocked: "{count} of {total} achievements unlocked",
  progress: "Progress",

  // Level and league display
  levelDisplay: "Level:",
  currentLeague: "Current",
  gamesUnit: "games",
  rewardsUnit: "rewards",
  gamesRequired: "games required",
  inLeague: "in",

  // Level progress
  levelProgress: {
    gamesToNext: "Games to next level",
    nextLevel: "Next level {level}",
    nextLeague: "Next league",
    maxAchieved: "Maximum achieved",
  },

  // League position
  leaguePosition: {
    title: "League Position",
    yourPosition: "Your position",
    gamesAhead: "games ahead",
    gamesBehind: "games behind",
    aloneInLeague: "You are alone in this league",
    leagueLeader: "League Leader!",
  },

  tabs: {
    stats: "STATISTICS",
    referrals: "REFERRALS",
    history: "HISTORY",
    achievements: "ACHIEVEMENTS",
  },
  levels: {
    rookie: "NEWCOMER",
    active: "ACTIVE",
    skilled: "SKILLED",
    expert: "EXPERT",
    legend: "LEGEND",
  },
  stats: {
    title: "STATISTICS",
    currentAttempts: "Current Attempts",
    reactionModeStats: "Reaction",
    survivalModeStats: "Survival",
    physicsModeStats: "Physics",
    rotationModeStats: "Rotation",
    noReactionTests: "NO REACTION TESTS",
    testReflexes: "Test your lightning reflexes (if you have them)!",
    noSurvivalAttempts: "NO SURVIVAL ATTEMPTS",
    enterSurvival: "ACCEPT SURVIVAL CHALLENGE!",
    noPhysicsAttempts: "NO PHYSICS EXPERIMENTS",
    enterPhysics: "TRY PHYSICS EXPERIMENT!",
    noRotationAttempts: "NO ROTATION EXPERIMENTS",
    enterRotation: "TRY ROTATION EXPERIMENT!",
    bestTime: "Best Time",
    bestScore: "Best Score",
    averageTime: "Average Time",
    ranking: "Rating",
    maxLevel: "Maximum Level",
    bestStreak: "Best Streak",
    bestSurvival: "Best Survival",
    totalExperiments: "Total Experiments",
    totalSpins: "Total Spins",
  },
  referrals: {
    title: "RECRUITMENT",
    friendsInvited: "FRIENDS INVITED",
    attemptsBonus: "BONUS ATTEMPTS",
    yourReferralCode: "YOUR REFERRAL CODE",
    referralLink: "REFERRAL LINK",
    copyLink: "COPY",
    share: "SHARE",
    howItWorks: "HOW IT WORKS",
    shareWithFriends: "Spam your referral link.",
    theyGetExtra: "They get extra attempts for registering via your link.",
    youGetRecognition:
      "You get respect for each invitee. And 5 attempts for yourself. That's all.",
    helpGrow: "More people - less oxygen! But also more burning asses 🥴",
    referredBy: "INVITED",
  },
  history: {
    title: "RECENT GAMES",
    noGamesYet: "NO GAMES PLAYED YET",
  },
  achievements: {
    title: "ACHIEVEMENTS",
    noAchievements: "NO ACHIEVEMENTS UNLOCKED",
    playToUnlock: "PLAY GAMES TO UNLOCK ACHIEVEMENTS!",

    // Achievement reward strings
    totalAttemptsEarned: "Total attempts earned: {count}",
    rewardsInfo: "Unlock achievements to earn bonus attempts!",
    automaticRewards:
      "Rewards are automatically added to your account when you unlock an achievement.",
    unlockedOn: "Unlocked on {date}",

    // NEW: Easter Egg notification strings
    achievementUnlocked: "Achievement Unlocked!",
    achievementAlreadyUnlocked: "Achievement Already Unlocked",
    attemptsAwarded: "+{count} attempts awarded!",

    // Regular achievement names (camelCase keys matching the toCamelCase conversion)
    firstGame: "FIRST STEPS",
    allModesPlayer: "UNIVERSAL PLAYER",
    superRecruiter: "SUPER RECRUITER",
    lightningReflexes: "LIGHTNING REFLEXES",

    // NEW: Easter Egg achievement names
    binaryEasterEgg: "BINARY GENIUS",
    catEasterEgg: "CAT WHISPERER",
    winxEasterEgg: "FAIRY GODPARENT",

    // Regular achievement descriptions (camelCase keys)
    descriptions: {
      firstGame: "PLAYED FIRST GAME",
      allModesPlayer: "TRIED ALL GAME MODES",
      superRecruiter: "INVITED {count}+ FRIENDS",
      lightningReflexes: "SUB {time}MS REACTION",

      // NEW: Easter Egg achievement descriptions
      binaryEasterEgg: "Found the secret binary sequence. Congrats, you can count to 2!",
      catEasterEgg: "A mysterious cat appeared. Did you pet it or did it judge you?",
      winxEasterEgg: "Became a Winx fairy! Your transformation was... magical? Or just lucky.",
    },
  },
} as const;