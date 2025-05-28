// src/services/portalsApiService.ts

import { Gift, PortalsNFT, PortalsSearchResponse, PortalsFilterParams, ApiResponse, TelegramWebAppAuth } from "@/types/gift";

class PortalsApiService {
    private baseUrl = "https://market.portals.tg/api";
    private fragmentUrl = "https://nft.fragment.com";

    // Mock TMA auth data for development/testing
    private mockTmaAuth: TelegramWebAppAuth = {
        query_id: "AAE5oKwZAAAAADmgrBl6xPYF",
        user: {
            id: 430743609,
            first_name: "Aleksandr",
            last_name: "Andreev",
            username: "mrmrcrowley",
            language_code: "ru",
            is_premium: true,
            allows_write_to_pm: true,
            photo_url: "https://t.me/i/userpic/320/0NNjvHRtW06W-TF6gxxV72Ut8OqQdAXV4hrUaa0h038.svg"
        },
        auth_date: 1748447546,
        signature: "7_AgvhsATkd9ZNyJwO0a30BFEBXuHPBj5CsoCrO5i081Ft-R4eLS5W7fQF5IZJYo2jYW5M3hYd46Q7_1yOzyAw",
        hash: "1f233c6f1fd54fa9a6ef5bffeb6d72cafe6e3bde8e2df135a961409cc86a3e58"
    };

    private defaultHeaders = {
        accept: "application/json, text/plain, */*",
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        priority: "u=1, i",
        referer: "https://market.portals.tg/",
        "sec-ch-ua": '"Chromium";v="134", "Not:A-Brand";v="24", "Opera";v="119"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-fetch-storage-access": "active",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0"
    };

