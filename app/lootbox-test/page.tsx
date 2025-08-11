// Enhanced Lootbox Test Page with OGL and Advanced Effects - Production Ready

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Package, Sparkles, Zap, Star, Gift, Lock, ChevronRight, Gem, Crown, Shield, Swords } from 'lucide-react';
import * as OGL from 'ogl';

// Type definitions
type RarityType = 'common' | 'rare' | 'legendary' | 'epic';

interface RarityConfig {
  name: string;
  gradient: string;
  color: string;
  glowColor: string;
  borderColor: string;
  bgPattern: string;
  particleColor: string;
  meshColor: [number, number, number];
  emissive: [number, number, number];
}

interface Lootbox {
  id: number;
  rarity: RarityType;
  name: string;
  count: number;
  locked: boolean;
  icon: React.ElementType;
}

interface Reward {
  id?: number;
  type: 'card' | 'attempts' | 'gift';
  name: string;
  icon: string;
  rarity?: RarityType;
  description: string;
  value?: number;
}

interface FloatingElement {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
}

// Rarity configuration with enhanced visuals
const RARITY_CONFIG: Record<RarityType, RarityConfig> = {
  common: {
    name: 'Common',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'from-slate-400 via-gray-400 to-slate-500',
    glowColor: 'rgba(148, 163, 184, 0.6)',
    borderColor: 'border-slate-400/50',
    bgPattern: 'bg-gradient-to-br from-slate-900/90 via-gray-900/90 to-slate-800/90',
    particleColor: '#94a3b8',
    meshColor: [0.4, 0.45, 0.5],
    emissive: [0.1, 0.1, 0.15]
  },
  rare: {
    name: 'Rare',
    gradient: 'linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)',
    color: 'from-blue-400 via-cyan-400 to-blue-500',
    glowColor: 'rgba(6, 182, 212, 0.7)',
    borderColor: 'border-cyan-400/60',
    bgPattern: 'bg-gradient-to-br from-blue-950/90 via-cyan-900/90 to-blue-900/90',
    particleColor: '#06b6d4',
    meshColor: [0.2, 0.6, 0.9],
    emissive: [0.1, 0.3, 0.5]
  },
  legendary: {
    name: 'Legendary',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'from-purple-400 via-pink-400 to-purple-500',
    glowColor: 'rgba(192, 132, 252, 0.8)',
    borderColor: 'border-purple-400/70',
    bgPattern: 'bg-gradient-to-br from-purple-950/90 via-pink-900/90 to-purple-900/90',
    particleColor: '#c084fc',
    meshColor: [0.7, 0.3, 0.9],
    emissive: [0.4, 0.2, 0.5]
  },
  epic: {
    name: 'Epic',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    color: 'from-amber-400 via-orange-400 to-red-500',
    glowColor: 'rgba(251, 191, 36, 0.9)',
    borderColor: 'border-amber-400/80',
    bgPattern: 'bg-gradient-to-br from-orange-950/90 via-amber-900/90 to-red-900/90',
    particleColor: '#fbbf24',
    meshColor: [1.0, 0.7, 0.2],
    emissive: [0.6, 0.4, 0.1]
  }
};

// Enhanced lootbox data
const LOOTBOXES: Lootbox[] = [
  { id: 1, rarity: 'common', name: 'Starter Cache', count: 5, locked: false, icon: Shield },
  { id: 2, rarity: 'rare', name: 'Mystic Vault', count: 3, locked: false, icon: Gem },
  { id: 3, rarity: 'legendary', name: 'Royal Treasury', count: 1, locked: false, icon: Crown },
  { id: 4, rarity: 'epic', name: 'Eternal Nexus', count: 0, locked: true, icon: Swords }
];

