// src/app/leaderboard/page.tsx - Final fixed version with stable Aurora and correct user position + localization

"use client";

import type {
  SafeReactionLeaderboard,
  SafeSurvivalLeaderboard,
  SafePhysicsLeaderboard,
  SafeRotationLeaderboard,
} from "@/hooks/modules/useLeaderboard";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Star, Crown, Zap, Crosshair, Atom, RotateCw } from "lucide-react";
import { Renderer, Program, Mesh, Color, Triangle } from "ogl";

import { useUser } from "@/hooks/useUser";
import { useLeaderboard } from "@/hooks/modules/useLeaderboard";
import { formatRotationTime } from "@/utils/timeFormatter";
import { useT } from "@/contexts/LocalizationContext";
import AuthGuard from "@/components/Auth/AuthGuard";

type LeaderboardType = "reaction" | "survival" | "physics" | "rotation";

// Static Aurora Background Component - completely isolated from tab changes
const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

// Static Aurora component that renders once and never re-renders
const StaticAurora: React.FC = React.memo(() => {
  const ctnDom = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!ctnDom.current || initializedRef.current) return;

    initializedRef.current = true;
    const ctn = ctnDom.current;

    // Set fallback background immediately
    ctn.style.background =
      "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)";

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    });

    const gl = renderer.gl;

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = "transparent";

    const geometry = new Triangle(gl);
    const colorStops = ["#1a1a2e", "#16213e", "#0f1419"];
    const colorStopsArray = colorStops.map((hex) => {
      const c = new Color(hex);

      return [c.r, c.g, c.b];
    });

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: 0.8 },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uBlend: { value: 0.6 },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!ctn) return;
      const width = ctn.offsetWidth;
      const height = ctn.offsetHeight;

      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height];
    }

    window.addEventListener("resize", resize);
    resize();

    // Smooth canvas insertion
    gl.canvas.style.opacity = "0";
    gl.canvas.style.transition = "opacity 0.5s ease-in-out";
    ctn.appendChild(gl.canvas);

    setTimeout(() => {
      gl.canvas.style.opacity = "1";
      ctn.style.background = "";
    }, 100);

    let animateId = 0;
    const update = (t: number) => {
      animateId = requestAnimationFrame(update);
      program.uniforms.uTime.value = t * 0.01 * 0.5 * 0.1;
      renderer.render({ scene: mesh });
    };

    animateId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener("resize", resize);
      if (ctn && gl.canvas.parentNode === ctn) {
        ctn.removeChild(gl.canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div ref={ctnDom} className="w-full h-full" />;
});

StaticAurora.displayName = "StaticAurora";

