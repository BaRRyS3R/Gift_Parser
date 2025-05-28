// src/services/portalsApiService.ts

import { Gift, PortalsNFT, PortalsSearchResponse, PortalsFilterParams, ApiResponse } from "@/types/gift";

class PortalsApiService {
    private baseUrl = "https://market.portals.tg/api";
    private fragmentUrl = "https://nft.fragment.com";

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
    private async generateAuthHeader(): Promise<string> {
        try {
            console.log('=== Начало генерации заголовка авторизации ===');
            
            if (typeof window === 'undefined') {
                console.error('Ошибка: не в браузерном окружении');
                throw new Error('Not in browser environment');
            }

            const webApp = (window as any).Telegram?.WebApp;
            if (!webApp) {
                console.error('Ошибка: Telegram WebApp не найден');
                throw new Error('Telegram WebApp не доступен');
            }

            console.log('Состояние WebApp до инициализации:', {
                isInitialized: webApp.isInitialized,
                initData: webApp.initData,
                initDataUnsafe: webApp.initDataUnsafe,
                version: webApp.version,
                platform: webApp.platform
            });

            // Ждем инициализации WebApp
            if (!webApp.isInitialized) {
                console.log('Ожидание инициализации Telegram WebApp...');
                await new Promise<void>((resolve) => {
                    const checkInitialization = () => {
                        if (webApp.isInitialized) {
                            console.log('WebApp инициализирован');
                            resolve();
                        } else {
                            setTimeout(checkInitialization, 100);
                        }
                    };
                    checkInitialization();
                });
            }

            // Дополнительная проверка на наличие данных
            if (!webApp.initData) {
                console.error('Ошибка: данные инициализации недоступны');
                throw new Error('Данные инициализации Telegram WebApp недоступны');
            }

            console.log('Получены данные инициализации:', {
                initData: webApp.initData,
                initDataUnsafe: webApp.initDataUnsafe,
                rawInitData: webApp.initData
            });

            // Парсим данные инициализации
            const params = new URLSearchParams(webApp.initData);
            const queryId = params.get('query_id');
            const user = params.get('user');
            const authDate = params.get('auth_date');
            const signature = params.get('signature');
            const hash = params.get('hash');

            // Проверяем наличие всех необходимых параметров
            if (!queryId || !user || !authDate || !signature || !hash) {
                console.error('Отсутствуют необходимые параметры авторизации:', {
                    hasQueryId: !!queryId,
                    hasUser: !!user,
                    hasAuthDate: !!authDate,
                    hasSignature: !!signature,
                    hasHash: !!hash
                });
                throw new Error('Отсутствуют необходимые параметры авторизации');
            }

            console.log('Извлеченные параметры авторизации:', {
                queryId,
                user,
                authDate,
                signature,
                hash,
                rawParams: Object.fromEntries(params.entries())
            });

            // Формируем заголовок в точном формате
            const header = `tma query_id=${queryId}&user=${user}&auth_date=${authDate}&signature=${signature}&hash=${hash}`;
            
            console.log('Сгенерированный заголовок авторизации:', {
                header,
                rawHeader: header
            });

            console.log('=== Завершение генерации заголовка авторизации ===');

            return header;
        } catch (error) {
            console.error('Ошибка при генерации TMA auth:', {
                error,
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }

    private async makeRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            console.log('=== Начало запроса к Portals API ===');
            
            const authHeader = await this.generateAuthHeader();
            
            const headers = {
                ...this.defaultHeaders,
                ...options.headers,
                authorization: authHeader,
                referer: 'https://market.portals.tg/',
                origin: 'https://market.portals.tg'
            };

            console.log('Финальные заголовки запроса:', {
                headers: {
                    ...headers,
                    authorization: '***' // Маскируем для логов
                }
            });

            console.log('Отправка запроса к:', {
                url: `${this.baseUrl}${endpoint}`,
                method: options.method || 'GET'
            });

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers,
                credentials: 'include'
            });

            console.log('Получен ответ от API:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка API:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                    headers: Object.fromEntries(response.headers.entries()),
                    url: response.url
                });
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const result = await response.json();
            console.log('Успешный ответ API:', {
                endpoint,
                dataSize: JSON.stringify(result).length,
                hasData: !!result
            });

            console.log('=== Завершение запроса к Portals API ===');

            return {
                success: true,
                data: result,
                marketplace: 'portals'
            };
        } catch (error) {
            console.error('Ошибка запроса к Portals API:', {
                endpoint,
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack
                } : error
            });

            return {
                success: false,
                data: null as unknown as T,
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