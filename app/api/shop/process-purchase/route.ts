// src/app/api/shop/process-purchase/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverUserService } from '@/lib/supabase_server';
import { PRODUCTS, type ProductType } from '@/types/purchases';

interface ProcessPurchaseRequest {
    productType: ProductType;
    paymentResult: boolean;
    transactionId?: string;
}

interface ProcessPurchaseResponse {
    success: boolean;
    product?: {
        type: ProductType;
        title: string;
        attempts_bonus?: number;
        is_instant_reset?: boolean;
    };
    message?: string;
    updatedAttempts?: number;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ProcessPurchaseResponse>> {
    try {
        // Extract user info from middleware headers
        const telegramId = request.headers.get('X-Telegram-ID');
        const userId = request.headers.get('X-User-ID');

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User authentication required'
                },
                { status: 401 }
            );
        }

        const telegramIdNumber = parseInt(telegramId);
        if (isNaN(telegramIdNumber)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid user ID'
                },
                { status: 400 }
            );
        }

        // Parse request body
        let requestBody: ProcessPurchaseRequest;
        try {
            requestBody = await request.json();
        } catch (error) {
            return NextResponse.json(
                { success: false, error: 'Invalid request body' },
                { status: 400 }
            );
        }

        const { productType, paymentResult } = requestBody;

        // Validate product type
        if (!productType || !PRODUCTS[productType as ProductType]) {
            return NextResponse.json(
                { success: false, error: 'Invalid product type' },
                { status: 400 }
            );
        }

        // If payment was cancelled or failed, return early
        if (!paymentResult) {
            return NextResponse.json(
                { success: false, error: 'Payment was cancelled or failed' },
                { status: 400 }
            );
        }

        // Wait for webhook processing to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get updated user data
        const updatedUserData = await serverUserService.findByTelegramId(telegramIdNumber);
        if (!updatedUserData) {
            return NextResponse.json(
                { success: false, error: 'Failed to refresh user data' },
                { status: 500 }
            );
        }

        const product = PRODUCTS[productType as ProductType];

        console.log(`Purchase processed for user ${telegramIdNumber}: ${productType}, attempts: ${updatedUserData.attempts_remaining}`);

        return NextResponse.json({
            success: true,
            product: {
                type: productType,
                title: product.title,
                attempts_bonus: product.attempts_bonus,
                is_instant_reset: product.is_instant_reset,
            },
            message: product.is_instant_reset
                ? 'Attempts restored and cooldown reset!'
                : `Added ${product.attempts_bonus} attempt${(product.attempts_bonus || 0) > 1 ? 's' : ''}!`,
            updatedAttempts: updatedUserData.attempts_remaining,
        });

    } catch (error) {
        console.error('Error processing purchase:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to process purchase'
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}