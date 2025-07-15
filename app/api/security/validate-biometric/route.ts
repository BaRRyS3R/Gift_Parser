// src/app/api/security/validate-biometric/route.ts - Validate biometric authentication

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";

export const POST = withAuth(async (request) => {
  try {
    // Здесь должна быть серверная валидация биометрии (заглушка)
    // В реальном приложении — интеграция с внешним сервисом
    return NextResponse.json({ success: true, valid: true });
  } catch (error) {
    console.error("Error validating biometric:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate biometric" },
      { status: 500 },
    );
  }
});
