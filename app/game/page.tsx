// src/app/game/page.tsx - Updated to work with new DifficultySelector

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GameDifficulty } from "@/types/game";
import DifficultySelector from "@/components/DifficultySelector";
import GameManager from "@/components/GameManager";

export default function GamePage() {
  const router = useRouter();
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<GameDifficulty | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const handleSelectDifficulty = (difficulty: GameDifficulty) => {
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

  if (gameStarted && selectedDifficulty) {
    return (
      <GameManager
        difficulty={selectedDifficulty}
        onBackToMenu={handleBackToDifficultySelection}
      />
    );
  }

  return (
    <DifficultySelector
      selectedDifficulty={selectedDifficulty}
      onSelectDifficulty={handleSelectDifficulty}
      onPlay={handleStartGame}
      onBack={handleBackToMenu}
    />
  );
}