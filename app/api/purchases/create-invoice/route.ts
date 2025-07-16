// src/app/api/purchases/create-invoice/route.ts - Production integration with PHP backend

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { userService } from "@/lib/supabase";
import { PRODUCTS, type ProductType } from "@/types/purchases";

// Get Telegram initData from request headers
async function extractInitData(request: Request): Promise<string> {
    try {
        // First try to get from request body
        const body = await request.clone().json();
        if (body.initData) {
            return body.initData;
        }

        // Fallback: construct from headers (set by middleware)
        const telegramId = request.headers.get("x-telegram-id");
        const userId = request.headers.get("x-user-id");

        if (!telegramId) {
            throw new Error("Telegram ID not available");
        }

        // Get user data to construct minimal initData
        const userData = await userService.findByTelegramId(parseInt(telegramId));
        if (!userData) {
            throw new Error("User not found");
        }

        // Construct minimal valid initData
        const userObject = {
            id: userData.telegram_id,
            first_name: userData.first_name,
            last_name: userData.last_name || undefined,
            username: userData.username || undefined,
            is_premium: userData.is_premium
        };

        const initDataParams = new URLSearchParams();
        initDataParams.append('user', JSON.stringify(userObject));
        initDataParams.append('auth_date', Math.floor(Date.now() / 1000).toString());

        return initDataParams.toString();
    } catch (error) {
        console.error("Error extracting initData:", error);
        throw new Error("Failed to prepare authentication data");
    }
}

export const POST = withAuth(async (request) => {
    try {
        const { user } = request;
        const { productType } = await request.json();

        // Validate input
        if (!productType) {
            return NextResponse.json(
                { success: false, error: "Product type is required" },
                { status: 400 },
            );
        }

        // Validate product type
        if (!PRODUCTS[productType as ProductType]) {
            return NextResponse.json(
                { success: false, error: "Invalid product type" },
                { status: 400 },
            );
        }

        // Get user data
        const userData = await userService.findByTelegramId(user.telegramId);
        if (!userData) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 },
            );
        }

        // Extract initData for PHP backend
        const initData = await extractInitData(request);

        // Get PHP backend URL
        const phpBackendUrl = process.env.NEXT_PUBLIC_PHP_BACKEND_URL;
        if (!phpBackendUrl) {
            console.error("PHP_BACKEND_URL not configured");
            return NextResponse.json(
                { success: false, error: "Payment service not available" },
                { status: 503 },
            );
        }

        // Call PHP backend to create invoice
        const response = await fetch(`${phpBackendUrl}/create_invoice.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                initData,
                productType,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("PHP backend error:", response.status, errorText);

            return NextResponse.json(
                { success: false, error: "Failed to create invoice" },
                { status: 500 },
            );
        }

        const result = await response.json();

        if (!result.success) {
            console.error("PHP backend returned error:", result.error);
            return NextResponse.json(
                { success: false, error: result.error || "Failed to create invoice" },
                { status: 400 },
            );
        }

        // Return invoice data
        return NextResponse.json({
            success: true,
            invoice_url: result.invoice_url,
            product: result.product,
            payload: result.payload,
        });

    } catch (error) {
        console.error("Error creating invoice:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to create invoice"
            },
            { status: 500 },
        );
    }
});