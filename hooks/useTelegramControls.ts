// src/hooks/useTelegramControls.ts - Hook for accessing Telegram WebApp controls

import { useEffect, useState, useCallback } from 'react';

interface TelegramStatus {
    isAvailable: boolean;
    version: string | null;
    platform: string | null;
    isOrientationLocked: boolean | null;
    isVerticalSwipesEnabled: boolean | null;
    isClosingConfirmationEnabled: boolean;
}

export function useTelegramControls() {
    const [status, setStatus] = useState<TelegramStatus>({
        isAvailable: false,
        version: null,
        platform: null,
        isOrientationLocked: null,
        isVerticalSwipesEnabled: null,
        isClosingConfirmationEnabled: false,
    });

    // Проверяем статус Telegram WebApp при монтировании
    useEffect(() => {
        const checkTelegramStatus = () => {
            if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;

                setStatus({
                    isAvailable: true,
                    version: tg.version || null,
                    platform: tg.platform || null,
                    isOrientationLocked: tg.isOrientationLocked ?? null,
                    isVerticalSwipesEnabled: tg.isVerticalSwipesEnabled ?? null,
                    isClosingConfirmationEnabled: tg.isClosingConfirmationEnabled || false,
                });
            }
        };

        checkTelegramStatus();

        // Проверяем еще раз через небольшую задержку на случай, если API еще не загружен
        const timer = setTimeout(checkTelegramStatus, 100);

        return () => clearTimeout(timer);
    }, []);

    // Функция для тактильной обратной связи
    const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
            const haptic = window.Telegram.WebApp.HapticFeedback;

            switch (type) {
                case 'light':
                case 'medium':
                case 'heavy':
                    haptic.impactOccurred(type);
                    break;
                case 'success':
                case 'error':
                case 'warning':
                    haptic.notificationOccurred(type);
                    break;
                case 'selection':
                    haptic.selectionChanged();
                    break;
            }
        }
    }, []);

    // Функции управления ориентацией
    const lockOrientation = useCallback(() => {
        if (window.Telegram?.WebApp?.lockOrientation) {
            window.Telegram.WebApp.lockOrientation();
            setStatus(prev => ({ ...prev, isOrientationLocked: true }));
            console.log('🔒 Orientation locked');
        } else {
            console.warn('⚠️ lockOrientation not supported');
        }
    }, []);

    const unlockOrientation = useCallback(() => {
        if (window.Telegram?.WebApp?.unlockOrientation) {
            window.Telegram.WebApp.unlockOrientation();
            setStatus(prev => ({ ...prev, isOrientationLocked: false }));
            console.log('🔓 Orientation unlocked');
        } else {
            console.warn('⚠️ unlockOrientation not supported');
        }
    }, []);

    // Функции управления вертикальными свайпами
    const disableVerticalSwipes = useCallback(() => {
        if (window.Telegram?.WebApp?.disableVerticalSwipes) {
            window.Telegram.WebApp.disableVerticalSwipes();
            setStatus(prev => ({ ...prev, isVerticalSwipesEnabled: false }));
            console.log('🚫 Vertical swipes disabled');
        } else {
            console.warn('⚠️ disableVerticalSwipes not supported');
        }
    }, []);

    const enableVerticalSwipes = useCallback(() => {
        if (window.Telegram?.WebApp?.enableVerticalSwipes) {
            window.Telegram.WebApp.enableVerticalSwipes();
            setStatus(prev => ({ ...prev, isVerticalSwipesEnabled: true }));
            console.log('✅ Vertical swipes enabled');
        } else {
            console.warn('⚠️ enableVerticalSwipes not supported');
        }
    }, []);

    // Функции управления подтверждением закрытия
    const enableClosingConfirmation = useCallback(() => {
        if (window.Telegram?.WebApp?.enableClosingConfirmation) {
            window.Telegram.WebApp.enableClosingConfirmation();
            setStatus(prev => ({ ...prev, isClosingConfirmationEnabled: true }));
            console.log('🛡️ Closing confirmation enabled');
        }
    }, []);

    const disableClosingConfirmation = useCallback(() => {
        if (window.Telegram?.WebApp?.disableClosingConfirmation) {
            window.Telegram.WebApp.disableClosingConfirmation();
            setStatus(prev => ({ ...prev, isClosingConfirmationEnabled: false }));
            console.log('🚪 Closing confirmation disabled');
        }
    }, []);

    // Функции для работы с кнопками
    const showMainButton = useCallback((text: string, onClick: () => void) => {
        if (window.Telegram?.WebApp?.MainButton) {
            const mainButton = window.Telegram.WebApp.MainButton;
            mainButton.setText(text);
            mainButton.onClick(onClick);
            mainButton.show();
        }
    }, []);

    const hideMainButton = useCallback(() => {
        if (window.Telegram?.WebApp?.MainButton) {
            window.Telegram.WebApp.MainButton.hide();
        }
    }, []);

    const showBackButton = useCallback((onClick: () => void) => {
        if (window.Telegram?.WebApp?.BackButton) {
            const backButton = window.Telegram.WebApp.BackButton;
            backButton.onClick(onClick);
            backButton.show();
        }
    }, []);

    const hideBackButton = useCallback(() => {
        if (window.Telegram?.WebApp?.BackButton) {
            window.Telegram.WebApp.BackButton.hide();
        }
    }, []);

    // Функция закрытия приложения
    const closeApp = useCallback(() => {
        if (window.Telegram?.WebApp?.close) {
            window.Telegram.WebApp.close();
        }
    }, []);

    // Функция отправки данных боту
    const sendData = useCallback((data: string) => {
        if (window.Telegram?.WebApp?.sendData) {
            window.Telegram.WebApp.sendData(data);
        }
    }, []);

    return {
        // Статус
        ...status,

        // Тактильная обратная связь
        hapticFeedback,

        // Управление ориентацией
        lockOrientation,
        unlockOrientation,

        // Управление свайпами
        disableVerticalSwipes,
        enableVerticalSwipes,

        // Управление подтверждением закрытия
        enableClosingConfirmation,
        disableClosingConfirmation,

        // Управление кнопками
        showMainButton,
        hideMainButton,
        showBackButton,
        hideBackButton,

        // Утилиты
        closeApp,
        sendData,

        // Прямой доступ к API (для продвинутого использования)
        webApp: typeof window !== 'undefined' ? window.Telegram?.WebApp : null,
    };
}