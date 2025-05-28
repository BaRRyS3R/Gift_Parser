// src/services/apiService.ts

import { Gift, GiftFilterParams, ApiResponse } from "@/types/gift";

// Updated apiService.ts with correct API format

class ApiService {
  private baseUrl = "https://gifts2.tonnel.network/api";
  private defaultHeaders = {
    accept: "*/*",
    "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/json",
    origin: "https://marketplace.tonnel.network",
    priority: "u=1, i",
    referer: "https://marketplace.tonnel.network/",
    "sec-ch-ua": '"Chromium";v="134", "Not:A-Brand";v="24", "Opera";v="119"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0",
  };

  private async makeRequest<T>(
    endpoint: string,
    data?: any,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this.defaultHeaders,
        body: JSON.stringify(data || { ref: "", authData: "" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);

      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private processGiftsData(rawData: any): Gift[] {
    if (!Array.isArray(rawData)) {
      return [];
    }

    return rawData.map((item) => ({
      name: item.name || "Unknown Gift",
      num: item.num || 0,
      gift_num: item.gift_num || item.num || 0,
      model: item.model || "",
      backdrop: item.backdrop || "",
      symbol: item.symbol || "",
      price: item.price || 0,
      asset: item.asset || "TON",
      message_id: item.message_id || 0,
      customEmojiId: item.customEmojiId || "",
      modelLink: item.modelLink || "",
      fullData: item.fullData || {},
      status: item.status || "unknown",
      seller: item.seller || 0,
      limited: item.limited || false,
      auction: item.auction || null,
      export_at: item.export_at || "",
      bundleData: item.bundleData || null,
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getPageGifts(
    params: Partial<GiftFilterParams> = {},
  ): Promise<ApiResponse<Gift[]>> {
    const defaultParams: GiftFilterParams = {
      page: 1,
      limit: 30, // Reduced from 50 to match API limit
      sort: '{"message_post_time":-1,"gift_id":-1}',
      filter: '{"price":{"$exists":true},"buyer":{"$exists":false},"asset":"TON"}',
      ref: 0,
      price_range: null,
      user_auth: "",
    };

    const requestData = { ...defaultParams, ...params };

    const response = await this.makeRequest<Gift[]>("/pageGifts", requestData);

    if (response.success) {
      const processedGifts = this.processGiftsData(response.data);

      return {
        success: true,
        data: processedGifts,
      };
    }

    return response;
  }

  async searchGiftsByName(searchTerm: string): Promise<ApiResponse<Gift[]>> {
    try {
      const searchFilter = {
        price: { $exists: true },
        buyer: { $exists: false },
        gift_name: searchTerm,
        asset: "TON"
      };

      const requestData: GiftFilterParams = {
        page: 1,
        limit: 30,
        sort: '{"message_post_time":-1,"gift_id":-1}',
        filter: JSON.stringify(searchFilter),
        ref: 0,
        price_range: null,
        user_auth: "",
      };

      let allFoundGifts: Gift[] = [];
      let currentPage = 1;
      let hasMoreData = true;
      let consecutiveEmptyPages = 0;
      const maxConsecutiveEmptyPages = 3; // Stop after 3 consecutive empty pages

      console.log(`Starting comprehensive search for: ${searchTerm}`);

      // Continue loading until no more data is available
      while (hasMoreData && consecutiveEmptyPages < maxConsecutiveEmptyPages) {
        const searchData = { ...requestData, page: currentPage };

        console.log(`Loading page ${currentPage} for ${searchTerm}...`);

        const response = await this.makeRequest<Gift[]>("/pageGifts", searchData);

        if (!response.success) {
          console.error(`Page ${currentPage} failed:`, response.error);
          break;
        }

        if (!response.data || response.data.length === 0) {
          consecutiveEmptyPages++;
          console.log(`Page ${currentPage} returned no data. Empty pages: ${consecutiveEmptyPages}`);

          if (consecutiveEmptyPages >= maxConsecutiveEmptyPages) {
            hasMoreData = false;
            break;
          }
        } else {
          consecutiveEmptyPages = 0; // Reset counter when data is found
          const processedGifts = this.processGiftsData(response.data);
          allFoundGifts.push(...processedGifts);

          console.log(`Page ${currentPage}: Found ${processedGifts.length} gifts. Total: ${allFoundGifts.length}`);

          // If page returned less than the limit, we might be at the end
          if (processedGifts.length < 30) {
            hasMoreData = false;
          }
        }

        currentPage++;

        // Rate limiting to avoid overwhelming the API
        await this.delay(200);

        // Safety check to prevent runaway requests
        if (currentPage > 200) {
          console.warn('Reached maximum page limit (200) for safety');
          break;
        }
      }

      console.log(`Search completed for ${searchTerm}. Total gifts found: ${allFoundGifts.length}`);

      return {
        success: true,
        data: allFoundGifts,
      };
    } catch (error) {
      console.error('Search failed:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  }

  // New method for paginated loading in the UI
  async searchGiftsWithPagination(
    searchTerm: string,
    page: number = 1
  ): Promise<ApiResponse<{ gifts: Gift[], hasMore: boolean, totalLoaded: number }>> {
    try {
      const searchFilter = {
        price: { $exists: true },
        buyer: { $exists: false },
        gift_name: searchTerm,
        asset: "TON"
      };

      const requestData: GiftFilterParams = {
        page,
        limit: 30,
        sort: '{"message_post_time":-1,"gift_id":-1}',
        filter: JSON.stringify(searchFilter),
        ref: 0,
        price_range: null,
        user_auth: "",
      };

      const response = await this.makeRequest<Gift[]>("/pageGifts", requestData);

      if (!response.success) {
        return {
          success: false,
          data: { gifts: [], hasMore: false, totalLoaded: 0 },
          error: response.error
        };
      }

      const processedGifts = this.processGiftsData(response.data || []);
      const hasMore = processedGifts.length === 30;

      return {
        success: true,
        data: {
          gifts: processedGifts,
          hasMore,
          totalLoaded: processedGifts.length
        }
      };
    } catch (error) {
      return {
        success: false,
        data: { gifts: [], hasMore: false, totalLoaded: 0 },
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  }

  async getGiftData(giftId: number): Promise<ApiResponse<Gift>> {
    const requestData = {
      ref: "",
      authData: "",
    };

    return await this.makeRequest<Gift>(`/giftData/${giftId}`, requestData);
  }

  async getAllAvailableGifts(
    maxPages: number = 10,
  ): Promise<ApiResponse<Gift[]>> {
    const allGifts: Gift[] = [];
    let currentPage = 1;
    let hasMoreData = true;

    try {
      while (hasMoreData && currentPage <= maxPages) {
        const response = await this.getPageGifts({
          page: currentPage,
          limit: 30, // Use approved limit
        });

        if (!response.success || !response.data || response.data.length === 0) {
          hasMoreData = false;
          break;
        }

        allGifts.push(...response.data);

        // If we got less than the limit, we've reached the end
        if (response.data.length < 30) {
          hasMoreData = false;
        }

        currentPage++;
        await this.delay(1000);
      }

      return {
        success: true,
        data: allGifts,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "Failed to fetch all gifts",
      };
    }
  }

  async getGiftsStatistics(): Promise<ApiResponse<any>> {
    try {
      const response = await this.getPageGifts({ limit: 1 });

      if (response.success) {
        return {
          success: true,
          data: {
            totalAvailable: 0,
            averagePrice: 0,
            lastUpdate: new Date().toISOString(),
          },
        };
      }

      return response;
    } catch (error) {
      return {
        success: false,
        data: null,
        error: "Failed to get statistics",
      };
    }
  }
}

export const apiService = new ApiService();