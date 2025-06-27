// src/locales/en/tournament.ts - English translations update
export const tournament = {
    title: "TOURNAMENT",
    noActiveTournament: "No Active Tournament",
    noActiveTournamentDesc: "There are currently no active tournaments. Check back later for upcoming tournaments!",
    tournamentActive: "Tournament Active",
    timeRemaining: "remaining",
    enterTournament: "ENTER TOURNAMENT",
    playTournamentAgain: "PLAY TOURNAMENT AGAIN",
    tournamentEnd: "TOURNAMENT END",
    tournamentMode: "Tournament Mode",
    prizes: "TOURNAMENT PRIZES",
    winners: "PRIZE WINNERS",
    participants: "PARTICIPANTS",
    otherParticipants: "OTHER PARTICIPANTS",
    noParticipants: "No participants yet",
    beFirstParticipant: "Be the first to enter the tournament!",
    yourBestResult: "YOUR TOURNAMENT PROGRESS",
    rank: "RANK",
    maxLevel: "MAX LEVEL",
    bestTime: "BEST TIME",
    survivalTime: "SURVIVAL TIME",
    tournamentScore: "TOURNAMENT SCORE",
    perfectStreak: "PERFECT STREAK",
    correctHits: "CORRECT HITS",
    totalHits: "TOTAL HITS",
    totalPoints: "TOTAL POINTS", // NEW
    topPoints: "TOP POINTS", // NEW
    pointsEarned: "POINTS EARNED",
    addedToTotal: "Added to your tournament total",
    pointsAccumulated: "Points accumulate across all games",
    pointsAddedToTotal: "Points added to tournament total",
    earnOnePointPerHit: "Earn 1 point per correct hit",
    earnMorePoints: "Play again to earn more points!",
    pointsBasedCompetition: "Points-Based Competition", // NEW
    earnPointsMessage: "Earn 1 point for each correct hit!", // NEW
    levelsCompleted: "levels completed",
    savingResult: "Saving tournament result...",
    resultSaved: "Tournament result saved successfully",
    resultSavedAfterRetries: "Saved after {attempts} attempts",
    dataSynchronized: "Data synchronized with tournament leaderboard",
    saveFailedRetries: "Save failed after {attempts} attempts",
    resultRecordedLocally: "Your result recorded locally but not synchronized",
    retrySave: "RETRY SAVE",
    connectionIssue: "Connection issue - automatic retry",
    retryingSave: "Retrying save ({attempt}/{max})...",
    loadingTournament: "Loading tournament...",
    tournamentNotFound: "Tournament not found",
    redirectingToTournament: "Redirecting to tournament page...",
    ended: "Ended",
    rulesTitle: "Tournament Rules",
    rulesSubtitle: "Competition Guidelines & Regulations",
    rulesButton: "Tournament Rules & Guidelines",
    rules: {
        gameMode: {
            title: "Game Mode",
            description: "Tournaments use Survival Mode exclusively",
            detail1: "Navigate through 12 increasingly difficult levels",
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
            title: "Points System", // UPDATED
            description: "How tournament rankings are determined",
            detail1: "Total Points is the primary ranking factor", // UPDATED
            detail2: "Earn 1 point for each correct hit on white circles", // UPDATED
            detail3: "Points accumulate across all your tournament games", // UPDATED
            detail4: "Survival Time serves as a secondary ranking factor", // UPDATED
            detail5: "In case of tied points, longest survival time wins", // UPDATED
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
            detail2: "Focus on accuracy over speed to maximize points", // UPDATED
            detail3: "Stay calm as levels increase in difficulty",
            detail4: "Watch for color changes carefully under pressure",
            detail5: "Develop your peripheral vision for multiple targets",
            detail6: "Play multiple games to accumulate more points" // UPDATED
        }
    }
} as const;