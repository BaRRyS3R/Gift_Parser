import React, { useState, useEffect, useRef } from 'react';
import { Card, CardBody, Button, Chip, Modal, ModalContent, ModalHeader, ModalBody } from '@nextui-org/react';
import { Gift, Star, Zap, Sparkles, Crown, Diamond, LucideIcon } from 'lucide-react';

// Type definitions
type RarityType = 'common' | 'rare' | 'legendary' | 'epic';
type LootboxType = 'common' | 'rare' | 'legendary' | 'epic';
type RewardType = 'card' | 'attempts' | 'gift';

interface RarityConfig {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: LucideIcon;
  chance: number;
}

interface LootboxConfig {
  name: string;
  price: number;
  rarity: RarityType;
  description: string;
}

interface Reward {
  id: string;
  type: RewardType;
  rarity: RarityType;
  name: string;
  quantity: number;
}

interface ParticleEffectProps {
  rarity: RarityType;
  isVisible: boolean;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
}

interface LootboxCardProps {
  type: LootboxType;
  onOpen: (type: LootboxType) => void;
}

interface RewardDisplayProps {
  reward: Reward;
}

// Rarities configuration
const RARITIES: Record<RarityType, RarityConfig> = {
  common: {
    name: 'Common',
    color: '#9CA3AF',
    bgColor: 'from-gray-400/20 to-gray-600/20',
    borderColor: 'border-gray-400/50',
    icon: Star,
    chance: 60
  },
  rare: {
    name: 'Rare', 
    color: '#3B82F6',
    bgColor: 'from-blue-400/20 to-blue-600/20',
    borderColor: 'border-blue-400/50',
    icon: Zap,
    chance: 25
  },
  legendary: {
    name: 'Legendary',
    color: '#A855F7', 
    bgColor: 'from-purple-400/20 to-purple-600/20',
    borderColor: 'border-purple-400/50',
    icon: Crown,
    chance: 12
  },
  epic: {
    name: 'Epic',
    color: '#F59E0B',
    bgColor: 'from-amber-400/20 to-orange-600/20', 
    borderColor: 'border-amber-400/50',
    icon: Diamond,
    chance: 3
  }
};

// Lootbox types
const LOOTBOX_TYPES: Record<LootboxType, LootboxConfig> = {
  common: {
    name: 'Common Lootbox',
    price: 50,
    rarity: 'common',
    description: 'Basic rewards and surprises'
  },
  rare: {
    name: 'Rare Lootbox',
    price: 150,
    rarity: 'rare', 
    description: 'Better chances for valuable items'
  },
  legendary: {
    name: 'Legendary Lootbox',
    price: 500,
    rarity: 'legendary',
    description: 'High-tier collectibles guaranteed'
  },
  epic: {
    name: 'Epic Lootbox',
    price: 1500,
    rarity: 'epic',
    description: 'The rarest treasures await'
  }
};

// Reward types
const REWARD_TYPES: Record<RewardType, string> = {
  card: 'Collectible Card',
  attempts: 'Game Attempts',
  gift: 'Telegram Gift'
};

// Generate random rewards based on lootbox type
const generateRewards = (lootboxType: LootboxType): Reward[] => {
  const rewards: Reward[] = [];
  const numRewards = Math.floor(Math.random() * 3) + 1; // 1-3 rewards
  
  for (let i = 0; i < numRewards; i++) {
    const rewardType: RewardType = Math.random() < 0.5 ? 'card' : Math.random() < 0.7 ? 'attempts' : 'gift';
    
    let rarity: RarityType;
    const rand = Math.random() * 100;
    
    // Adjust rarity chances based on lootbox type
    const rarityMultiplier = lootboxType === 'epic' ? 3 : lootboxType === 'legendary' ? 2 : lootboxType === 'rare' ? 1.5 : 1;
    
    if (rand < RARITIES.epic.chance * rarityMultiplier) {
      rarity = 'epic';
    } else if (rand < (RARITIES.epic.chance + RARITIES.legendary.chance) * rarityMultiplier) {
      rarity = 'legendary';
    } else if (rand < (RARITIES.epic.chance + RARITIES.legendary.chance + RARITIES.rare.chance) * rarityMultiplier) {
      rarity = 'rare';
    } else {
      rarity = 'common';
    }
    
    rewards.push({
      id: Math.random().toString(36).substr(2, 9),
      type: rewardType,
      rarity,
      name: rewardType === 'card' ? `${RARITIES[rarity].name} Card #${Math.floor(Math.random() * 1000)}` :
            rewardType === 'attempts' ? `${Math.floor(Math.random() * 10) + 1} Game Attempts` :
            `Telegram ${RARITIES[rarity].name} Gift`,
      quantity: rewardType === 'attempts' ? Math.floor(Math.random() * 10) + 1 : 1
    });
  }
  
  return rewards;
};

