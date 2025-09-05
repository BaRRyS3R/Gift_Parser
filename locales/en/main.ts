// src/locales/en/main.ts - Main page elements

export const main = {
  title: "circusle", 
  greeting: "Hello, {name}",
  startGame: "START GAME",
  loading: "LOADING...",
  welcome: "WELCOME",
  chooseEntryMethod: "Choose entry method",
  initialize: "INITIALIZE",
  quickStart: "QUICK START",
  fullExperience: "Full experience with intro video",
  recommended: "Recommended for new users",
  skipIntro: "Skip intro • Potato mode",
  slowConnections: "For slow internet and impatient 🥔",

  // Season Modal
  seasonModal: {
    title: "INFO",
    loading: "LOADING...",
    error: "ERROR",
    noActiveSeason: "NO ACTIVE SEASON",
    noActiveSeasonDesc:
      "There is currently no active season running. Stay tuned for updates on upcoming seasonal competitions.",
    dates: "SEASON DATES",
    prizes: "PRIZES",
    rules: "SEASON RULES",
    gameMode: "Game Mode:",
    kingOfHill: "King of the Hill",
    rulesDescription:
      "All game modes count, but each has its own score multiplier. Because fairness is when everyone is equally inconvenienced.",
    reaction: "Reaction",
    survival: "Survival",
    physics: "Physics",
    rotation: "Rotation",
    noMultiplier: "no multiplier (multipooper lol)",
    rulesNote:
      "Remember: the harder the mode, the more points you get. Revolutionary concept, isn't it?",
    snapshotInfo:
      "A final leaderboard snapshot will be taken at the end of the season. Changes after this moment will not be counted.",
    fairPlayInfo:
      "If we suspect cheating, we may run extra checks before awarding a prize.",
    viewDetails: "LEADERBOARD",
    upcomingSeason: "UPCOMING",
    activeSeason: "ACTIVE",
    endedSeason: "ENDED",
  },
} as const;
