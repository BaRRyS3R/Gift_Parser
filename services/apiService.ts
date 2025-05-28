// src/services/apiService.ts

import { Gift, GiftFilterParams, ApiResponse } from "@/types/gift";

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
      const requestBody = data || { ref: "", authData: "" };

      // Detailed logging
      console.log("=== API Request Debug ===");
      console.log("URL:", `${this.baseUrl}${endpoint}`);
      console.log("Headers:", this.defaultHeaders);
      console.log("Request Body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this.defaultHeaders,
        body: JSON.stringify(requestBody),
      });

      console.log("Response Status:", response.status);
      console.log("Response Headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Error Response Body:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log("Success Response:", result);

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

  // Test with the original working filter format
  async getPageGiftsBasic(
    params: Partial<GiftFilterParams> = {},
  ): Promise<ApiResponse<Gift[]>> {
    const defaultParams: GiftFilterParams = {
      page: 1,
      limit: 30,
      sort: '{"message_post_time":-1,"gift_id":-1}',
      filter: '{"price":{"$exists":true},"buyer":{"$exists":false},"asset":"TON"}', // Original working filter
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

  // Simplified search without complex MongoDB operators
  async searchGiftsByNameSimple(searchTerm: string): Promise<ApiResponse<Gift[]>> {
    try {
      console.log("Starting simple search for:", searchTerm);

      // First, try to get all gifts with basic filter
      const allGiftsResponse = await this.getPageGiftsBasic({
        page: 1,
        limit: 100
      });

      if (!allGiftsResponse.success) {
        return allGiftsResponse;
      }

      // Filter client-side to avoid complex server-side queries
      const filteredGifts = allGiftsResponse.data.filter(gift =>
        gift.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      console.log(`Found ${filteredGifts.length} gifts matching "${searchTerm}"`);

      return {
        success: true,
        data: filteredGifts,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  }

  // Keep all other existing methods unchanged...
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
}

export const apiService = new ApiService();
