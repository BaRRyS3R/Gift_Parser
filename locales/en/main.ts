// src/locales/en/main.ts - Main page elements

export const main = {
  title: "something",
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
    title: "SEASON INFO",
    loading: "LOADING...",
    error: "ERROR",
    noActiveSeason: "NO ACTIVE SEASON",
    noActiveSeasonDesc: "There is currently no active season running. Stay tuned for updates on upcoming seasonal competitions.",
    dates: "SEASON DATES",
    prizes: "PRIZES",
    snapshotInfo: "A final leaderboard snapshot will be taken at the end of the season. Changes after this moment will not be counted.",
    fairPlayInfo: "If we suspect unfair play, we may conduct additional verification of the user before awarding prizes.",
    viewDetails: "VIEW DETAILS",
    upcomingSeason: "UPCOMING",
    activeSeason: "ACTIVE",
    endedSeason: "ENDED",
  },
} as const;