// Particle effect component
const ParticleEffect: React.FC<ParticleEffectProps> = ({ rarity, isVisible, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: Particle[] = [];
    const rarityConfig = RARITIES[rarity];
    
    // Create particles
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        decay: Math.random() * 0.02 + 0.01,
        size: Math.random() * 4 + 2,
        color: rarityConfig.color
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= particle.decay;
        particle.vy += 0.1; // gravity
        
        if (particle.life <= 0) {
          particles.splice(index, 1);
          return;
        }
        
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      
      if (particles.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, rarity, onComplete]);
  
  if (!isVisible) return null;
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ background: 'transparent' }}
    />
  );
};

// Lootbox component
const LootboxCard: React.FC<LootboxCardProps> = ({ type, onOpen }) => {
  const lootbox = LOOTBOX_TYPES[type];
  const rarityConfig = RARITIES[lootbox.rarity];
  const IconComponent = rarityConfig.icon;
  
  return (
    <Card className={`bg-gradient-to-br ${rarityConfig.bgColor} border-2 ${rarityConfig.borderColor} hover:scale-105 transition-transform duration-300 cursor-pointer`}>
      <CardBody className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${rarityConfig.bgColor} flex items-center justify-center border-2 ${rarityConfig.borderColor}`}>
            <IconComponent size={32} color={rarityConfig.color} />
          </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{lootbox.name}</h3>
        <p className="text-white/70 text-sm mb-4">{lootbox.description}</p>
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Star className="text-yellow-400" size={16} />
          <span className="text-white font-bold">{lootbox.price}</span>
        </div>
        <Chip size="sm" style={{ backgroundColor: rarityConfig.color + '40', color: rarityConfig.color }}>
          {rarityConfig.name}
        </Chip>
        <Button
          className="w-full mt-4 bg-white/20 text-white border border-white/40 hover:bg-white/30"
          onClick={() => onOpen(type)}
        >
          Open Lootbox
        </Button>
      </CardBody>
    </Card>
  );
};

// Reward display component
const RewardDisplay: React.FC<RewardDisplayProps> = ({ reward }) => {
  const rarityConfig = RARITIES[reward.rarity];
  
  return (
    <div className={`p-4 rounded-lg bg-gradient-to-br ${rarityConfig.bgColor} border-2 ${rarityConfig.borderColor} text-center transform transition-all duration-500 hover:scale-105`}>
      <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br ${rarityConfig.bgColor} flex items-center justify-center border ${rarityConfig.borderColor}`}>
        {reward.type === 'card' && <Gift size={24} color={rarityConfig.color} />}
        {reward.type === 'attempts' && <Zap size={24} color={rarityConfig.color} />}
        {reward.type === 'gift' && <Sparkles size={24} color={rarityConfig.color} />}
      </div>
      <h4 className="font-bold text-white text-sm mb-1">{reward.name}</h4>
      <p className="text-white/70 text-xs">{REWARD_TYPES[reward.type]}</p>
      {reward.quantity > 1 && (
        <div className="mt-2">
          <Chip size="sm" style={{ backgroundColor: rarityConfig.color + '40', color: rarityConfig.color }}>
            x{reward.quantity}
          </Chip>
        </div>
      )}
    </div>
  );
};

