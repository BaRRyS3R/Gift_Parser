// src/app/api/security/evaluate/route.ts - Единый endpoint для security evaluation
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { securityProcessor } from "@/lib/securityMiddleware";

export const POST = withAuth(async (request) => {
    try {
        const { user } = request;
        const { action } = await request.json();

        // Обработка запроса через security processor
        const decision = await securityProcessor.processSecurityCheck(
            request,
            user.userId,
            user.telegramId
        );

        // Минимальный ответ без раскрытия внутренней логики
        const response = {
            status: decision.action,
            ...(decision.action === "require_verification" && {
                method: decision.verificationMethod,
                token: decision.sessionToken,
                expires: decision.expiresAt
            })
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Security evaluation error:", error);
        return NextResponse.json(
            { status: "error" },
            { status: 500 }
        );
    }
});