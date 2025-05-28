// Enhanced src/types/gift.ts

export type MarketplaceType = 'tonnel' | 'portals';

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

  // Additional fields for multi-marketplace support
  marketplace: MarketplaceType;
  marketplaceId?: string;
  marketplaceUrl?: string;
}

export interface PortalsNFT {
  id: string;
  collection: string;
  name: string;
  description?: string;
  image: string;
  animation_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string;
    rarity?: number;
  }>;
  owner: string;
  status: 'listed' | 'sold' | 'draft';
  created_at: string;
  updated_at: string;
  token_id: string;
  contract_address: string;
  metadata_url?: string;
  // Price information might be in a separate field or nested object
  listing?: {
    price: number;
    currency: string;
    expires_at?: string;
  };
}

export interface PortalsSearchResponse {
  data: PortalsNFT[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface TelegramWebAppAuth {
  query_id: string;
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code: string;
    is_premium?: boolean;
    allows_write_to_pm?: boolean;
    photo_url?: string;
  };
  auth_date: number;
  signature: string;
  hash: string;
}

export interface GiftListResponse {
  gifts: Gift[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  marketplace: MarketplaceType;
}

export interface GiftFilterParams {
  page: number;
  limit: number;
  sort: string;
  filter: string;
  ref: number;
  price_range: any;
  user_auth: string;
  marketplace?: MarketplaceType;
}

export interface PortalsFilterParams {
  offset: number;
  limit: number;
  filter_by_collections?: string;
  status?: 'listed' | 'sold' | 'all';
  sort_by?: 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc';
  min_price?: number;
  max_price?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  marketplace?: MarketplaceType;
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