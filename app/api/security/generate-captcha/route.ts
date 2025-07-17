// src/app/api/security/generate-captcha/route.ts - Updated with 15-second expiration

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get user ID from middleware-added header
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

    // Generate simple math captcha
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ["+", "-", "*"];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let correctAnswer: number;
    let challenge: string;

    switch (operator) {
      case "+":
        correctAnswer = num1 + num2;
        challenge = `${num1} + ${num2} = ?`;
        break;
      case "-":
        correctAnswer = num1 - num2;
        challenge = `${num1} - ${num2} = ?`;
        break;
      case "*":
        correctAnswer = num1 * num2;
        challenge = `${num1} × ${num2} = ?`;
        break;
      default:
        correctAnswer = num1 + num2;
        challenge = `${num1} + ${num2} = ?`;
    }

    // Set expiry time (15 seconds from now) - updated from 5 minutes
    const expiresAt = Date.now() + 15 * 1000;

    console.log(
      `Generated captcha for user ${telegramId}: ${challenge} = ${correctAnswer}`,
    );

    return NextResponse.json({
      success: true,
      challenge,
      correctAnswer: correctAnswer.toString(),
      expiresAt,
    });
  } catch (error) {
    console.error("Generate captcha API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
