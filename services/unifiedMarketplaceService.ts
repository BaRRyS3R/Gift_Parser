// src/services/unifiedMarketplaceService.ts

import { Gift, MarketplaceType, ApiResponse } from "@/types/gift";
import { apiService } from "./apiService";
import { portalsApiService } from "./portalsApiService";

// Gift collections available on different marketplaces
const MARKETPLACE_COLLECTIONS = {
  tonnel: {
    "Santa Hat": "Santa Hat",
    "Signet Ring": "Signet Ring", 
    "Precious Peach": "Precious Peach",
    "Plush Pepe": "Plush Pepe",
    "Spiced Wine": "Spiced Wine",
    "Jelly Bunny": "Jelly Bunny",
    "Durov's Cap": "Durov's Cap",
    "Perfume Bottle": "Perfume Bottle",
    "Eternal Rose": "Eternal Rose",
    "Berry Box": "Berry Box",
    "Vintage Cigar": "Vintage Cigar",
    "Magic Potion": "Magic Potion",
    "Kissed Frog": "Kissed Frog",
    "Hex Pot": "Hex Pot",
    "Evil Eye": "Evil Eye",
    "Sharp Tongue": "Sharp Tongue",
    "Trapped Heart": "Trapped Heart",
    "Skull Flower": "Skull Flower",
    "Scared Cat": "Scared Cat",
    "Spy Agaric": "Spy Agaric",
    "Homemade Cake": "Homemade Cake",
    "Genie Lamp": "Genie Lamp",
    "Lunar Snake": "Lunar Snake",
    "Party Sparkler": "Party Sparkler",
    "Jester Hat": "Jester Hat",
    "Witch Hat": "Witch Hat",
    "Hanging Star": "Hanging Star",
    "Love Candle": "Love Candle",
    "Cookie Heart": "Cookie Heart",
    "Desk Calendar": "Desk Calendar",
    "Jingle Bells": "Jingle Bells",
    "Snow Mittens": "Snow Mittens",
    "Voodoo Doll": "Voodoo Doll",
    "Mad Pumpkin": "Mad Pumpkin",
    "Hypno Lollipop": "Hypno Lollipop",
    "B-Day Candle": "B-Day Candle",
    "Bunny Muffin": "Bunny Muffin",
    "Astral Shard": "Astral Shard",
    "Flying Broom": "Flying Broom",
    "Crystal Ball": "Crystal Ball",
    "Eternal Candle": "Eternal Candle",
    "Swiss Watch": "Swiss Watch",
    "Ginger Cookie": "Ginger Cookie",
    "Mini Oscar": "Mini Oscar",
    "Lol Pop": "Lol Pop",
    "Ion Gem": "Ion Gem",
    "Star Notepad": "Star Notepad",
    "Loot Bag": "Loot Bag",
    "Love Potion": "Love Potion",
    "Toy Bear": "Toy Bear",
    "Diamond Ring": "Diamond Ring",
    "Sakura Flower": "Sakura Flower",
    "Sleigh Bell": "Sleigh Bell",
    "Top Hat": "Top Hat",
    "Record Player": "Record Player",
    "Winter Wreath": "Winter Wreath",
    "Snow Globe": "Snow Globe",
    "Electric Skull": "Electric Skull",
    "Tama Gadget": "Tama Gadget",
    "Candy Cane": "Candy Cane",
    "Neko Helmet": "Neko Helmet",
    "Jack-in-the-Box": "Jack-in-the-Box",
    "Easter Egg": "Easter Egg",
    "Bonded Ring": "Bonded Ring",
    "Pet Snake": "Pet Snake",
    "Snake Box": "Snake Box",
    "Xmas Stocking": "Xmas Stocking",
    "Big Year": "Big Year",
    "Holiday Drink": "Holiday Drink",
    "Gem Signet": "Gem Signet",
    "Light Sword": "Light Sword",
    "Restless Jar": "Restless Jar",
    "Nail Bracelet": "Nail Bracelet",
    "Heroic Helmet": "Heroic Helmet",
    "Bow Tie": "Bow Tie"
  },
  portals: {
    "Santa Hat": "Santa Hat",
    "Signet Ring": "Signet Ring", 
    "Precious Peach": "Precious Peach",
    "Plush Pepe": "Plush Pepe",
    "Spiced Wine": "Spiced Wine",
    "Jelly Bunny": "Jelly Bunny",
    "Durov's Cap": "Durov's Cap",
    "Perfume Bottle": "Perfume Bottle",
    "Eternal Rose": "Eternal Rose",
    "Berry Box": "Berry Box",
    "Vintage Cigar": "Vintage Cigar",
    "Magic Potion": "Magic Potion",
    "Kissed Frog": "Kissed Frog",
    "Hex Pot": "Hex Pot",
    "Evil Eye": "Evil Eye",
    "Sharp Tongue": "Sharp Tongue",
    "Trapped Heart": "Trapped Heart",
    "Skull Flower": "Skull Flower",
    "Scared Cat": "Scared Cat",
    "Spy Agaric": "Spy Agaric",
    "Homemade Cake": "Homemade Cake",
    "Genie Lamp": "Genie Lamp",
    "Lunar Snake": "Lunar Snake",
    "Party Sparkler": "Party Sparkler",
    "Jester Hat": "Jester Hat",
    "Witch Hat": "Witch Hat",
    "Hanging Star": "Hanging Star",
    "Love Candle": "Love Candle",
    "Cookie Heart": "Cookie Heart",
    "Desk Calendar": "Desk Calendar",
    "Jingle Bells": "Jingle Bells",
    "Snow Mittens": "Snow Mittens",
    "Voodoo Doll": "Voodoo Doll",
    "Mad Pumpkin": "Mad Pumpkin",
    "Hypno Lollipop": "Hypno Lollipop",
    "B-Day Candle": "B-Day Candle",
    "Bunny Muffin": "Bunny Muffin",
    "Astral Shard": "Astral Shard",
    "Flying Broom": "Flying Broom",
    "Crystal Ball": "Crystal Ball",
    "Eternal Candle": "Eternal Candle",
    "Swiss Watch": "Swiss Watch",
    "Ginger Cookie": "Ginger Cookie",
    "Mini Oscar": "Mini Oscar",
    "Lol Pop": "Lol Pop",
    "Ion Gem": "Ion Gem",
    "Star Notepad": "Star Notepad",
    "Loot Bag": "Loot Bag",
    "Love Potion": "Love Potion",
    "Toy Bear": "Toy Bear",
    "Diamond Ring": "Diamond Ring",
    "Sakura Flower": "Sakura Flower",
    "Sleigh Bell": "Sleigh Bell",
    "Top Hat": "Top Hat",
    "Record Player": "Record Player",
    "Winter Wreath": "Winter Wreath",
    "Snow Globe": "Snow Globe",
    "Electric Skull": "Electric Skull",
    "Tama Gadget": "Tama Gadget",
    "Candy Cane": "Candy Cane",
    "Neko Helmet": "Neko Helmet",
    "Jack-in-the-Box": "Jack-in-the-Box",
    "Easter Egg": "Easter Egg",
    "Bonded Ring": "Bonded Ring",
    "Pet Snake": "Pet Snake",
    "Snake Box": "Snake Box",
    "Xmas Stocking": "Xmas Stocking",
    "Big Year": "Big Year",
    "Holiday Drink": "Holiday Drink",
    "Gem Signet": "Gem Signet",
    "Light Sword": "Light Sword",
    "Restless Jar": "Restless Jar",
    "Nail Bracelet": "Nail Bracelet",
    "Heroic Helmet": "Heroic Helmet",
    "Bow Tie": "Bow Tie"
  }
};

