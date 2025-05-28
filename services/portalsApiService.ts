// src/services/portalsApiService.ts

import { Gift, PortalsNFT, PortalsSearchResponse, PortalsFilterParams, ApiResponse } from "@/types/gift";

class PortalsApiService {
    private baseUrl = "https://market.portals.tg/api";
    private fragmentUrl = "https://nft.fragment.com";
    private isAuthenticated = false;
    private authToken: string | null = null;

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

    // Generate TMA authorization header with proper format
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

            // Получаем все данные из WebApp
            const initData = webApp.initDataUnsafe;
            const rawInitData = webApp.initData;
            
            console.log('WebApp initData:', {
                initData,
                rawInitData: rawInitData.substring(0, 100) + '...'
            });

            // Парсим URL-encoded данные
            const params = new URLSearchParams(rawInitData);
            
            // Извлекаем все необходимые параметры
            const queryId = params.get('query_id');
            const authDate = params.get('auth_date');
            const hash = params.get('hash');
            const signature = params.get('signature');
            
            // Получаем user из initDataUnsafe или из params
            let userStr = params.get('user');
            if (!userStr && initData.user) {
                userStr = encodeURIComponent(JSON.stringify(initData.user));
            }

            console.log('Извлеченные параметры:', {
                hasQueryId: !!queryId,
                hasUser: !!userStr,
                hasAuthDate: !!authDate,
                hasHash: !!hash,
                hasSignature: !!signature
            });

            // Проверяем наличие критически важных параметров
            if (!queryId || !userStr || !authDate || !hash) {
                console.warn('Отсутствуют необходимые параметры, пытаемся извлечь из initDataUnsafe');
                
                // Альтернативный метод извлечения данных
                const alternativeParams = this.extractParamsFromInitDataUnsafe(initData, rawInitData);
                
                const finalQueryId = queryId || alternativeParams.queryId;
                const finalUser = userStr || alternativeParams.user;
                const finalAuthDate = authDate || alternativeParams.authDate;
                const finalHash = hash || alternativeParams.hash;
                const finalSignature = signature || alternativeParams.signature;

                if (!finalQueryId) {
                    throw new Error('query_id не найден в данных Telegram WebApp');
                }

                // Формируем заголовок с учетом signature
                let header = `tma query_id=${finalQueryId}&user=${finalUser}&auth_date=${finalAuthDate}`;
                
                if (finalSignature) {
                    header += `&signature=${finalSignature}`;
                }
                
                header += `&hash=${finalHash}`;
                
                console.log('Сформирован альтернативный заголовок авторизации');
                return header;
            }

            // Формируем заголовок в точном формате из curl
            let header = `tma query_id=${queryId}&user=${userStr}&auth_date=${authDate}`;
            
            if (signature) {
                header += `&signature=${signature}`;
            }
            
            header += `&hash=${hash}`;
            
            console.log('Сформирован заголовок авторизации:', {
                length: header.length,
                hasSignature: !!signature
            });

            return header;
        } catch (error) {
            console.error('Ошибка при генерации TMA auth:', error);
            throw error;
        }
    }

    // Альтернативный метод извлечения параметров
    private extractParamsFromInitDataUnsafe(initData: any, rawInitData: string): any {
        const result: any = {
            queryId: null,
            user: null,
            authDate: null,
            hash: null,
            signature: null
        };

        // Пытаемся найти query_id в разных местах
        if (initData.start_param) {
            // Иногда query_id может быть в start_param
            result.queryId = initData.start_param;
        }

        // User data
        if (initData.user) {
            result.user = encodeURIComponent(JSON.stringify(initData.user));
        }

        // Auth date
        result.authDate = initData.auth_date || Math.floor(Date.now() / 1000).toString();

        // Hash
        result.hash = initData.hash || this.generateHash(rawInitData);

        // Signature - может быть в разных местах
        if (initData.signature) {
            result.signature = initData.signature;
        }

        console.log('Альтернативное извлечение параметров:', result);
        return result;
    }

    // Генерация хеша для резервного случая
    private generateHash(data: string): string {
        // Простая хеш-функция
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    // Выполнить аутентификацию перед основными запросами
    private async authenticate(): Promise<boolean> {
        try {
            console.log('Выполняем аутентификацию на /api/users/auth');
            
            const authHeader = await this.generateAuthHeader();
            
            const response = await fetch(`${this.baseUrl}/users/auth`, {
                method: 'GET',
                headers: {
                    ...this.defaultHeaders,
                    authorization: authHeader
                },
                mode: 'cors'
            });

            if (response.ok) {
                console.log('Аутентификация успешна');
                this.isAuthenticated = true;
                this.authToken = authHeader;
                return true;
            } else {
                console.error('Ошибка аутентификации:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Детали ошибки:', errorText);
                return false;
            }
        } catch (error) {
            console.error('Исключение при аутентификации:', error);
            return false;
        }
    }

    private async makeRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            console.log('=== Начало запроса к Portals API ===');
            
            // Проверяем, аутентифицированы ли мы
            if (!this.isAuthenticated) {
                console.log('Требуется аутентификация, выполняем...');
                const authSuccess = await this.authenticate();
                if (!authSuccess) {
                    throw new Error('Не удалось выполнить аутентификацию в Portals API');
                }
            }

            const authHeader = this.authToken || await this.generateAuthHeader();
            
            const headers = {
                ...this.defaultHeaders,
                ...options.headers,
                authorization: authHeader
            };

            console.log('Отправка запроса к:', {
                url: `${this.baseUrl}${endpoint}`,
                method: options.method || 'GET'
            });

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers,
                mode: 'cors'
            });

            console.log('Получен ответ от API:', {
                status: response.status,
                statusText: response.statusText
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка API:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                
                // Если получили 401, сбрасываем аутентификацию
                if (response.status === 401) {
                    this.isAuthenticated = false;
                    this.authToken = null;
                }
                
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const result = await response.json();
            console.log('Успешный ответ API');

            return {
                success: true,
                data: result,
                marketplace: 'portals'
            };
        } catch (error) {
            console.error('Ошибка запроса к Portals API:', error);

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
        const giftNum = this.extractGiftNumber(nft.name) || parseInt(nft.token_id) || 0;

        const model = nft.attributes.find(attr => attr.trait_type.toLowerCase().includes('model'))?.value || '';
        const backdrop = nft.attributes.find(attr => attr.trait_type.toLowerCase().includes('backdrop'))?.value || '';
        const symbol = nft.attributes.find(attr => attr.trait_type.toLowerCase().includes('symbol'))?.value || '';

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
            seller: 0,
            limited: false,
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

                if (response.data.length < limit) {
                    hasMoreData = false;
                }

                currentOffset += limit;
                pageCount++;

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

    // Load gift animation from Fragment
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
            const authSuccess = await this.authenticate();
            return {
                success: authSuccess,
                data: authSuccess,
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

    // Reset authentication state
    resetAuth(): void {
        this.isAuthenticated = false;
        this.authToken = null;
        console.log('Состояние аутентификации сброшено');
    }
}

export const portalsApiService = new PortalsApiService();