// src/app/api/security/validate-captcha/route.ts - Enhanced with anti-manipulation validation

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Validation thresholds and constraints
const VALIDATION_CONSTRAINTS = {
  MIN_VERIFICATION_TIME: 3000, // 3 seconds minimum for gyroscope
  MAX_VERIFICATION_TIME: 15000, // 15 seconds maximum
  MIN_MOTION_SAMPLES: 15,
  MIN_MOTION_INTENSITY: 250,
  MAX_ALLOWED_VERIFICATION_SPEED: 1000, // ms
} as const;

// Security validation utilities
function validateMotionData(motionData: any, verificationTime: number): boolean {
  if (!motionData || typeof motionData !== 'object') {
    return false;
  }

  const { samples, intensity, signature, timestamps } = motionData;

  // Check minimum samples and intensity
  if (samples < VALIDATION_CONSTRAINTS.MIN_MOTION_SAMPLES) {
    console.log(`Motion validation failed: insufficient samples (${samples})`);
    return false;
  }

  if (intensity < VALIDATION_CONSTRAINTS.MIN_MOTION_INTENSITY) {
    console.log(`Motion validation failed: insufficient intensity (${intensity})`);
    return false;
  }

  // Validate signature integrity
  if (!signature || typeof signature !== 'string') {
    console.log('Motion validation failed: missing or invalid signature');
    return false;
  }

  // Check timestamp distribution (anti-injection)
  if (timestamps && Array.isArray(timestamps)) {
    const timeSpread = Math.max(...timestamps) - Math.min(...timestamps);
    if (timeSpread < VALIDATION_CONSTRAINTS.MIN_VERIFICATION_TIME * 0.8) {
      console.log('Motion validation failed: suspicious timestamp distribution');
      return false;
    }
  }

  return true;
}

function validateVerificationTiming(startTime: number, endTime: number): boolean {
  const verificationDuration = endTime - startTime;

  // Check if verification was too fast (suspicious)
  if (verificationDuration < VALIDATION_CONSTRAINTS.MIN_VERIFICATION_TIME) {
    console.log(`Timing validation failed: too fast (${verificationDuration}ms)`);
    return false;
  }

  // Check if verification took too long (timeout)
  if (verificationDuration > VALIDATION_CONSTRAINTS.MAX_VERIFICATION_TIME) {
    console.log(`Timing validation failed: too slow (${verificationDuration}ms)`);
    return false;
  }

  return true;
}

