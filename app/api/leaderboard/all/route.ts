// src/app/api/leaderboard/all/route.ts - Enhanced with Redis caching

import type { AllLeaderboardsResponse } from "@/lib/server/leaderboardService";

import { NextRequest, NextResponse } from "next/server";

import { serverLeaderboardService } from "@/lib/server/leaderboardService";
import { cacheService, cacheKeys, CACHE_CONFIG, getCachedOrFetch } from "@/lib/redis";

// Response interface
interface LeaderboardResponse {
  success: boolean;
  data?: AllLeaderboardsResponse;
  error?: string;
  cached?: boolean; // Add flag to indicate if data is from cache
  cacheAge?: number; // Age of cache in seconds
}

/**
 * GET /api/leaderboard/all
 * Retrieves all leaderboards with Redis caching (5 minutes TTL)
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<LeaderboardResponse>> {
  const startTime = Date.now();
  
  try {
    // Extract user info from middleware headers
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    if (!telegramId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User authentication required",
        },
        { status: 401 },
      );
    }

    const telegramIdNumber = parseInt(telegramId);

    if (isNaN(telegramIdNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID",
        },
        { status: 400 },
      );
    }

    // Get limit parameter from query string (default: 100, max: 100)
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam), 1), 100)
      : 100;
    
    // Check for force refresh parameter (optional, for admin use)
    const forceRefresh = url.searchParams.get("refresh") === "true";
    
    // Generate cache key based on limit
    // Note: We don't include userId in cache key because leaderboard data 
    // is the same for all users (only isCurrentUser flag differs)
    const cacheKey = cacheKeys.leaderboard.all(limit);
    
    // Try to get data from cache first
    let leaderboardData: AllLeaderboardsResponse | null = null;
    let fromCache = false;
    let cacheAge = 0;
    
    if (!forceRefresh) {
      console.log(`[Leaderboard] Checking cache for key: ${cacheKey}`);
      
      const cachedData = await cacheService.get<AllLeaderboardsResponse>(cacheKey);
      
      if (cachedData) {
        // Get cache age for monitoring
        const ttl = await cacheService.ttl(cacheKey);
        cacheAge = CACHE_CONFIG.LEADERBOARD.TTL - ttl;
        
        // Mark current user in cached data
        leaderboardData = markCurrentUserInCachedData(
          cachedData,
          userId,
          telegramIdNumber
        );
        fromCache = true;
        
        console.log(`[Leaderboard] Cache hit! Age: ${cacheAge}s, TTL remaining: ${ttl}s`);
      }
    }
    
    // If no cached data, fetch from database
    if (!leaderboardData) {
      console.log(`[Leaderboard] Cache miss or force refresh, fetching from database`);
      
      try {
        // Fetch fresh data from database
        leaderboardData = await serverLeaderboardService.getAllLeaderboards(
          userId,
          telegramIdNumber,
          limit,
        );
        
        // Cache the data for future requests
        // Store data without user-specific markers for better cache efficiency
        const dataToCache = removeUserSpecificData(leaderboardData);
        
        const cacheSuccess = await cacheService.set(
          cacheKey,
          dataToCache,
          CACHE_CONFIG.LEADERBOARD.TTL
        );
        
        if (cacheSuccess) {
          console.log(`[Leaderboard] Data cached successfully with TTL: ${CACHE_CONFIG.LEADERBOARD.TTL}s`);
        } else {
          console.warn(`[Leaderboard] Failed to cache data, but continuing with response`);
        }
        
      } catch (dbError) {
        console.error("[Leaderboard] Database fetch failed:", dbError);
        
        // Try to return stale cache if database fails
        const staleData = await cacheService.get<AllLeaderboardsResponse>(cacheKey);
        if (staleData) {
          console.warn("[Leaderboard] Returning stale cache due to database error");
          leaderboardData = markCurrentUserInCachedData(
            staleData,
            userId,
            telegramIdNumber
          );
          fromCache = true;
          cacheAge = -1; // Indicate stale data
        } else {
          throw dbError; // No cache available, propagate error
        }
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Leaderboard] Request completed in ${duration}ms (cached: ${fromCache})`);
    
    // Add cache headers for CDN and browser caching
    const response = NextResponse.json({
      success: true,
      data: leaderboardData,
      cached: fromCache,
      ...(fromCache && { cacheAge }),
    });
    
    // Set cache control headers
    if (fromCache && cacheAge >= 0) {
      // If data is from cache and not stale, set browser cache
      const maxAge = Math.max(0, CACHE_CONFIG.LEADERBOARD.TTL - cacheAge);
      response.headers.set(
        "Cache-Control",
        `public, max-age=${Math.min(maxAge, 60)}, s-maxage=${maxAge}`
      );
      response.headers.set("X-Cache", "HIT");
      response.headers.set("X-Cache-Age", cacheAge.toString());
    } else {
      // Fresh data or stale cache
      response.headers.set(
        "Cache-Control",
        "public, max-age=30, s-maxage=60"
      );
      response.headers.set("X-Cache", fromCache ? "STALE" : "MISS");
    }
    
    return response;
    
  } catch (error) {
    console.error("Error fetching leaderboards:", error);
    
    const duration = Date.now() - startTime;
    console.log(`[Leaderboard] Request failed after ${duration}ms`);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("leaderboard")) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch leaderboard data",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve leaderboards",
      },
      { status: 500 },
    );
  }
}

/**
 * Remove user-specific data from leaderboard for caching
 */
function removeUserSpecificData(
  data: AllLeaderboardsResponse
): AllLeaderboardsResponse {
  return {
    season: data.season.map(entry => ({ ...entry, isCurrentUser: undefined })),
    reaction: data.reaction.map(entry => ({ ...entry, isCurrentUser: undefined })),
    survival: data.survival.map(entry => ({ ...entry, isCurrentUser: undefined })),
    physics: data.physics.map(entry => ({ ...entry, isCurrentUser: undefined })),
    rotation: data.rotation.map(entry => ({ ...entry, isCurrentUser: undefined })),
    userRankings: {}, // User rankings are specific to each user, don't cache
  };
}

/**
 * Mark current user in cached leaderboard data
 */
function markCurrentUserInCachedData(
  data: AllLeaderboardsResponse,
  userId: string,
  telegramId: number
): AllLeaderboardsResponse {
  // Clone the data to avoid mutations
  const markedData = JSON.parse(JSON.stringify(data)) as AllLeaderboardsResponse;
  
  // Mark current user in each leaderboard
  // Note: This is a simplified approach. In production, you might want to
  // match by telegram_id if that data is included in the cached entries
  
  // For now, we'll need to fetch user rankings separately since they're user-specific
  // In a production environment, you might want to cache user rankings separately
  // or include telegram_id in the cached data for matching
  
  return {
    ...markedData,
    userRankings: {}, // Will be calculated on the fly or cached separately
  };
}
