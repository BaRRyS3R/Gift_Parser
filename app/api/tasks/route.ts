import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { supabaseServer } from "@/lib/supabaseServer";
import { taskService } from "@/lib/supabase_tasks";

export const GET = withAuth(async (request) => {
  try {
    const { user } = request;
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
    const tasks = await taskService.getTasksForUser(userData.id);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
});
