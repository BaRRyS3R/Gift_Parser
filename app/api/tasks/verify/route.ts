// src/app/api/tasks/verify/route.ts - API endpoint for task verification

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/authMiddleware";
import { taskService } from "@/lib/taskService";
import { validateTaskType } from "@/types/tasks";
import type { TaskVerificationRequest, TaskVerificationResponse } from "@/types/tasks";

export const POST = withAuth(async (request) => {
    try {
        const { user } = request;

        // Parse request body
        let requestBody: TaskVerificationRequest;
        try {
            requestBody = await request.json();
        } catch (error) {
            console.error("Error parsing request body:", error);
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid request body",
                    verified: false,
                    error: "Invalid request body"
                } as TaskVerificationResponse,
                { status: 400 }
            );
        }

        const { taskId, verificationType, verificationData } = requestBody;

        // Validate input
        if (!taskId || typeof taskId !== 'number') {
            return NextResponse.json(
                {
                    success: false,
                    message: "Task ID is required",
                    verified: false,
                    error: "Task ID is required"
                } as TaskVerificationResponse,
                { status: 400 }
            );
        }

        if (!verificationType || !validateTaskType(verificationType)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Valid verification type is required",
                    verified: false,
                    error: "Valid verification type is required"
                } as TaskVerificationResponse,
                { status: 400 }
            );
        }

        console.log(`User ${user.telegramId} attempting to verify task ${taskId} of type ${verificationType}`);

        // Verify the task
        const verificationResult = await taskService.verifyTask(
            user.userId,
            taskId,
            verificationType,
            verificationData
        );

        if (!verificationResult.success) {
            console.warn(`Task verification failed for user ${user.telegramId}, task ${taskId}: ${verificationResult.error}`);

            return NextResponse.json(
                verificationResult,
                { status: 400 }
            );
        }

        console.log(`Task ${taskId} verification result for user ${user.telegramId}: ${verificationResult.verified ? 'verified' : 'not verified'}`);

        return NextResponse.json(verificationResult);
    } catch (error) {
        console.error("Error verifying task:", error);

        const errorResponse: TaskVerificationResponse = {
            success: false,
            message: "Failed to verify task",
            verified: false,
            error: error instanceof Error ? error.message : "Unknown error occurred"
        };

        return NextResponse.json(errorResponse, { status: 500 });
    }
});