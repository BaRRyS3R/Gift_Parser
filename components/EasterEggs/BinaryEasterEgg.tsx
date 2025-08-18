// src/components/EasterEggs/BinaryEasterEgg.tsx - Updated with reward system

"use client";

import React, { useState } from "react";
import { Button } from "@nextui-org/react";
import { Check, X, Gift, Trophy } from "lucide-react";

interface BinaryEasterEggProps {
  isVisible: boolean;
  onClose: () => void;
  makeAuthenticatedRequest: (
    url: string,
    options?: RequestInit,
  ) => Promise<Response>;
}

export default function BinaryEasterEgg({
  isVisible,
  onClose,
  makeAuthenticatedRequest,
}: BinaryEasterEggProps) {
  const [binaryString, setBinaryString] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [rewardInfo, setRewardInfo] = useState<{
    attemptsAwarded: number;
    alreadyUnlocked: boolean;
  } | null>(null);

  // Haptic feedback helper
  const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      } catch (error) {
        // Fallback for non-Telegram environments
        if (navigator.vibrate) {
          const vibrationMap = {
            light: 50,
            medium: 100,
            heavy: 200,
          };

          navigator.vibrate(vibrationMap[type]);
        }
      }
    }
  };

  // Handle binary digit click (0 or 1)
  const handleBinaryClick = (digit: "0" | "1") => {
    triggerHaptic("medium");
    setBinaryString((prev) => prev + digit);
    setResultMessage("");
    setRewardInfo(null);
  };

  // Award Easter Egg achievement
  const awardEasterEggAchievement = async () => {
    try {
      const response = await makeAuthenticatedRequest("/api/easter-egg/reward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ easterEggType: "binary" }),
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
        console.error("Failed to award Easter Egg achievement:", data.error);
        return null;
      }
    } catch (error) {
      console.error("Error awarding Easter Egg achievement:", error);
      return null;
    }
  };

  // Handle check button click
  const handleCheck = async () => {
    if (binaryString.length === 0) {
      setResultMessage("Enter some binary digits first!");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic("light");

    try {
      // Check the binary sequence first
      const response = await makeAuthenticatedRequest(
        "/api/easter-egg/binary-check",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ binaryString }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        setResultMessage(data.message);

        // ONLY award the Easter Egg achievement if binary sequence is CORRECT
        const rewardData = await awardEasterEggAchievement();

        // Success haptic feedback
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
          try {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
          } catch (error) {
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
          }
        }
      } else {
        // Wrong sequence - no reward given
        setIsSuccess(false);
        setResultMessage(data.error || "Wrong binary sequence!");
        setBinaryString("");
        setRewardInfo(null); // Clear any previous reward info

        // Error haptic feedback
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
          try {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred("error");
          } catch (error) {
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          }
        }
      }
    } catch (error) {
      setIsSuccess(false);
      setResultMessage("Network error. Try again!");
      setBinaryString("");
      setRewardInfo(null);

      // Error haptic feedback
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        try {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred("error");
        } catch (error) {
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    triggerHaptic("light");
    setBinaryString("");
    setResultMessage("");
    setIsSuccess(false);
    setRewardInfo(null);
    onClose();
  };

  // Copy success message to clipboard
  const handleCopyMessage = async () => {
    if (isSuccess && resultMessage) {
      try {
        await navigator.clipboard.writeText(resultMessage);
        triggerHaptic("medium");
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full animate-fade-in-up">
      {/* Easter egg container */}
      <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-6 relative">
        {/* Close button */}
        <button
          aria-label="Close easter egg"
          className="absolute top-2 right-2 p-1 text-white/60 hover:text-white transition-colors"
          style={{ touchAction: "manipulation" }}
          type="button"
          onTouchEnd={handleClose}
        >
          <X size={16} />
        </button>

        {/* Binary input area */}
        <div className="space-y-4">
          {/* Title */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-white mb-1">🔢 Binary Challenge</h3>
            <p className="text-white/60 text-sm">Find the correct sequence</p>
          </div>

          {/* Binary circles - no numbers shown */}
          <div className="flex items-center justify-center space-x-4">
            <button
              aria-label="Add binary 0"
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50 active:scale-95"
              disabled={isSubmitting}
              style={{ touchAction: "manipulation" }}
              type="button"
              onTouchEnd={() => handleBinaryClick("0")}
            >
              {/* Empty circle for 0 */}
            </button>
            <button
              aria-label="Add binary 1"
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50 active:scale-95"
              disabled={isSubmitting}
              style={{ touchAction: "manipulation" }}
              type="button"
              onTouchEnd={() => handleBinaryClick("1")}
            >
              {/* Empty circle for 1 */}
            </button>
          </div>

          {/* Current sequence display */}
          {binaryString && (
            <div className="text-center">
              <div className="bg-black/50 rounded-lg p-2 font-mono text-white/80 text-sm">
                {binaryString}
              </div>
            </div>
          )}

          {/* Check button */}
          <div className="flex justify-center">
            <Button
              aria-label="Check binary sequence"
              className="bg-white/20 text-white border border-white/40 hover:bg-white/30"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              startContent={!isSubmitting ? <Check size={16} /> : null}
              style={{ touchAction: "manipulation" }}
              type="button"
              onClick={handleCheck}
            >
              {isSubmitting ? "Checking..." : "Check"}
            </Button>
          </div>

          {/* Result message */}
          {resultMessage && (
            <div className="text-center space-y-3">
              {isSuccess ? (
                <div className="space-y-3">
                  {/* Success message */}
                  <button
                    aria-label="Copy success message"
                    className="w-full p-3 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                    style={{ touchAction: "manipulation" }}
                    type="button"
                    onTouchEnd={handleCopyMessage}
                  >
                    {resultMessage}
                    <div className="text-green-300/80 text-xs mt-1">
                      Tap to copy
                    </div>
                  </button>

                  {/* Reward notification */}
                  {rewardInfo && (
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 rounded-lg p-3">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        {rewardInfo.alreadyUnlocked ? (
                          <Trophy className="text-yellow-400" size={20} />
                        ) : (
                          <Gift className="text-yellow-400" size={20} />
                        )}
                        <span className="text-yellow-400 font-bold text-sm">
                          {rewardInfo.alreadyUnlocked ? "Achievement Already Unlocked" : "Achievement Unlocked!"}
                        </span>
                      </div>

                      {!rewardInfo.alreadyUnlocked && (
                        <div className="space-y-1">
                          <div className="text-yellow-300 text-xs font-bold">
                            🔢 BINARY GENIUS
                          </div>
                          <div className="text-yellow-300/80 text-xs">
                            +{rewardInfo.attemptsAwarded} attempts awarded!
                          </div>
                          <div className="text-yellow-300/60 text-xs italic">
                            "Found the secret binary sequence. Congrats, you can count to 2!"
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/40">
                  {resultMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}