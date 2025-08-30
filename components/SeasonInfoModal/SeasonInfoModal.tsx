// src/components/SeasonInfoModal/SeasonInfoModal.tsx - FIXED TypeScript errors + Visual Debug
import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";
import { useUser } from "@/hooks/useUser";

interface SeasonInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  makeAuthenticatedRequest?: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>; // Optional since we're not using it
}

export default function SeasonInfoModal({
  isOpen,
  onClose,
}: SeasonInfoModalProps) {
  const router = useRouter();
  const t = useT();
  
  // Use the seasons module from useUser
  const { seasons } = useUser();
  const {
    seasonData,
    isLoading,
    error,
    fetchCurrentSeason,
    clearError,
    cacheManagement,
  } = seasons;

  // Debug state for visual logging
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Add debug message
  const addDebug = useCallback((message: string) => {
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  // Load season data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadSeasonData = async () => {
      try {
        addDebug('Modal opened - starting season data fetch');
        
        // Check cache before API call
        const cacheInfo = cacheManagement.getCacheInfo();
        if (cacheInfo?.hasCached) {
          addDebug(`Cache found: ${cacheInfo.cachedSeasonName}`);
        } else {
          addDebug('No cache found - will make API request');
        }
        
        // Clear any previous errors
        clearError();
        
        // This will use cache if available, or fetch from API if needed
        const result = await fetchCurrentSeason();
        
        if (result) {
          addDebug(`Success: Got data for ${result.name}`);
        } else {
          addDebug('No season data returned');
        }
        
      } catch (err) {
        console.error("Error loading season data:", err);
        addDebug(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    loadSeasonData();
  }, [isOpen, fetchCurrentSeason, clearError, cacheManagement, addDebug]);

  // Get cache info for display (memoized to prevent re-renders)
  const cacheInfo = useMemo(() => {
    return cacheManagement.getCacheInfo();
  }, [cacheManagement, seasonData]);

  // Handle force refresh (for debugging)
  const handleForceRefresh = useCallback(async () => {
    console.log('[SEASON_MODAL] Force refreshing season data...');
    await cacheManagement.forceRefresh();
  }, [cacheManagement]);

  if (!isOpen) return null;

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

  return (
    <>
      {/* Backdrop */}
      <div
        aria-label="Close modal"
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300 cursor-pointer"
        role="button"
        tabIndex={0}
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
          className="bg-black/90 backdrop-blur-xl border-2 border-white/30 text-white w-full max-w-md h-[70vh] relative overflow-hidden flex flex-col"
          style={{
            clipPath: "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
          }}
        >
          {/* Semi-transparent background overlay */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />

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
                  clipPath:
                    "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
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
              {/* Visual Debug Info - Always visible in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-3 bg-gray-900/50 border border-gray-600/50 rounded text-xs">
                  <div className="text-green-400 mb-2 font-mono">🐛 Debug Info:</div>
                  {debugInfo.length === 0 ? (
                    <div className="text-gray-400">No debug info yet...</div>
                  ) : (
                    <div className="space-y-1">
                      {debugInfo.map((info, index) => (
                        <div key={index} className="text-gray-300 font-mono text-xs">
                          {info}
                        </div>
                      ))}
                    </div>
                  )}
                  {cacheInfo && (
                    <div className="mt-2 pt-2 border-t border-gray-600/50">
                      <div className="text-blue-400 mb-1">Cache Status:</div>
                      <div className="text-gray-300 font-mono text-xs">
                        Has cached: {cacheInfo.hasCached ? '✅ YES' : '❌ NO'}
                      </div>
                      {cacheInfo.hasCached && (
                        <div className="text-gray-300 font-mono text-xs">
                          Season: {cacheInfo.cachedSeasonName}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                  <p className="text-red-400 font-mono text-sm tracking-wider mb-4">
                    {t("main.seasonModal.error")}
                  </p>
                  <p className="text-white/60 text-xs mb-4">{error}</p>
                  {/* Add force refresh button for debugging */}
                  <button
                    onClick={handleForceRefresh}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    Force Refresh
                  </button>
                </div>
              )}

              {/* No Active Season */}
              {!isLoading && !error && !seasonData && (
                <div className="text-center py-8">
                  <h3 className="text-lg font-mono tracking-wider text-white mb-2">
                    {t("main.seasonModal.noActiveSeason")}
                  </h3>
                  <p className="text-white/70 text-sm max-w-sm mx-auto">
                    {t("main.seasonModal.noActiveSeasonDesc")}
                  </p>
                </div>
              )}

              {/* Season Data - SIMPLIFIED: Only static data */}
              {!isLoading && !error && seasonData && (
                <div className="space-y-6">
                  {/* Cache Status Indicator (for debugging) */}
                  {process.env.NODE_ENV === 'development' && cacheInfo?.hasCached && (
                    <div className="text-xs text-green-400/60 text-center">
                      Cached data: {cacheInfo.cachedSeasonName}
                    </div>
                  )}

                  {/* Season Name and Status - calculated client-side */}
                  <div className="text-center">
                    <h3 className="text-2xl font-mono tracking-widest text-white mb-2">
                      {seasonData.name}
                    </h3>
                    {(() => {
                      const now = new Date();
                      const startDate = new Date(seasonData.start_date);
                      const endDate = new Date(seasonData.end_date);

                      let status;
                      if (now < startDate) {
                        status = {
                          text: t("main.seasonModal.upcomingSeason"),
                          color: "text-yellow-400",
                        };
                      } else if (now >= startDate && now <= endDate) {
                        status = {
                          text: t("main.seasonModal.activeSeason"),
                          color: "text-green-400",
                        };
                      } else {
                        status = {
                          text: t("main.seasonModal.endedSeason"),
                          color: "text-red-400",
                        };
                      }

                      return (
                        <div
                          className={`flex items-center justify-center ${status.color}`}
                        >
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
                    <div className="mb-3">
                      <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                        {t("main.seasonModal.dates")}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-white/80 tracking-wider pl-6">
                      {formatDate(seasonData.start_date)} – {" "}
                      {formatDate(seasonData.end_date)}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  {/* Prizes */}
                  {seasonData.prizes.length > 0 && (
                    <>
                      <div>
                        <div className="mb-4">
                          <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                            {t("main.seasonModal.prizes")}
                          </span>
                        </div>
                        <div className="pl-6">
                          {renderPrizes(seasonData.prizes)}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  {/* Season Rules */}
                  <div>
                    <div className="mb-4">
                      <span className="font-mono text-sm tracking-wider text-white/90 uppercase">
                        {t("main.seasonModal.rules")}
                      </span>
                    </div>
                    <div className="pl-6 space-y-3 text-sm text-white/80">
                      <div>
                        <span className="text-white/60">
                          {t("main.seasonModal.gameMode")}
                        </span>
                        <span className="ml-2 text-white/90">
                          {t("main.seasonModal.kingOfHill")}
                        </span>
                      </div>
                      <div className="text-white/70 text-xs">
                        {t("main.seasonModal.rulesDescription")}
                      </div>
                      <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">
                            {t("main.seasonModal.reaction")}
                          </span>
                          <span className="text-white/60">
                            {t("main.seasonModal.noMultiplier")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">
                            {t("main.seasonModal.survival")}
                          </span>
                          <span className="text-green-400">×2</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">
                            {t("main.seasonModal.physics")}
                          </span>
                          <span className="text-blue-400">×4</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">
                            {t("main.seasonModal.rotation")}
                          </span>
                          <span className="text-purple-400">×3</span>
                        </div>
                      </div>
                      <div className="text-white/60 text-xs italic">
                        {t("main.seasonModal.rulesNote")}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

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
                  clipPath:
                    "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
                }}
                onClick={() => {
                  onClose();
                  router.push("/leaderboard");
                }}
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