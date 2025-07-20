// src/app/api/nebula/gyroscope/route.ts - Исправленный Nebula Gyroscope Verification API

import { NextRequest, NextResponse } from "next/server";

import { serverBlockService } from "@/lib/server/blockService";

// Request interface
interface GyroscopeRequest {
    success: boolean;
    completedInTime: boolean;
    deviceSupported: boolean;
    movementData?: {
        totalMovements: number;
        requiredMovements: number;
        timeSpent: number;
        significantMovements: boolean;
    };
}

// Response interface
interface GyroscopeResponse {
    success: boolean;
    verified?: boolean;
    trustRestored?: boolean;
    blocked?: boolean;
    blockReason?: string;
    blockDuration?: string;
    error?: string;
}

// Map для отслеживания обрабатываемых запросов (предотвращение дублирования)
const processingRequests = new Map<string, boolean>();

/**
 * POST /api/nebula/gyroscope
 * Validate gyroscope verification for Nebula security system
 */
export async function POST(
    request: NextRequest,
): Promise<NextResponse<GyroscopeResponse>> {
    let requestKey: string | null = null;

    try {
        // Extract user info from middleware headers
        const telegramId = request.headers.get("X-Telegram-ID");
        const userId = request.headers.get("X-User-ID");

        if (!telegramId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User authentication required",
                },
                { status: 401 },
            );
        }

        const telegramIdNumber = parseInt(telegramId);

        if (isNaN(telegramIdNumber)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid user ID",
                },
                { status: 400 },
            );
        }

        // Создаем уникальный ключ для предотвращения дублирования запросов
        requestKey = `gyroscope_${telegramIdNumber}_${Date.now()}`;

        // Проверяем, не обрабатывается ли уже запрос для этого пользователя
        const existingRequestKey = Array.from(processingRequests.keys()).find(key =>
            key.startsWith(`gyroscope_${telegramIdNumber}_`)
        );

        if (existingRequestKey) {
            console.log(`Duplicate gyroscope request detected for user ${telegramIdNumber}, rejecting`);
            return NextResponse.json(
                {
                    success: false,
                    error: "Verification already in progress",
                },
                { status: 429 },
            );
        }

        // Отмечаем запрос как обрабатываемый
        processingRequests.set(requestKey, true);

        // Parse request body
        const body: GyroscopeRequest = await request.json();
        const {
            success: gyroscopeSuccess,
            completedInTime,
            deviceSupported,
            movementData,
        } = body;

        console.log(
            `Gyroscope verification attempt for user ${telegramIdNumber}:`,
            {
                success: gyroscopeSuccess,
                completedInTime,
                deviceSupported,
                movementData,
                timestamp: new Date().toISOString(),
            },
        );

        // Проверяем, не заблокирован ли пользователь уже
        const existingBlock = await serverBlockService.checkUserBlock(telegramIdNumber);
        if (existingBlock && existingBlock.isActive && existingBlock.timeRemainingSeconds > 0) {
            console.log(`User ${telegramIdNumber} is already blocked, rejecting verification attempt`);
            return NextResponse.json({
                success: true,
                verified: false,
                blocked: true,
                blockReason: "User is already blocked",
                blockDuration: "existing block",
            });
        }

        // Handle device not supported case
        if (!deviceSupported) {
            console.log(
                `Gyroscope not supported for user ${telegramIdNumber} - blocking for 1 month`,
            );

            const blockResult = await serverBlockService.handleVerificationFailure(
                userId,
                telegramIdNumber,
                "gyroscope",
                false, // Device not supported
            );

            if (blockResult.success) {
                return NextResponse.json({
                    success: true,
                    verified: false,
                    blocked: true,
                    blockReason: "Device does not support gyroscope verification",
                    blockDuration: "1 month",
                });
            } else {
                console.error(
                    "Failed to block user for unsupported device:",
                    blockResult.error,
                );

                return NextResponse.json(
                    {
                        success: false,
                        error: "Failed to process device compatibility check",
                    },
                    { status: 500 },
                );
            }
        }

        // Enhanced validation for movement data
        let isValidMovement = true;
        let validationDetails = "";

        if (gyroscopeSuccess && movementData) {
            const { totalMovements, requiredMovements, timeSpent, significantMovements } = movementData;

            // Comprehensive movement validation
            const validations = {
                sufficientMovements: totalMovements >= requiredMovements,
                significantMovements: significantMovements === true,
                reasonableTimeSpent: timeSpent >= 1000 && timeSpent <= 15000, // 1-15 seconds
                movementRate: totalMovements > 0 && (timeSpent / totalMovements) >= 500, // Минимум 500ms между движениями
            };

            isValidMovement = Object.values(validations).every(Boolean);

            validationDetails = `Movements: ${totalMovements}/${requiredMovements}, ` +
                `Time: ${timeSpent}ms, Significant: ${significantMovements}, ` +
                `Validations: ${JSON.stringify(validations)}`;

            console.log(`Movement validation for user ${telegramIdNumber}: ${validationDetails}`);
        } else if (gyroscopeSuccess) {
            // Если успех заявлен, но данные о движении отсутствуют
            isValidMovement = false;
            validationDetails = "Missing movement data despite claimed success";
            console.log(`Invalid gyroscope verification for user ${telegramIdNumber}: ${validationDetails}`);
        }

        // Handle successful gyroscope verification
        if (gyroscopeSuccess && completedInTime && isValidMovement) {
            console.log(
                `Gyroscope verification successful for user ${telegramIdNumber}. ${validationDetails}`,
            );

            // Restore trust score
            const restoreResult = await serverBlockService.handleVerificationSuccess(
                telegramIdNumber,
                "gyroscope",
            );

            if (restoreResult.success) {
                console.log(`Trust score successfully restored for user ${telegramIdNumber}`);
                return NextResponse.json({
                    success: true,
                    verified: true,
                    trustRestored: true,
                });
            } else {
                console.error(`Failed to restore trust score for user ${telegramIdNumber}:`, restoreResult.error);

                return NextResponse.json(
                    {
                        success: false,
                        error: "Verification successful but failed to update trust score",
                    },
                    { status: 500 },
                );
            }
        } else {
            // Handle failed gyroscope verification
            let failureReasons = [];

            if (!gyroscopeSuccess) {
                failureReasons.push("gyroscope verification failed");
            }
            if (!completedInTime) {
                failureReasons.push("verification timed out");
            }
            if (!isValidMovement) {
                failureReasons.push(`invalid movement pattern (${validationDetails})`);
            }

            const failureReason = failureReasons.join(", ");

            console.log(
                `Gyroscope verification failed for user ${telegramIdNumber}: ${failureReason}`,
            );

            // Block user for failed gyroscope verification
            const blockResult = await serverBlockService.handleVerificationFailure(
                userId,
                telegramIdNumber,
                "gyroscope",
                true, // Device supports gyroscope
            );

            if (blockResult.success) {
                console.log(`User ${telegramIdNumber} blocked successfully for gyroscope verification failure`);
                return NextResponse.json({
                    success: true,
                    verified: false,
                    blocked: true,
                    blockReason: failureReason,
                    blockDuration: "1 month",
                });
            } else {
                console.error(`Failed to block user ${telegramIdNumber}:`, blockResult.error);

                return NextResponse.json(
                    {
                        success: false,
                        error: "Verification failed and blocking unsuccessful",
                    },
                    { status: 500 },
                );
            }
        }
    } catch (error) {
        console.error("Error in Nebula gyroscope API:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 },
        );
    } finally {
        // Убираем запрос из списка обрабатываемых
        if (requestKey) {
            processingRequests.delete(requestKey);
        }

        // Очищаем старые записи (старше 30 секунд)
        const now = Date.now();
        const keysToDelete: string[] = [];

        processingRequests.forEach((_, key) => {
            const timestamp = parseInt(key.split('_').pop() || '0');
            if (now - timestamp > 30000) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => {
            processingRequests.delete(key);
        });
    }
}

/**
 * OPTIONS /api/nebula/gyroscope
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        },
    });
}