// Main component
export default function LootboxDemo() {
  const [isOpening, setIsOpening] = useState<boolean>(false);
  const [showRewards, setShowRewards] = useState<boolean>(false);
  const [currentRewards, setCurrentRewards] = useState<Reward[]>([]);
  const [openingLootbox, setOpeningLootbox] = useState<LootboxType | null>(null);
  const [showParticles, setShowParticles] = useState<boolean>(false);
  const [particleRarity, setParticleRarity] = useState<RarityType>('common');
  
  const handleOpenLootbox = async (type: LootboxType): Promise<void> => {
    setIsOpening(true);
    setOpeningLootbox(type);
    setShowRewards(false);
    
    // Simulate opening animation delay
    setTimeout(() => {
      const rewards = generateRewards(type);
      setCurrentRewards(rewards);
      
      // Find highest rarity for particle effect
      const rarityOrder: RarityType[] = ['common', 'rare', 'legendary', 'epic'];
      const highestRarity = rewards.reduce((highest: RarityType, reward) => {
        return rarityOrder.indexOf(reward.rarity) > rarityOrder.indexOf(highest) ? reward.rarity : highest;
      }, 'common' as RarityType);
      
      setParticleRarity(highestRarity);
      setShowParticles(true);
      setIsOpening(false);
      setShowRewards(true);
    }, 2000);
  };
  
  const handleCloseModal = () => {
    setShowRewards(false);
    setShowParticles(false);
    setCurrentRewards([]);
    setOpeningLootbox(null);
  };
  
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">🎁 Lootbox Demo</h1>
          <p className="text-white/70">Experience the thrill of opening collectible lootboxes</p>
        </div>
        
        {/* Lootboxes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(Object.keys(LOOTBOX_TYPES) as LootboxType[]).map((type) => (
            <LootboxCard key={type} type={type} onOpen={handleOpenLootbox} />
          ))}
        </div>
        
        {/* Opening Animation */}
        {isOpening && openingLootbox && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 animate-spin-slow">
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${RARITIES[LOOTBOX_TYPES[openingLootbox].rarity].bgColor} border-4 ${RARITIES[LOOTBOX_TYPES[openingLootbox].rarity].borderColor} flex items-center justify-center`}>
                  <Gift size={48} color={RARITIES[LOOTBOX_TYPES[openingLootbox].rarity].color} />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Opening Lootbox...</h2>
              <p className="text-white/70">Revealing your rewards</p>
            </div>
          </div>
        )}
        
        {/* Particle Effect */}
        <ParticleEffect 
          rarity={particleRarity}
          isVisible={showParticles}
          onComplete={() => setShowParticles(false)}
        />
        
        {/* Rewards Modal */}
        <Modal 
          isOpen={showRewards} 
          onClose={handleCloseModal}
          size="2xl"
          classNames={{
            backdrop: "bg-black/80 backdrop-blur-sm",
            base: "bg-black border border-white/20",
            header: "border-b border-white/20",
            body: "py-6"
          }}
        >
          <ModalContent>
            <ModalHeader className="text-white">
              <div className="flex items-center space-x-2">
                <Gift className="text-yellow-400" size={24} />
                <span>Congratulations! You received:</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentRewards.map((reward) => (
                  <RewardDisplay key={reward.id} reward={reward} />
                ))}
              </div>
              <div className="text-center mt-6">
                <Button 
                  className="bg-white/20 text-white border border-white/40 hover:bg-white/30"
                  onClick={handleCloseModal}
                >
                  Collect Rewards
                </Button>
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
        
        {/* Demo Info */}
        <Card className="bg-white/10 border border-white/20 mt-8">
          <CardBody className="p-6">
            <h3 className="text-xl font-bold mb-4">Demo Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2 text-blue-400">Rarity System:</h4>
                <ul className="space-y-1 text-white/70">
                  <li>• Common (60% chance) - Gray theme</li>
                  <li>• Rare (25% chance) - Blue theme</li>
                  <li>• Legendary (12% chance) - Purple theme</li>
                  <li>• Epic (3% chance) - Gold theme</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-green-400">Reward Types:</h4>
                <ul className="space-y-1 text-white/70">
                  <li>• Collectible Cards</li>
                  <li>• Game Attempts (1-10)</li>
                  <li>• Telegram Gifts</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}