    // Generate TMA authorization header
    private generateAuthHeader(): string {
        try {
            // Try to get real TMA data from Telegram Web App if available
            if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                const webApp = (window as any).Telegram.WebApp;
                if (webApp.initData) {
                    return `tma ${webApp.initData}`;
                }
            }

            // Fallback to mock data for development
            const tmaData = this.mockTmaAuth;
            const queryString = `query_id=${tmaData.query_id}&user=${encodeURIComponent(JSON.stringify(tmaData.user))}&auth_date=${tmaData.auth_date}&signature=${tmaData.signature}&hash=${tmaData.hash}`;
            return `tma ${queryString}`;
        } catch (error) {
            console.warn('Failed to generate TMA auth, using mock data:', error);
            const tmaData = this.mockTmaAuth;
            const queryString = `query_id=${tmaData.query_id}&user=${encodeURIComponent(JSON.stringify(tmaData.user))}&auth_date=${tmaData.auth_date}&signature=${tmaData.signature}&hash=${tmaData.hash}`;
            return `tma ${queryString}`;
        }
    }

    private async makeRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            const authHeader = this.generateAuthHeader();

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    ...this.defaultHeaders,
                    authorization: authHeader,
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const result = await response.json();

            return {
                success: true,
                data: result,
                marketplace: 'portals'
            };
        } catch (error) {
            console.error(`Portals API request failed for ${endpoint}:`, error);

            return {
                success: false,
                data: null as T,
                error: error instanceof Error ? error.message : "Unknown error",
                marketplace: 'portals'
            };
        }
    }

    // Convert Portals NFT to Gift format
    private convertPortalsNftToGift(nft: PortalsNFT): Gift {
        // Extract gift number from name or ID
        const giftNum = this.extractGiftNumber(nft.name) || parseInt(nft.token_id) || 0;

        // Extract characteristics from attributes
        const model = nft.attributes.find(attr => attr.trait_type.toLowerCase().includes('model'))?.value || '';
        const backdrop = nft.attributes.find(attr => attr.trait_type.toLowerCase().includes('backdrop'))?.value || '';
        const symbol = nft.attributes.find(attr => attr.trait_type.toLowerCase().includes('symbol'))?.value || '';

        // Get price from listing info
        const price = nft.listing?.price || 0;
        const asset = nft.listing?.currency || 'TON';

        return {
            name: nft.collection,
            num: giftNum,
            gift_num: giftNum,
            model: model,
            backdrop: backdrop,
            symbol: symbol,
            price: price,
            asset: asset,
            message_id: parseInt(nft.id) || 0,
            customEmojiId: nft.id,
            modelLink: nft.animation_url || nft.image,
            fullData: nft,
            status: nft.status,
            seller: 0, // Not available in Portals data
            limited: false, // Determine from attributes if available
            auction: null,
            export_at: nft.created_at,
            bundleData: null,
            marketplace: 'portals',
            marketplaceId: nft.id,
            marketplaceUrl: `https://market.portals.tg/nft/${nft.id}`
        };
    }

    // Extract gift number from name string
    private extractGiftNumber(name: string): number | null {
        const match = name.match(/[-#](\d+)$/);
        return match ? parseInt(match[1]) : null;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Search NFTs by collection
    async searchGiftsByCollection(
        collectionName: string,
        params: Partial<PortalsFilterParams> = {}
    ): Promise<ApiResponse<Gift[]>> {
        try {
            const defaultParams: PortalsFilterParams = {
                offset: 0,
                limit: 20,
                filter_by_collections: collectionName,
                status: 'listed'
            };

            const searchParams = { ...defaultParams, ...params };

            // Build query string
            const queryParams = new URLSearchParams();
            Object.entries(searchParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value.toString());
                }
            });

            const endpoint = `/nfts/search?${queryParams.toString()}`;

            console.log(`Searching Portals for collection: ${collectionName}`);

            const response = await this.makeRequest<PortalsSearchResponse>(endpoint);

            if (response.success && response.data) {
                const gifts = response.data.data.map(nft => this.convertPortalsNftToGift(nft));

                return {
                    success: true,
                    data: gifts,
                    marketplace: 'portals'
                };
            }

            return {
                success: false,
                data: [],
                error: response.error,
                marketplace: 'portals'
            };
        } catch (error) {
            return {
                success: false,
                data: [],
                error: error instanceof Error ? error.message : "Search failed",
                marketplace: 'portals'
            };
        }
    }

    // Get all NFTs for a collection with pagination
    async getAllCollectionNfts(
        collectionName: string,
        maxPages: number = 50
    ): Promise<ApiResponse<Gift[]>> {
        const allGifts: Gift[] = [];
        let currentOffset = 0;
        const limit = 20;
        let hasMoreData = true;
        let pageCount = 0;

        try {
            console.log(`Starting comprehensive Portals search for: ${collectionName}`);

            while (hasMoreData && pageCount < maxPages) {
                const response = await this.searchGiftsByCollection(collectionName, {
                    offset: currentOffset,
                    limit: limit,
                    status: 'listed'
                });

                if (!response.success || !response.data || response.data.length === 0) {
                    hasMoreData = false;
                    break;
                }

                allGifts.push(...response.data);

                console.log(`Portals page ${pageCount + 1}: Found ${response.data.length} gifts. Total: ${allGifts.length}`);

                // Check if we have more data
                if (response.data.length < limit) {
                    hasMoreData = false;
                }

                currentOffset += limit;
                pageCount++;

                // Rate limiting
                await this.delay(300);
            }

            console.log(`Portals search completed for ${collectionName}. Total gifts found: ${allGifts.length}`);

            return {
                success: true,
                data: allGifts,
                marketplace: 'portals'
            };
        } catch (error) {
            return {
                success: false,
                data: [],
                error: error instanceof Error ? error.message : "Failed to fetch all NFTs",
                marketplace: 'portals'
            };
        }
    }

    // Get NFT details by ID
    async getNftDetails(nftId: string): Promise<ApiResponse<Gift>> {
        try {
            const endpoint = `/nfts/${nftId}`;
            const response = await this.makeRequest<PortalsNFT>(endpoint);

            if (response.success && response.data) {
                const gift = this.convertPortalsNftToGift(response.data);
                return {
                    success: true,
                    data: gift,
                    marketplace: 'portals'
                };
            }

            return {
                success: false,
                data: null as unknown as Gift,
                error: response.error,
                marketplace: 'portals'
            };
        } catch (error) {
            return {
                success: false,
                data: null as unknown as Gift,
                error: error instanceof Error ? error.message : "Failed to get NFT details",
                marketplace: 'portals'
            };
        }
    }

    // Load gift animation from Fragment (same as Tonnel)
    async loadGiftAnimation(giftName: string, giftNum: number): Promise<string | null> {
        try {
            const formattedName = giftName
                .toLowerCase()
                .replace(/\s+/g, "")
                .replace(/[^a-z0-9]/g, "");

            const animationUrl = `${this.fragmentUrl}/gift/${formattedName}-${giftNum}.lottie.json`;

            const response = await fetch(animationUrl, {
                method: "GET",
                mode: "cors",
                headers: {
                    Accept: "application/json",
                    Origin: "https://market.portals.tg",
                    Referer: "https://market.portals.tg/"
                },
            });

            if (response.ok) {
                return animationUrl;
            }

            return null;
        } catch (error) {
            console.warn(`Failed to load animation for ${giftName}-${giftNum}:`, error);
            return null;
        }
    }

    // Test connection to Portals API
    async testConnection(): Promise<ApiResponse<boolean>> {
        try {
            const response = await this.makeRequest<any>('/collections');
            return {
                success: response.success,
                data: response.success,
                marketplace: 'portals'
            };
        } catch (error) {
            return {
                success: false,
                data: false,
                error: "Failed to connect to Portals API",
                marketplace: 'portals'
            };
        }
    }
}

export const portalsApiService = new PortalsApiService();