// Enhanced rewards with better categorization
const POSSIBLE_REWARDS: Record<RarityType, Reward[]> = {
  common: [
    { type: 'card', name: 'Shadow Walker', icon: '🌙', rarity: 'common', description: 'Basic stealth unit' },
    { type: 'attempts', name: 'Energy Boost', icon: '⚡', value: 2, description: '+2 game attempts' },
    { type: 'card', name: 'Iron Guardian', icon: '🛡️', rarity: 'common', description: 'Defensive unit' }
  ],
  rare: [
    { type: 'card', name: 'Crystal Phoenix', icon: '🔷', rarity: 'rare', description: 'Mythical creature' },
    { type: 'attempts', name: 'Power Surge', icon: '⚡', value: 5, description: '+5 game attempts' },
    { type: 'gift', name: 'Blue Diamond', icon: '💎', description: 'Telegram premium gift' }
  ],
  legendary: [
    { type: 'card', name: 'Void Emperor', icon: '👑', rarity: 'legendary', description: 'Ultimate ruler' },
    { type: 'attempts', name: 'Mega Charge', icon: '⚡', value: 10, description: '+10 game attempts' },
    { type: 'gift', name: 'Golden Crown', icon: '👑', description: 'Exclusive Telegram gift' }
  ],
  epic: [
    { type: 'card', name: 'Cosmic Destroyer', icon: '🌌', rarity: 'epic', description: 'Reality bender' },
    { type: 'attempts', name: 'Infinite Power', icon: '⚡', value: 20, description: '+20 game attempts' },
    { type: 'gift', name: 'Eternal Flame', icon: '🔥', description: 'Legendary Telegram gift' }
  ]
};

// OGL 3D Box Component Props
interface LootboxCanvasProps {
  isOpening: boolean;
  rarity: RarityType;
  onAnimationComplete?: () => void;
}

