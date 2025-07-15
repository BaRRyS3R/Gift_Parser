// src/app/api/security/validate-captcha/route.ts - Validate captcha response

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";

export const POST = withAuth(async (request) => {
  try {
    const { challenge, answer, correctAnswer } = await request.json();
    // Пример: простая арифметика
    if (!challenge || !answer || !correctAnswer) {
      return NextResponse.json(
        { success: false, error: "Missing captcha data" },
        { status: 400 },
      );
    }
    if (answer.trim() === correctAnswer.trim()) {
      return NextResponse.json({ success: true, valid: true });
    } else {
      return NextResponse.json({ success: true, valid: false });
    }
  } catch (error) {
    console.error("Error validating captcha:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate captcha" },
      { status: 500 },
    );
  }
});
