// src/components/Profile/MinimalistActionButtons.tsx - Simple action buttons

"use client";

import React from "react";
import { Button } from "@nextui-org/react";
import { Share2, Award } from "lucide-react";
import { useT } from "@/contexts/LocalizationContext";

interface MinimalistActionButtonsProps {
    onOpenReferrals: () => void;
    onOpenAchievements: () => void;
}

const MinimalistActionButtons: React.FC<MinimalistActionButtonsProps> = ({
    onOpenReferrals,
    onOpenAchievements
}) => {
    const t = useT();

    return (
        <div className="flex space-x-3 px-4">
            <Button
                className="flex-1 bg-transparent border border-white/30 text-white hover:bg-white/10"
                variant="bordered"
                startContent={<Share2 size={16} />}
                onPress={onOpenReferrals}
            >
                {t("profile.referralButton")}
            </Button>

            <Button
                className="flex-1 bg-transparent border border-white/30 text-white hover:bg-white/10"
                variant="bordered"
                startContent={<Award size={16} />}
                onPress={onOpenAchievements}
            >
                {t("profile.achievementButton")}
            </Button>
        </div>
    );
};

export default MinimalistActionButtons;