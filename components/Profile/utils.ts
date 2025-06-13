// src/components/Profile/utils.ts

export const getProfileLevel = (totalGames: number, precisionGames: number) => {
    // Factor in precision mode achievements for level calculation
    const adjustedTotal = totalGames + (precisionGames * 2) // Precision games count double

    if (adjustedTotal >= 100) return { level: 'MASTER', color: 'text-white' }
    if (adjustedTotal >= 50) return { level: 'EXPERT', color: 'text-white' }
    if (adjustedTotal >= 20) return { level: 'VETERAN', color: 'text-white' }
    if (adjustedTotal >= 10) return { level: 'SKILLED', color: 'text-white' }
    return { level: 'ROOKIE', color: 'text-white/60' }
}