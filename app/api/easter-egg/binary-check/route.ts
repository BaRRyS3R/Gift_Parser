// src/app/api/easter-egg/binary-check/route.ts

import { NextRequest, NextResponse } from "next/server";

// The secret binary string - change this to whatever you want
const SECRET_BINARY = "01110000";

// Response interface
interface BinaryCheckResponse {
  success: boolean;
  message?: string;
  result?: "correct" | "incorrect";
  error?: string;
}

/**
 * POST /api/easter-egg/binary-check
 * Check if the submitted binary string matches the secret
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<BinaryCheckResponse>> {
  try {
    // Extract user info from middleware headers (optional for easter egg)
    const telegramId = request.headers.get("X-Telegram-ID");
    const userId = request.headers.get("X-User-ID");

    const { binaryString } = await request.json();

    if (!binaryString || typeof binaryString !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid binary string format",
        },
        { status: 400 },
      );
    }

    // Validate binary string format (only 0s and 1s)
    if (!/^[01]+$/.test(binaryString)) {
      return NextResponse.json(
        {
          success: false,
          error: "Binary string can only contain 0s and 1s",
        },
        { status: 400 },
      );
    }

    // Check if the binary string matches our secret
    const isCorrect = binaryString === SECRET_BINARY;

    if (isCorrect) {
      console.log(
        `Correct binary sequence entered by user ${telegramId || "anonymous"}`,
      );

      return NextResponse.json({
        success: true,
        message: "You fucking right!",
        result: "correct",
      });
    } else {
      // Return sarcastic error messages
      const sarcasticMessages = [
        "Nice try, genius. Maybe use your brain next time?",
        "Wrong again! Are you even trying?",
        "Nope! Back to binary basics for you.",
        "Seriously? That's your guess? Try harder.",
        "Epic fail! The computer is laughing at you.",
        "Wrong! Even my calculator could do better.",
        "Bzzt! Wrong answer. Maybe stick to regular math?",
        "Ouch! That hurt to watch. Try again.",
        "Not even close! Are you using your elbows to tap?",
        "Negative! Your binary skills need some work.",
        "404: Brain not found. Please try again.",
        "Error: Intelligence.exe has stopped working.",
        "Congratulations! You've achieved maximum wrongness!",
        "Even a broken calculator would do better than this.",
        "Did you close your eyes while tapping?",
      ];

      const randomMessage =
        sarcasticMessages[Math.floor(Math.random() * sarcasticMessages.length)];

      return NextResponse.json({
        success: false,
        error: randomMessage,
        result: "incorrect",
      });
    }
  } catch (error) {
    console.error("Binary check error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Server error occurred",
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/easter-egg/binary-check
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Telegram-ID, X-User-ID",
      "Access-Control-Max-Age": "86400",
    },
  });
}
