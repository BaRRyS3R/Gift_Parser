// src/app/api/security/evaluate/route.ts - Fixed security evaluation endpoint

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { securityProcessor } from "@/lib/securityMiddleware";

export const POST = withAuth(async (request) => {
    try {
        const { user } = request;
        const { action } = await request.json();

        // Validate user session data
        if (!user.sessionId || !user.telegramId) {
            return NextResponse.json(
                {
                    status: "error",
                    message: "Invalid user session"
                },
                { status: 401 }
            );
        }

        // FIXED: Handle optional userId properly
        if (!user.userId) {
            console.warn(`No userId resolved for session: ${user.sessionId.substring(0, 8)}...`);
            return NextResponse.json(
                {
                    status: "error",
                    message: "User not found in database"
                },
                { status: 404 }
            );
        }

        // Validate action parameter
        const actionType = action || "default_access";
        if (typeof actionType !== "string") {
            return NextResponse.json(
                {
                    status: "error",
                    message: "Invalid action parameter"
                },
                { status: 400 }
            );
        }

        // Log security evaluation request (without sensitive data)
        console.log(`Security evaluation requested for session: ${user.sessionId.substring(0, 8)}..., action: ${actionType}`);

        // Process security check through the centralized processor
        const decision = await securityProcessor.processSecurityCheck(
            request,
            user.sessionId,
            user.telegramId
        );

        // Prepare response based on security decision
        const response = {
            status: decision.action,
            ...(decision.action === "require_verification" && {
                method: decision.verificationMethod,
                token: decision.sessionToken,
                expires: decision.expiresAt
            })
        };

        // Log decision (without exposing sensitive details)
        console.log(`Security decision for session ${user.sessionId.substring(0, 8)}...: ${decision.action}`);

        return NextResponse.json(response);
    } catch (error) {
        console.error("Security evaluation error:", error);

        // Return conservative fallback - require verification on errors
        return NextResponse.json(
            {
                status: "require_verification",
                method: "interactive",
                token: Buffer.from(`fallback_${Date.now()}_${Math.random()}`).toString('base64'),
                expires: Date.now() + 5 * 60 * 1000
            },
            { status: 200 } // Return 200 with verification requirement
        );
    }
});