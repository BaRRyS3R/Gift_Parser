import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { supabaseServer } from "@/lib/supabaseServer";
import { taskService } from "@/lib/supabase_tasks";

export const POST = withAuth(async (request) => {
  try {
    const { user } = request;
    const { taskId, telegramUserId } = await request.json();
    // Получаем пользователя
    const { data: userData, error: userError } = await supabaseServer
      .from("users")
      .select("id")
      .eq("telegram_id", user.telegramId)
      .maybeSingle();
    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }
    const result = await taskService.claimTaskReward(
      userData.id,
      taskId,
      telegramUserId,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Error claiming task reward:", error);
    return NextResponse.json(
      { success: false, error: "Failed to claim task reward" },
      { status: 500 },
    );
  }
});
