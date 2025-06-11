// src/components/DifficultySelector.tsx

"use client";

import { GameDifficulty } from "../types/game";
import { GAME_CONFIGS } from "../utils/gameUtils";

interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: GameDifficulty) => void;
  selectedDifficulty: GameDifficulty | null;
}

export default function DifficultySelector({
  onSelectDifficulty,
  selectedDifficulty,
}: DifficultySelectorProps) {
  const difficulties = Object.values(GameDifficulty);

  const getDifficultyColor = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.EASY:
        return "bg-green-500/10 border-green-500/40 text-green-300/80";
      case GameDifficulty.MEDIUM:
        return "bg-amber-500/10 border-amber-500/40 text-amber-300/80";
      case GameDifficulty.HARD:
        return "bg-blue-500/10 border-blue-500/40 text-blue-300/80";
      case GameDifficulty.LEGENDARY:
        return "bg-orange-500/10 border-orange-500/40 text-orange-300/80";
      case GameDifficulty.OMG:
        return "bg-red-500/10 border-red-500/40 text-red-300/80";
      case GameDifficulty.NIGHTMARE:
        return "bg-purple-500/10 border-purple-500/40 text-purple-300/80";
      case GameDifficulty.IMPOSSIBLE:
        return "bg-white/10 border-white/40 text-white/80";
      default:
        return "border-white/40 hover:bg-white/5 text-white/80";
    }
  };

  const getSelectedColor = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.EASY:
        return "bg-green-500/20 border-green-400/60 text-green-200";
      case GameDifficulty.MEDIUM:
        return "bg-amber-500/20 border-amber-400/60 text-amber-200";
      case GameDifficulty.HARD:
        return "bg-blue-500/20 border-blue-400/60 text-blue-200";
      case GameDifficulty.LEGENDARY:
        return "bg-orange-500/20 border-orange-400/60 text-orange-200";
      case GameDifficulty.OMG:
        return "bg-red-500/20 border-red-400/60 text-red-200";
      case GameDifficulty.NIGHTMARE:
        return "bg-purple-500/20 border-purple-400/60 text-purple-200";
      case GameDifficulty.IMPOSSIBLE:
        return "bg-white/20 border-white/60 text-white";
      default:
        return "bg-white/15 border-white/50 text-white";
    }
  };

  const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.EASY: return 'N00B M0D3'
      case GameDifficulty.MEDIUM: return 'C4SU4L M0D3'
      case GameDifficulty.HARD: return 'PR0 M0D3'
      case GameDifficulty.LEGENDARY: return 'L3G3ND M0D3'
      case GameDifficulty.OMG: return '0MG M0D3'
      case GameDifficulty.NIGHTMARE: return 'N1GHT|M4RE'
      case GameDifficulty.IMPOSSIBLE: return 'R4GE M0DE'
    }
  };

  const getDifficultyDescription = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.EASY:
        return "FUND4M3NT4L SK1LL D3V3L0PM3NT";
      case GameDifficulty.MEDIUM:
        return "1NT3RM3D14T3 CH4LL3NG3 W1TH D3C0Y 3L3M3NTS";
      case GameDifficulty.HARD:
        return "4DV4NC3D M3CH4N1CS W1TH 4D4PT1V3 SC4L1NG";
      case GameDifficulty.LEGENDARY:
        return "3XP3RT-L3V3L MULT1-T4RG3T 3NG4G3M3NT";
      case GameDifficulty.OMG:
        return "3XTR3M3 SP33D 4ND PR3C1S10N R3QU1R3M3NTS";
      case GameDifficulty.NIGHTMARE:
        return "M4X1MUM C0MPL3X1TY W1TH FULL M3CH4N1CS";
      case GameDifficulty.IMPOSSIBLE:
        return "ULT1M4T3 T3ST 0F R34CT10N C4P4B1L1T13S";
    }
  };

  const getFeatureList = (difficulty: GameDifficulty): string[] => {
    const config = GAME_CONFIGS[difficulty];
    const features: string[] = [];

    features.push(`${config.circleCount} T4RG3T 3L3M3NTS`);
    features.push(`${config.minActivationTime / 1000}-${config.maxActivationTime / 1000}S 1NT3RV4LS`);

    if (config.maxSimultaneousCircles > 1) {
      features.push(`UP T0 ${config.maxSimultaneousCircles} S1MULT4N30US`);
    }

    if (config.decoyProbability > 0) {
      features.push(`${Math.round(config.decoyProbability * 100)}% D3C0Y PR0B4B1L1TY`);
    }

    if (config.adaptiveScaling) {
      features.push("DYN4M1C D1FF1CULTY 4DJU5TM3NT");
    }

    if (config.fastClickThreshold < 300) {
      features.push(`${config.fastClickThreshold}MS SP33D B0NUS THR3SH0LD`);
    }

    return features;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold font-bpdots text-white">
          S3L3CT D1FF1CULTY
        </h2>
        <p className="text-gray-400 font-bpdots text-sm">
          CH00S3 TR41N1NG 1NT3NS1TY L3V3L F0R S3SS10N P4R4M3T3RS
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {difficulties.map((difficulty) => {
          const config = GAME_CONFIGS[difficulty];
          const isSelected = selectedDifficulty === difficulty;
          const colorClass = isSelected
            ? getSelectedColor(difficulty)
            : getDifficultyColor(difficulty);
          const features = getFeatureList(difficulty);

          return (
            <button
              key={difficulty}
              className={`
                w-full p-4 border rounded-xl font-bpdots 
                transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                backdrop-blur-sm hover:backdrop-blur-md
                ${colorClass}
              `}
              onClick={() => onSelectDifficulty(difficulty)}
            >
              <div className="text-left space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{getDifficultyDisplayName(difficulty)}</h3>
                  <div className="text-sm opacity-70">
                    {config.circleActiveTime}MS 4CT1V3 DUR4T10N
                  </div>
                </div>

                <div className="text-xs opacity-80">
                  {getDifficultyDescription(difficulty)}
                </div>

                <div className="text-xs opacity-60 space-y-1">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <span className="w-1 h-1 bg-current rounded-full mr-2 flex-shrink-0"></span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}