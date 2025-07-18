// src/app/api/profile/route.ts - Profile information API endpoint

import { NextRequest, NextResponse } from "next/server";

import {
  serverProfileService,
  type ProfileResponse,
} from "@/lib/server/profileService";

// Response interface for API
interface ProfileAPIResponse {
  success: boolean;
  data?: ProfileResponse;
  error?: string;
}

/**
 * GET /api/profile
 * Get complete profile information for authenticated user
 * Includes profile data, referrals, and rankings
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ProfileAPIResponse>> {
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

    console.log(`Fetching profile data for user: ${telegramIdNumber}`);

    // Get complete profile data
    const profileData =
      await serverProfileService.getProfileData(telegramIdNumber);

    console.log(`Successfully fetched profile for user: ${telegramIdNumber}`, {
      hasProfile: !!profileData.profile,
      hasReferrals: !!profileData.referrals,
      rankingsCount: Object.keys(profileData.rankings).length,
    });

    return NextResponse.json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);

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
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch profile data",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/profile
 * Update profile information for authenticated user
 */
export async function PATCH(
  request: NextRequest,
): Promise<NextResponse<ProfileAPIResponse>> {
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

    // Parse request body
    const updates = await request.json();

    console.log(`Updating profile for user: ${telegramIdNumber}`, updates);

    // Update profile
    const updatedProfile = await serverProfileService.updateProfile(
      telegramIdNumber,
      updates,
    );

    // Get complete updated profile data
    const profileData =
      await serverProfileService.getProfileData(telegramIdNumber);

    console.log(`Successfully updated profile for user: ${telegramIdNumber}`);

    return NextResponse.json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Error updating profile:", error);

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

      if (error.message.includes("Failed to update")) {
        return NextResponse.json(
          {
            success: false,
            error: "Update failed",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update profile",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/profile
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
