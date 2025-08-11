// src/app/lootbox/page.tsx - Страница имитации открытия лутбоксов с анимациями

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Chip } from "@nextui-org/react";
import { Package, Gift, Sparkles, Zap, ArrowLeft, Star, Crown, Gem } from "lucide-react";
import ConfettiExplosion from "react-confetti-explosion";
import Lottie from "lottie-react";

// Типы для системы лутбоксов
enum CardRarity {
  COMMON = "common",
  RARE = "rare", 
  LEGENDARY = "legendary",
  EPIC = "epic"
}

enum LootboxType {
  BASIC = "basic",
  PREMIUM = "premium",
  ULTIMATE = "ultimate"
}

interface Card {
  id: string;
  name: string;
  description: string;
  rarity: CardRarity;
  imageUrl: string;
  collectionId: string;
  issuedCount: number;
  maxSupply?: number;
}

interface Lootbox {
  id: string;
  type: LootboxType;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  guaranteedRarity?: CardRarity;
  contents: {
    cards: { count: number; rarityWeights: Record<CardRarity, number> };
    bonusAttempts: { min: number; max: number; chance: number };
    telegramGifts: { chance: number; possibleGifts: string[] };
  };
}

interface LootboxOpenResult {
  cards: Card[];
  bonusAttempts: number;
  telegramGift?: { id: string; name: string; imageUrl: string };
}

// Константы для цветовых схем редкости
const RARITY_COLORS = {
  [CardRarity.COMMON]: {
    primary: "rgb(156, 163, 175)",
    secondary: "rgb(75, 85, 99)",
    glow: "rgba(156, 163, 175, 0.3)",
    gradient: "from-gray-400 to-gray-600",
    shadow: "shadow-gray-500/30"
  },
  [CardRarity.RARE]: {
    primary: "rgb(59, 130, 246)",
    secondary: "rgb(29, 78, 216)",
    glow: "rgba(59, 130, 246, 0.4)",
    gradient: "from-blue-400 to-blue-600",
    shadow: "shadow-blue-500/40"
  },
  [CardRarity.LEGENDARY]: {
    primary: "rgb(168, 85, 247)",
    secondary: "rgb(245, 158, 11)",
    glow: "rgba(168, 85, 247, 0.5)",
    gradient: "from-purple-500 via-pink-500 to-amber-500",
    shadow: "shadow-purple-500/50"
  },
  [CardRarity.EPIC]: {
    primary: "rgb(236, 72, 153)",
    secondary: "rgb(59, 130, 246)",
    glow: "rgba(236, 72, 153, 0.6)",
    gradient: "from-pink-500 via-purple-500 via-blue-500 via-green-500 to-yellow-500",
    shadow: "shadow-pink-500/60"
  }
};

// Mock данные
const MOCK_LOOTBOXES: Lootbox[] = [
  {
    id: "basic_box",
    type: LootboxType.BASIC,
    name: "Basic Lootbox",
    description: "Contains 3 cards with basic rewards",
    imageUrl: "/images/lootbox-basic.png",
    price: 50,
    contents: {
      cards: { count: 3, rarityWeights: { common: 0.7, rare: 0.25, legendary: 0.05, epic: 0 } },
      bonusAttempts: { min: 1, max: 3, chance: 0.3 },
      telegramGifts: { chance: 0.1, possibleGifts: ["star", "heart"] }
    }
  },
  {
    id: "premium_box", 
    type: LootboxType.PREMIUM,
    name: "Premium Lootbox",
    description: "Contains 5 cards with improved odds",
    imageUrl: "/images/lootbox-premium.png",
    price: 150,
    guaranteedRarity: CardRarity.RARE,
    contents: {
      cards: { count: 5, rarityWeights: { common: 0.4, rare: 0.45, legendary: 0.13, epic: 0.02 } },
      bonusAttempts: { min: 3, max: 8, chance: 0.5 },
      telegramGifts: { chance: 0.25, possibleGifts: ["star", "heart", "gift"] }
    }
  },
  {
    id: "ultimate_box",
    type: LootboxType.ULTIMATE, 
    name: "Ultimate Lootbox",
    description: "Contains 7 cards with guaranteed legendary",
    imageUrl: "/images/lootbox-ultimate.png",
    price: 300,
    guaranteedRarity: CardRarity.LEGENDARY,
    contents: {
      cards: { count: 7, rarityWeights: { common: 0.2, rare: 0.4, legendary: 0.3, epic: 0.1 } },
      bonusAttempts: { min: 5, max: 15, chance: 0.8 },
      telegramGifts: { chance: 0.4, possibleGifts: ["star", "heart", "gift", "trophy"] }
    }
  }
];

