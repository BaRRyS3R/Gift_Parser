// src/services/portalsApiService.ts
// Этот файл теперь работает с TGMRKT API вместо Portals

import { Gift, PortalsNFT, PortalsSearchResponse, PortalsFilterParams, ApiResponse } from "@/types/gift";

// Интерфейсы для TGMRKT API
interface TGMRKTAuthRequest {
    data: string;
    photo: string | null;
    appId: string | null;
}

interface TGMRKTAuthResponse {
    token: string;
    isFirstTime: boolean;
    giftId: string | null;
    giveawayId: string | null;
}

interface TGMRKTGift {
    id: string;
    exportDate: string;
    receivedDate: string;
    giftId: number;
    maxUpgradedCount: number;
    totalUpgradedCount: number;
    backdropColorsCenterColor: number;
    backdropColorsEdgeColor: number;
    backdropColorsTextColor: number;
    backdropColorsSymbolColor: number;
    backdropName: string;
    backdropRarityPerMille: number;
    modelName: string;
    modelRarityPerMille: number;
    modelStickerKey: string;
    modelStickerThumbnailKey: string;
    symbolName: string;
    symbolRarityPerMille: number;
    symbolStickerKey: string;
    symbolStickerThumbnailKey: string;
    name: string;
    number: number;
    title: string;
    collectionName: string;
    isOnAuction: boolean;
    isOnSale: boolean;
    salePrice: number;
    salesCount: number;
    promoteEndAt: string;
    isMine: boolean;
    isGiveawayReceived: boolean;
    nextResaleDate: string;
    nextTransferDate: string;
    isLocked: boolean;
    unlockDate: string;
    nextGiveAvailableAt: string;
    isOnPlatform: boolean;
}

interface TGMRKTSearchRequest {
    count: number;
    cursor: string;
    ordering: string;
    lowToHigh: boolean;
    query: string | null;
    number: number | null;
    collectionNames: string[];
    modelNames: string[];
    backdropNames: string[];
    symbolNames: string[];
    minPrice: number | null;
    maxPrice: number | null;
    mintable: boolean | null;
    promotedFirst: boolean;
}

interface TGMRKTSearchResponse {
    gifts: TGMRKTGift[];
    cursor?: string;
    hasMore?: boolean;
}

class TGMRKTApiService {
    private baseUrl = "https://api.tgmrkt.io/api/v1";
    private cdnUrl = "https://cdn.tgmrkt.io";
    private authToken: string | null = null;
    private isAuthenticated = false;

    private defaultHeaders = {
        accept: "*/*",
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        origin: "https://cdn.tgmrkt.io",
        priority: "u=1, i",
        referer: "https://cdn.tgmrkt.io/",
        "sec-ch-ua": '"Chromium";v="134", "Not:A-Brand";v="24", "Opera";v="119"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0"
    };

    // Генерация строки авторизации для TGMRKT
    private generateAuthDataString(): string | null {
        try {
            if (typeof window === 'undefined') {
                console.error('Ошибка: не в браузерном окружении');
                return null;
            }

            const webApp = (window as any).Telegram?.WebApp;
            if (!webApp) {
                console.error('Ошибка: Telegram WebApp не найден');
                return null;
            }

            const rawInitData = webApp.initData;

            if (!rawInitData) {
                console.error('Ошибка: initData отсутствует');
                return null;
            }

            console.log('Используем initData для TGMRKT:', rawInitData.substring(0, 50) + '...');

            return rawInitData;
        } catch (error) {
            console.error('Ошибка при генерации данных авторизации:', error);
            return null;
        }
    }

