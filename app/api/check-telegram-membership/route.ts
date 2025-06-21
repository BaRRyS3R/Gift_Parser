// src/app/api/check-telegram-membership/route.ts

import { NextRequest, NextResponse } from 'next/server';

interface TelegramUser {
  user: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
  until_date?: number;
  can_be_edited?: boolean;
  can_manage_chat?: boolean;
  can_change_info?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_delete_messages?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_manage_video_chats?: boolean;
  can_manage_voice_chats?: boolean;
  is_anonymous?: boolean;
}

interface TelegramApiResponse {
  ok: boolean;
  result?: TelegramUser;
  error_code?: number;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { chat_id, user_id } = await request.json();

    if (!chat_id || !user_id) {
      return NextResponse.json(
        { error: 'chat_id and user_id are required' },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_API;
    if (!botToken) {
      console.error('TELEGRAM_BOT_API environment variable is not set');
      return NextResponse.json(
        { error: 'Bot token not configured' },
        { status: 500 }
      );
    }

    // Вызываем Telegram Bot API для проверки членства
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/getChatMember`;
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chat_id,
        user_id: user_id,
      }),
    });

    const data: TelegramApiResponse = await response.json();

    console.log('Telegram API response:', {
      ok: data.ok,
      status: data.result?.status,
      error: data.error_code ? `${data.error_code}: ${data.description}` : null
    });

    if (!data.ok) {
      // Обрабатываем различные ошибки
      if (data.error_code === 400 && data.description?.includes('user not found')) {
        return NextResponse.json({
          is_member: false,
          error: 'User not found in chat'
        });
      }
      
      if (data.error_code === 400 && data.description?.includes('chat not found')) {
        return NextResponse.json({
          is_member: false,
          error: 'Chat not found'
        });
      }

      console.error('Telegram API error:', data.error_code, data.description);
      return NextResponse.json({
        is_member: false,
        error: data.description || 'Unknown error'
      });
    }

    if (!data.result) {
      return NextResponse.json({
        is_member: false,
        error: 'No result from Telegram API'
      });
    }

    // Проверяем статус пользователя
    const memberStatuses = ['creator', 'administrator', 'member'];
    const isMember = memberStatuses.includes(data.result.status);

    return NextResponse.json({
      is_member: isMember,
      status: data.result.status,
      user_info: {
        id: data.result.user.id,
        first_name: data.result.user.first_name,
        username: data.result.user.username
      }
    });

  } catch (error) {
    console.error('Error checking Telegram membership:', error);
    return NextResponse.json(
      {
        is_member: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}