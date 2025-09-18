// src/components/Profile/MinimalistActionButtons.tsx - Updated with removed borders and monochrome theme

"use client";

import React from "react";
import { Button } from "@nextui-org/react";

import { useT } from "@/contexts/LocalizationContext";

interface MinimalistActionButtonsProps {
  onOpenReferrals: () => void;
  onOpenAchievements: () => void;
}

const MinimalistActionButtons: React.FC<MinimalistActionButtonsProps> = ({
  onOpenReferrals,
  onOpenAchievements,
}) => {
  const t = useT();

  return (
    <div className="flex gap-3 px-4">
      <Button
        className="w-full bg-white/10 text-white hover:bg-white/20 justify-center shadow-md hover:shadow-lg transition-all duration-300"
        variant="flat"
        onPress={onOpenReferrals}
      >
        {t("profile.referralButton")}
      </Button>

      <Button
        className="w-full bg-white/10 text-white hover:bg-white/20 justify-center shadow-md hover:shadow-lg transition-all duration-300"
        variant="flat"
        onPress={onOpenAchievements}
      >
        {t("profile.achievementButton")}
      </Button>
    </div>
  );
};

export default MinimalistActionButtons;