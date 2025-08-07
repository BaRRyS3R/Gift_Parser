// src/app/api/tournaments/[id]/submit/route.ts - Отправка результата турнира

import { NextRequest, NextResponse } from "next/server";
import { serverTournamentService } from "@/lib/server/tournamentService";
import type { TournamentSubmitResponse } from "@/types/tournaments";

interface SubmitRouteParams {
    params: {
        id: string;
    };
}

interface SubmitRequest {
    gameScore: number;
}

/**
 * POST /api/tournaments/[id]/submit
 * Отправка результата игры в турнир
 */
export async function POST(
    request: NextRequest,
    { params }: SubmitRouteParams
): Promise<NextResponse<TournamentSubmitResponse>> {
    try {
        const { id } = params;

        // Извлекаем информацию о пользователе из заголовков middleware
        const userId = request.headers.get("X-User-ID");
        const telegramId = request.headers.get("X-Telegram-ID");

        if (!userId || !telegramId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User authentication required",
                },
                { status: 401 }
            );
        }

        const telegramIdNumber = parseInt(telegramId);
        if (isNaN(telegramIdNumber)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid user ID",
                },
                { status: 400 }
            );
        }

        // Парсим тело запроса
        let body: SubmitRequest;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid request body",
                },
                { status: 400 }
            );
        }

        const { gameScore } = body;

        // Валидируем score
        if (typeof gameScore !== "number" || gameScore < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid game score",
                },
                { status: 400 }
            );
        }

        // Проверяем возможность участия пользователя
        const canParticipate = await serverTournamentService.canUserParticipate(id, userId);
        if (!canParticipate) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cannot participate in this tournament",
                },
                { status: 403 }
            );
        }

        // Отправляем результат
        const submitResult = await serverTournamentService.submitTournamentResult(
            id,
            userId,
            telegramIdNumber,
            gameScore
        );

        return NextResponse.json({
            success: true,
            data: submitResult,
        });
    } catch (error) {
        console.error("Error submitting tournament result:", error);

        if (error instanceof Error) {
            if (error.message.includes("not found")) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Tournament not found",
                    },
                    { status: 404 }
                );
            }

            if (error.message.includes("not active")) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Tournament is not active",
                    },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to submit tournament result",
            },
            { status: 500 }
        );
    }
}