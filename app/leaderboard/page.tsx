// src/app/leaderboard/page.tsx - Updated with integrated skeleton UI

"use client";

import type {
  SafeReactionLeaderboard,
  SafeSurvivalLeaderboard,
  SafePhysicsLeaderboard,
  SafeRotationLeaderboard,
  CacheInfo,
} from "@/hooks/modules/useLeaderboard";

// Season leaderboard interface
export interface SafeSeasonLeaderboard {
  position: number;
  first_name: string;
  last_name?: string;
  username?: string;
  total_score: number;
  total_games: number;
  isCurrentUser?: boolean;
}

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Crown, Zap, Crosshair, Atom, RotateCw } from "lucide-react";
import { Renderer, Program, Triangle, Mesh } from "ogl";

import { useUser } from "@/hooks/useUser";
import { useLeaderboard } from "@/hooks/modules/useLeaderboard";
import { useT } from "@/contexts/LocalizationContext";

type LeaderboardType =
  | "season"
  | "reaction"
  | "survival"
  | "physics"
  | "rotation";

// LightRays Component (unchanged)
interface LightRaysProps {
  className?: string;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  noiseAmount?: number;
  distortion?: number;
}

function LightRays({
  className = "",
  raysColor = "#ffffff",
  raysSpeed = 1,
  lightSpread = 1.5,
  rayLength = 2,
  pulsating = false,
  fadeDistance = 1.0,
  saturation = 1.0,
  noiseAmount = 0.1,
  distortion = 0.2,
}: LightRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<any>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const meshRef = useRef<any>(null);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const hexToRgb = (hex: string): [number, number, number] => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    return m
      ? [
          parseInt(m[1], 16) / 255,
          parseInt(m[2], 16) / 255,
          parseInt(m[3], 16) / 255,
        ]
      : [1, 1, 1];
  };

  const getAnchorAndDir = (
    w: number,
    h: number,
  ): { anchor: [number, number]; dir: [number, number] } => {
    const outside = 0.2;

    return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    if (cleanupFunctionRef.current) {
      cleanupFunctionRef.current();
      cleanupFunctionRef.current = null;
    }

    const initializeWebGL = async () => {
      if (!containerRef.current) return;

      await new Promise((resolve) => setTimeout(resolve, 10));

      if (!containerRef.current) return;

      const renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio, 2),
        alpha: true,
      });

      rendererRef.current = renderer;

      const gl = renderer.gl;

      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";

      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(gl.canvas);

      const vert = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

      const frag = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;

uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
  
  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  
  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  
  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, rayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, rayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  float smoothFade = smoothstep(0.3, 1.0, coord.y / iResolution.y);
  
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;
  
  // Apply smooth fade to bottom
  fragColor.rgb *= (1.0 - smoothFade * 0.8);

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor  = color;
}`;

      const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        rayPos: { value: [0, 0] },
        rayDir: { value: [0, 1] },
        raysColor: { value: hexToRgb(raysColor) },
        raysSpeed: { value: raysSpeed },
        lightSpread: { value: lightSpread },
        rayLength: { value: rayLength },
        pulsating: { value: pulsating ? 1.0 : 0.0 },
        fadeDistance: { value: fadeDistance },
        saturation: { value: saturation },
        noiseAmount: { value: noiseAmount },
        distortion: { value: distortion },
      };

      uniformsRef.current = uniforms;

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex: vert,
        fragment: frag,
        uniforms,
      });
      const mesh = new Mesh(gl, { geometry, program });

      meshRef.current = mesh;

      const updatePlacement = () => {
        if (!containerRef.current || !renderer) return;

        renderer.dpr = Math.min(window.devicePixelRatio, 2);

        const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;

        renderer.setSize(wCSS, hCSS);

        const dpr = renderer.dpr;
        const w = wCSS * dpr;
        const h = hCSS * dpr;

        uniforms.iResolution.value = [w, h];

        const { anchor, dir } = getAnchorAndDir(w, h);

        uniforms.rayPos.value = anchor;
        uniforms.rayDir.value = dir;
      };

      const loop = (t: number) => {
        if (!rendererRef.current || !uniformsRef.current || !meshRef.current) {
          return;
        }

        uniforms.iTime.value = t * 0.001;

        try {
          renderer.render({ scene: mesh });
          animationIdRef.current = requestAnimationFrame(loop);
        } catch (error) {
          console.warn("WebGL rendering error:", error);

          return;
        }
      };

      window.addEventListener("resize", updatePlacement);
      updatePlacement();
      animationIdRef.current = requestAnimationFrame(loop);

      cleanupFunctionRef.current = () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }

        window.removeEventListener("resize", updatePlacement);

        if (renderer) {
          try {
            const canvas = renderer.gl.canvas;
            const loseContextExt =
              renderer.gl.getExtension("WEBGL_lose_context");

            if (loseContextExt) {
              loseContextExt.loseContext();
            }

            if (canvas && canvas.parentNode) {
              canvas.parentNode.removeChild(canvas);
            }
          } catch (error) {
            console.warn("Error during WebGL cleanup:", error);
          }
        }

        rendererRef.current = null;
        uniformsRef.current = null;
        meshRef.current = null;
      };
    };

    initializeWebGL();

    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
        cleanupFunctionRef.current = null;
      }
    };
  }, [
    isVisible,
    raysColor,
    raysSpeed,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    noiseAmount,
    distortion,
  ]);

  useEffect(() => {
    if (!uniformsRef.current || !containerRef.current || !rendererRef.current)
      return;

    const u = uniformsRef.current;
    const renderer = rendererRef.current;

    u.raysColor.value = hexToRgb(raysColor);
    u.raysSpeed.value = raysSpeed;
    u.lightSpread.value = lightSpread;
    u.rayLength.value = rayLength;
    u.pulsating.value = pulsating ? 1.0 : 0.0;
    u.fadeDistance.value = fadeDistance;
    u.saturation.value = saturation;
    u.noiseAmount.value = noiseAmount;
    u.distortion.value = distortion;

    const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;
    const dpr = renderer.dpr;
    const { anchor, dir } = getAnchorAndDir(wCSS * dpr, hCSS * dpr);

    u.rayPos.value = anchor;
    u.rayDir.value = dir;
  }, [
    raysColor,
    raysSpeed,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    noiseAmount,
    distortion,
  ]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full pointer-events-none z-[3] overflow-hidden relative ${className}`.trim()}
    />
  );
}

// Cache Status Badge Component
const CacheStatusBadge = ({ cacheInfo }: { cacheInfo: CacheInfo | null }) => {
  if (!cacheInfo) return null;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m${seconds % 60 > 0 ? ` ${seconds % 60}s` : ''}`;
  };

  return (
    <div className="text-center text-xs text-white/60 mb-4 px-4">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 inline-block">
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${cacheInfo.is_from_cache ? 'bg-green-400' : 'bg-yellow-400'}`} />
          <span>
            {cacheInfo.is_from_cache 
              ? `Updated ${cacheInfo.cache_age_seconds ? formatTime(cacheInfo.cache_age_seconds) : '0s'} ago` 
              : 'Just updated'
            }
          </span>
        </div>
        
        <div className="mt-1 text-white/50 text-xs">
          📊 Personalized rankings • Optimized data
        </div>
        
        {cacheInfo.next_update_in_seconds !== undefined && cacheInfo.next_update_in_seconds > 0 && (
          <div className="mt-1 text-white/50">
            Next update in {formatTime(cacheInfo.next_update_in_seconds)}
          </div>
        )}
        <div className="mt-1 text-white/40">
          Leaderboard updates every 5 minutes
        </div>
      </div>
    </div>
  );
};

