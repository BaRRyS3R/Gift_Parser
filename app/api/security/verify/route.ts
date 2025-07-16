// src/app/api/security/verify/route.ts - Fixed verification processing endpoint

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authMiddleware";
import { securityProcessor } from "@/lib/securityMiddleware";

export const POST = withAuth(async (request) => {
    try {
        const { user } = request;
        const { token, method, payload } = await request.json();

        // Validate required parameters
        if (!token || !method || !payload) {
            return NextResponse.json(
                {
                    verified: false,
                    status: "error",
                    message: "Missing required parameters"
                },
                { status: 400 }
            );
        }

        // Validate user session
        if (!user.sessionId || !user.telegramId) {
            return NextResponse.json(
                {
                    verified: false,
                    status: "error",
                    message: "Invalid user session"
                },
                { status: 401 }
            );
        }

        let success = false;

        // Process different verification methods
        if (method === "interactive") {
            const { userInput, expectedOutput } = payload;
            if (!userInput || !expectedOutput) {
                return NextResponse.json(
                    {
                        verified: false,
                        status: "error",
                        message: "Invalid interactive verification payload"
                    },
                    { status: 400 }
                );
            }
            success = userInput.trim().toLowerCase() === expectedOutput.trim().toLowerCase();
        } else if (method === "biometric") {
            const { biometricResult } = payload;
            if (typeof biometricResult !== "boolean") {
                return NextResponse.json(
                    {
                        verified: false,
                        status: "error",
                        message: "Invalid biometric verification payload"
                    },
                    { status: 400 }
                );
            }
            success = biometricResult === true;
        } else {
            return NextResponse.json(
                {
                    verified: false,
                    status: "error",
                    message: "Unsupported verification method"
                },
                { status: 400 }
            );
        }

        // FIXED: Pass all required parameters including telegramId
        const result = await securityProcessor.processVerificationResult(
            user.sessionId,
            token,
            success,
            user.telegramId // Added missing telegramId parameter
        );

        console.log(`Verification ${success ? 'successful' : 'failed'} for session: ${user.sessionId.substring(0, 8)}...`);

        return NextResponse.json({
            verified: result,
            status: result ? "approved" : "rejected"
        });
    } catch (error) {
        console.error("Verification processing error:", error);
        return NextResponse.json(
            {
                verified: false,
                status: "error",
                message: "Internal server error during verification"
            },
            { status: 500 }
        );
    }
});