"use client";

import React, { useState } from "react";
import { Card, CardBody, CardHeader, Chip, Button, Progress } from "@nextui-org/react";
import { Package, Sparkles, Crown, Zap, Star, Gift, Image, BoxSelect } from "lucide-react";

// Types for collections system
type RarityLevel = "common" | "rare" | "legendary" | "epic";

interface CollectionItem {
  id: string;
  name: string;
  collection: string;
  rarity: RarityLevel;
  type: "collectible_card" | "lootbox";
  issued: number;
  maxSupply: number;
  imageUrl?: string;
  description?: string;
}

interface RarityStats {
  common: { total: number; available: number };
  rare: { total: number; available: number };
  legendary: { total: number; available: number };
  epic: { total: number; available: number };
}

// Mock data for demonstration
const mockGlobalStats: RarityStats = {
  common: { total: 100000, available: 45230 },
  rare: { total: 50000, available: 12340 },
  legendary: { total: 10000, available: 3456 },
  epic: { total: 2000, available: 567 }
};

const mockUserInventory: CollectionItem[] = [
  {
    id: "card_001",
    name: "Digital Nexus",
    collection: "Genesis Collection",
    rarity: "legendary",
    type: "collectible_card",
    issued: 234,
    maxSupply: 10000,
    description: "A rare digital artifact from the first collection"
  },
  {
    id: "card_002", 
    name: "Quantum Echo",
    collection: "Genesis Collection",
    rarity: "rare",
    type: "collectible_card",
    issued: 1456,
    maxSupply: 50000
  },
  {
    id: "loot_001",
    name: "Mystic Container",
    collection: "Genesis Collection", 
    rarity: "epic",
    type: "lootbox",
    issued: 12,
    maxSupply: 2000
  },
  {
    id: "card_003",
    name: "Data Stream",
    collection: "Alpha Series",
    rarity: "common",
    type: "collectible_card",
    issued: 8934,
    maxSupply: 100000
  },
  {
    id: "loot_002",
    name: "Standard Cache",
    collection: "Alpha Series",
    rarity: "common", 
    type: "lootbox",
    issued: 2340,
    maxSupply: 100000
  }
];

// Rarity configuration with colors and icons
const rarityConfig = {
  common: {
    color: "default",
    bgGradient: "from-gray-800 to-gray-700",
    borderColor: "border-gray-500/50",
    icon: Star,
    label: "Common",
    glowColor: "shadow-gray-500/20"
  },
  rare: {
    color: "primary", 
    bgGradient: "from-blue-900 to-blue-800",
    borderColor: "border-blue-500/50",
    icon: Sparkles,
    label: "Rare",
    glowColor: "shadow-blue-500/30"
  },
  legendary: {
    color: "secondary",
    bgGradient: "from-purple-900 via-violet-800 to-purple-900", 
    borderColor: "border-purple-500/50",
    icon: Crown,
    label: "Legendary",
    glowColor: "shadow-purple-500/40"
  },
  epic: {
    color: "warning",
    bgGradient: "from-yellow-900 via-orange-800 to-red-900",
    borderColor: "border-yellow-500/50", 
    icon: Zap,
    label: "Epic",
    glowColor: "shadow-yellow-500/50"
  }
} as const;