interface PageState {
  selectedLootbox: Lootbox | null;
  isOpening: boolean;
  openingResult: LootboxOpenResult | null;
  showResult: boolean;
  animationPhase: "anticipation" | "tgs-animation" | "reveal" | "complete";
  revealedCards: Card[];
  showConfetti: boolean;
  lottieData: any | null;
}

function LootboxPageContent() {
  const router = useRouter();

  const [state, setState] = useState<PageState>({
    selectedLootbox: null,
    isOpening: false, 
    openingResult: null,
    showResult: false,
    animationPhase: "anticipation",
    revealedCards: [],
    showConfetti: false,
    lottieData: null
  });

  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);

  // Загрузка TGS файла
  useEffect(() => {
    const loadTGS = async () => {
      try {
        const response = await fetch('https://cdn.changes.tg/gifts/models/Stellar%20Rocket/Doomsday.tgs');
        const arrayBuffer = await response.arrayBuffer();
        // TGS файлы - это сжатые JSON файлы, их нужно распаковать
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(arrayBuffer);
        const lottieData = JSON.parse(jsonString);
        setState(prev => ({ ...prev, lottieData }));
      } catch (error) {
        console.error('Failed to load TGS animation:', error);
        // Fallback - используем null, чтобы показать текстовую заглушку
      }
    };

    loadTGS();
  }, []);

  // Настройка Telegram WebApp back button
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        router.push("/main");
      });

      return () => {
        tg.BackButton.hide();
        tg.BackButton.offClick(() => {});
      };
    }
  }, [router]);

  // Симуляция открытия лутбокса
  const simulateLootboxOpen = (lootbox: Lootbox): LootboxOpenResult => {
    const cards = [];
    const cardsToGenerate = lootbox.contents.cards.count;
    
    for (let i = 0; i < cardsToGenerate; i++) {
      const random = Math.random();
      let rarity = CardRarity.COMMON;
      let threshold = 0;
      
      for (const [rarityKey, weight] of Object.entries(lootbox.contents.cards.rarityWeights)) {
        threshold += weight;
        if (random <= threshold) {
          rarity = rarityKey as CardRarity;
          break;
        }
      }
      
      cards.push({
        id: `card_${Date.now()}_${i}`,
        name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Card`,
        description: `A magnificent ${rarity} rarity card from the Circusle collection`,
        rarity,
        imageUrl: `/images/card-${rarity}.png`,
        collectionId: "circusle_collection",
        issuedCount: Math.floor(Math.random() * 1000) + 1,
        maxSupply: rarity === CardRarity.EPIC ? 100 : undefined
      });
    }

    // Гарантированная редкость
    if (lootbox.guaranteedRarity) {
      const hasGuaranteed = cards.some(card => 
        card.rarity === lootbox.guaranteedRarity ||
        (lootbox.guaranteedRarity === CardRarity.RARE && 
         [CardRarity.LEGENDARY, CardRarity.EPIC].includes(card.rarity))
      );
      
      if (!hasGuaranteed && cards.length > 0) {
        cards[0].rarity = lootbox.guaranteedRarity;
        cards[0].name = `Guaranteed ${lootbox.guaranteedRarity.charAt(0).toUpperCase() + lootbox.guaranteedRarity.slice(1)} Card`;
      }
    }

    // Сортируем по редкости для красивого показа
    const rarityOrder = [CardRarity.COMMON, CardRarity.RARE, CardRarity.LEGENDARY, CardRarity.EPIC];
    cards.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));

    const bonusAttempts = Math.random() < lootbox.contents.bonusAttempts.chance
      ? Math.floor(Math.random() * (lootbox.contents.bonusAttempts.max - lootbox.contents.bonusAttempts.min + 1)) + lootbox.contents.bonusAttempts.min
      : 0;

    const telegramGift = Math.random() < lootbox.contents.telegramGifts.chance
      ? {
          id: "gift_" + Date.now(),
          name: "Special Telegram Gift",
          imageUrl: "/images/telegram-gift.png"
        }
      : undefined;

    return { cards, bonusAttempts, telegramGift };
  };

  const handleLootboxSelect = (lootbox: Lootbox) => {
    setState(prev => ({ ...prev, selectedLootbox: lootbox }));
  };

  const handleOpenLootbox = async () => {
    if (!state.selectedLootbox) return;

    const result = simulateLootboxOpen(state.selectedLootbox);
    
    setState(prev => ({ 
      ...prev, 
      isOpening: true, 
      openingResult: result,
      animationPhase: "anticipation",
      revealedCards: [],
      showConfetti: false
    }));

    // Фаза ожидания - 1 секунда
    setTimeout(() => {
      setState(prev => ({ ...prev, animationPhase: "tgs-animation" }));
    }, 1000);

    // TGS анимация играет около 3-4 секунд, затем переходим к reveal
    setTimeout(() => {
      setState(prev => ({ ...prev, animationPhase: "reveal" }));
      
      // Последовательное раскрытие карточек
      result.cards.forEach((card, index) => {
        setTimeout(() => {
          setState(prev => ({ 
            ...prev, 
            revealedCards: [...prev.revealedCards, card] 
          }));
          
          // Показываем конфетти для редких карточек
          if ([CardRarity.LEGENDARY, CardRarity.EPIC].includes(card.rarity)) {
            setState(prev => ({ ...prev, showConfetti: true }));
            setTimeout(() => {
              setState(prev => ({ ...prev, showConfetti: false }));
            }, 3000);
          }
        }, index * 800);
      });
    }, 4500); // Увеличено время для TGS анимации

    setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        animationPhase: "complete",
        showResult: true,
        isOpening: false 
      }));
    }, 4500 + result.cards.length * 800 + 1000);
  };

  const handleCloseResult = () => {
    setState(prev => ({
      ...prev,
      selectedLootbox: null,
      openingResult: null,
      showResult: false,
      revealedCards: [],
      showConfetti: false
    }));
  };

  const getLootboxTypeColor = (type: LootboxType) => {
    switch (type) {
      case LootboxType.BASIC:
        return "from-gray-500 to-gray-700";
      case LootboxType.PREMIUM:
        return "from-blue-500 to-purple-600";
      case LootboxType.ULTIMATE:
        return "from-purple-600 to-pink-600";
      default:
        return "from-gray-500 to-gray-700";
    }
  };

  const getLootboxIcon = (type: LootboxType) => {
    switch (type) {
      case LootboxType.BASIC:
        return Package;
      case LootboxType.PREMIUM:
        return Gift;
      case LootboxType.ULTIMATE:
        return Sparkles;
      default:
        return Package;
    }
  };

  const getRarityIcon = (rarity: CardRarity) => {
    switch (rarity) {
      case CardRarity.COMMON:
        return Star;
      case CardRarity.RARE:
        return Gem;
      case CardRarity.LEGENDARY:
        return Crown;
      case CardRarity.EPIC:
        return Sparkles;
      default:
        return Star;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset-bottom px-4 safe-area-inset relative overflow-hidden">
      {/* Конфетти для редких карточек */}
      {state.showConfetti && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <ConfettiExplosion
            colors={["#FFD700", "#FF69B4", "#00BFFF", "#7B68EE", "#FF4500", "#32CD32"]}
            duration={3000}
            force={0.8}
            particleCount={150}
            width={600}
            height={600}
          />
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-4 mb-8 pt-6 relative z-10">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => router.push("/main")}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110 border border-white/20"
            aria-label="Back to main"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-5xl font-bold tracking-widest text-white animate-fade-in font-bpdots">
            LOOTBOX
          </h1>
          <div className="w-12" />
        </div>
        <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in-slow">
          Discover rare collectibles and rewards
        </p>
      </div>

      {/* Анимация открытия лутбокса */}
      {state.isOpening && state.selectedLootbox && (
        <div className="fixed inset-0 bg-black z-40 flex items-center justify-center">
          <div className="text-center space-y-8 relative z-10">
            {/* Фаза ожидания */}
            {state.animationPhase === "anticipation" && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-3xl font-bold text-white font-bpdots">
                  Opening {state.selectedLootbox.name}...
                </div>
                <div className="w-32 h-32 mx-auto relative">
                  <div className={`w-full h-full rounded-xl bg-gradient-to-br ${getLootboxTypeColor(state.selectedLootbox.type)} animate-pulse-gentle border-4 border-white/30`}>
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={48} className="text-white" />
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-xl border-4 border-white/60 animate-ping" />
                </div>
              </div>
            )}

            {/* TGS анимация */}
            {state.animationPhase === "tgs-animation" && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-3xl font-bold text-white font-bpdots animate-pulse">
                  Opening...
                </div>
                <div className="w-80 h-80 mx-auto">
                  {state.lottieData ? (
                    <Lottie
                      animationData={state.lottieData}
                      loop={false}
                      autoplay={true}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className={`w-40 h-40 rounded-xl bg-gradient-to-br ${getLootboxTypeColor(state.selectedLootbox.type)} animate-spin-slow border-4 border-white/50`}>
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles size={56} className="text-white animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Фаза раскрытия */}
            {state.animationPhase === "reveal" && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-4xl font-bold text-white font-bpdots">
                  Rewards Revealed!
                </div>
                
                {/* Сетка карточек в стиле игры */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl mx-auto p-4">
                  {state.openingResult?.cards.map((card, index) => {
                    const isRevealed = state.revealedCards.some(c => c.id === card.id);
                    const RarityIcon = getRarityIcon(card.rarity);
                    
                    return (
                      <div
                        key={card.id}
                        className={`
                          relative w-32 h-32 rounded-xl transition-all duration-800 ease-out
                          ${isRevealed ? 'opacity-100 scale-100' : 'opacity-30 scale-75'}
                        `}
                        style={{ 
                          animationDelay: `${index * 100}ms`,
                          filter: isRevealed ? 'none' : 'blur(8px)'
                        }}
                      >
                        {/* Основная карточка */}
                        <div className={`
                          w-full h-full rounded-xl bg-gradient-to-br ${RARITY_COLORS[card.rarity].gradient}
                          border-4 border-white/40 relative overflow-hidden
                          ${isRevealed ? `${RARITY_COLORS[card.rarity].shadow} shadow-2xl` : ''}
                        `}>
                          {/* Свечение фона */}
                          {isRevealed && (
                            <div 
                              className="absolute inset-0 opacity-20 animate-pulse-slow"
                              style={{ backgroundColor: RARITY_COLORS[card.rarity].glow }}
                            />
                          )}
                          
                          {/* Содержимое карточки */}
                          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-2 space-y-2">
                            <RarityIcon size={32} className="text-white" />
                            <div className="text-center">
                              <div className="text-xs font-bold text-white leading-tight">
                                {card.name}
                              </div>
                              <Chip 
                                size="sm" 
                                className="bg-white/20 text-white text-xs mt-1"
                              >
                                {card.rarity.toUpperCase()}
                              </Chip>
                            </div>
                          </div>

                          {/* Анимация появления для редких карточек */}
                          {isRevealed && [CardRarity.LEGENDARY, CardRarity.EPIC].includes(card.rarity) && (
                            <>
                              <div className="absolute inset-0 rounded-xl border-4 border-white/80 animate-ping" />
                              <div className="absolute inset-2 rounded-lg border-2 border-white/60 animate-ping" style={{ animationDelay: "0.3s" }} />
                            </>
                          )}
                        </div>

                        {/* Частицы для эпических карточек */}
                        {isRevealed && card.rarity === CardRarity.EPIC && (
                          <div className="absolute inset-0 pointer-events-none">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div
                                key={i}
                                className="absolute w-1 h-1 bg-white rounded-full animate-ping"
                                style={{
                                  left: `${20 + (i * 10)}%`,
                                  top: `${20 + (i * 10)}%`,
                                  animationDelay: `${i * 200}ms`
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Результат открытия */}
      {state.showResult && state.openingResult && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-gradient-to-br from-white/15 to-white/5 border-2 border-white/30 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardBody className="p-8">
              <div className="text-center space-y-8">
                <h2 className="text-4xl font-bold text-white font-bpdots animate-fade-in">
                  Lootbox Opened Successfully!
                </h2>
                
                {/* Детальный просмотр карточек */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-semibold text-white/90">Cards Received:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {state.openingResult.cards.map((card, index) => {
                      const RarityIcon = getRarityIcon(card.rarity);
                      
                      return (
                        <div 
                          key={card.id}
                          className={`
                            p-6 rounded-xl bg-gradient-to-br ${RARITY_COLORS[card.rarity].gradient}
                            border-2 border-white/30 hover:border-white/50 transition-all duration-300
                            hover:scale-105 ${RARITY_COLORS[card.rarity].shadow} shadow-xl
                            animate-fade-in-up
                          `}
                          style={{ animationDelay: `${index * 150}ms` }}
                        >
                          <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center">
                              <RarityIcon size={32} className="text-white" />
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-bold text-lg text-white">{card.name}</h4>
                              <p className="text-white/80 text-sm">{card.description}</p>
                              <div className="flex items-center justify-center space-x-2">
                                <Chip 
                                  size="sm" 
                                  className="bg-white/25 text-white font-semibold"
                                >
                                  {card.rarity.toUpperCase()}
                                </Chip>
                                <span className="text-white/70 text-xs">
                                  #{card.issuedCount}
                                  {card.maxSupply && ` / ${card.maxSupply}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Дополнительные награды */}
                <div className="space-y-4">
                  {state.openingResult.bonusAttempts > 0 && (
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/40 rounded-xl p-6 animate-fade-in-up">
                      <div className="flex items-center justify-center space-x-3">
                        <Zap className="text-green-400" size={28} />
                        <span className="text-green-300 font-bold text-xl">
                          +{state.openingResult.bonusAttempts} Bonus Attempts Received!
                        </span>
                      </div>
                    </div>
                  )}

                  {state.openingResult.telegramGift && (
                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-400/40 rounded-xl p-6 animate-fade-in-up">
                      <div className="flex items-center justify-center space-x-3">
                        <Gift className="text-blue-400" size={28} />
                        <span className="text-blue-300 font-bold text-xl">
                          Special Telegram Gift Unlocked!
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onPress={handleCloseResult}
                  className="bg-gradient-to-r from-white/20 to-white/10 text-white hover:from-white/30 hover:to-white/20 transition-all duration-300 border-2 border-white/30 hover:border-white/50 font-bold text-lg px-8 py-4"
                  size="lg"
                >
                  Continue Collecting
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Основной контент - выбор лутбокса */}
      {!state.isOpening && !state.showResult && (
        <div className="max-w-6xl mx-auto space-y-10 relative z-10">
          {/* Доступные лутбоксы */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-white text-center font-bpdots">Available Lootboxes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {MOCK_LOOTBOXES.map((lootbox) => {
                const IconComponent = getLootboxIcon(lootbox.type);
                const isSelected = state.selectedLootbox?.id === lootbox.id;
                
                return (
                  <Card 
                    key={lootbox.id}
                    isPressable
                    onPress={() => handleLootboxSelect(lootbox)}
                    className={`
                      bg-gradient-to-br ${getLootboxTypeColor(lootbox.type)} 
                      border-3 transition-all duration-500 hover:scale-105 hover:shadow-2xl
                      ${isSelected 
                        ? 'border-white ring-4 ring-white/50 scale-105 shadow-2xl' 
                        : 'border-white/30 hover:border-white/60'
                      }
                      relative overflow-hidden group
                    `}
                  >
                    {/* Фоновое свечение */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <CardBody className="p-8 text-center space-y-6 relative z-10">
                      <div className="relative">
                        <IconComponent size={64} className="mx-auto text-white drop-shadow-lg" />
                        {isSelected && (
                          <div className="absolute inset-0 animate-ping">
                            <IconComponent size={64} className="mx-auto text-white opacity-50" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-bold text-2xl text-white">{lootbox.name}</h3>
                        <p className="text-white/80 text-base leading-relaxed">{lootbox.description}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="text-white font-bold text-xl flex items-center justify-center space-x-2">
                          <Star size={20} />
                          <span>{lootbox.price}</span>
                        </div>
                        
                        {lootbox.guaranteedRarity && (
                          <Chip 
                            size="lg"
                            className={`bg-gradient-to-r ${RARITY_COLORS[lootbox.guaranteedRarity].gradient} text-white font-bold border-2 border-white/30`}
                          >
                            Guaranteed {lootbox.guaranteedRarity.charAt(0).toUpperCase() + lootbox.guaranteedRarity.slice(1)}
                          </Chip>
                        )}
                        
                        <div className="text-white/70 text-sm">
                          {lootbox.contents.cards.count} cards included
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Кнопка открытия */}
          {state.selectedLootbox && (
            <div className="text-center space-y-4">
              <div className="animate-pulse-gentle">
                <Button
                  onPress={handleOpenLootbox}
                  size="lg"
                  className={`
                    bg-gradient-to-r ${getLootboxTypeColor(state.selectedLootbox.type)}
                    text-white font-bold px-12 py-6 text-xl font-bpdots
                    hover:scale-110 transition-all duration-500
                    shadow-2xl hover:shadow-3xl border-3 border-white/40 hover:border-white/80
                    relative overflow-hidden group
                  `}
                  startContent={<Package size={28} />}
                >
                  {/* Фоновая анимация */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative z-10">
                    OPEN {state.selectedLootbox.name.toUpperCase()}
                  </span>
                </Button>
              </div>
              
              <p className="text-white/60 text-sm">
                Click to open and discover your rewards!
              </p>
            </div>
          )}

          {/* Информация о шансах */}
          <section className="bg-gradient-to-br from-white/5 to-white/2 border border-white/20 rounded-xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-white text-center">Drop Rates Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {Object.entries(RARITY_COLORS).map(([rarity, colors]) => {
                const RarityIcon = getRarityIcon(rarity as CardRarity);
                return (
                  <div key={rarity} className="space-y-2">
                    <RarityIcon size={24} className="mx-auto text-white" />
                    <div className="text-sm font-semibold text-white capitalize">{rarity}</div>
                    <div className="text-xs text-white/70">
                      {rarity === 'common' && '60-70%'}
                      {rarity === 'rare' && '25-45%'}
                      {rarity === 'legendary' && '5-30%'}
                      {rarity === 'epic' && '2-10%'}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function LootboxPage() {
  return (
      <LootboxPageContent />
  );
}