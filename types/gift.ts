// src/types/gift.ts

export interface Gift {
  name: string;
  num: number;
  gift_num?: number;
  model: string;
  backdrop: string;
  symbol: string;
  price: number;
  asset: string;
  message_id: number;
  customEmojiId: string;
  modelLink: string;
  fullData: any;
  status: string;
  seller: number;
  limited: boolean;
  auction: any;
  export_at: string;
  bundleData: any;
}

export interface GiftListResponse {
  gifts: Gift[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface GiftFilterParams {
  page: number;
  limit: number;
  sort: string;
  filter: string;
  ref: number;
  price_range: any;
  user_auth: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface GiftCharacteristics {
  model: {
    name: string;
    rarity: string;
  };
  backdrop: {
    name: string;
    rarity: string;
  };
  symbol: {
    name: string;
    rarity: string;
  };
}