export default function InventoryPage() {
  const [selectedTab, setSelectedTab] = useState<"all" | "cards" | "lootboxes">("all");

  const getRarityIcon = (rarity: RarityLevel) => {
    const IconComponent = rarityConfig[rarity].icon;
    return <IconComponent size={16} />;
  };

  const getTypeIcon = (type: "collectible_card" | "lootbox") => {
    return type === "collectible_card" ? <Image size={16} /> : <Gift size={16} />;
  };

  const filterInventory = () => {
    if (selectedTab === "cards") {
      return mockUserInventory.filter(item => item.type === "collectible_card");
    }
    if (selectedTab === "lootboxes") {
      return mockUserInventory.filter(item => item.type === "lootbox");
    }
    return mockUserInventory;
  };

  const getAvailabilityPercentage = (available: number, total: number) => {
    return ((total - available) / total) * 100;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 safe-area-inset">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-wider text-white mb-2">
          INVENTORY
        </h1>
        <p className="text-white/60 text-sm uppercase tracking-[0.3em]">
          Collections & Digital Assets
        </p>
      </div>

      {/* Global Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BoxSelect size={20} />
          Global Collection Stats
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(mockGlobalStats).map(([rarity, stats]) => {
            const config = rarityConfig[rarity as RarityLevel];
            const issued = stats.total - stats.available;
            const percentage = getAvailabilityPercentage(stats.available, stats.total);
            
            return (
              <Card 
                key={rarity}
                className={`bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} ${config.glowColor} shadow-lg`}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getRarityIcon(rarity as RarityLevel)}
                      <span className="font-semibold text-sm">{config.label}</span>
                    </div>
                    <Chip 
                      size="sm" 
                      variant="flat"
                      className="bg-white/10 text-white border border-white/20"
                    >
                      {issued.toLocaleString()} / {stats.total.toLocaleString()}
                    </Chip>
                  </div>
                  
                  <Progress 
                    value={percentage}
                    className="mb-2"
                    classNames={{
                      track: "bg-white/10",
                      indicator: `bg-gradient-to-r ${config.bgGradient}`
                    }}
                  />
                  
                  <div className="text-xs text-white/70">
                    {stats.available.toLocaleString()} remaining
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          {[
            { key: "all", label: "All Items", icon: Package },
            { key: "cards", label: "Cards", icon: Image },
            { key: "lootboxes", label: "Lootboxes", icon: Gift }
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={selectedTab === key ? "solid" : "bordered"}
              className={
                selectedTab === key 
                  ? "bg-white/20 text-white border-white/30" 
                  : "bg-transparent text-white/70 border-white/20 hover:text-white hover:border-white/40"
              }
              startContent={<Icon size={16} />}
              onClick={() => setSelectedTab(key as any)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* User Inventory */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package size={20} />
          Your Collection ({filterInventory().length} items)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filterInventory().map((item) => {
            const config = rarityConfig[item.rarity];
            const issuedPercentage = (item.issued / item.maxSupply) * 100;
            
            return (
              <Card 
                key={item.id}
                className={`bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} ${config.glowColor} shadow-lg hover:scale-105 transition-transform duration-300`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start w-full">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      <span className="text-xs text-white/60 uppercase tracking-wide">
                        {item.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getRarityIcon(item.rarity)}
                      <span className="text-xs font-medium">{config.label}</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardBody className="pt-0">
                  <div className="mb-3">
                    <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                    <p className="text-sm text-white/70">{item.collection}</p>
                  </div>
                  
                  {item.description && (
                    <p className="text-xs text-white/60 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/70">Issued:</span>
                      <span className="text-xs font-medium">
                        {item.issued.toLocaleString()} / {item.maxSupply.toLocaleString()}
                      </span>
                    </div>
                    
                    <Progress 
                      value={issuedPercentage}
                      className="h-1"
                      classNames={{
                        track: "bg-white/10",
                        indicator: `bg-gradient-to-r ${config.bgGradient}`
                      }}
                    />
                    
                    <div className="text-right">
                      <span className="text-xs text-white/60">
                        {issuedPercentage.toFixed(1)}% minted
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
        
        {filterInventory().length === 0 && (
          <Card className="bg-white/5 border border-white/10">
            <CardBody className="text-center py-12">
              <Package size={48} className="mx-auto mb-4 text-white/40" />
              <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
              <p className="text-white/60">
                Your {selectedTab === "all" ? "inventory" : selectedTab} collection is empty.
                Play games to earn collectibles!
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Footer Spacing */}
      <div className="h-24" />
    </div>
  );
}