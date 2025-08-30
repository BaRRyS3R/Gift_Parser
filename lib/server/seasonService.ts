// src/lib/server/seasonService.ts - SIMPLIFIED: Only static season data

import { supabaseServer } from "@/lib/supabase_server";

// SIMPLIFIED: Only static season data interface
export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  prizes: string[];
  created_at: string;
  updated_at: string;
}

/**
 * SIMPLIFIED server-side season service - ONLY static season data from PostgreSQL
 * Leaderboard and user stats are handled by separate leaderboard system
 */
export const serverSeasonService = {
  /**
   * Get current active season - ONLY static data
   */
  async getCurrentSeason(): Promise<Season | null> {
    console.log("[SEASON_SERVICE] Fetching current static season data from PostgreSQL");
    
    const { data, error } = await supabaseServer
      .from("seasons")
      .select("*")
      .lte("start_date", new Date().toISOString())
      .gte("end_date", new Date().toISOString())
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching current season:", error);
      throw new Error("Failed to fetch current season");
    }

    if (data) {
      console.log(`[SEASON_SERVICE] Found current season: ${data.name} until ${data.end_date}`);
    } else {
      console.log("[SEASON_SERVICE] No active season found");
    }

    return data;
  },

  /**
   * Get season by ID - ONLY static data
   */
  async getSeasonById(seasonId: string): Promise<Season | null> {
    console.log(`[SEASON_SERVICE] Fetching season ${seasonId} static data from PostgreSQL`);
    
    const { data, error } = await supabaseServer
      .from("seasons")
      .select("*")
      .eq("id", seasonId)
      .single();

    if (error) {
      console.error("Error fetching season:", error);
      throw new Error("Failed to fetch season");
    }

    console.log(`[SEASON_SERVICE] Found season: ${data.name}`);
    return data;
  },

  /**
   * Check if there's an active season
   */
  async hasActiveSeason(): Promise<boolean> {
    const season = await this.getCurrentSeason();
    return !!season;
  },

  /**
   * Get all seasons (for admin purposes)
   */
  async getAllSeasons(): Promise<Season[]> {
    const { data, error } = await supabaseServer
      .from("seasons")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Error fetching all seasons:", error);
      throw new Error("Failed to fetch seasons");
    }

    return data || [];
  },

  /**
   * Create new season (for admin purposes)
   */
  async createSeason(seasonData: Omit<Season, 'id' | 'created_at' | 'updated_at'>): Promise<Season> {
    const { data, error } = await supabaseServer
      .from("seasons")
      .insert(seasonData)
      .select()
      .single();

    if (error) {
      console.error("Error creating season:", error);
      throw new Error("Failed to create season");
    }

    console.log(`[SEASON_SERVICE] Created new season: ${data.name}`);
    return data;
  },

  /**
   * Update season (for admin purposes)
   */
  async updateSeason(seasonId: string, updates: Partial<Omit<Season, 'id' | 'created_at'>>): Promise<Season> {
    const { data, error } = await supabaseServer
      .from("seasons")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", seasonId)
      .select()
      .single();

    if (error) {
      console.error("Error updating season:", error);
      throw new Error("Failed to update season");
    }

    console.log(`[SEASON_SERVICE] Updated season: ${data.name}`);
    return data;
  },

  /**
   * Delete season (for admin purposes)
   */
  async deleteSeason(seasonId: string): Promise<void> {
    const { error } = await supabaseServer
      .from("seasons")
      .delete()
      .eq("id", seasonId);

    if (error) {
      console.error("Error deleting season:", error);
      throw new Error("Failed to delete season");
    }

    console.log(`[SEASON_SERVICE] Deleted season: ${seasonId}`);
  }
};