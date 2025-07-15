// src/app/api/security/update-trust-score/route.ts - Update user trust score

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { supabaseServer } from "@/lib/supabaseServer";

export const POST = withAuth(async (request) => {
  try {
    const { user } = request;
    const { scoreChange } = await request.json();
    if (typeof scoreChange !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid scoreChange" },
        { status: 400 },
      );
    }
    // Получаем пользователя
    const { data: userData, error: userError } = await supabaseServer
      .from("users")
      .select("trust_score")
      .eq("telegram_id", user.telegramId)
      .maybeSingle();
    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }
    const newScore = (userData.trust_score || 50) + scoreChange;
    const { error: updateError } = await supabaseServer
      .from("users")
      .update({ trust_score: newScore })
      .eq("telegram_id", user.telegramId);
    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, trustScore: newScore });
  } catch (error) {
    console.error("Error updating trust score:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update trust score" },
      { status: 500 },
    );
  }
});