    // Аутентификация в TGMRKT
    private async authenticate(): Promise<boolean> {
        try {
            console.log('Выполняем аутентификацию в TGMRKT...');

            const authData = this.generateAuthDataString();
            if (!authData) {
                console.error('Не удалось получить данные для аутентификации');
                return false;
            }

            // Извлекаем URL фото пользователя из данных
            const webApp = (window as any).Telegram?.WebApp;
            const photoUrl = webApp?.initDataUnsafe?.user?.photo_url || null;

            const requestBody: TGMRKTAuthRequest = {
                data: "query_id=AAE5oKwZAAAAADmgrBnaaXe6&user=%7B%22id%22%3A430743609%2C%22first_name%22%3A%22Aleksandr%22%2C%22last_name%22%3A%22Andreev%22%2C%22username%22%3A%22mrmrcrowley%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2F0NNjvHRtW06W-TF6gxxV72Ut8OqQdAXV4hrUaa0h038.svg%22%7D&auth_date=1748459717&signature=DrZNGPzM0rtF-o-h86fedmHCpla1fRQTv3o7mvd_tqhHSSwCiDPgPUZ8HCArWW17qm-4-ag4EYUwGhRZPvL7DA&hash=fdd785384e7a562eaa675109888bb2697fe543064084a224079b7b42108b69c7",
                photo: "https://t.me/i/userpic/320/0NNjvHRtW06W-TF6gxxV72Ut8OqQdAXV4hrUaa0h038.svg",
                appId: null
            };

            const response = await fetch(`${this.baseUrl}/auth`, {
                method: 'POST',
                headers: this.defaultHeaders,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка аутентификации TGMRKT:', response.status, errorText);
                return false;
            }

            const authResponse: TGMRKTAuthResponse = await response.json();

            if (authResponse.token) {
                this.authToken = authResponse.token;
                this.isAuthenticated = true;
                console.log('Аутентификация TGMRKT успешна, получен токен');
                return true;
            }

            console.error('Токен не получен в ответе аутентификации');
            return false;
        } catch (error) {
            console.error('Исключение при аутентификации TGMRKT:', error);
            return false;
        }
    }

    // Основной метод для выполнения запросов
    private async makeRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            // Проверяем аутентификацию
            if (!this.isAuthenticated || !this.authToken) {
                console.log('Требуется аутентификация...');
                const authSuccess = await this.authenticate();
                if (!authSuccess) {
                    throw new Error('Не удалось выполнить аутентификацию в TGMRKT');
                }
            }

            const headers = {
                ...this.defaultHeaders,
                ...options.headers,
                authorization: this.authToken!
            };

            console.log(`Отправка запроса к TGMRKT: ${endpoint}`);

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка TGMRKT API:', response.status, errorText);

                // При ошибке 401 сбрасываем аутентификацию
                if (response.status === 401) {
                    this.isAuthenticated = false;
                    this.authToken = null;
                }

                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const result = await response.json();

            return {
                success: true,
                data: result,
                marketplace: 'portals' // Сохраняем для совместимости
            };
        } catch (error) {
            console.error('Ошибка запроса к TGMRKT:', error);
            return {
                success: false,
                data: null as unknown as T,
                error: error instanceof Error ? error.message : "Unknown error",
                marketplace: 'portals'
            };
        }
    }

    // Конвертация TGMRKT подарка в формат Gift
    private convertTGMRKTGiftToGift(tgGift: TGMRKTGift): Gift {
        // Конвертируем цену из нанотонов в тоны
        const priceInTON = tgGift.salePrice / 1000000000;

        // Форматируем редкость в проценты
        const formatRarity = (rarityPerMille: number) => {
            return `${(rarityPerMille / 10).toFixed(1)}%`;
        };

        return {
            name: tgGift.collectionName,
            num: tgGift.number,
            gift_num: tgGift.number,
            model: `${tgGift.modelName} (${formatRarity(tgGift.modelRarityPerMille)})`,
            backdrop: `${tgGift.backdropName} (${formatRarity(tgGift.backdropRarityPerMille)})`,
            symbol: `${tgGift.symbolName} (${formatRarity(tgGift.symbolRarityPerMille)})`,
            price: priceInTON,
            asset: 'TON',
            message_id: 0, // Не доступно в TGMRKT
            customEmojiId: tgGift.id,
            modelLink: `${this.cdnUrl}/${tgGift.modelStickerKey}`,
            fullData: tgGift,
            status: tgGift.isOnSale ? 'forsale' : 'notforsale',
            seller: 0, // Не доступно в TGMRKT
            limited: false,
            auction: tgGift.isOnAuction ? {} : null,
            export_at: tgGift.exportDate,
            bundleData: null,
            marketplace: 'portals', // Новый маркетплейс
            marketplaceId: tgGift.id,
            marketplaceUrl: `https://cdn.tgmrkt.io/gifts/${tgGift.id}`
        };
    }

    // Поиск подарков по коллекции
    async searchGiftsByCollection(
        collectionName: string,
        params: Partial<PortalsFilterParams> = {}
    ): Promise<ApiResponse<Gift[]>> {
        try {
            const searchRequest: TGMRKTSearchRequest = {
                count: params.limit || 20,
                cursor: "",
                ordering: "Price",
                lowToHigh: true,
                query: null,
                number: null,
                collectionNames: [collectionName],
                modelNames: [],
                backdropNames: [],
                symbolNames: [],
                minPrice: params.min_price || null,
                maxPrice: params.max_price || null,
                mintable: null,
                promotedFirst: false
            };

            // Применяем сортировку если указана
            if (params.sort_by) {
                switch (params.sort_by) {
                    case 'price_asc':
                        searchRequest.ordering = "Price";
                        searchRequest.lowToHigh = true;
                        break;
                    case 'price_desc':
                        searchRequest.ordering = "Price";
                        searchRequest.lowToHigh = false;
                        break;
                    case 'date_desc':
                        searchRequest.ordering = "Date";
                        searchRequest.lowToHigh = false;
                        break;
                    case 'date_asc':
                        searchRequest.ordering = "Date";
                        searchRequest.lowToHigh = true;
                        break;
                }
            }

            // Фильтр по статусу
            const endpoint = params.status === 'listed' ? '/gifts/saling' : '/gifts';

            const response = await this.makeRequest<TGMRKTSearchResponse>(endpoint, {
                method: 'POST',
                body: JSON.stringify(searchRequest)
            });

            if (response.success && response.data) {
                const gifts = response.data.gifts.map(g => this.convertTGMRKTGiftToGift(g));

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

    // Получение всех NFT коллекции с пагинацией
    async getAllCollectionNfts(
        collectionName: string,
        maxPages: number = 50
    ): Promise<ApiResponse<Gift[]>> {
        const allGifts: Gift[] = [];
        let cursor = "";
        let hasMoreData = true;
        let pageCount = 0;
        const limit = 50; // Увеличиваем лимит для TGMRKT

        try {
            console.log(`Начинаем поиск TGMRKT для коллекции: ${collectionName}`);

            while (hasMoreData && pageCount < maxPages) {
                const searchRequest: TGMRKTSearchRequest = {
                    count: limit,
                    cursor: cursor,
                    ordering: "Price",
                    lowToHigh: true,
                    query: null,
                    number: null,
                    collectionNames: [collectionName],
                    modelNames: [],
                    backdropNames: [],
                    symbolNames: [],
                    minPrice: null,
                    maxPrice: null,
                    mintable: null,
                    promotedFirst: false
                };

                const response = await this.makeRequest<TGMRKTSearchResponse>('/gifts/saling', {
                    method: 'POST',
                    body: JSON.stringify(searchRequest)
                });

                if (!response.success || !response.data || response.data.gifts.length === 0) {
                    hasMoreData = false;
                    break;
                }

                const gifts = response.data.gifts.map(g => this.convertTGMRKTGiftToGift(g));
                allGifts.push(...gifts);

                console.log(`TGMRKT страница ${pageCount + 1}: найдено ${gifts.length} подарков. Всего: ${allGifts.length}`);

                // Проверяем наличие дополнительных данных
                if (response.data.cursor) {
                    cursor = response.data.cursor;
                } else if (response.data.gifts.length < limit) {
                    hasMoreData = false;
                } else {
                    // Если курсор не предоставлен, но получено полное количество, продолжаем
                    cursor = `page_${pageCount + 1}`;
                }

                pageCount++;

                // Задержка между запросами
                await this.delay(200);
            }

            console.log(`Поиск TGMRKT завершен для ${collectionName}. Всего найдено подарков: ${allGifts.length}`);

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

    // Получение деталей подарка по ID
    async getNftDetails(nftId: string): Promise<ApiResponse<Gift>> {
        try {
            // TGMRKT может не иметь отдельного эндпоинта для деталей
            // В этом случае используем поиск по ID
            const response = await this.makeRequest<TGMRKTSearchResponse>('/gifts', {
                method: 'POST',
                body: JSON.stringify({
                    count: 1,
                    cursor: "",
                    ordering: "Price",
                    lowToHigh: true,
                    query: nftId,
                    number: null,
                    collectionNames: [],
                    modelNames: [],
                    backdropNames: [],
                    symbolNames: [],
                    minPrice: null,
                    maxPrice: null,
                    mintable: null,
                    promotedFirst: false
                })
            });

            if (response.success && response.data && response.data.gifts.length > 0) {
                const gift = this.convertTGMRKTGiftToGift(response.data.gifts[0]);
                return {
                    success: true,
                    data: gift,
                    marketplace: 'portals'
                };
            }

            return {
                success: false,
                data: null as unknown as Gift,
                error: 'Gift not found',
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

    // Загрузка анимации подарка
    async loadGiftAnimation(giftName: string, giftNum: number): Promise<string | null> {
        // TGMRKT использует другую структуру для анимаций
        // Нужно будет адаптировать под их формат
        try {
            const formattedName = giftName
                .toLowerCase()
                .replace(/\s+/g, "")
                .replace(/[^a-z0-9]/g, "");

            // Попробуем несколько вариантов URL
            const possibleUrls = [
                `${this.cdnUrl}/gifts/stickers/${formattedName}-${giftNum}.json`,
                `${this.cdnUrl}/gifts/animations/${formattedName}-${giftNum}.lottie.json`,
                `${this.cdnUrl}/gifts/${formattedName}/${giftNum}/animation.json`
            ];

            for (const url of possibleUrls) {
                try {
                    const response = await fetch(url, {
                        method: "GET",
                        mode: "cors",
                        headers: {
                            Accept: "application/json"
                        }
                    });

                    if (response.ok) {
                        return url;
                    }
                } catch (error) {
                    continue;
                }
            }

            return null;
        } catch (error) {
            console.warn(`Failed to load animation for ${giftName}-${giftNum}:`, error);
            return null;
        }
    }

    // Тестирование подключения
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
                error: "Failed to connect to TGMRKT API",
                marketplace: 'portals'
            };
        }
    }

    // Сброс аутентификации
    resetAuth(): void {
        this.isAuthenticated = false;
        this.authToken = null;
        console.log('Состояние аутентификации TGMRKT сброшено');
    }

    // Вспомогательный метод для задержки
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// Экспортируем под тем же именем для совместимости
export const portalsApiService = new TGMRKTApiService();