// src/app/api/shop/create-invoice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverUserService } from '@/lib/supabase_server';
import { PRODUCTS, type ProductType } from '@/types/purchases';

interface CreateInvoiceRequest {
    productType: ProductType;
    initData?: string;
}

interface CreateInvoiceResponse {
    success: boolean;
    invoiceUrl?: string;
    product?: {
        type: ProductType;
        title: string;
        description: string;
        price: number;
        attempts_bonus?: number;
        is_instant_reset?: boolean;
    };
    payload?: string;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateInvoiceResponse>> {
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
        let requestBody: CreateInvoiceRequest;
        try {
            requestBody = await request.json();
        } catch (error) {
            console.error('Error parsing request body:', error);
            return NextResponse.json(
                { success: false, error: 'Invalid request body' },
                { status: 400 }
            );
        }

        const { productType, initData } = requestBody;

        // Validate product type
        if (!productType || !PRODUCTS[productType as ProductType]) {
            return NextResponse.json(
                { success: false, error: 'Invalid product type' },
                { status: 400 }
            );
        }

        // Get user data
        const userData = await serverUserService.findByTelegramId(telegramIdNumber);
        if (!userData) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Prepare initData for PHP backend
        let finalInitData: string;
        if (initData) {
            finalInitData = initData;
        } else {
            const userObject = {
                id: userData.telegram_id,
                first_name: userData.first_name,
                last_name: userData.last_name || undefined,
                username: userData.username || undefined,
                is_premium: userData.is_premium,
            };

            const initDataParams = new URLSearchParams();
            initDataParams.append('user', JSON.stringify(userObject));
            initDataParams.append('auth_date', Math.floor(Date.now() / 1000).toString());
            finalInitData = initDataParams.toString();
        }

        // Get PHP backend URL
        const phpBackendUrl = process.env.NEXT_PUBLIC_PHP_BACKEND_URL;
        if (!phpBackendUrl) {
            console.error('PHP_BACKEND_URL not configured');
            return NextResponse.json(
                { success: false, error: 'Payment service not available' },
                { status: 503 }
            );
        }

        // Call PHP backend to create invoice
        const response = await fetch(`${phpBackendUrl}/create_invoice.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                initData: finalInitData,
                productType,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('PHP backend error:', response.status, errorText);
            return NextResponse.json(
                { success: false, error: 'Failed to create invoice' },
                { status: 500 }
            );
        }

        const result = await response.json();

        if (!result.success) {
            console.error('PHP backend returned error:', result.error);
            return NextResponse.json(
                { success: false, error: result.error || 'Failed to create invoice' },
                { status: 400 }
            );
        }

        console.log(`Invoice created for user ${telegramIdNumber}: ${productType}`);

        return NextResponse.json({
            success: true,
            invoiceUrl: result.invoice_url,
            product: result.product,
            payload: result.payload,
        });

    } catch (error) {
        console.error('Error creating invoice:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create invoice'
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