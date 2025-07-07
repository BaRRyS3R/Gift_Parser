// src/locales/en/tournament.ts - Updated localization with new strings

export const tournament = {
    title: "TOURNAMENT",
    noActiveTournament: "No Active Tournament",
    noActiveTournamentDesc: "There are currently no active tournaments. Check back later for upcoming tournaments!",
    tournamentActive: "Tournament Active",
    timeRemaining: "remaining",
    enterTournament: "PLAY",
    playTournamentAgain: "PLAY AGAIN",
    tournamentEnd: "END",
    tournamentMode: "Tournament Mode",
    prizes: "TOURNAMENT PRIZES",
    winners: "PRIZE WINNERS",
    participants: "PARTICIPANTS",
    noParticipants: "No participants yet",
    beFirstParticipant: "Be the first to enter the tournament!",

    // User position
    yourProgress: "YOUR PROGRESS",
    yourPosition: "Your Position",
    prizePosition: "Prize Position",
    notParticipating: "You are not participating in the tournament yet",
    playToJoinLeaderboard: "Play to join the leaderboard",
    outOf: "out of",

    // Modal windows
    allParticipants: "All Participants",
    totalParticipants: "total participants",
    tournamentPrizes: "Tournament Prizes",
    place: "place",

    // Statistics
    tournamentStats: "Tournament Statistics",
    topParticipants: "Top Participants",
    topScore: "Top Score",

    // Time data
    startDate: "Start Date",
    endDate: "End Date",

    // Main results
    rank: "RANK",
    maxLevel: "MAX LEVEL",
    bestTime: "BEST TIME",
    bestScore: "BEST SCORE",
    survivalTime: "SURVIVAL TIME",
    tournamentScore: "TOURNAMENT SCORE",
    perfectStreak: "PERFECT STREAK",
    correctHits: "CORRECT HITS",
    totalHits: "TOTAL HITS",
    totalPoints: "TOTAL POINTS",
    pointsEarned: "POINTS EARNED",
    addedToTotal: "Added to your tournament total",
    pointsAccumulated: "Points accumulate across all games",
    earnOnePointPerHit: "Earn 1 point per correct hit",
    earnMorePoints: "Play again to earn more points!",
    levelsCompleted: "levels completed",

    // Saving results
    savingResult: "Saving tournament result...",
    resultSaved: "Tournament result saved successfully",
    resultSavedAfterRetries: "Saved after {attempts} attempts",
    dataSynchronized: "Data synchronized with tournament leaderboard",
    saveFailedRetries: "Save failed after {attempts} attempts",
    resultRecordedLocally: "Your result recorded locally but not synchronized",
    retrySave: "RETRY SAVE",
    connectionIssue: "Connection issue - automatic retry",
    retryingSave: "Retrying save ({attempt}/{max})...",

    // Loading
    loadingTournament: "Loading tournament...",
    tournamentNotFound: "Tournament not found",
    redirectingToTournament: "Redirecting to tournament page...",
    ended: "Ended",

    // Statistics and progress
    gamesPlayed: "Games Played",
    totalAccumulated: "Total Accumulated",
    thisGamePoints: "This Game",
    previousTotal: "Previous Total",
    newTotal: "New Total",
    pointsProgress: "Points Progress",
    gameScore: "Game Score",
    accumulatedScore: "Accumulated Score",
    lastGameScore: "Last Game",
    tournamentProgress: "Tournament Progress",

    // Completed tournaments
    completed: "Completed",
    duration: "Duration",
    viewDetails: "View Details",
    tournamentDates: "Tournament Dates",
    start: "Start",
    end: "End",
    prizePositions: "prize positions",
    champions: "Champions",
    loadingChampions: "Loading champions...",
    hits: "hits",
    position: "Position",
    noChampionsData: "No champions data available",
    tournaments: "tournaments",
    status: "Status",

    // Errors and loading states
    errorLoadingTournaments: "Error loading tournaments",
    noTournamentsAvailable: "No tournaments available",
    checkBackLater: "Check back later for upcoming tournaments information",
    tryRefreshPage: "Try refreshing the page",
    refresh: "Refresh",
    checkBackSoon: "New tournaments will appear here soon",
    competitionCenter: "Competition Center",
    hallOfFame: "Hall of Fame",
    loadingTournaments: "Loading tournaments...",
    fetchingData: "Fetching tournament data...",

    // "King of the Hill" Tournament Rules
    rulesAndStrategy: "Rules & Strategy",
    kingOfTheHillRules: "King of the Hill Rules",
    competitionFormat: "Competition Format",

    conceptTitle: "King of the Hill Concept",
    conceptSubtitle: "Point accumulation competition",
    conceptDescription: "The tournament operates on a 'King of the Hill' principle — each game awards points that accumulate in your overall score. The winner is whoever accumulates the most points across all their tournament games.",

    howToPlay: "How to Play",
    playRule1: "Click white circles to earn points",
    playRule2: "Avoid red trap circles",
    playRule3: "Don't miss active targets",

    scoringSystem: "Scoring System",
    scoringRule1: "1 point for each correct hit",
    scoringRule2: "Points accumulate across all games",
    scoringRule3: "Total score determines tournament ranking",

    winningStrategy: "Winning Strategy",
    strategyRule1: "Play multiple games to accumulate points",
    strategyRule2: "Accuracy is more important than speed",
    strategyRule3: "Each game increases your total score",

    timeConstraints: "Time Constraints",
    timeRule1: "Tournament runs for a limited time period",
    timeRule2: "Each game consumes one attempt",

    importantNotes: "Important Notes",
    finalNote: "Remember: in King of the Hill tournaments, the number of games can be a key success factor. The more points you accumulate, the higher your position in the final leaderboard.",

    // Detailed tournament rules
    rules: {
        gameMode: {
            title: "Game Mode",
            description: "Tournaments use Survival Mode exclusively",
            detail1: "Navigate through increasingly difficult levels",
            detail2: "Survive as long as possible to achieve the highest score",
            detail3: "Each level brings faster targets and more complexity"
        },
        competition: {
            title: "Competition Rules",
            description: "Core tournament competition guidelines",
            detail1: "Each game consumes one attempt from your account balance",
            detail2: "Your points accumulate across all tournament games",
            detail3: "Click white circles to earn points and progress",
            detail4: "Avoid red trap circles at all costs - they end the game",
            detail5: "Missing any target ends the game immediately",
            detail6: "Tournament runs for a limited time period only"
        },
        scoring: {
            title: "Points System",
            description: "How tournament rankings are determined",
            detail1: "Total Points is the primary ranking factor",
            detail2: "Earn 1 point for each correct hit on white circles",
            detail3: "Points accumulate across all your tournament games",
            detail4: "Survival Time serves as a secondary ranking factor",
            detail5: "In case of tied points, longest survival time wins",
            detail6: "Real-time leaderboard updates after each game"
        },
        format: {
            title: "Tournament Format",
            description: "Competition structure and timeline",
            detail1: "Tournament runs for a limited time period",
            detail2: "Real-time leaderboard updates every completed game",
            detail3: "Winners determined at tournament conclusion",
            detail4: "No registration required - just start playing",
            detail5: "Prize distribution based on final rankings",
            detail6: "Multiple attempts allowed during tournament period"
        },
        fairPlay: {
            title: "Fair Play Policy",
            description: "Rules for legitimate competition",
            detail1: "No external tools or automation software allowed",
            detail2: "Account sharing is strictly prohibited",
            detail3: "Suspicious activity may result in disqualification",
            detail4: "All games must be played legitimately by the account owner",
            detail5: "Violations may result in permanent tournament ban"
        },
        tips: {
            title: "Pro Tips",
            description: "Strategies for tournament success",
            detail1: "Practice in regular survival mode before competing",
            detail2: "Focus on accuracy over speed to maximize points",
            detail3: "Stay calm as levels increase in difficulty",
            detail4: "Watch for color changes carefully under pressure",
            detail5: "Develop your peripheral vision for multiple targets",
            detail6: "Play multiple games to accumulate more points"
        }
    }
} as const;