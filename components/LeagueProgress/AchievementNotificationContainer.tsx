// src/components/LeagueProgress/AchievementNotificationContainer.tsx - Container for achievement notifications

"use client";

import React from "react";

import AchievementNotification from "./AchievementNotification";

import { useUser } from "@/hooks/useUser";

const AchievementNotificationContainer: React.FC = () => {
  const { currentAchievement, hideAchievement } = useUser();

  return (
    <AchievementNotification
      autoCloseDelay={5000}
      notification={currentAchievement}
      onClose={hideAchievement}
    />
  );
};

export default AchievementNotificationContainer;
