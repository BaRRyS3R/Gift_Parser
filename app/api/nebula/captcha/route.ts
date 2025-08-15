// src/app/api/nebula/captcha/route.ts - Fixed with correct block reason handling

import { NextRequest, NextResponse } from "next/server";

import { serverBlockService } from "@/lib/server/blockService";

// Captcha generation interface
interface CaptchaChallenge {
  challenge: string;
  correctAnswer: string;
  expiresAt: number;
}

// Request interfaces
interface GenerateCaptchaRequest {
  action: "generate";
}

interface ValidateCaptchaRequest {
  action: "validate";
  userAnswer: string;
  challenge: string;
  completedInTime: boolean;
  attemptId: string;
}

// Response interfaces
interface CaptchaResponse {
  success: boolean;
  challenge?: string;
  expiresAt?: number;
  verified?: boolean;
  trustRestored?: boolean;
  blocked?: boolean;
  blockReason?: string;
  error?: string;
}

/**
 * Generate secure captcha challenge
 */
function generateSecureCaptcha(): CaptchaChallenge {
  // Generate random math problem
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 20) + 1;
  const operations = ["+", "-", "*"];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let correctAnswer: number;
  let challenge: string;

  switch (operation) {
    case "+":
      correctAnswer = num1 + num2;
      challenge = `${num1} + ${num2}`;
      break;
    case "-":
      // Ensure positive result
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);

      correctAnswer = larger - smaller;
      challenge = `${larger} - ${smaller}`;
      break;
    case "*":
      // Use smaller numbers for multiplication
      const smallNum1 = Math.floor(Math.random() * 10) + 1;
      const smallNum2 = Math.floor(Math.random() * 10) + 1;

      correctAnswer = smallNum1 * smallNum2;
      challenge = `${smallNum1} × ${smallNum2}`;
      break;
    default:
      correctAnswer = num1 + num2;
      challenge = `${num1} + ${num2}`;
  }

  return {
    challenge,
    correctAnswer: correctAnswer.toString(),
    expiresAt: Date.now() + 15000, // 15 seconds
  };
}

/**
 * POST /api/nebula/captcha
 * Generate or validate captcha for Nebula security system
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<CaptchaResponse>> {
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

    // Parse request body
    const body = await request.json();
    const { action } = body;

    if (action === "generate") {
      // Generate new captcha challenge
      const captcha = generateSecureCaptcha();

      return NextResponse.json({
        success: true,
        challenge: captcha.challenge,
        expiresAt: captcha.expiresAt,
      });
    } else if (action === "validate") {
      const { userAnswer, challenge, completedInTime, attemptId } =
        body as ValidateCaptchaRequest;

      if (!userAnswer || !challenge || !attemptId) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required fields",
          },
          { status: 400 },
        );
      }

      // Verify attempt belongs to user
      const { attempt } =
        await serverBlockService.checkVerificationAttempt(telegramIdNumber);

      if (!attempt || attempt.id !== attemptId) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid verification attempt",
          },
          { status: 400 },
        );
      }

      // Re-generate the same challenge to verify answer
      // This is a simplified approach - in production, you'd want to store challenges securely
      let isCorrect = false;

      try {
        // Parse the challenge and calculate correct answer
        const challengeMatch = challenge.match(/^(\d+)\s*([+\-×])\s*(\d+)$/);

        if (challengeMatch) {
          const [, num1Str, operation, num2Str] = challengeMatch;
          const num1 = parseInt(num1Str);
          const num2 = parseInt(num2Str);

          let correctAnswer: number;

          switch (operation) {
            case "+":
              correctAnswer = num1 + num2;
              break;
            case "-":
              correctAnswer = num1 - num2;
              break;
            case "×":
              correctAnswer = num1 * num2;
              break;
            default:
              correctAnswer = num1 + num2;
          }

          isCorrect = parseInt(userAnswer.trim()) === correctAnswer;
        }
      } catch (error) {
        console.error("Error validating captcha:", error);
        isCorrect = false;
      }

      // Check if verification was successful
      if (isCorrect && completedInTime) {
        // Restore trust score
        const restoreResult =
          await serverBlockService.handleVerificationSuccess(
            telegramIdNumber,
            "captcha",
          );

        // Remove verification attempt record
        await serverBlockService.removeVerificationAttempt(attemptId);

        if (restoreResult.success) {
          return NextResponse.json({
            success: true,
            verified: true,
            trustRestored: true,
          });
        } else {
          console.error("Failed to restore trust score:", restoreResult.error);

          return NextResponse.json(
            {
              success: false,
              error: "Verification successful but failed to update trust score",
            },
            { status: 500 },
          );
        }
      } else {
        // Block user for failed captcha - simply use failed_captcha reason
        const blockResult = await serverBlockService.handleVerificationFailure(
          userId,
          telegramIdNumber,
          "captcha",
          "failed_captcha", // Correct block reason for failed captcha
        );

        // Remove verification attempt record
        await serverBlockService.removeVerificationAttempt(attemptId);

        if (blockResult.success) {
          return NextResponse.json({
            success: true,
            verified: false,
            blocked: true,
            blockReason: "Failed captcha verification",
          });
        } else {
          console.error("Failed to block user:", blockResult.error);

          return NextResponse.json(
            {
              success: false,
              error: "Verification failed and blocking unsuccessful",
            },
            { status: 500 },
          );
        }
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error in Nebula captcha API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