interface MarketplaceSearchRequest {
  giftName: string;
  marketplace: MarketplaceType;
  options?: {
    includeAllMarketplaces?: boolean;
    preferredMarketplace?: MarketplaceType;
  };
}

interface MarketplaceSearchResult {
  gifts: Gift[];
  totalFound: number;
  marketplacesSearched: MarketplaceType[];
  errors: Array<{
    marketplace: MarketplaceType;
    error: string;
  }>;
}

class UnifiedMarketplaceService {
  // Get available collections for a marketplace
  getAvailableCollections(marketplace: MarketplaceType): Record<string, string> {
    return MARKETPLACE_COLLECTIONS[marketplace] || {};
  }

  // Get all available collections across marketplaces
  getAllAvailableCollections(): Array<{
    name: string;
    marketplaces: MarketplaceType[];
  }> {
    const collectionsMap = new Map<string, MarketplaceType[]>();

    Object.entries(MARKETPLACE_COLLECTIONS).forEach(([marketplace, collections]) => {
      Object.keys(collections).forEach(collectionName => {
        if (!collectionsMap.has(collectionName)) {
          collectionsMap.set(collectionName, []);
        }
        collectionsMap.get(collectionName)!.push(marketplace as MarketplaceType);
      });
    });

    return Array.from(collectionsMap.entries()).map(([name, marketplaces]) => ({
      name,
      marketplaces
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Search gifts on a specific marketplace
  async searchOnMarketplace(
    giftName: string, 
    marketplace: MarketplaceType
  ): Promise<ApiResponse<Gift[]>> {
    try {
      console.log(`Searching for "${giftName}" on ${marketplace}`);

      switch (marketplace) {
        case 'tonnel':
          return await apiService.searchGiftsByName(giftName);
          
        case 'portals':
          return await portalsApiService.getAllCollectionNfts(giftName);
          
        default:
          return {
            success: false,
            data: [],
            error: `Unsupported marketplace: ${marketplace}`,
            marketplace
          };
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "Search failed",
        marketplace
      };
    }
  }

  // Search across multiple marketplaces
  async searchAcrossMarketplaces(
    request: MarketplaceSearchRequest
  ): Promise<MarketplaceSearchResult> {
    const { giftName, marketplace, options = {} } = request;
    const marketplacesToSearch: MarketplaceType[] = [];
    const results: Gift[] = [];
    const errors: Array<{ marketplace: MarketplaceType; error: string }> = [];

    // Determine which marketplaces to search
    if (options.includeAllMarketplaces) {
      marketplacesToSearch.push('tonnel', 'portals');
    } else {
      marketplacesToSearch.push(marketplace);
    }

    // Filter marketplaces that have the requested collection
    const availableMarketplaces = marketplacesToSearch.filter(mp => 
      Object.keys(this.getAvailableCollections(mp)).includes(giftName)
    );

    if (availableMarketplaces.length === 0) {
      errors.push({
        marketplace: marketplace,
        error: `Collection "${giftName}" not available on selected marketplace(s)`
      });
      
      return {
        gifts: [],
        totalFound: 0,
        marketplacesSearched: [],
        errors
      };
    }

    // Search each marketplace
    const searchPromises = availableMarketplaces.map(async (mp) => {
      try {
        const response = await this.searchOnMarketplace(giftName, mp);
        
        if (response.success) {
          return {
            marketplace: mp,
            gifts: response.data,
            success: true
          };
        } else {
          errors.push({
            marketplace: mp,
            error: response.error || 'Unknown error'
          });
          return {
            marketplace: mp,
            gifts: [],
            success: false
          };
        }
      } catch (error) {
        errors.push({
          marketplace: mp,
          error: error instanceof Error ? error.message : 'Search failed'
        });
        return {
          marketplace: mp,
          gifts: [],
          success: false
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    
    // Combine results
    searchResults.forEach(result => {
      if (result.success) {
        results.push(...result.gifts);
      }
    });

    // Sort by price if we have results from multiple marketplaces
    if (options.includeAllMarketplaces && results.length > 0) {
      results.sort((a, b) => a.price - b.price);
    }

    return {
      gifts: results,
      totalFound: results.length,
      marketplacesSearched: availableMarketplaces,
      errors
    };
  }

  // Get marketplace statistics
  async getMarketplaceStatistics(
    giftName: string,
    marketplaces: MarketplaceType[] = ['tonnel', 'portals']
  ): Promise<Array<{
    marketplace: MarketplaceType;
    totalListings: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    isAvailable: boolean;
  }>> {
    const statistics = [];

    for (const marketplace of marketplaces) {
      try {
        const isAvailable = Object.keys(this.getAvailableCollections(marketplace)).includes(giftName);
        
        if (!isAvailable) {
          statistics.push({
            marketplace,
            totalListings: 0,
            averagePrice: 0,
            minPrice: 0,
            maxPrice: 0,
            isAvailable: false
          });
          continue;
        }

        const response = await this.searchOnMarketplace(giftName, marketplace);
        
        if (response.success && response.data.length > 0) {
          const gifts = response.data;
          const prices = gifts.map(g => g.price).filter(p => p > 0);
          
          statistics.push({
            marketplace,
            totalListings: gifts.length,
            averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
            minPrice: prices.length > 0 ? Math.min(...prices) : 0,
            maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
            isAvailable: true
          });
        } else {
          statistics.push({
            marketplace,
            totalListings: 0,
            averagePrice: 0,
            minPrice: 0,
            maxPrice: 0,
            isAvailable: true
          });
        }
      } catch (error) {
        console.error(`Failed to get statistics for ${marketplace}:`, error);
        statistics.push({
          marketplace,
          totalListings: 0,
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          isAvailable: false
        });
      }
    }

    return statistics;
  }

  // Test connectivity to all marketplaces
  async testAllMarketplaces(): Promise<Array<{
    marketplace: MarketplaceType;
    connected: boolean;
    error?: string;
  }>> {
    const results = [];

    // Test Tonnel
    try {
      const tonnelResponse = await apiService.getPageGifts({ limit: 1 });
      results.push({
        marketplace: 'tonnel' as MarketplaceType,
        connected: tonnelResponse.success,
        error: tonnelResponse.error
      });
    } catch (error) {
      results.push({
        marketplace: 'tonnel' as MarketplaceType,
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    }

    // Test Portals
    try {
      const portalsResponse = await portalsApiService.testConnection();
      results.push({
        marketplace: 'portals' as MarketplaceType,
        connected: portalsResponse.success,
        error: portalsResponse.error
      });
    } catch (error) {
      results.push({
        marketplace: 'portals' as MarketplaceType,
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    }

    return results;
  }
}

export const unifiedMarketplaceService = new UnifiedMarketplaceService();