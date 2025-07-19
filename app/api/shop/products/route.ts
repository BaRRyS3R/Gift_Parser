// src/app/api/shop/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PRODUCTS } from '@/types/purchases';
import { serverUserService } from '@/lib/supabase_server';

interface ProductsResponse {
    success: boolean;
    products: typeof PRODUCTS;
    userInfo?: {
        telegram_id: number;
        attempts_remaining: number;
        is_premium: boolean;
    };
    error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<ProductsResponse>> {
    try {
        // Extract user info from middleware headers
        const telegramId = request.headers.get('X-Telegram-ID');
        const userId = request.headers.get('X-User-ID');

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    products: PRODUCTS,
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
                    products: PRODUCTS,
                    error: 'Invalid user ID'
                },
                { status: 400 }
            );
        }

        // Get user data for personalized information
        const userData = await serverUserService.findByTelegramId(telegramIdNumber);

        const response: ProductsResponse = {
            success: true,
            products: PRODUCTS,
            userInfo: userData ? {
                telegram_id: userData.telegram_id,
                attempts_remaining: userData.attempts_remaining,
                is_premium: userData.is_premium,
            } : undefined
        };

        console.log(`Shop products fetched for user ${telegramIdNumber}`);

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching shop products:', error);

        return NextResponse.json(
            {
                success: false,
                products: PRODUCTS,
                error: error instanceof Error ? error.message : 'Failed to fetch products'
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
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}