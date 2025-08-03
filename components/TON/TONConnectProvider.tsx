// src/components/TON/TONConnectProvider.tsx - TON Connect Provider инициализация

"use client";

import React from 'react';
import { TonConnectUIProvider, THEME } from '@tonconnect/ui-react';

interface TONConnectProviderProps {
    children: React.ReactNode;
}

/**
 * TON Connect Provider для инициализации TON Connect UI
 * Должен оборачивать все приложение или страницы, использующие TON Connect
 */
export function TONConnectProvider({ children }: TONConnectProviderProps) {
    // URL манифеста TON Connect (должен быть доступен публично)
    const manifestUrl = '/tonconnect-manifest.json';

    return (
        <TonConnectUIProvider
            manifestUrl={manifestUrl}
            // Дополнительные настройки TON Connect
            uiPreferences={{
                theme: THEME.DARK, // Использование константы темы из библиотеки
            }}
            // Настройки кошельков с полной конфигурацией
            walletsListConfiguration={{
                includeWallets: [
                    {
                        name: 'tonkeeper',
                        appName: 'Tonkeeper',
                        imageUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png',
                        aboutUrl: 'https://tonkeeper.com',
                        universalLink: 'https://app.tonkeeper.com/ton-connect',
                        bridgeUrl: 'https://bridge.tonapi.io/bridge',
                        deepLink: 'tonkeeper-tc://',
                        platforms: ['ios', 'android', 'chrome', 'firefox']
                    },
                    {
                        name: 'mytonwallet',
                        appName: 'MyTonWallet',
                        imageUrl: 'https://static.mytonwallet.io/icon-256.png',
                        aboutUrl: 'https://mytonwallet.io',
                        universalLink: 'https://connect.mytonwallet.org',
                        bridgeUrl: 'https://bridge.mytonwallet.org/bridge',
                        deepLink: 'mytonwallet-tc://',
                        platforms: ['ios', 'android', 'chrome', 'firefox', 'safari']
                    },
                ]
            }}
            // Настройки актуальности соединения
            actionsConfiguration={{
                twaReturnUrl: 'https://t.me/marketaggregator_bot?startapp'
            }}
        >
            {children}
        </TonConnectUIProvider>
    );
}

export default TONConnectProvider;