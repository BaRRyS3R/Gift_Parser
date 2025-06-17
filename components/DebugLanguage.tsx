// src/components/DebugLanguage.tsx - Temporary debug component

"use client";

import React from 'react';
import { useLanguage, useT } from '@/contexts/LocalizationContext';

export default function DebugLanguage() {
    const { currentLanguage, isRussian, isEnglish, toggleLanguage } = useLanguage();
    const t = useT();

    // Get Telegram data for debugging
    const getTelegramDebugInfo = () => {
        if (typeof window === "undefined") return "Window not available";

        if (!window.Telegram?.WebApp) return "Telegram WebApp not available";

        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;

        return {
            hasWebApp: !!window.Telegram?.WebApp,
            hasUser: !!user,
            languageCode: user?.language_code,
            firstName: user?.first_name,
            username: user?.username,
            initData: tg.initData ? "Available" : "Not available"
        };
    };

    const debugInfo = getTelegramDebugInfo();

    return (
        <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-4 rounded-lg border border-white/20 max-w-sm">
            <h3 className="font-bold mb-2">Language Debug Info</h3>

            <div className="space-y-2 text-xs">
                <div>
                    <strong>Current Language:</strong> {currentLanguage}
                </div>
                <div>
                    <strong>Is Russian:</strong> {isRussian ? 'Yes' : 'No'}
                </div>
                <div>
                    <strong>Is English:</strong> {isEnglish ? 'Yes' : 'No'}
                </div>

                <hr className="border-white/20" />

                <div>
                    <strong>Telegram Debug:</strong>
                </div>
                {typeof debugInfo === 'string' ? (
                    <div>{debugInfo}</div>
                ) : (
                    <div className="space-y-1">
                        <div>WebApp: {debugInfo.hasWebApp ? 'Yes' : 'No'}</div>
                        <div>User: {debugInfo.hasUser ? 'Yes' : 'No'}</div>
                        <div>Language Code: {debugInfo.languageCode || 'Not set'}</div>
                        <div>First Name: {debugInfo.firstName || 'Not set'}</div>
                        <div>Username: {debugInfo.username || 'Not set'}</div>
                        <div>Init Data: {debugInfo.initData}</div>
                    </div>
                )}

                <hr className="border-white/20" />

                <div>
                    <strong>Test Translation:</strong>
                </div>
                <div>welcome: {t('main.welcome')}</div>
                <div>greeting: {t('main.greeting', { name: 'Test' })}</div>

                <button
                    onClick={toggleLanguage}
                    className="mt-2 px-2 py-1 bg-white/20 rounded text-xs"
                >
                    Toggle Language
                </button>
            </div>
        </div>
    );
}