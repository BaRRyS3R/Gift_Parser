// src/app/api/security/check-status/route.ts - Security status check endpoint

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const telegramId = request.headers.get('x-telegram-id');

    if (!telegramId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User authentication required',
        },
        { status: 401 }
      );
    }

    // First check and unblock if time has passed
    const { error: unblockError } = await supabaseServer.rpc('check_and_unblock_user', {
      user_telegram_id: parseInt(telegramId)
    });

    if (unblockError) {
      console.error("Error checking unblock status:", unblockError.message);
    }

    // Get current user data
    const { data: user, error } = await supabaseServer
      .from('users')
      .select('trust_score, blocked_until')
      .eq('telegram_id', parseInt(telegramId))
      .single();

    if (error || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    const { data: serverTimeData } = await supabaseServer.rpc("get_current_timestamp");
    const serverTime = serverTimeData ? new Date(serverTimeData) : new Date();
    const isBlocked = user.blocked_until ? new Date(user.blocked_until) > serverTime : false;

    let timeUntilUnblock: number | undefined;
    let blockReason: string | undefined;

    if (isBlocked && user.blocked_until) {
      timeUntilUnblock = new Date(user.blocked_until).getTime() - serverTime.getTime();

      // Get the most recent active block reason
      const { data: blockData } = await supabaseServer
        .from("user_blocks")
        .select("block_reason")
        .eq("telegram_id", parseInt(telegramId))
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (blockData) {
        blockReason = blockData.block_reason;
      }
    }

    const trustScore = user.trust_score || 50;

    return NextResponse.json({
      success: true,
      securityResult: {
        isBlocked,
        needsCaptcha: !isBlocked && trustScore < 40,
        needsBiometric: !isBlocked && trustScore < 20,
        trustScore,
        timeUntilUnblock: timeUntilUnblock && timeUntilUnblock > 0 ? timeUntilUnblock : undefined,
        blockReason,
      },
    });
  } catch (error) {
    console.error('Security check API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check security status',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}