"use client";

import React, { useState } from "react";
import { Card, CardBody, Input, Button, Chip } from "@nextui-org/react";
import { Search, Package, Gift, Image, Crown, Sparkles, Star, Zap, ArrowLeft, Share, Send, Repeat, ChevronDown, ChevronUp } from "lucide-react";

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
  imageUrl: string;
  description?: string;
  owner: string;
  game: string;
}

// Mock data with visual representations
const mockUserInventory: CollectionItem[] = [
  {
    id: "card_001",
    name: "Eclipse",
    collection: "Genesis Collection",
    rarity: "rare",
    type: "collectible_card",
    issued: 12845,
    maxSupply: 50000,
    imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiByeD0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQwKSIvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxNDAiIHI9IjQwIiBmaWxsPSIjMDAwIi8+CjxkZWZzPgo8cmFkaWFsR3JhZGllbnQgaWQ9ImdyYWRpZW50MCIgY3g9IjEwMCIgY3k9IjE0MCIgcj0iMTUwIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZGRDcwMCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMDAiLz4KPC9yYWRpYWxHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4=",
    description: "Woke up to a Morse signal. Can be used for crafting.",
    owner: "Aleksandr",
    game: "Circusle"
  },
  {
    id: "card_002",
    name: "Quantum Echo",
    collection: "Genesis Collection", 
    rarity: "legendary",
    type: "collectible_card",
    issued: 5432,
    maxSupply: 10000,
    imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiByeD0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQxKSIvPgo8cGF0aCBkPSJNMTAwIDUwTDE1MCAyMDBMNTAgMjAwWiIgZmlsbD0iI0ZGRCIgb3BhY2l0eT0iMC4zIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MSIgeDE9IjAiIHkxPSIwIiB4Mj0iMjAwIiB5Mj0iMjgwIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzg4NTVGRiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMDAiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4=",
    owner: "Aleksandr",
    game: "Circusle"
  },
  {
    id: "card_003", 
    name: "Data Stream",
    collection: "Alpha Series",
    rarity: "common",
    type: "collectible_card",
    issued: 23451,
    maxSupply: 100000,
    imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiByeD0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQyKSIvPgo8cmVjdCB4PSI1MCIgeT0iMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiByeD0iOCIgZmlsbD0iI0ZGRiIgb3BhY2l0eT0iMC4yIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MiIgeDE9IjAiIHkxPSIwIiB4Mj0iMjAwIiB5Mj0iMjgwIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzMzMzMzMyIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMDAiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4=",
    owner: "Aleksandr", 
    game: "Circusle"
  },
  {
    id: "loot_001",
    name: "Mystic Container",
    collection: "Genesis Collection",
    rarity: "epic", 
    type: "lootbox",
    issued: 127,
    maxSupply: 2000,
    imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiByeD0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQzKSIvPgo8cmVjdCB4PSI2MCIgeT0iMTAwIiB3aWR0aD0iODAiIGhlaWdodD0iODAiIHJ4PSI4IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkQiIHN0cm9rZS13aWR0aD0iMyIvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxNDAiIHI9IjgiIGZpbGw9IiNGRkQiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQzIiB4MT0iMCIgeTE9IjAiIHgyPSIyMDAiIHkyPSIyODAiPgo8c3RvcCBzdG9wLWNvbG9yPSIjRkZENzAwIi8+CjxzdG9wIG9mZnNldD0iMC41IiBzdG9wLWNvbG9yPSIjRkY4QzAwIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ZGMDAwMCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPg==",
    owner: "Aleksandr",
    game: "Circusle"
  }
];

