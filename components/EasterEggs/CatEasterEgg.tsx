// src/components/EasterEggs/CatEasterEgg.tsx - Updated with reward system

"use client";

import React, { useState, useEffect } from "react";
import { Gift, Trophy } from "lucide-react";
import { useT } from "@/contexts/LocalizationContext";

interface CatEasterEggProps {
  isVisible: boolean;
  onComplete: () => void;
  makeAuthenticatedRequest?: (
    url: string,
    options?: RequestInit,
  ) => Promise<Response>;
}

export default function CatEasterEgg({
  isVisible,
  onComplete,
  makeAuthenticatedRequest,
}: CatEasterEggProps) {
  const t = useT(); // ADD localization
  const [isActive, setIsActive] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardInfo, setRewardInfo] = useState<{
    attemptsAwarded: number;
    alreadyUnlocked: boolean;
  } | null>(null);

  // Award Easter Egg achievement
  const awardEasterEggAchievement = async () => {
    if (!makeAuthenticatedRequest) {
      console.warn("No authenticated request function provided to CatEasterEgg");
      return null;
    }

    try {
      const response = await makeAuthenticatedRequest("/api/easter-egg/reward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ easterEggType: "cat" }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRewardInfo({
          attemptsAwarded: data.achievement?.attemptsAwarded || 0,
          alreadyUnlocked: data.alreadyUnlocked || false,
        });
        
        return data;
      } else {
        console.error("Failed to award Cat Easter Egg achievement:", data.error);
        return null;
      }
    } catch (error) {
      console.error("Error awarding Cat Easter Egg achievement:", error);
      return null;
    }
  };

  useEffect(() => {
    if (isVisible && !isActive) {
      setIsActive(true);

      // Award achievement when cat appears
      if (makeAuthenticatedRequest) {
        awardEasterEggAchievement().then(() => {
          // Show reward notification after a short delay
          setTimeout(() => {
            setShowReward(true);
          }, 1000);
        });
      }

      // Complete animation after 6 seconds
      const completeTimeout = setTimeout(() => {
        setIsActive(false);
        setShowReward(false);
        onComplete();
      }, 6000);

      return () => {
        clearTimeout(completeTimeout);
      };
    }
  }, [isVisible, isActive, onComplete, makeAuthenticatedRequest]);

  if (!isActive) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 pointer-events-none cat-easter-egg-container"
      style={{
        height: "100vh",
      }}
    >
      <div className="flex items-end justify-center h-full pb-16">
        <div className="relative cat-image-container">
          {/* Main cat image */}
          <img
            alt=""
            className="cat-image"
            draggable={false}
            src="https://notfren.com/circusle/ee/cat.png"
            style={{
              width: "280px",
              height: "280px",
              objectFit: "contain",
              display: "block",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* Shadow */}
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
            style={{
              width: "240px",
              height: "60px",
              background:
                "radial-gradient(ellipse, rgba(0,0,0,0.7) 0%, transparent 70%)",
              filter: "blur(15px)",
              zIndex: -1,
            }}
          />

          {/* Reward notification - FIXED positioning to center */}
          {showReward && rewardInfo && (
            <div 
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto animate-fade-in-up z-60"
              style={{ width: "320px", maxWidth: "90vw" }}
            >
              <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 rounded-lg p-4 backdrop-blur-sm mx-4">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {rewardInfo.alreadyUnlocked ? (
                    <Trophy className="text-pink-400" size={20} />
                  ) : (
                    <Gift className="text-pink-400" size={20} />
                  )}
                  <span className="text-pink-400 font-bold text-sm">
                    {rewardInfo.alreadyUnlocked 
                      ? t("profile.achievements.achievementAlreadyUnlocked" as any)
                      : t("profile.achievements.achievementUnlocked" as any)
                    }
                  </span>
                </div>
                
                {!rewardInfo.alreadyUnlocked && (
                  <div className="space-y-1 text-center">
                    <div className="text-pink-300 text-xs font-bold">
                      🐱 {t("profile.achievements.catEasterEgg" as any)}
                    </div>
                    <div className="text-pink-300/80 text-xs">
                      {t("profile.achievements.attemptsAwarded" as any, { count: rewardInfo.attemptsAwarded })}
                    </div>
                    <div className="text-pink-300/60 text-xs italic">
                      &quot;{t("profile.achievements.descriptions.catEasterEgg" as any)}&quot;
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}