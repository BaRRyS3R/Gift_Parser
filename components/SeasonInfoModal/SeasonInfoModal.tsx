// src/components/SeasonInfoModal/SeasonInfoModal.tsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Trophy, X, ArrowRight, Zap } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";
import type { CompleteSeasonData } from "@/hooks/modules/useSeasons";

interface SeasonInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>;
}

interface GridCircle {
  id: number;
  isActive: boolean;
  isRed: boolean;
  activationTime: number;
}

export default function SeasonInfoModal({
  isOpen,
  onClose,
  makeAuthenticatedRequest,
}: SeasonInfoModalProps) {
  const router = useRouter();
  const t = useT();
  
  const [seasonData, setSeasonData] = useState<CompleteSeasonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridCircles, setGridCircles] = useState<GridCircle[]>([]);

  // Initialize grid circles for futuristic background animation
  useEffect(() => {
    const initialCircles: GridCircle[] = Array.from(
      { length: 24 }, // 6x4 grid for modal background
      (_, index) => ({
        id: index,
        isActive: false,
        isRed: false,
        activationTime: 0,
      }),
    );
    setGridCircles(initialCircles);
  }, []);

  // Periodic circle activation animation
  useEffect(() => {
    if (!isOpen) return;

    const activateRandomCircles = () => {
      setGridCircles((prev) => {
        const newCircles = [...prev];
        const currentTime = Date.now();

        // Randomly select 3-5 circles to activate
        const numberOfActivations = Math.floor(Math.random() * 3) + 3;
        const availableIndices = Array.from({ length: 24 }, (_, i) => i);

        for (let i = 0; i < numberOfActivations; i++) {
          const randomIndex = Math.floor(
            Math.random() * availableIndices.length,
          );
          const circleIndex = availableIndices[randomIndex];
          availableIndices.splice(randomIndex, 1);

          // 15% chance for red, 85% chance for white
          const isRed = Math.random() < 0.15;

          newCircles[circleIndex] = {
            ...newCircles[circleIndex],
            isActive: true,
            isRed,
            activationTime: currentTime,
          };
        }

        return newCircles;
      });

      // Deactivate circles after animation duration
      setTimeout(() => {
        setGridCircles((prev) => {
          return prev.map((circle) => ({
            ...circle,
            isActive: false,
            isRed: false,
          }));
        });
      }, 1000);
    };

    // Start periodic activation
    const interval = setInterval(activateRandomCircles, 2500);
    // Initial activation
    const initialTimeout = setTimeout(activateRandomCircles, 300);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [isOpen]);

  // Load season data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadSeasonData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await makeAuthenticatedRequest("/api/seasons/current");

        if (!response.ok) {
          if (response.status === 404) {
            // No active season
            setSeasonData(null);
            setIsLoading(false);
            return;
          }
          throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setSeasonData(result.data);
        } else {
          throw new Error(result.error || "Failed to load season data");
        }
      } catch (err) {
        console.error("Error loading season data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    loadSeasonData();
  }, [isOpen, makeAuthenticatedRequest]);

  // Handle view details (redirect to leaderboard page)
  const handleViewDetails = () => {
    onClose();
    router.push("/leaderboard");
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderBackgroundGrid = () => {
    return (
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="grid grid-cols-6 grid-rows-4 gap-1 w-full h-full p-2">
          {gridCircles.map((circle) => (
            <div
              key={circle.id}
              className={`
                rounded-full border border-white/20 
                transition-all duration-500 ease-out
                aspect-square flex-shrink-0
                ${
                  circle.isActive
                    ? circle.isRed
                      ? "bg-red-500 border-red-400 shadow-sm shadow-red-500/50 scale-110"
                      : "bg-white border-white shadow-sm shadow-white/50 scale-110"
                    : "bg-transparent scale-100"
                }
              `}
              style={{
                width: "8px",
                height: "8px",
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderPrizes = (prizes: string[]) => {
    return (
      <div className="space-y-2">
        {prizes.map((prize, index) => (
          <div key={index} className="flex items-center space-x-3 text-sm">
            <div className="w-8 h-8 rounded border border-white/30 bg-white/5 flex items-center justify-center flex-shrink-0">
              <span className="text-white/80 font-mono text-xs">
                #{index + 1}
              </span>
            </div>
            <div className="text-white/90 flex-1">{prize}</div>
          </div>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSeasonStatus = () => {
    if (!seasonData) return null;

    const now = new Date();
    const startDate = new Date(seasonData.season.start_date);
    const endDate = new Date(seasonData.season.end_date);

    if (now < startDate) {
      return {
        text: t("main.seasonModal.upcomingSeason"),
        color: "text-yellow-400",
        icon: Clock,
      };
    } else if (now >= startDate && now <= endDate) {
      return {
        text: t("main.seasonModal.activeSeason"),
        color: "text-green-400",
        icon: Zap,
      };
    } else {
      return {
        text: t("main.seasonModal.endedSeason"),
        color: "text-red-400",
        icon: X,
      };
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Close modal"
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300 cursor-pointer"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-black/90 backdrop-blur-xl border-2 border-white/30 text-white w-full max-w-md h-[50vh] relative overflow-hidden flex flex-col"
          style={{
            clipPath: "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
          }}
        >
          {/* Background Grid Animation */}
          {renderBackgroundGrid()}

          {/* Scanning line animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-pulse opacity-30 pointer-events-none" />

          {/* Header - Fixed */}
          <div className="relative z-10 p-6 pb-4 border-b border-white/20 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <h2 className="text-xl font-mono tracking-[0.15em] uppercase">
                  {t("main.seasonModal.title")}
                </h2>
              </div>
              <button
                className="w-8 h-8 border border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
                style={{
                  clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                }}
                onClick={onClose}
              >
                <X className="text-white" size={14} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="relative z-10 flex-1 overflow-y-auto">
            <div className="p-6 pt-4">
              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-white/70 font-mono text-sm tracking-wider">
                    {t("main.seasonModal.loading")}
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-8">
                  <X className="text-red-400 mx-auto mb-3" size={24} />
                  <p className="text-red-400 font-mono text-sm tracking-wider mb-4">
                    {t("main.seasonModal.error")}
                  </p>
                  <p className="text-white/60 text-xs">{error}</p>
                </div>
              )}

              {/* No Active Season */}
              {!isLoading && !error && !seasonData && (
                <div className="text-center py-8">
                  <Calendar className="text-white/60 mx-auto mb-4" size={32} />
                  <h3 className="text-lg font-mono tracking-wider text-white mb-2">
                    {t("main.seasonModal.noActiveSeason")}
                  </h3>
                  <p className="text-white/70 text-sm max-w-sm mx-auto">
                    {t("main.seasonModal.noActiveSeasonDesc")}
                  </p>
                </div>
              )}

              {/* Season Data */}
              {!isLoading && !error && seasonData && (
                <div className="space-y-6">
                  {/* Season Name and Status */}
                  <div className="text-center">
                    <h3 className="text-2xl font-mono tracking-widest text-white mb-2">
                      {seasonData.season.name}
                    </h3>
                    {(() => {
                      const status = getSeasonStatus();
                      if (!status) return null;
                      const IconComponent = status.icon;
                      return (
                        <div className={`flex items-center justify-center space-x-2 ${status.color}`}>
                          <IconComponent size={14} />
                          <span className="font-mono text-xs tracking-wider uppercase">
                            {status.text}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  {/* Dates */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Calendar className="text-white/70" size={16} />
                      <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                        {t("main.seasonModal.dates")}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-white/80 tracking-wider pl-6">
                      {formatDate(seasonData.season.start_date)} — {formatDate(seasonData.season.end_date)}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  {/* Prizes */}
                  {seasonData.season.prizes.length > 0 && (
                    <>
                      <div>
                        <div className="flex items-center space-x-2 mb-4">
                          <Trophy className="text-yellow-400" size={16} />
                          <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                            {t("main.seasonModal.prizes")}
                          </span>
                        </div>
                        <div className="pl-6">
                          {renderPrizes(seasonData.season.prizes)}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    </>
                  )}

                  {/* Important Information */}
                  <div className="space-y-3 text-xs font-mono tracking-wide">
                    <div className="text-yellow-300/90">
                      {t("main.seasonModal.snapshotInfo")}
                    </div>
                    <div className="text-white/70">
                      {t("main.seasonModal.fairPlayInfo")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Fixed */}
          {!isLoading && !error && seasonData && (
            <div className="relative z-10 p-6 pt-4 border-t border-white/20 flex-shrink-0">
              <button
                className="w-full py-3 px-4 border border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-300 group flex items-center justify-center space-x-3"
                style={{
                  clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
                }}
                onClick={handleViewDetails}
              >
                <span className="font-mono text-sm tracking-[0.15em] uppercase text-white">
                  {t("main.seasonModal.viewDetails")}
                </span>
                <ArrowRight 
                  className="text-white group-hover:translate-x-1 transition-transform duration-300" 
                  size={14} 
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}