// OGL 3D Box Component
function LootboxCanvas({ isOpening, rarity, onAnimationComplete }: LootboxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<OGL.Renderer | null>(null);
  const sceneRef = useRef<OGL.Transform | null>(null);
  const meshRef = useRef<OGL.Mesh | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const config = RARITY_CONFIG[rarity];
    
    // Create renderer
    const renderer = new OGL.Renderer({
      canvas: canvasRef.current,
      width: 300,
      height: 300,
      dpr: 2,
      alpha: true,
      antialias: true
    });
    rendererRef.current = renderer;
    
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    // Create camera
    const camera = new OGL.Camera(gl, { fov: 45 });
    camera.position.set(0, 0, 5);

    // Create scene
    const scene = new OGL.Transform();
    sceneRef.current = scene;

    // Create geometry
    const geometry = new OGL.Box(gl, { width: 1.5, height: 1.5, depth: 1.5 });

    // Create shader program with emissive glow
    const program = new OGL.Program(gl, {
      vertex: `
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;
        
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform mat3 normalMatrix;
        
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        
        uniform vec3 uColor;
        uniform vec3 uEmissive;
        uniform float uTime;
        uniform float uOpening;
        
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 light = normalize(vec3(0.5, 1.0, 0.3));
          float shading = dot(normal, light) * 0.5 + 0.5;
          
          // Edge glow effect
          float fresnel = pow(1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0))), 2.0);
          
          // Pulsing emissive
          float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
          vec3 emissive = uEmissive * (1.0 + pulse * 0.5) * (1.0 + fresnel);
          
          // Opening effect
          float openGlow = uOpening * 2.0;
          emissive += vec3(1.0, 1.0, 1.0) * openGlow * fresnel;
          
          // Holographic effect
          float hologram = sin(vPosition.y * 10.0 + uTime * 3.0) * 0.1 + 0.9;
          
          vec3 color = uColor * shading * hologram + emissive;
          float alpha = 0.9 + fresnel * 0.1 - uOpening * 0.5;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uColor: { value: config.meshColor },
        uEmissive: { value: config.emissive },
        uTime: { value: 0 },
        uOpening: { value: 0 }
      }
    });

    // Create mesh
    const mesh = new OGL.Mesh(gl, { geometry, program });
    mesh.setParent(scene);
    meshRef.current = mesh;

    // Animation loop
    let startTime = Date.now();
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      const time = (Date.now() - startTime) * 0.001;
      program.uniforms.uTime.value = time;
      
      if (isOpening) {
        // Opening animation
        const openProgress = Math.min(time / 2, 1);
        program.uniforms.uOpening.value = openProgress;
        
        mesh.rotation.x = time * 2;
        mesh.rotation.y = time * 3;
        mesh.scale.set(1 + openProgress * 0.5);
        
        if (openProgress >= 1 && onAnimationComplete) {
          onAnimationComplete();
        }
      } else {
        // Idle animation
        mesh.rotation.x = time * 0.3;
        mesh.rotation.y = time * 0.5;
        mesh.rotation.z = Math.sin(time) * 0.1;
      }
      
      renderer.render({ scene, camera });
    };
    
    animate();

    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current = null;
      }
    };
  }, [isOpening, rarity, onAnimationComplete]);

  return (
    <canvas 
      ref={canvasRef}
      className="w-[300px] h-[300px]"
      style={{ touchAction: 'none' }}
    />
  );
}

// Animation styles object
const animationStyles = {
  floatBubble: (duration: number, delay: number) => ({
    animation: `lootboxFloatBubble ${duration}s ease-in-out infinite`,
    animationDelay: `${delay}s`
  }),
  slideInUp: (index: number) => ({
    animation: `lootboxSlideInUp 0.5s ease-out forwards`,
    animationDelay: `${index * 0.1}s`,
    opacity: 0
  }),
  rewardReveal: (index: number) => ({
    animation: `lootboxRewardReveal 0.5s ease-out forwards`,
    animationDelay: `${index * 0.15}s`,
    opacity: 0
  }),
  sparkleRotate: {
    animation: 'lootboxSparkleRotate 2s ease-in-out infinite'
  },
  progressFill: {
    animation: 'lootboxProgressFill 2s ease-out forwards'
  }
};

// Main Component
export default function EnhancedLootboxPage() {
  const [selectedLootbox, setSelectedLootbox] = useState<Lootbox | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [revealedRewards, setRevealedRewards] = useState<Reward[]>([]);
  const [showRewards, setShowRewards] = useState(false);
  const [lootboxInventory, setLootboxInventory] = useState<Lootbox[]>(LOOTBOXES);
  const [totalOpened, setTotalOpened] = useState(12);
  const [cardsFound, setCardsFound] = useState(8);
  const [floatingElements, setFloatingElements] = useState<FloatingElement[]>([]);

  // Generate floating background elements
  useEffect(() => {
    const elements: FloatingElement[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      size: Math.random() * 30 + 10,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5
    }));
    setFloatingElements(elements);
  }, []);

  const handleOpenLootbox = useCallback((lootbox: Lootbox) => {
    if (lootbox.locked || lootbox.count === 0) return;
    
    // Haptic feedback for mobile
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(50);
    }
    
    setSelectedLootbox(lootbox);
    setIsOpening(true);
    setRevealedRewards([]);
    setShowRewards(false);
  }, []);

  const handleOpeningComplete = useCallback(() => {
    if (!selectedLootbox) return;
    
    // Generate rewards
    const possibleRewards = POSSIBLE_REWARDS[selectedLootbox.rarity];
    const numRewards = selectedLootbox.rarity === 'epic' ? 3 : selectedLootbox.rarity === 'legendary' ? 2 : 1;
    const rewards: Reward[] = [];
    
    for (let i = 0; i < numRewards; i++) {
      const randomReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
      rewards.push({ ...randomReward, id: Date.now() + i });
    }
    
    setRevealedRewards(rewards);
    setShowRewards(true);
    setTotalOpened(prev => prev + 1);
    setCardsFound(prev => prev + rewards.filter(r => r.type === 'card').length);
    
    // Update inventory
    setLootboxInventory(prev => 
      prev.map(box => 
        box.id === selectedLootbox.id 
          ? { ...box, count: Math.max(0, box.count - 1) }
          : box
      )
    );
  }, [selectedLootbox]);

  const handleClose = useCallback(() => {
    setSelectedLootbox(null);
    setIsOpening(false);
    setShowRewards(false);
    setRevealedRewards([]);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Dynamic background with floating elements */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-black to-blue-950/40" />
        {floatingElements.map(element => (
          <div
            key={element.id}
            className="absolute rounded-full bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm"
            style={{
              width: `${element.size}px`,
              height: `${element.size}px`,
              left: `${element.x}%`,
              top: `${element.y}%`,
              ...animationStyles.floatBubble(element.duration, element.delay)
            }}
          />
        ))}
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse at top left, rgba(120, 119, 198, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(168, 85, 247, 0.1) 0%, transparent 50%)
          `
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 p-4 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button className="p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-wider">
              <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                LOOTBOXES
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-1 tracking-widest">COLLECTION SYSTEM</p>
          </div>
          <div className="w-11" />
        </div>

        {/* Enhanced stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-cyan-400 mb-2 uppercase tracking-wider">Opened</div>
              <div className="text-2xl font-black">{totalOpened}</div>
              <div className="absolute top-2 right-2 text-cyan-400 opacity-20">
                <Package size={24} />
              </div>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-purple-400 mb-2 uppercase tracking-wider">Cards</div>
              <div className="text-2xl font-black">{cardsFound}</div>
              <div className="absolute top-2 right-2 text-purple-400 opacity-20">
                <Star size={24} />
              </div>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-amber-400 mb-2 uppercase tracking-wider">Rarest</div>
              <div className="text-xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Legend</div>
              <div className="absolute top-2 right-2 text-amber-400 opacity-20">
                <Crown size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Lootbox Grid with enhanced visuals */}
        <div className="space-y-4">
          {lootboxInventory.map((lootbox, index) => {
            const config = RARITY_CONFIG[lootbox.rarity];
            const Icon = lootbox.icon;
            const isAvailable = !lootbox.locked && lootbox.count > 0;
            
            return (
              <div
                key={lootbox.id}
                onClick={() => handleOpenLootbox(lootbox)}
                className={`
                  relative overflow-hidden rounded-3xl
                  ${isAvailable ? 'cursor-pointer active:scale-[0.98]' : 'opacity-60'}
                  transition-all duration-300 group
                `}
                style={animationStyles.slideInUp(index)}
              >
                {/* Gradient background */}
                <div className="absolute inset-0" style={{ background: config.gradient, opacity: 0.1 }} />
                
                {/* Glow effect */}
                {isAvailable && (
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(ellipse at center, ${config.glowColor} 0%, transparent 70%)`
                    }}
                  />
                )}
                
                {/* Content */}
                <div className="relative bg-black/60 backdrop-blur-xl p-5 border border-white/10 group-hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Icon container with animation */}
                      <div className="relative">
                        <div className={`
                          w-14 h-14 rounded-2xl bg-gradient-to-br ${config.color}
                          flex items-center justify-center shadow-2xl
                          ${isAvailable ? 'group-hover:scale-110 group-hover:rotate-3' : ''}
                          transition-all duration-300
                        `}>
                          <Icon size={24} className="text-white" />
                        </div>
                        {isAvailable && (
                          <div className={`
                            absolute inset-0 rounded-2xl bg-gradient-to-br ${config.color}
                            blur-xl opacity-50 group-hover:opacity-70 transition-opacity
                          `} />
                        )}
                      </div>
                      
                      {/* Text */}
                      <div>
                        <div className="font-bold text-lg">{lootbox.name}</div>
                        <div className="text-sm text-gray-400">
                          <span className={`
                            inline-block px-2 py-0.5 rounded-full text-xs
                            bg-gradient-to-r ${config.color} bg-clip-text text-transparent font-bold
                          `}>
                            {config.name.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Count or lock status */}
                    <div className="text-right">
                      {lootbox.locked ? (
                        <div className="flex flex-col items-center">
                          <Lock size={20} className="text-gray-500 mb-1" />
                          <span className="text-xs text-gray-500">LOCKED</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="text-3xl font-black tabular-nums">{lootbox.count}</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider">Available</div>
                          {lootbox.count > 0 && (
                            <ChevronRight 
                              size={20} 
                              className="absolute -right-6 top-1/2 -translate-y-1/2 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" 
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Opening Modal with OGL */}
      {selectedLootbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="relative w-full max-w-md">
            {!showRewards ? (
              // Opening animation with OGL
              <div className="text-center">
                <div className="flex justify-center mb-8">
                  <LootboxCanvas 
                    isOpening={isOpening}
                    rarity={selectedLootbox.rarity}
                    onAnimationComplete={handleOpeningComplete}
                  />
                </div>
                
                <h2 className="text-3xl font-black mb-2">
                  <span className={`bg-gradient-to-r ${RARITY_CONFIG[selectedLootbox.rarity].color} bg-clip-text text-transparent`}>
                    {isOpening ? 'OPENING...' : selectedLootbox.name.toUpperCase()}
                  </span>
                </h2>
                <p className="text-gray-400 text-sm tracking-wider">
                  {isOpening ? 'Revealing treasures...' : 'Tap to continue'}
                </p>
                
                {/* Progress bar */}
                {isOpening && (
                  <div className="mt-6 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${RARITY_CONFIG[selectedLootbox.rarity].color} rounded-full`}
                      style={animationStyles.progressFill}
                    />
                  </div>
                )}
              </div>
            ) : (
              // Rewards display with enhanced animations
              <div className="text-center">
                <div className="mb-6">
                  <Sparkles className="w-16 h-16 mx-auto text-yellow-400 mb-4" 
                    style={animationStyles.sparkleRotate} />
                  <h2 className="text-3xl font-black mb-2">REWARDS UNLOCKED!</h2>
                  <p className="text-gray-400 text-sm">Tap items to collect</p>
                </div>
                
                <div className="space-y-4 mb-8">
                  {revealedRewards.map((reward, index) => {
                    const rewardConfig = RARITY_CONFIG[reward.rarity || selectedLootbox.rarity];
                    return (
                      <div
                        key={reward.id}
                        className="relative group cursor-pointer"
                        style={animationStyles.rewardReveal(index)}
                      >
                        {/* Glow background */}
                        <div 
                          className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity"
                          style={{ 
                            background: `linear-gradient(135deg, ${rewardConfig.glowColor} 0%, transparent 100%)` 
                          }}
                        />
                        
                        {/* Card content */}
                        <div className="relative bg-black/40 backdrop-blur-md rounded-2xl p-5 border border-white/20 group-hover:border-white/40 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="text-3xl transform group-hover:scale-110 group-hover:rotate-12 transition-transform">
                                {reward.icon}
                              </div>
                              <div className="text-left">
                                <div className="font-bold text-lg">{reward.name}</div>
                                <div className="text-xs text-gray-400">{reward.description}</div>
                                <div className={`
                                  inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold
                                  bg-gradient-to-r ${rewardConfig.color} bg-clip-text text-transparent
                                `}>
                                  {reward.type.toUpperCase()}
                                </div>
                              </div>
                            </div>
                            {reward.type === 'attempts' && (
                              <div className="text-2xl font-black text-green-400 animate-pulse">
                                +{reward.value}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <button
                  onClick={handleClose}
                  className="w-full py-4 rounded-2xl font-black text-lg tracking-wider
                    bg-gradient-to-r from-purple-600 to-blue-600 
                    hover:from-purple-500 hover:to-blue-500
                    transform hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200 shadow-2xl"
                  style={{
                    boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  COLLECT ALL
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}