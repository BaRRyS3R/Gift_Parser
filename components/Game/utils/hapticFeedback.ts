// src/components/Game/utils/hapticFeedback.ts

export const triggerHapticFeedback = (type: 'success' | 'error' | 'impact') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        const haptic = window.Telegram.WebApp.HapticFeedback

        switch (type) {
            case 'success':
                haptic.notificationOccurred('success')
                break
            case 'error':
                haptic.notificationOccurred('error')
                break
            case 'impact':
                haptic.impactOccurred('light')
                break
        }
    }
}