function LeaderboardPageContent() {
  const router = useRouter();
  const { makeAuthenticatedRequest, user, telegramUser } = useUser();
  const {
    leaderboardData,
    cacheInfo,
    isLoading,
    error,
    fetchLeaderboards,
    clearError,
    getUserPosition,
  } = useLeaderboard(makeAuthenticatedRequest);

  const t = useT();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("season");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pageInitialized, setPageInitialized] = useState(false);

  const initializationRef = useRef(false);

  // Setup Telegram WebApp back button
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      if (tg.BackButton) {
        tg.BackButton.show();

        const handleBackClick = () => {
          router.push("/main");
        };

        tg.BackButton.onClick(handleBackClick);

        return () => {
          tg.BackButton.offClick(handleBackClick);
          tg.BackButton.hide();
        };
      }
    }
  }, [router]);

  useEffect(() => {
    if (initializationRef.current) return;
    
    const initializePage = async () => {
      if (initializationRef.current) return;
      
      initializationRef.current = true;
      
      try {
        await fetchLeaderboards();
      } catch (error) {
        console.error("Failed to initialize leaderboard:", error);
      } finally {
        setPageInitialized(true);
      }
    };

    initializePage();
  }, []);

  const handleTabChange = async (tab: LeaderboardType) => {
    if (tab === activeTab || isTransitioning) return;

    setIsTransitioning(true);
    await new Promise((resolve) => setTimeout(resolve, 150));
    setActiveTab(tab);
    setIsTransitioning(false);
  };

  const getCurrentLeaderboard = useMemo(() => {
    if (!leaderboardData) return [];

    switch (activeTab) {
      case "season":
        return leaderboardData.season.slice(0, 100);
      case "reaction":
        return leaderboardData.reaction.slice(0, 100);
      case "survival":
        return leaderboardData.survival.slice(0, 100);
      case "physics":
        return leaderboardData.physics.slice(0, 100);
      case "rotation":
        return leaderboardData.rotation.slice(0, 100);
    }
  }, [leaderboardData, activeTab]);

  // Get current user data for display
  const getCurrentUserData = useMemo(() => {
    if (!leaderboardData || !user || !telegramUser) return null;

    const userPosition = leaderboardData.userRankings[activeTab];

    // Find user data in the current leaderboard (top 10)
    const userData = getCurrentLeaderboard.find((entry) => entry.isCurrentUser);

    // Get user's game count for this mode
    let gamesCount = 0;
    let value = "N/A";

    switch (activeTab) {
      case "season": {
        const userInSeasonLeaderboard = leaderboardData.season.find(
          (entry) => entry.isCurrentUser,
        );

        if (userInSeasonLeaderboard) {
          value = `${userInSeasonLeaderboard.total_score}`;
          gamesCount = userInSeasonLeaderboard.total_games;
        } else if (userData) {
          const seasonUserData = userData as SafeSeasonLeaderboard;

          value = `${seasonUserData.total_score}`;
          gamesCount = user.total_games || 0;
        } else {
          gamesCount = user.total_games || 0;
          const totalScore = user.total_score || 0;

          if (gamesCount > 0 || totalScore > 0) {
            value = `${totalScore}`;
          }
        }
        break;
      }

      case "reaction": {
        const userInReactionLeaderboard = leaderboardData.reaction.find(
          (entry) => entry.isCurrentUser,
        );

        if (userInReactionLeaderboard) {
          value = `${userInReactionLeaderboard.best_reaction_time}ms`;
          gamesCount = userInReactionLeaderboard.reaction_games;
        } else if (userData) {
          const reactionUserData = userData as SafeReactionLeaderboard;

          value = `${reactionUserData.best_reaction_time}ms`;
          gamesCount = user.reaction_games || 0;
        } else {
          gamesCount = user.reaction_games || 0;
          const bestTime = user.reaction_best_time;

          if (gamesCount > 0) {
            const timeValue = bestTime != null && bestTime > 0 ? bestTime : 0;

            value = `${timeValue}ms`;
          }
        }
        break;
      }

      case "survival": {
        const userInSurvivalLeaderboard = leaderboardData.survival.find(
          (entry) => entry.isCurrentUser,
        );

        if (userInSurvivalLeaderboard) {
          value = `${userInSurvivalLeaderboard.best_survival_score}`;
          gamesCount = userInSurvivalLeaderboard.survival_games;
        } else if (userData) {
          const survivalUserData = userData as SafeSurvivalLeaderboard;

          value = `${survivalUserData.best_survival_score}`;
          gamesCount = user.survival_games || 0;
        } else {
          gamesCount = user.survival_games || 0;
          const bestScore = user.survival_best_score || 0;

          if (gamesCount > 0 || bestScore > 0) {
            value = `${bestScore}`;
          }
        }
        break;
      }

      case "physics": {
        const userInPhysicsLeaderboard = leaderboardData.physics.find(
          (entry) => entry.isCurrentUser,
        );

        if (userInPhysicsLeaderboard) {
          value = `${userInPhysicsLeaderboard.best_physics_score}`;
          gamesCount = userInPhysicsLeaderboard.physics_games;
        } else if (userData) {
          const physicsUserData = userData as SafePhysicsLeaderboard;

          value = `${physicsUserData.best_physics_score}`;
          gamesCount = user.physics_games || 0;
        } else {
          gamesCount = user.physics_games || 0;
          const bestScore = user.physics_best_score || 0;

          if (gamesCount > 0 || bestScore > 0) {
            value = `${bestScore}`;
          }
        }
        break;
      }

      case "rotation": {
        const userInRotationLeaderboard = leaderboardData.rotation.find(
          (entry) => entry.isCurrentUser,
        );

        if (userInRotationLeaderboard) {
          value = `${userInRotationLeaderboard.best_rotation_score}`;
          gamesCount = userInRotationLeaderboard.rotation_games;
        } else if (userData) {
          const rotationUserData = userData as SafeRotationLeaderboard;

          value = `${rotationUserData.best_rotation_score}`;
          gamesCount = user.rotation_games || 0;
        } else {
          gamesCount = user.rotation_games || 0;
          const bestScore = user.rotation_best_score;

          if (gamesCount > 0) {
            const scoreValue =
              bestScore != null && bestScore >= 0 ? bestScore : 0;

            value = `${scoreValue}`;
          }
        }
        break;
      }
    }

    // Check if user has played in this mode
    const hasPlayed =
      gamesCount > 0 || userData !== undefined || userPosition !== undefined;

    return {
      name: `${telegramUser.first_name} ${telegramUser.last_name || ""}`.trim(),
      username: telegramUser.username,
      position: userPosition,
      value,
      gamesCount,
      hasPlayed,
    };
  }, [leaderboardData, activeTab, user, telegramUser, getCurrentLeaderboard]);

  // Get full leaderboard starting from position 1
  const getFullLeaderboard = useMemo(() => {
    return getCurrentLeaderboard; // Show all from position 1
  }, [getCurrentLeaderboard]);

  const getTabIcon = (tab: LeaderboardType) => {
    switch (tab) {
      case "season":
        return <span className="text-xs font-bold">βᾦτα SEASON</span>;
      case "reaction":
        return <Zap size={16} />;
      case "survival":
        return <Crosshair size={16} />;
      case "physics":
        return <Atom size={16} />;
      case "rotation":
        return <RotateCw size={16} />;
    }
  };

  const getPlayerValue = (player: any) => {
    switch (activeTab) {
      case "season":
        return `${player.total_score}`;
      case "reaction":
        return `${player.best_reaction_time}ms`;
      case "survival":
        return `${player.best_survival_score}`;
      case "physics":
        return `${player.best_physics_score}`;
      case "rotation":
        return `${player.best_rotation_score}`;
    }
  };

  // Get position-based styling for top-3 (darker gradients, left-to-right)
  const getPositionStyling = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-600/8 to-yellow-800/4";
      case 2:
        return "bg-gradient-to-r from-gray-500/8 to-gray-700/4";
      case 3:
        return "bg-gradient-to-r from-amber-700/8 to-amber-900/4";
      default:
        return "";
    }
  };

  const handleRefresh = async () => {
    clearError();
    await fetchLeaderboards();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Crown className="text-white/60 mx-auto" size={32} />
          <p className="text-white/80">{error}</p>
          <button
            className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            onClick={handleRefresh}
          >
            {t("leaderboard.retry")}
          </button>
        </div>
      </div>
    );
  }

  const fullLeaderboard = getFullLeaderboard;
  const currentUserData = getCurrentUserData;
  const isInitialLoading = !pageInitialized || (isLoading && !leaderboardData);

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom relative overflow-hidden">
      {/* Light Rays Background */}
      <div className="absolute inset-0 z-0 h-96">
        <LightRays
          distortion={0.15}
          fadeDistance={1.2}
          lightSpread={1.2}
          noiseAmount={0.05}
          pulsating={false}
          rayLength={1.8}
          raysColor="#ffffff"
          raysSpeed={0.8}
          saturation={0.8}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black pointer-events-none" />
      </div>

      <div className="relative z-10 px-4 safe-area-inset">
        {/* Current User Display with Skeleton */}
        <div className="text-center py-4 pt-8">
          {/* Always show user name from telegramUser */}
          {telegramUser && (
            <div className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <div className="mb-4">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-3xl font-bold text-white drop-shadow-lg">
                    {telegramUser.first_name} {telegramUser.last_name || ""}
                  </span>
                </div>

                {telegramUser.username && (
                  <div className="text-white/60 text-sm mt-1 drop-shadow-sm">
                    @{telegramUser.username}
                  </div>
                )}
              </div>

              {/* User stats with skeleton */}
              {isInitialLoading || !currentUserData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-center">
                      <div className="h-8 w-20 bg-white/10 rounded animate-pulse mx-auto mb-1" />
                      <div className="h-3 w-16 bg-white/10 rounded animate-pulse mx-auto" />
                    </div>

                    <div className="w-px h-8 bg-white/30" />

                    <div className="text-center">
                      <div className="h-8 w-12 bg-white/10 rounded animate-pulse mx-auto mb-1" />
                      <div className="h-3 w-14 bg-white/10 rounded animate-pulse mx-auto" />
                    </div>
                  </div>

                  <div className="h-10 w-32 bg-white/10 rounded-lg animate-pulse mx-auto" />
                </div>
              ) : currentUserData.hasPlayed ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white drop-shadow-lg">
                        {currentUserData.value}
                      </div>
                      <div className="text-xs text-white/70 drop-shadow-sm">
                        {activeTab === "season"
                          ? t("leaderboard.points")
                          : activeTab === "reaction"
                            ? t("leaderboard.reactionTime")
                            : activeTab === "survival"
                              ? t("leaderboard.points")
                              : activeTab === "physics"
                                ? t("leaderboard.points")
                                : t("leaderboard.points")}
                      </div>
                    </div>

                    <div className="w-px h-8 bg-white/30" />

                    <div className="text-center">
                      {currentUserData.position ? (
                        <>
                          <div className="text-2xl font-bold text-white drop-shadow-lg">
                            #{currentUserData.position}
                          </div>
                          <div className="text-xs text-white/70 drop-shadow-sm">
                            {t("leaderboard.position")}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xl text-white/60 drop-shadow-lg">
                            -
                          </div>
                          <div className="text-xs text-white/50 drop-shadow-sm">
                            {t("leaderboard.position")}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all duration-200 hover:scale-105"
                    onClick={() => router.push("/game")}
                  >
                    {t("leaderboard.playGame")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xl text-white/60 drop-shadow-lg">
                    {t("leaderboard.noGamesYet")}
                  </div>

                  <button
                    className="px-6 py-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                    onClick={() => router.push("/game")}
                  >
                    {t("leaderboard.letsPlay")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cache Status Badge */}
        {!isInitialLoading && <CacheStatusBadge cacheInfo={cacheInfo} />}

        {/* Mode Tabs */}
        <div className="text-center mb-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-1 inline-block">
            <div className="flex space-x-1">
              {(
                [
                  "season",
                  "reaction",
                  "survival",
                  "physics",
                  "rotation",
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200
                    ${
                      activeTab === tab
                        ? "bg-white/10 text-white border border-white/20"
                        : "text-white/60 hover:text-white/80 hover:bg-white/5"
                    }
                  `}
                  disabled={isTransitioning}
                  onClick={() => handleTabChange(tab)}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {getTabIcon(tab)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard with Skeleton */}
        <div className="space-y-0 max-w-2xl mx-auto">
          {isInitialLoading ? (
            // Skeleton for leaderboard list
            <div className="space-y-0">
              {[...Array(10)].map((_, index) => (
                <div key={index}>
                  <div className="w-full px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div 
                          className="w-8 h-6 bg-white/10 rounded animate-pulse"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        />
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          <div 
                            className="h-5 w-32 bg-white/10 rounded animate-pulse"
                            style={{ animationDelay: `${index * 0.1 + 0.05}s` }}
                          />
                          <div 
                            className="h-3 w-24 bg-white/10 rounded animate-pulse"
                            style={{ animationDelay: `${index * 0.1 + 0.1}s` }}
                          />
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0 space-y-1">
                        <div 
                          className="h-5 w-16 bg-white/10 rounded animate-pulse"
                          style={{ animationDelay: `${index * 0.1 + 0.15}s` }}
                        />
                        <div 
                          className="h-3 w-12 bg-white/10 rounded animate-pulse"
                          style={{ animationDelay: `${index * 0.1 + 0.2}s` }}
                        />
                      </div>
                    </div>
                  </div>

                  {index < 9 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-6" />
                  )}
                </div>
              ))}
            </div>
          ) : fullLeaderboard.length === 0 ? (
            <div className="text-center py-12 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <p className="font-bold text-white/80 text-xl mb-2">
                {t("leaderboard.noPlayersYet")}
              </p>
              <p className="text-white/60">{t("leaderboard.beFirstToPlay")}</p>
            </div>
          ) : (
            <div
              className={`transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
            >
              {fullLeaderboard.map((entry, index) => (
                <div key={`${activeTab}-${entry.position}`}>
                  <div
                    className={`
                      w-full px-6 py-4 text-left hover:bg-white/5 transition-all duration-200
                      ${entry.isCurrentUser ? "bg-blue-500/10" : ""}
                      ${entry.position <= 3 ? getPositionStyling(entry.position) : ""}
                      opacity-0 animate-[slideIn_0.3s_ease-out_forwards]
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="w-8 text-center font-bold text-lg relative">
                          <span
                            className={`
                              ${entry.position === 1 ? "text-yellow-400" : ""}
                              ${entry.position === 2 ? "text-gray-300" : ""}
                              ${entry.position === 3 ? "text-amber-500" : ""}
                              ${entry.position > 3 ? "text-white/80" : ""}
                            `}
                          >
                            #{entry.position}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`font-medium truncate ${
                                entry.isCurrentUser
                                  ? "text-white"
                                  : entry.position === 1
                                    ? "text-yellow-100"
                                    : entry.position === 2
                                      ? "text-gray-100"
                                      : entry.position === 3
                                        ? "text-amber-100"
                                        : "text-white/90"
                              }`}
                            >
                              {entry.first_name} {entry.last_name || ""}
                            </span>
                          </div>
                          {entry.username && (
                            <div
                              className={`text-xs truncate ${
                                entry.position <= 3
                                  ? "text-white/60"
                                  : "text-white/50"
                              }`}
                            >
                              @{entry.username}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div
                          className={`font-bold text-lg ${
                            entry.position === 1
                              ? "text-yellow-400"
                              : entry.position === 2
                                ? "text-gray-300"
                                : entry.position === 3
                                  ? "text-amber-500"
                                  : "text-white"
                          }`}
                        >
                          {getPlayerValue(entry)}
                        </div>
                        <div
                          className={`text-xs ${
                            entry.position <= 3
                              ? "text-white/60"
                              : "text-white/50"
                          }`}
                        >
                          {activeTab === "season"
                            ? t("leaderboard.points")
                            : activeTab === "reaction"
                              ? t("leaderboard.time")
                              : activeTab === "survival"
                                ? t("leaderboard.points")
                                : activeTab === "physics"
                                  ? t("leaderboard.points")
                                  : t("leaderboard.points")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {index < fullLeaderboard.length - 1 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-6" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-24" />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return <LeaderboardPageContent />;
}