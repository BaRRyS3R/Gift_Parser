// src/components/LeagueProgress/AchievementNotificationContainer.tsx - Container for achievement notifications

"use client";

import React from "react";
import { useUser } from "@/hooks/useUser";
import AchievementNotification from "./AchievementNotification";

const AchievementNotificationContainer: React.FC = () => {
    const { currentAchievement, hideAchievement } = useUser();

    return (
        <AchievementNotification
            notification={currentAchievement}
            onClose={hideAchievement}
            autoCloseDelay={5000}
        />
    );
};

export default AchievementNotificationContainer;