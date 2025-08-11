"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@nextui-org/react";
import {
  Gift,
  Star,
  Zap,
  Sparkles,
  Crown,
  Diamond,
  LucideIcon,
} from "lucide-react";

// ==== CONFIG ====
type RarityType = "common" | "rare" | "legendary" | "epic";
type LootboxType = "common" | "rare" | "legendary" | "epic";
type RewardType = "card" | "attempts" | "gift";

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

const RARITIES: Record<RarityType, RarityConfig> = {
  common: {
    name: "Common",
    color: "#9CA3AF",
    bgColor: "from-gray-400/20 to-gray-600/20",
    borderColor: "border-gray-400/50",
    icon: Star,
    chance: 60,
  },
  rare: {
    name: "Rare",
    color: "#3B82F6",
    bgColor: "from-blue-400/20 to-blue-600/20",
    borderColor: "border-blue-400/50",
    icon: Zap,
    chance: 25,
  },
  legendary: {
    name: "Legendary",
    color: "#A855F7",
    bgColor: "from-purple-400/20 to-purple-600/20",
    borderColor: "border-purple-400/50",
    icon: Crown,
    chance: 12,
  },
  epic: {
    name: "Epic",
    color: "#F59E0B",
    bgColor: "from-amber-400/20 to-orange-600/20",
    borderColor: "border-amber-400/50",
    icon: Diamond,
    chance: 3,
  },
};

const LOOTBOX_TYPES: Record<LootboxType, LootboxConfig> = {
  common: {
    name: "Common Lootbox",
    price: 50,
    rarity: "common",
    description: "Basic rewards and surprises",
  },
  rare: {
    name: "Rare Lootbox",
    price: 150,
    rarity: "rare",
    description: "Better chances for valuable items",
  },
  legendary: {
    name: "Legendary Lootbox",
    price: 500,
    rarity: "legendary",
    description: "High-tier collectibles guaranteed",
  },
  epic: {
    name: "Epic Lootbox",
    price: 1500,
    rarity: "epic",
    description: "The rarest treasures await",
  },
};

const REWARD_TYPES: Record<RewardType, string> = {
  card: "Collectible Card",
  attempts: "Game Attempts",
  gift: "Telegram Gift",
};

const generateRewards = (lootboxType: LootboxType): Reward[] => {
  const rewards: Reward[] = [];
  const numRewards = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < numRewards; i++) {
    const rewardType: RewardType =
      Math.random() < 0.5
        ? "card"
        : Math.random() < 0.7
        ? "attempts"
        : "gift";

    let rarity: RarityType;
    const rand = Math.random() * 100;
    const rarityMultiplier =
      lootboxType === "epic"
        ? 3
        : lootboxType === "legendary"
        ? 2
        : lootboxType === "rare"
        ? 1.5
        : 1;

    if (rand < RARITIES.epic.chance * rarityMultiplier) {
      rarity = "epic";
    } else if (
      rand <
      (RARITIES.epic.chance + RARITIES.legendary.chance) * rarityMultiplier
    ) {
      rarity = "legendary";
    } else if (
      rand <
      (RARITIES.epic.chance +
        RARITIES.legendary.chance +
        RARITIES.rare.chance) *
        rarityMultiplier
    ) {
      rarity = "rare";
    } else {
      rarity = "common";
    }

    rewards.push({
      id: Math.random().toString(36).substr(2, 9),
      type: rewardType,
      rarity,
      name:
        rewardType === "card"
          ? `${RARITIES[rarity].name} Card #${Math.floor(
              Math.random() * 1000
            )}`
          : rewardType === "attempts"
          ? `${Math.floor(Math.random() * 10) + 1} Game Attempts`
          : `Telegram ${RARITIES[rarity].name} Gift`,
      quantity: rewardType === "attempts" ? Math.floor(Math.random() * 10) + 1 : 1,
    });
  }

  return rewards;
};

// ==== BACKGROUND ====
const NeonGrid = () => (
  <div className="absolute inset-0 z-0">
    <div className="absolute inset-0 bg-black" />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] animate-slow-pan" />
    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-500/10 to-purple-500/10 mix-blend-screen" />
  </div>
);

// ==== PORTAL + PARTICLES ====
const PortalEffectWithParticles: React.FC<{ rarity: RarityType }> = ({
  rarity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      size: number;
    }[] = [];

    const createParticles = () => {
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          size: Math.random() * 3 + 2,
        });
      }
    };

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Portal ring
      const radius = 100 + Math.sin(frame * 0.1) * 20;
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        radius * 0.2,
        canvas.width / 2,
        canvas.height / 2,
        radius
      );
      gradient.addColorStop(0, RARITIES[rarity].color + "AA");
      gradient.addColorStop(0.5, RARITIES[rarity].color + "55");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
      ctx.fill();

      // Spawn new particles every few frames
      if (frame % 5 === 0) createParticles();

      // Draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;

        ctx.globalAlpha = p.life;
        ctx.fillStyle = RARITIES[rarity].color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0) particles.splice(i, 1);
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    animate();
  }, [rarity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-40 pointer-events-none"
    />
  );
};

