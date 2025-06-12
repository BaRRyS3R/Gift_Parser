// src/app/game/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GameDifficulty, GameMode } from "@/types/game";
import { GAME_CONFIGS } from "@/utils/gameUtils";
import DifficultySelector from "@/components/DifficultySelector";
import GameManager from "@/components/GameManager";

export default function GamePage() {
  const router = useRouter();
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty | GameMode | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const handleSelectDifficulty = (difficulty: GameDifficulty | GameMode) => {
    setSelectedDifficulty(difficulty);
  };

  const handleStartGame = () => {
    if (!selectedDifficulty) return;
    setGameStarted(true);
  };

  const handleBackToMenu = () => {
    router.push("/main");
  };

  const handleBackToDifficultySelection = () => {
    setGameStarted(false);
    setSelectedDifficulty(null);
  };

  // Get config for selected mode
  const selectedConfig = selectedDifficulty ? GAME_CONFIGS[selectedDifficulty] : null;

  if (gameStarted && selectedDifficulty) {
    return (
      <GameManager
        difficulty={selectedDifficulty}
        onBackToMenu={handleBackToDifficultySelection}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 pb-24">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <DifficultySelector
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={handleSelectDifficulty}
        />

        {/* Mode info panel */}
        {selectedConfig && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4 space-y-3">
            <div className="text-center">
              <h3 className="text-lg font-bold font-bpdots text-white mb-2">
                {selectedConfig.name}
              </h3>
              <p className="text-white/70 font-bpdots text-sm mb-3">
                {selectedConfig.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-white/60 font-bpdots">Duration</div>
                <div className="text-white font-bold font-bpdots">
                  {selectedConfig.gameDuration || 30}s
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-white/60 font-bpdots">Targets</div>
                <div className="text-white font-bold font-bpdots">
                  {selectedConfig.circleCount}
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-white/60 font-bpdots">Active</div>
                <div className="text-white font-bold font-bpdots">
                  {selectedConfig.maxSimultaneousCircles}
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-white/60 font-bpdots">Window</div>
                <div className="text-white font-bold font-bpdots">
                  {selectedConfig.circleActiveTime}ms
                </div>
              </div>
            </div>

            {/* Special features */}
            <div className="space-y-2">
              {selectedConfig.isPrecisionMode && (
                <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-2">
                  <div className="text-red-300 font-bpdots text-xs font-bold text-center">
                    ⚠️ PRECISION MODE: One miss = Game Over
                  </div>
                </div>
              )}

              {selectedConfig.isMemoryMode && (
                <div className="bg-purple-500/20 border border-purple-400/50 rounded-lg p-2">
                  <div className="text-purple-300 font-bpdots text-xs font-bold text-center">
                    🧠 MEMORY MODE: Remember the positions
                  </div>
                </div>
              )}

              {selectedConfig.isSequenceMode && (
                <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-2">
                  <div className="text-blue-300 font-bpdots text-xs font-bold text-center">
                    🎼 SEQUENCE MODE: Repeat the pattern
                  </div>
                </div>
              )}

              {selectedConfig.isBlindMode && (
                <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-2">
                  <div className="text-yellow-300 font-bpdots text-xs font-bold text-center">
                    👁️ BLIND MODE: Lightning fast circles
                  </div>
                </div>
              )}

              {selectedConfig.isReverseMode && (
                <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-2">
                  <div className="text-green-300 font-bpdots text-xs font-bold text-center">
                    🔄 REVERSE MODE: Misses give points!
                  </div>
                </div>
              )}

              {selectedConfig.effectsEnabled && selectedConfig.effectsEnabled.length > 0 && (
                <div className="bg-orange-500/20 border border-orange-400/50 rounded-lg p-2">
                  <div className="text-orange-300 font-bpdots text-xs font-bold text-center">
                    🌪️ EFFECTS: {selectedConfig.effectsEnabled.map(effect => effect.toUpperCase()).join(', ')}
                  </div>
                </div>
              )}

              {selectedConfig.powerUpsEnabled && selectedConfig.powerUpsEnabled.length > 0 && (
                <div className="bg-cyan-500/20 border border-cyan-400/50 rounded-lg p-2">
                  <div className="text-cyan-300 font-bpdots text-xs font-bold text-center">
                    ⚡ POWER-UPS: {selectedConfig.powerUpsEnabled.length} types available
                  </div>
                </div>
              )}

              {selectedConfig.decoyProbability > 0 && (
                <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-2">
                  <div className="text-red-300 font-bpdots text-xs font-bold text-center">
                    🎭 DECOYS: {Math.round(selectedConfig.decoyProbability * 100)}% chance
                  </div>
                </div>
              )}

              {selectedConfig.adaptiveScaling && (
                <div className="bg-pink-500/20 border border-pink-400/50 rounded-lg p-2">
                  <div className="text-pink-300 font-bpdots text-xs font-bold text-center">
                    📈 ADAPTIVE: Difficulty scales with performance
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-4">
          <button
            className={`
              w-full px-8 py-4 border-2 rounded-xl font-bpdots text-xl 
              transition-all duration-300 relative overflow-hidden
              ${selectedDifficulty
                ? "bg-transparent border-white text-white hover:bg-white/10 hover:scale-105 active:scale-95 cursor-pointer"
                : "bg-transparent border-white/30 text-white/30 cursor-not-allowed"
              }
            `}
            disabled={!selectedDifficulty}
            onClick={handleStartGame}
          >
            {/* Animated background for enabled state */}
            {selectedDifficulty && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            )}

            <span className="relative z-10 tracking-wider">
              {selectedDifficulty ? "START GAME" : "SELECT MODE FIRST"}
            </span>

            {/* Subtle glow effect */}
            {selectedDifficulty && (
              <div className="absolute inset-0 bg-white opacity-0 hover:opacity-5 transition-opacity duration-300 rounded-xl"></div>
            )}
          </button>

          <button
            className="w-full px-6 py-3 bg-transparent border-2 border-white/60 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
            onClick={handleBackToMenu}
          >
            BACK TO MENU
          </button>
        </div>

        {/* Quick tips based on selected mode */}
        {selectedConfig && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
            <div className="text-center">
              <h4 className="text-sm font-bpdots text-white/80 font-bold mb-2">💡 PRO TIPS</h4>
              <div className="text-xs font-bpdots text-white/60 space-y-1">
                {selectedConfig.gameMode === GameMode.TIME_ATTACK_60 && (
                  <p>• Focus on speed over accuracy - every second counts!</p>
                )}
                {selectedConfig.gameMode === GameMode.TIME_ATTACK_90 && (
                  <p>• Balance speed and accuracy for maximum points</p>
                )}
                {selectedConfig.gameMode === GameMode.TIME_ATTACK_120 && (
                  <p>• Pace yourself - consistency beats short bursts</p>
                )}
                {selectedConfig.isPrecisionMode && (
                  <p>• Take your time - one mistake ends everything!</p>
                )}
                {selectedConfig.isMemoryMode && (
                  <p>• Create mental patterns to remember positions</p>
                )}
                {selectedConfig.isSequenceMode && (
                  <p>• Watch the entire sequence before starting</p>
                )}
                {selectedConfig.isBlindMode && (
                  <p>• Keep your eyes focused on the center</p>
                )}
                {selectedConfig.isReverseMode && (
                  <p>• Avoid the white circles - miss on purpose!</p>
                )}
                {selectedConfig.effectsEnabled?.includes('earthquake') && (
                  <p>• Predict circle movement during shakes</p>
                )}
                {selectedConfig.effectsEnabled?.includes('tornado') && (
                  <p>• Follow the rotation pattern to track circles</p>
                )}
                {selectedConfig.powerUpsEnabled && selectedConfig.powerUpsEnabled.length > 0 && (
                  <p>• Save power-ups for difficult moments</p>
                )}
                {selectedConfig.decoyProbability > 0 && (
                  <p>• Red circles are enemies - avoid them!</p>
                )}
                {!selectedConfig.isPrecisionMode && !selectedConfig.isMemoryMode && !selectedConfig.isSequenceMode &&
                  !selectedConfig.isBlindMode && !selectedConfig.isReverseMode && (
                    <p>• Build combos for higher scores</p>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}