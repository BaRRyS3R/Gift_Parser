// src/components/LevelDisplay/LevelDisplay.tsx - Level display component for main page

"use client";

import React, { useState } from "react";

import { useT } from "@/contexts/LocalizationContext";
import LevelInfoModal from "./LevelInfoModal";

interface LevelDisplayProps {
  level: number;
  totalGames: number;
  className?: string;
}

const LevelDisplay: React.FC<LevelDisplayProps> = ({
  level,
  totalGames,
  className = "",
}) => {
  const t = useT();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className={`text-center ${className}`}>
        <button
          className="text-white/80 hover:text-white text-sm transition-colors duration-300 cursor-pointer"
          onClick={handleClick}
        >
          {t("levels.display", { level })}
        </button>
      </div>

      <LevelInfoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        currentLevel={level}
        totalGames={totalGames}
      />
    </>
  );
};

export default LevelDisplay;