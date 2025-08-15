// src/app/api/user/profile/route.ts - Обновленный endpoint профиля с полными данными пользователя

import { NextRequest, NextResponse } from "next/server";

import {
  serverUserProfileService,
  type UserProfileData,
} from "@/lib/server/userProfileService";

// Response interface
interface ProfileResponse {
  success: boolean;
  data?: UserProfileData;
  error?: string;
}

/**
 * GET /api/user/profile
 * Retrieves complete user profile data including user stats, referrals and rankings
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ProfileResponse>> {
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

    // Get complete profile data including user stats, referrals and rankings
    const profileData =
      await serverUserProfileService.getUserProfileData(telegramIdNumber);

    return NextResponse.json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);

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

      if (error.message.includes("profile")) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch profile data",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve user profile",
      },
      { status: 500 },
    );
  }
}

