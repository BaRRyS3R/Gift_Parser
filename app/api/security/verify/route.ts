// src/app/api/security/verify/route.ts - Verification processing endpoint
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { securityProcessor } from "@/lib/securityMiddleware";

export const POST = withAuth(async (request) => {
    try {
        const { user } = request;
        const { token, method, payload } = await request.json();

        let success = false;

        // Обработка различных методов верификации
        if (method === "interactive") {
            const { userInput, expectedOutput } = payload;
            success = userInput === expectedOutput;
        } else if (method === "biometric") {
            const { biometricResult } = payload;
            success = biometricResult === true;
        }

        // Обработка результата через security processor
        const result = await securityProcessor.processVerificationResult(
            user.userId,
            token,
            success
        );

        return NextResponse.json({
            verified: result,
            status: result ? "approved" : "rejected"
        });
    } catch (error) {
        console.error("Verification processing error:", error);
        return NextResponse.json(
            { verified: false, status: "error" },
            { status: 500 }
        );
    }
});