// ==== LOOTBOX CARD ====
const LootboxCard: React.FC<{ type: LootboxType; onOpen: (t: LootboxType) => void }> = ({
  type,
  onOpen,
}) => {
  const lootbox = LOOTBOX_TYPES[type];
  const rarityConfig = RARITIES[lootbox.rarity];
  const Icon = rarityConfig.icon;

  return (
    <Card
      className={`bg-gradient-to-br ${rarityConfig.bgColor} border-2 ${rarityConfig.borderColor} hover:shadow-[0_0_20px_${rarityConfig.color}] transition-all cursor-pointer hover:scale-105`}
    >
      <CardBody className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <div
            className={`w-16 h-16 rounded-full bg-gradient-to-br ${rarityConfig.bgColor} flex items-center justify-center border-2 ${rarityConfig.borderColor}`}
          >
            <Icon size={32} color={rarityConfig.color} />
          </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{lootbox.name}</h3>
        <p className="text-white/70 text-sm mb-4">{lootbox.description}</p>
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Star className="text-yellow-400" size={16} />
          <span className="text-white font-bold">{lootbox.price}</span>
        </div>
        <Chip
          size="sm"
          style={{
            backgroundColor: rarityConfig.color + "40",
            color: rarityConfig.color,
          }}
        >
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

// ==== REWARD DISPLAY ====
const RewardDisplay: React.FC<{ reward: Reward }> = ({ reward }) => {
  const rarityConfig = RARITIES[reward.rarity];
  return (
    <div
      className={`p-4 rounded-lg bg-gradient-to-br ${rarityConfig.bgColor} border-2 ${rarityConfig.borderColor} text-center transform transition-all duration-500 hover:scale-105`}
    >
      <div
        className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br ${rarityConfig.bgColor} flex items-center justify-center border ${rarityConfig.borderColor}`}
      >
        {reward.type === "card" && <Gift size={24} color={rarityConfig.color} />}
        {reward.type === "attempts" && <Zap size={24} color={rarityConfig.color} />}
        {reward.type === "gift" && (
          <Sparkles size={24} color={rarityConfig.color} />
        )}
      </div>
      <h4 className="font-bold text-white text-sm mb-1">{reward.name}</h4>
      <p className="text-white/70 text-xs">{REWARD_TYPES[reward.type]}</p>
      {reward.quantity > 1 && (
        <div className="mt-2">
          <Chip
            size="sm"
            style={{
              backgroundColor: rarityConfig.color + "40",
              color: rarityConfig.color,
            }}
          >
            x{reward.quantity}
          </Chip>
        </div>
      )}
    </div>
  );
};

// ==== MAIN ====
export default function LootboxDemo() {
  const [isOpening, setIsOpening] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [currentRewards, setCurrentRewards] = useState<Reward[]>([]);
  const [openingLootbox, setOpeningLootbox] = useState<LootboxType | null>(null);

  const handleOpenLootbox = (type: LootboxType) => {
    setIsOpening(true);
    setOpeningLootbox(type);

    setTimeout(() => {
      const rewards = generateRewards(type);
      setCurrentRewards(rewards);
      setIsOpening(false);
      setShowRewards(true);
    }, 2500);
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <NeonGrid />

      <div className="max-w-6xl mx-auto relative z-10 p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">🎁 Lootbox Portal Demo</h1>
          <p className="text-white/70">
            Experience the thrill of opening collectible lootboxes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(Object.keys(LOOTBOX_TYPES) as LootboxType[]).map((type) => (
            <LootboxCard key={type} type={type} onOpen={handleOpenLootbox} />
          ))}
        </div>
      </div>

      {isOpening && openingLootbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <PortalEffectWithParticles
            rarity={LOOTBOX_TYPES[openingLootbox].rarity}
          />
          <div className="relative z-50 animate-pulse">
            <div
              className={`w-40 h-40 rounded-full bg-gradient-to-br ${RARITIES[LOOTBOX_TYPES[openingLootbox].rarity].bgColor} border-4 ${RARITIES[LOOTBOX_TYPES[openingLootbox].rarity].borderColor} flex items-center justify-center animate-spin-slow`}
            >
              <Gift
                size={64}
                color={RARITIES[LOOTBOX_TYPES[openingLootbox].rarity].color}
              />
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showRewards}
        onClose={() => setShowRewards(false)}
        size="2xl"
        classNames={{
          backdrop: "bg-black/80 backdrop-blur-sm",
          base: "bg-black border border-white/20",
          header: "border-b border-white/20",
          body: "py-6",
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
                onClick={() => setShowRewards(false)}
              >
                Collect Rewards
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
