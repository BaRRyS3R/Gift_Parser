// src/components/Game/DifficultySelector/DifficultySelector.tsx - REFACTORED

'use client'

import { GameDifficulty } from '@/types/game'
import DifficultyHeader from './DifficultyHeader'
import DifficultyCard from './DifficultyCard'

interface DifficultySelectorProps {
    onSelectDifficulty: (difficulty: GameDifficulty) => void
    selectedDifficulty: GameDifficulty | null
}

export default function DifficultySelector({
    onSelectDifficulty,
    selectedDifficulty,
}: DifficultySelectorProps) {
    const difficulties = Object.values(GameDifficulty)

    return (
        <div className="space-y-8">
            <DifficultyHeader />

            {/* Difficulty Cards Grid */}
            <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto scrollbar-hide">
                {difficulties.map((difficulty, index) => (
                    <DifficultyCard
                        key={difficulty}
                        difficulty={difficulty}
                        isSelected={selectedDifficulty === difficulty}
                        onSelect={onSelectDifficulty}
                        index={index}
                    />
                ))}
            </div>
        </div>
    )
}