function LeaderboardPageContent() {
  const router = useRouter();
  const { makeAuthenticatedRequest } = useUser();
  const {
    leaderboardData,
    isLoading,
    error,
    fetchLeaderboards,
    clearError,
    getUserPosition,
  } = useLeaderboard(makeAuthenticatedRequest);

  const t = useT();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("reaction");
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  // Load leaderboards on mount
  useEffect(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

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
      case "reaction":
        return leaderboardData.reaction.slice(0, 10);
      case "survival":
        return leaderboardData.survival.slice(0, 10);
      case "physics":
        return leaderboardData.physics.slice(0, 10);
      case "rotation":
        return leaderboardData.rotation.slice(0, 10);
    }
  }, [leaderboardData, activeTab]);

  const getChampion = () => {
    return getCurrentLeaderboard.length > 0 ? getCurrentLeaderboard[0] : null;
  };

  const getRestOfLeaderboard = () => {
    return getCurrentLeaderboard.slice(1);
  };

  const getTabIcon = (tab: LeaderboardType) => {
    switch (tab) {
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

  const getChampionValue = (champion: any) => {
    switch (activeTab) {
      case "reaction":
        return `${champion.best_reaction_time}ms`;
      case "survival":
        return `${champion.best_survival_score}`;
      case "physics":
        return `${champion.best_physics_score}`; // Изменено
      case "rotation":
        return `${champion.best_rotation_score}`; // Изменено
    }
  };

  const getPlayerValue = (player: any) => {
    switch (activeTab) {
      case "reaction":
        return `${player.best_reaction_time}ms`;
      case "survival":
        return `${player.best_survival_score}`; // Очки
      case "physics":
        return `${player.best_physics_score}`; // Изменено: теперь показываем очки вместо времени
      case "rotation":
        return `${player.best_rotation_score}`; // Изменено: теперь показываем очки вместо времени
    }
  };

  // Check if user is in visible top 10
  const isUserInVisibleTop10 = useMemo(() => {
    return getCurrentLeaderboard.some((entry) => entry.isCurrentUser);
  }, [getCurrentLeaderboard]);

  // Get user position and data for display outside top 10
  const getUserPositionData = useMemo(() => {
    if (!leaderboardData || !leaderboardData.userRankings) return null;

    const userPosition = leaderboardData.userRankings[activeTab];

    if (!userPosition) return null;

    // Find user data in the full leaderboard (not just top 10)
    const fullLeaderboard = leaderboardData[activeTab];
    const userData = fullLeaderboard.find((entry) => entry.isCurrentUser);

    let value = "N/A";

    if (userData) {
      switch (activeTab) {
        case "reaction":
          value = `${(userData as SafeReactionLeaderboard).best_reaction_time}ms`;
          break;
        case "survival":
          value = `${(userData as SafeSurvivalLeaderboard).best_survival_score}`;
          break;
        case "physics":
          value = `${(userData as SafePhysicsLeaderboard).best_physics_score}`;
          break;
        case "rotation":
          value = formatRotationTime(
            (userData as SafeRotationLeaderboard).best_rotation_time,
          );
          break;
      }
    }

    return { position: userPosition, value };
  }, [leaderboardData, activeTab]);

  const handleRefresh = async () => {
    clearError();
    await fetchLeaderboards();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">{t("leaderboard.loadingLeaderboards")}</p>
        </div>
      </div>
    );
  }

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

  const champion = getChampion();
  const restOfLeaderboard = getRestOfLeaderboard();

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom relative overflow-hidden">
      {/* Static Aurora Background - never re-renders */}
      <div className="absolute inset-0 z-0 h-96">
        <StaticAurora />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black pointer-events-none" />
      </div>

      <div className="relative z-10 px-4 safe-area-inset">
        {/* Champion Display */}
        <div className="text-center py-4 pt-8">
          {champion ? (
            <div className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <div className="mb-3">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-3xl font-bold text-white drop-shadow-lg">
                    {champion.first_name} {champion.last_name || ""}
                  </span>
                  {champion.isCurrentUser && (
                    <Star className="text-blue-400 drop-shadow-lg" size={20} />
                  )}
                </div>

                {champion.username && (
                  <div className="text-white/60 text-sm mt-1 drop-shadow-sm">
                    @{champion.username}
                  </div>
                )}
              </div>

              <div className="text-2xl font-bold text-white drop-shadow-lg">
                {getChampionValue(champion)}
              </div>
              <div className="text-xs text-white/70 drop-shadow-sm">
                {activeTab === "reaction"
                  ? t("leaderboard.reactionTime")
                  : activeTab === "survival"
                    ? t("leaderboard.points")
                    : activeTab === "physics"
                      ? t("leaderboard.points")
                      : t("leaderboard.time")}
              </div>
            </div>
          ) : (
            <div className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <p className="text-white/60 drop-shadow-sm text-lg">
                {t("leaderboard.noChampionYet")}
              </p>
              <p className="text-white/40 text-sm mt-1">
                {t("leaderboard.claimThrone")}
              </p>
            </div>
          )}
        </div>

        {/* Mode Tabs */}
        <div className="text-center mb-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-1 inline-block">
            <div className="flex space-x-1">
              {(["reaction", "survival", "physics", "rotation"] as const).map(
                (tab) => (
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
                ),
              )}
            </div>
          </div>
        </div>

        {/* User Position - Fixed: Show when user has position but not in visible top 10 */}
        {getUserPositionData && !isUserInVisibleTop10 && (
          <div className="mb-4 px-4 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
            <div className="rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                      <Crown className="text-white/70" size={14} />
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">
                        {t("leaderboard.yourPosition")}
                      </div>
                      <div className="text-white/60 text-xs">
                        {t("leaderboard.currentRanking")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      #{getUserPositionData.position}
                    </div>
                    <div className="text-white/50 text-xs">
                      {getUserPositionData.value}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-0 max-w-2xl mx-auto">
          {restOfLeaderboard.length === 0 && !champion ? (
            <div className="text-center py-12 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <p className="font-bold text-white/80 text-xl mb-2">
                {t("leaderboard.noPlayersYet")}
              </p>
              <p className="text-white/60">{t("leaderboard.beFirstToPlay")}</p>
            </div>
          ) : restOfLeaderboard.length === 0 ? (
            <div className="text-center py-12 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <p className="font-bold text-white/80 text-xl mb-2">
                {t("leaderboard.onlyOneChampion")}
              </p>
              <p className="text-white/60">
                {t("leaderboard.challengeLeader")}
              </p>
            </div>
          ) : (
            <div
              className={`transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
            >
              {restOfLeaderboard.map((entry, index) => (
                <div key={`${activeTab}-${entry.position}`}>
                  <div
                    className={`
                      w-full px-6 py-4 text-left hover:bg-white/5 transition-all duration-200
                      ${entry.isCurrentUser ? "bg-blue-500/10" : ""}
                      opacity-0 animate-[slideIn_0.3s_ease-out_forwards]
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="w-8 text-center font-bold text-lg text-white/80">
                          #{entry.position}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`font-medium truncate ${entry.isCurrentUser ? "text-white" : "text-white/90"}`}
                            >
                              {entry.first_name} {entry.last_name || ""}
                            </span>
                            {entry.isCurrentUser && (
                              <Star
                                className="text-blue-400 flex-shrink-0"
                                size={14}
                              />
                            )}
                          </div>
                          {entry.username && (
                            <div className="text-xs text-white/50 truncate">
                              @{entry.username}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-white text-lg">
                          {getPlayerValue(entry)}
                        </div>
                        <div className="text-xs text-white/50">
                          {activeTab === "reaction"
                            ? t("leaderboard.time")
                            : activeTab === "survival"
                              ? t("leaderboard.points")
                              : activeTab === "physics"
                                ? t("leaderboard.points")
                                : t("leaderboard.time")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {index < restOfLeaderboard.length - 1 && (
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
  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      <AuthGuard requireCompleteAuth={true} showError={true}>
        <LeaderboardPageContent />
      </AuthGuard>
    </>
  );
}