// Rarity configuration
const rarityConfig = {
  common: {
    label: "Common",
    color: "#9CA3AF",
    icon: Star
  },
  rare: {
    label: "Rare", 
    color: "#3B82F6",
    icon: Sparkles
  },
  legendary: {
    label: "Legendary",
    color: "#8B5CF6", 
    icon: Crown
  },
  epic: {
    label: "Epic",
    color: "#F59E0B",
    icon: Zap
  }
} as const;

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    collectible_cards: true,
    lootboxes: true
  });

  const toggleSection = (section: 'collectible_cards' | 'lootboxes') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filteredInventory = mockUserInventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.collection.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedInventory = {
    collectible_cards: filteredInventory.filter(item => item.type === "collectible_card"),
    lootboxes: filteredInventory.filter(item => item.type === "lootbox")
  };

  const getRarityIcon = (rarity: RarityLevel) => {
    const IconComponent = rarityConfig[rarity].icon;
    return <IconComponent size={14} />;
  };

  if (selectedItem) {
    return (
      <div className="min-h-screen bg-black text-white p-4 safe-area-inset">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="light"
            startContent={<ArrowLeft size={20} />}
            className="text-white p-0 min-w-0"
            onClick={() => setSelectedItem(null)}
          >
            Back
          </Button>
        </div>

        {/* Card Detail View */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-6">
            <img 
              src={selectedItem.imageUrl}
              alt={selectedItem.name}
              className="w-64 h-80 object-cover rounded-xl"
            />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">
            {selectedItem.name} #{selectedItem.issued}
          </h1>
          
          {selectedItem.description && (
            <p className="text-gray-400 text-center mb-6 px-4">
              {selectedItem.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <Button className="bg-gray-800 text-white min-w-20" startContent={<Send size={16} />}>
              Send
            </Button>
            <Button className="bg-gray-800 text-white min-w-20" startContent={<Repeat size={16} />}>
              Trade
            </Button>
            <Button className="bg-gray-800 text-white min-w-20" startContent={<Share size={16} />}>
              Share
            </Button>
          </div>
        </div>

        {/* Details Table */}
        <Card className="bg-gray-900/50 border border-gray-800">
          <CardBody className="p-0">
            <div className="divide-y divide-gray-800">
              <div className="flex justify-between items-center p-4">
                <span className="text-gray-400">Owner</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  <span className="text-white">{selectedItem.owner}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4">
                <span className="text-gray-400">Game</span>
                <div className="flex items-center gap-2">
                  <span className="text-white">{selectedItem.game}</span>
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                </div>
              </div>

              <div className="flex justify-between items-center p-4">
                <span className="text-gray-400">Collection</span>
                <span className="text-white">{selectedItem.collection}</span>
              </div>

              <div className="flex justify-between items-center p-4">
                <span className="text-gray-400">Rarity</span>
                <span style={{ color: rarityConfig[selectedItem.rarity].color }}>
                  {rarityConfig[selectedItem.rarity].label}
                </span>
              </div>

              <div className="flex justify-between items-center p-4">
                <span className="text-gray-400">Type</span>
                <span className="text-white">
                  {selectedItem.type === "collectible_card" ? "Collectible Cards" : "Lootbox"}
                </span>
              </div>

              <div className="flex justify-between items-center p-4">
                <span className="text-gray-400">Issued</span>
                <span className="text-white">{selectedItem.issued.toLocaleString()}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset">
      {/* Header */}
      <div className="p-4 pt-2 pb-2">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="light"
            startContent={<ArrowLeft size={20} />}
            className="text-white p-0 min-w-0"
          >
            Back
          </Button>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-1">
            Your inventory
          </h1>
          <div className="flex items-center gap-1 mb-4">
            <span className="text-gray-400">in</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
              <span className="text-white font-semibold">Circusle</span>
            </div>
          </div>
          
          <div className="text-sm text-gray-400 mb-4">
            Need more items? <span className="text-white font-semibold">Buy on market</span>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search In Circusle Inventory"
          startContent={<Search size={20} className="text-gray-400" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          classNames={{
            input: "bg-transparent text-white placeholder:text-gray-500",
            inputWrapper: "bg-gray-900/50 border border-gray-800 hover:border-gray-700"
          }}
          className="mb-6"
        />
      </div>

      {/* Content */}
      <div className="px-4">
        {/* Collectible Cards Section */}
        {groupedInventory.collectible_cards.length > 0 && (
          <div className="mb-8">
            <button
              className="flex items-center justify-between w-full mb-4 text-left"
              onClick={() => toggleSection('collectible_cards')}
              type="button"
            >
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Image size={20} />
                Collectible Cards
                <span className="text-gray-400 font-normal">{groupedInventory.collectible_cards.length}</span>
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="light" size="sm" className="text-gray-400 p-0 min-w-0">
                  <Package size={16} />
                </Button>
                {expandedSections.collectible_cards ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </div>
            </button>
            
            {expandedSections.collectible_cards && (
              <div className="grid grid-cols-2 gap-4">
                {groupedInventory.collectible_cards.map((item) => (
                  <button 
                    key={item.id}
                    className="cursor-pointer text-left w-full bg-transparent border-0 p-0"
                    onClick={() => setSelectedItem(item)}
                    type="button"
                  >
                    <div className="relative group">
                      <img 
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full aspect-[3/4] object-cover rounded-lg mb-2 group-hover:opacity-80 transition-opacity"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-white mb-1">{item.name} #{item.issued}</h3>
                      <div className="flex items-center justify-center gap-1">
                        {getRarityIcon(item.rarity)}
                        <span 
                          className="text-sm font-medium"
                          style={{ color: rarityConfig[item.rarity].color }}
                        >
                          {rarityConfig[item.rarity].label}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lootboxes Section */}
        {groupedInventory.lootboxes.length > 0 && (
          <div className="mb-8">
            <button
              className="flex items-center justify-between w-full mb-4 text-left"
              onClick={() => toggleSection('lootboxes')}
              type="button"
            >
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Gift size={20} />
                Lootboxes
                <span className="text-gray-400 font-normal">{groupedInventory.lootboxes.length}</span>
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="light" size="sm" className="text-gray-400 p-0 min-w-0">
                  <Package size={16} />
                </Button>
                {expandedSections.lootboxes ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </div>
            </button>
            
            {expandedSections.lootboxes && (
              <div className="grid grid-cols-2 gap-4">
                {groupedInventory.lootboxes.map((item) => (
                  <button 
                    key={item.id}
                    className="cursor-pointer text-left w-full bg-transparent border-0 p-0"
                    onClick={() => setSelectedItem(item)}
                    type="button"
                  >
                    <div className="relative group">
                      <img 
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full aspect-[3/4] object-cover rounded-lg mb-2 group-hover:opacity-80 transition-opacity"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-white mb-1">{item.name} #{item.issued}</h3>
                      <div className="flex items-center justify-center gap-1">
                        {getRarityIcon(item.rarity)}
                        <span 
                          className="text-sm font-medium"
                          style={{ color: rarityConfig[item.rarity].color }}
                        >
                          {rarityConfig[item.rarity].label}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {filteredInventory.length === 0 && (
          <Card className="bg-gray-900/30 border border-gray-800">
            <CardBody className="text-center py-12">
              <Package size={48} className="mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-semibold mb-2 text-white">No Items Found</h3>
              <p className="text-gray-400">
                {searchQuery ? "No items match your search." : "Your inventory is empty. Play games to earn collectibles!"}
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Bottom spacing */}
      <div className="h-20" />
    </div>
  );
}