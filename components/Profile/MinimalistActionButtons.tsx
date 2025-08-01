// src/components/Profile/MinimalistActionButtons.tsx - Simple action buttons

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
        className="w-full bg-transparent border border-white/30 text-white hover:bg-white/10 justify-center"
        variant="bordered"
        onPress={onOpenReferrals}
      >
        {t("profile.referralButton")}
      </Button>

      <Button
        className="w-full bg-transparent border border-white/30 text-white hover:bg-white/10 justify-center"
        variant="bordered"
        onPress={onOpenAchievements}
      >
        {t("profile.achievementButton")}
      </Button>
    </div>
  );
};

export default MinimalistActionButtons;
