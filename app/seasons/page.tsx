// src/app/seasons/page.tsx - Complete seasons page with consolidated components

"use client";

import type {
  CompleteSeasonData,
  SeasonLeaderboardEntry,
} from "@/hooks/modules/useSeasons";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { Renderer, Program, Triangle, Mesh } from "ogl";

import { useUser } from "@/hooks/useUser";
import { useSeasons } from "@/hooks/modules/useSeasons";
import { useT } from "@/contexts/LocalizationContext";
import AuthGuard from "@/components/Auth/AuthGuard";

// Inline PlayerModal Component
interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    position: number;
    first_name: string;
    last_name?: string;
    username?: string;
    survival_best_score: number;
    isCurrentUser?: boolean;
  } | null;
  prize?: string;
}

// Date Info Modal Component
interface DateInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function DateInfoModal({ isOpen, onClose }: DateInfoModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      
      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-t border-white/20 rounded-t-3xl p-6 mx-4 mb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Calendar size={20} />
              <span>Season Timeline</span>
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
            >
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="text-blue-400" size={16} />
                <span className="text-blue-300 font-bold text-sm">IMPORTANT NOTICE</span>
              </div>
              <div className="text-white/90 leading-relaxed">
                At the moment the season ends, a final snapshot of the leaderboard will be taken. After this point, no further changes to player rankings or scores will be counted for this season.
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-white/70 text-sm">
                Make sure to play your best games before the season deadline!
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PlayerModal({ isOpen, onClose, player, prize }: PlayerModalProps) {
  if (!isOpen || !player) return null;

  const displayName = `${player.first_name} ${player.last_name || ''}`.trim();

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      
      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-t border-white/20 rounded-t-3xl p-6 mx-4 mb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {player.position <= 3 && (
                <Trophy 
                  className={
                    player.position === 1 ? "text-yellow-400" :
                    player.position === 2 ? "text-gray-300" : "text-amber-600"
                  } 
                  size={24} 
                />
              )}
              <h3 className="text-xl font-bold text-white">
                #{player.position} Place
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
            >
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Player Info */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <h4 className="text-2xl font-bold text-white">{displayName}</h4>
                {player.isCurrentUser && (
                  <Star className="text-blue-400" size={16} />
                )}
              </div>
              {player.username && (
                <p className="text-white/60">@{player.username}</p>
              )}
            </div>

            <div className="text-center py-4">
              <div className="text-3xl font-bold text-white mb-1">
                {player.survival_best_score}
              </div>
              <div className="text-white/60 text-sm">Points</div>
            </div>

            {prize && (
              <div className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Trophy className="text-yellow-400" size={16} />
                  <span className="text-yellow-300 font-bold text-sm">PRIZE</span>
                </div>
                <div className="text-white font-medium">{prize}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Inline LightRays Component
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
    h: number
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
      { threshold: 0.1 }
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

// Main Seasons Page Component
function SeasonsPageContent() {
  const router = useRouter();
  const { user, makeAuthenticatedRequest } = useUser();
  const {
    seasonData,
    isLoading,
    error,
    fetchCurrentSeason,
    clearError,
    isUserInTopLeaderboard,
    getUserPosition,
    isSeasonActive,
  } = useSeasons(makeAuthenticatedRequest);

  const t = useT();
  const [selectedPlayer, setSelectedPlayer] = useState<{
    player: SeasonLeaderboardEntry;
    prize: string;
  } | null>(null);
  const [showDateInfo, setShowDateInfo] = useState(false);

  // Setup Telegram WebApp back button
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Show back button
      if (tg.BackButton) {
        tg.BackButton.show();
        
        // Handle back button click
        const handleBackClick = () => {
          router.push("/main");
        };
        
        tg.BackButton.onClick(handleBackClick);
        
        // Cleanup on unmount
        return () => {
          tg.BackButton.offClick(handleBackClick);
          tg.BackButton.hide();
        };
      }
    }
  }, [router]);

  // Load season data on mount
  useEffect(() => {
    fetchCurrentSeason();
  }, [fetchCurrentSeason]);

  const handlePlayerClick = (player: SeasonLeaderboardEntry) => {
    // Get prize for this position (prizes are 0-indexed in array)
    const prize = seasonData?.season.prizes[player.position - 1] || `Prize ${player.position}`;
    
    setSelectedPlayer({
      player,
      prize,
    });
  };

  const handleCloseModal = () => {
    setSelectedPlayer(null);
  };

  const handleRefresh = async () => {
    clearError();
    await fetchCurrentSeason();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">Loading season data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Calendar className="text-white/60 mx-auto" size={32} />
          <p className="text-white/80">{error}</p>
          <button
            className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!seasonData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <Calendar className="text-white/60 mx-auto" size={48} />
          <h2 className="text-2xl font-bold text-white">No Active Season</h2>
          <p className="text-white/70 max-w-md">
            There is currently no active season running. Check back later for upcoming seasonal competitions.
          </p>
          <button
            className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            onClick={handleRefresh}
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  const { season, leaderboard } = seasonData;
  const userPosition = getUserPosition();
  const isUserInTop = isUserInTopLeaderboard();
  const isActive = isSeasonActive();

  // Separate top 1 player from the rest
  const topPlayer = leaderboard.length > 0 ? leaderboard[0] : undefined;
  const restOfLeaderboard = leaderboard.slice(1); // Start from #2

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom relative overflow-hidden">
      
      {/* Light Rays Background */}
      <div className="absolute inset-0 z-0 h-96">
        <LightRays 
          raysColor="#ffffff"
          raysSpeed={0.8}
          lightSpread={1.2}
          rayLength={1.8}
          pulsating={false}
          fadeDistance={1.2}
          saturation={0.8}
          noiseAmount={0.05}
          distortion={0.15}
        />
        {/* Gradient Overlay for smooth bottom transition */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black pointer-events-none" />
      </div>

      <div className="relative z-10 px-4 safe-area-inset">
        
        {/* Champion Display */}
        <div className="text-center py-6 pt-16">
          {topPlayer ? (
            <button
              onClick={() => handlePlayerClick(topPlayer)}
              className="focus:outline-none"
            >
              {/* Player Name */}
              <div className="mb-3">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-3xl font-bold text-white drop-shadow-lg">
                    {topPlayer.first_name} {topPlayer.last_name || ''}
                  </span>
                  {topPlayer.isCurrentUser && (
                    <Star className="text-blue-400 drop-shadow-lg" size={20} />
                  )}
                </div>
                
                {topPlayer.username && (
                  <div className="text-yellow-300/80 text-sm mt-1 drop-shadow-sm">
                    @{topPlayer.username}
                  </div>
                )}
              </div>

              {/* Score Display */}
              <div className="text-2xl font-bold text-white drop-shadow-lg">
                {topPlayer.survival_best_score}
              </div>
              <div className="text-xs text-white/70 drop-shadow-sm">
                points
              </div>
            </button>
          ) : (
            <div>
              <p className="text-white/60 drop-shadow-sm text-lg">
                No champion yet
              </p>
              <p className="text-white/40 text-sm mt-1">
                Be the first to claim the throne!
              </p>
            </div>
          )}
        </div>

        {/* Season Name */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold tracking-widest text-white drop-shadow-lg">
            {season.name}
          </h1>
        </div>

        {/* Season Dates */}
        <div className="flex items-center justify-center space-x-4 text-sm text-white/70 mb-8">
          <button 
            onClick={() => setShowDateInfo(true)}
            className="flex items-center space-x-1 hover:text-white/90 transition-colors"
          >
            <Calendar size={14} />
            <span>
              {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
            </span>
          </button>
          {!isActive && new Date() < new Date(season.start_date) && (
            <div className="flex items-center space-x-1 text-yellow-400">
              <Clock size={14} />
              <span>Starts {new Date(season.start_date).toLocaleDateString()}</span>
            </div>
          )}
          {!isActive && new Date() > new Date(season.end_date) && (
            <div className="flex items-center space-x-1 text-red-400">
              <Clock size={14} />
              <span>Ended</span>
            </div>
          )}
        </div>

        {/* User Position (if not in top 10) */}
        {userPosition && !isUserInTop && user && (
          <div className="mb-8 text-center">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500/20 border border-blue-400/30 rounded-full">
              <Star className="text-blue-400" size={16} />
              <span className="text-blue-300 font-bold">Your Position: #{userPosition}</span>
            </div>
          </div>
        )}

        {/* Leaderboard (Starting from #2) */}
        <div className="space-y-0 max-w-2xl mx-auto">
          {restOfLeaderboard.length === 0 && !topPlayer ? (
            <div className="text-center py-12">
              <p className="font-bold text-white/80 text-xl mb-2">No Players Yet</p>
              <p className="text-white/60">
                Be the first to compete in this season!
              </p>
            </div>
          ) : restOfLeaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-bold text-white/80 text-xl mb-2">Only One Champion</p>
              <p className="text-white/60">
                Challenge the current leader!
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              {restOfLeaderboard.map((entry, index) => (
                <div key={`season-${entry.position}`}>
                  <button
                    onClick={() => handlePlayerClick(entry)}
                    className={`
                      w-full px-6 py-4 text-left hover:bg-white/5 transition-colors duration-200
                      ${entry.isCurrentUser ? "bg-blue-500/10" : ""}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      {/* Position and Name */}
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="w-8 text-center font-bold text-lg text-white/80">
                          #{entry.position}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium truncate ${
                              entry.isCurrentUser ? "text-white" : "text-white/90"
                            }`}>
                              {entry.first_name} {entry.last_name || ""}
                            </span>
                            {entry.isCurrentUser && (
                              <Star className="text-blue-400 flex-shrink-0" size={14} />
                            )}
                          </div>
                          {entry.username && (
                            <div className="text-xs text-white/50 truncate">
                              @{entry.username}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-white text-lg">
                          {entry.survival_best_score}
                        </div>
                        <div className="text-xs text-white/50">
                          points
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Divider */}
                  {index < restOfLeaderboard.length - 1 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-6" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom spacing for safe area */}
        <div className="h-24" />
      </div>

      {/* Player Details Modal */}
      <PlayerModal
        isOpen={!!selectedPlayer}
        onClose={handleCloseModal}
        player={selectedPlayer?.player || null}
        prize={selectedPlayer?.prize}
      />

      {/* Date Info Modal */}
      <DateInfoModal
        isOpen={showDateInfo}
        onClose={() => setShowDateInfo(false)}
      />
    </div>
  );
}

export default function SeasonsPage() {
  return (
    <AuthGuard requireCompleteAuth={true} showError={true}>
      <SeasonsPageContent />
    </AuthGuard>
  );
}