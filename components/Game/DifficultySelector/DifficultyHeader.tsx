// src/components/Game/DifficultySelector/DifficultyHeader.tsx

'use client'

export default function DifficultyHeader() {
    return (
        <div className="text-center space-y-4">
            <div className="relative">
                <h2 className="text-4xl font-bold font-bpdots text-white tracking-wider">
                    SELECT MODE
                </h2>
                <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-16 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
            </div>
            <p className="text-white/60 font-bpdots text-sm uppercase tracking-widest">
                Choose your challenge level
            </p>
        </div>
    )
}