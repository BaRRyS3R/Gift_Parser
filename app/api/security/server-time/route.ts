// src/app/api/security/server-time/route.ts - Secure server time API endpoint

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
    try {
        // Get user ID from middleware-added header for authentication
        const userId = request.headers.get("x-user-id");
        const telegramId = request.headers.get("x-telegram-id");

        if (!userId || !telegramId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User authentication required",
                },
                { status: 401 },
            );
        }

        // Get current server timestamp using secure RPC function
        const { data, error } = await supabaseServer.rpc("get_current_timestamp");

        if (error) {
            console.error("Error getting server timestamp:", error);

            // Fallback to system time if RPC fails
            const fallbackTime = new Date().toISOString();
            console.log("Using fallback system time:", fallbackTime);

            return NextResponse.json({
                success: true,
                timestamp: fallbackTime,
                source: "fallback",
            });
        }

        console.log(`Server time retrieved for user ${telegramId}:`, data);

        return NextResponse.json({
            success: true,
            timestamp: data,
            source: "database",
        });
    } catch (error) {
        console.error("Server time API error:", error);

        // Return fallback time even on error to prevent blocking
        const fallbackTime = new Date().toISOString();

        return NextResponse.json({
            success: true,
            timestamp: fallbackTime,
            source: "fallback",
            warning: "Database time unavailable, using system time",
        });
    }
}