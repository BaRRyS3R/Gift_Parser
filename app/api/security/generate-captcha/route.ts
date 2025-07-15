// src/app/api/security/generate-captcha/route.ts - Generate captcha challenge

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';

export const GET = withAuth(async (request) => {
    try {
        // Генерация капчи на сервере (пример: простая арифметика)
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const challenge = `${a} + ${b}`;
        const correctAnswer = (a + b).toString();
        const expiresAt = Date.now() + 2 * 60 * 1000; // 2 минуты
        return NextResponse.json({ success: true, challenge, correctAnswer, expiresAt });
    } catch (error) {
        console.error('Error generating captcha:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate captcha' }, { status: 500 });
    }
});