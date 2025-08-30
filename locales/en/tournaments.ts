// src/locales/en/tournaments.ts - Tournament localization (English) - UPDATED VERSION
export const tournaments = {
  title: "TOURNAMENTS",
  subtitle: "Weekly competitions",

  // Tournament status
  status: {
    active: "ACTIVE",
    upcoming: "UPCOMING",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  },

  // Tournament sections
  sections: {
    activeTournament: "Current tournament",
    upcomingTournaments: "Upcoming tournaments",
    completedTournaments: "Completed tournaments",
    noActiveTournament: "NO ACTIVE TOURNAMENT",
    noUpcomingTournaments: "No upcoming tournaments",
    noCompletedTournaments: "No completed tournaments",
  },

  // Tournament details
  details: {
    mode: "MODE",
    duration: "Duration",
    participants: "Participants",
    timeLeft: "ENDS IN",
    startsIn: "Starts in",
    endedOn: "Ended on",
    prizes: "PRIZES",
    joinTournament: "JOIN",
    viewLeaderboard: "LEADERBOARD",
    tournamentEnded: "ENDED",
  },

  // Game modes for tournaments
  modes: {
    survival: "SURVIVAL",
    physics: "PHYSICS",
    rotation: "ROTATION",
  },

  // Leaderboard
  leaderboard: {
    title: "LEADERBOARD",
    position: "Rank",
    player: "Player",
    score: "Score",
    games: "GAMES",
    time: "Time",
    level: "Level",
    streak: "Streak",
    hits: "Hits",
    mistakes: "Mistakes",
    yourPosition: "YOUR POSITION",
    notParticipating: "You're not participating in the tournament",
    participateFirst: "Play {mode} mode to join the tournament",
    loadingLeaderboard: "Loading leaderboard...",
    errorLoadingLeaderboard: "Error loading leaderboard",
    retryLoading: "Retry",
    topPlayers: "TOP",
    viewFullLeaderboard: "Full leaderboard",
    backToTournaments: "Back to tournaments",
    updateInfo: "Leaderboard updates every 5 minutes",
    noParticipants: "NO PARTICIPANTS YET",
  },

  // Tournament participation
  participation: {
    howToParticipate: "Weekly tournaments with exciting prizes",
    playGames: "Play {mode} mode during the tournament",
    bestScore: "Your best score counts for the tournament",
    multipleGames: "Play as many games as you want - best result counts",
    timeLimit: "Games only count during tournament time",
    goodLuck: "Good luck in the competition!",
    playFirst: "PLAY YOUR FIRST TOURNAMENT GAME",
    joinCompetition: "Join the competition to appear on the leaderboard",
  },

  // Time formatting
  time: {
    daysLeft: "{days}d {hours}h",
    hoursLeft: "{hours}h {minutes}m",
    minutesLeft: "{minutes}m {seconds}s",
    secondsLeft: "{seconds}s",
    ended: "Ended",
    week: "week",
    day: "day",
    hour: "hour",
    minute: "minute",
    second: "second",
    days: "days",
    hours: "hours",
    minutes: "minutes",
    seconds: "seconds",
  },

  // Errors and loading
  errors: {
    failedToLoad: "Failed to load tournaments",
    tournamentNotFound: "Tournament not found",
    noConnection: "No connection",
    tryAgain: "Try again",
    loadingTournaments: "LOADING TOURNAMENT DATA...",
    loadingTournament: "Loading tournament...",
  },

  // Prize positions
  prizes: {
    first: "1ST PLACE",
    second: "2ND PLACE",
    third: "3RD PLACE",
    position: "{position}TH PLACE",
    topTen: "Top 10",
    winner: "Winner",
    runner_up: "Runner-up",
  },

  // Tournament cards
  cards: {
    participate: "Participate",
    viewDetails: "View details",
    ended: "Ended",
    comingSoon: "Coming soon",
    live: "LIVE",
    new: "NEW",
  },

  // Navigation
  navigation: {
    tournaments: "Tournaments",
    backToGame: "Back to games",
    backToMain: "Back to main",
  },

  // Tournament results and achievements
  results: {
    congratulations: "Congratulations!",
    newPersonalBest: "New personal best in tournament!",
    improvedPosition: "You moved up in the leaderboard!",
    tournamentScore: "Tournament score",
    currentPosition: "Current position",
    keepPlaying: "Keep playing to improve your result!",
    tournamentProgress: "Tournament progress",
  },

  // Empty states
  empty: {
    noTournaments: "TOURNAMENTS ARE CURRENTLY OFFLINE",
    checkBackLater: "CHECK BACK SOON FOR THE NEXT COMPETITION",
    firstTournament: "Upcoming features",
  },

  // Additional missing keys found in components
  stats: {
    startDate: "Start Date",
    endDate: "End Date",
    status: "Status",
  },
} as const;