function generateExpectedSignature(data: any): string {
  // Simple signature generation for validation
  const signatureData = [
    data.samples || 0,
    Math.floor(data.intensity || 0),
    Math.floor(data.startTime || 0),
  ].join(':');

  let hash = 0;
  for (let i = 0; i < signatureData.length; i++) {
    const char = signatureData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return hash.toString(36);
}

async function logSuspiciousActivity(
  telegramId: string,
  reason: string,
  details: any
): Promise<void> {
  try {
    await supabaseServer.from('security_logs').insert({
      telegram_id: parseInt(telegramId),
      event_type: 'suspicious_verification',
      reason,
      details: JSON.stringify(details),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Enhanced request parsing with validation data
    const {
      userInput,
      correctAnswer,
      completedInTime,
      startTime,
      verificationData,
      clientFingerprint
    } = await request.json();

    if (!userInput || !correctAnswer) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    const endTime = Date.now();
    const isMotionVerification = userInput === "MOTION" && correctAnswer === "MOTION";

    // Enhanced validation for motion verification
    if (isMotionVerification) {
      // Validate timing constraints
      if (!startTime || !validateVerificationTiming(startTime, endTime)) {
        await logSuspiciousActivity(telegramId, 'invalid_timing', {
          startTime,
          endTime,
          duration: endTime - startTime
        });

        // Apply penalty for suspicious timing
        await supabaseServer.rpc("update_trust_score", {
          user_telegram_id: parseInt(telegramId),
          score_change: -30,
        });

        return NextResponse.json({
          success: false,
          newTrustScore: 0,
        });
      }

      // Validate motion data integrity
      if (!verificationData || !validateMotionData(verificationData, endTime - startTime)) {
        await logSuspiciousActivity(telegramId, 'invalid_motion_data', {
          verificationData,
          duration: endTime - startTime
        });

        await supabaseServer.rpc("update_trust_score", {
          user_telegram_id: parseInt(telegramId),
          score_change: -40,
        });

        return NextResponse.json({
          success: false,
          newTrustScore: 0,
        });
      }

      // Validate signature integrity
      const expectedSignature = generateExpectedSignature({
        samples: verificationData.samples,
        intensity: verificationData.intensity,
        startTime: startTime
      });

      if (verificationData.signature !== expectedSignature) {
        await logSuspiciousActivity(telegramId, 'signature_mismatch', {
          expected: expectedSignature,
          received: verificationData.signature
        });

        await supabaseServer.rpc("update_trust_score", {
          user_telegram_id: parseInt(telegramId),
          score_change: -50,
        });

        return NextResponse.json({
          success: false,
          newTrustScore: 0,
        });
      }

      // Additional behavioral analysis
      const verificationSpeed = (endTime - startTime) / verificationData.samples;
      if (verificationSpeed < VALIDATION_CONSTRAINTS.MAX_ALLOWED_VERIFICATION_SPEED) {
        await logSuspiciousActivity(telegramId, 'unrealistic_verification_speed', {
          speed: verificationSpeed,
          samples: verificationData.samples,
          duration: endTime - startTime
        });

        await supabaseServer.rpc("update_trust_score", {
          user_telegram_id: parseInt(telegramId),
          score_change: -25,
        });

        return NextResponse.json({
          success: false,
          newTrustScore: 0,
        });
      }
    }

    // Standard validation logic
    const isCorrect = userInput.toLowerCase() === correctAnswer.toLowerCase();

    if (isCorrect && completedInTime) {
      // Successful verification
      const scoreIncrease = isMotionVerification ? 45 : 40; // Bonus for motion verification

      const { data: newTrustScore, error: trustError } =
        await supabaseServer.rpc("update_trust_score", {
          user_telegram_id: parseInt(telegramId),
          score_change: scoreIncrease,
        });

      if (trustError) {
        console.error("Error updating trust score:", trustError);
      }

      // Log successful verification
      await supabaseServer.from('security_logs').insert({
        telegram_id: parseInt(telegramId),
        event_type: 'verification_success',
        reason: isMotionVerification ? 'motion_verification' : 'captcha_verification',
        details: JSON.stringify({
          duration: endTime - startTime,
          samples: verificationData?.samples || 0
        }),
        created_at: new Date().toISOString(),
      });

      console.log(`${isMotionVerification ? 'Motion' : 'Captcha'} verification successful for user ${telegramId}, trust score increased by ${scoreIncrease}`);

      return NextResponse.json({
        success: true,
        newTrustScore: newTrustScore || 0,
      });
    } else {
      // Failed verification
      const { error: trustError } = await supabaseServer.rpc(
        "update_trust_score",
        {
          user_telegram_id: parseInt(telegramId),
          score_change: -20,
        },
      );

      if (trustError) {
        console.error("Error updating trust score:", trustError);
      }

      const { error: blockError } = await supabaseServer.rpc("block_user", {
        user_telegram_id: parseInt(telegramId),
        reason: "captcha_failed",
        duration_minutes: 2,
      });

      if (blockError) {
        console.error("Error blocking user:", blockError);
      }

      await logSuspiciousActivity(telegramId, 'verification_failed', {
        reason: !isCorrect ? 'incorrect_answer' : 'timeout',
        userInput,
        duration: endTime - startTime
      });

      console.log(
        `${isMotionVerification ? 'Motion' : 'Captcha'} verification failed for user ${telegramId}: ${!isCorrect ? "incorrect answer" : "timeout"}, trust score decreased by 20`,
      );

      return NextResponse.json({
        success: false,
        newTrustScore: 0,
      });
    }
  } catch (error) {
    console.error("Validate captcha API error:", error);

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