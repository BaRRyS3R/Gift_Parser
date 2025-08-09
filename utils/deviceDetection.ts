// src/utils/deviceDetection.ts
export interface DeviceInfo {
    isMobile: boolean;
    isTelegram: boolean;
    isValidMobileTelegram: boolean;
    platform: string;
    userAgent: string;
    screenInfo: {
        width: number;
        height: number;
        aspectRatio: number;
        pixelRatio: number;
    };
    touchSupport: boolean;
    telegramPlatform?: string;
}

/**
 * Comprehensive device detection for blocking desktop access
 */
export class DeviceDetector {
    private static instance: DeviceDetector;
    private deviceInfo: DeviceInfo | null = null;

    static getInstance(): DeviceDetector {
        if (!DeviceDetector.instance) {
            DeviceDetector.instance = new DeviceDetector();
        }
        return DeviceDetector.instance;
    }

    /**
     * Detect if device supports touch
     */
    private detectTouchSupport(): boolean {
        if (typeof window === 'undefined') return false;

        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            // @ts-ignore
            navigator.msMaxTouchPoints > 0
        );
    }

    /**
     * Detect mobile device through multiple checks
     */
    private detectMobileDevice(): boolean {
        if (typeof window === 'undefined') return false;

        const userAgent = navigator.userAgent.toLowerCase();

        // Mobile user agent patterns
        const mobilePatterns = [
            /android/i,
            /iphone/i,
            /ipad/i,
            /ipod/i,
            /blackberry/i,
            /windows phone/i,
            /mobile/i,
            /webos/i,
            /opera mini/i,
            /iemobile/i,
            /kindle/i,
            /silk/i,
            /fennec/i
        ];

        // Desktop patterns that should be excluded
        const desktopPatterns = [
            /windows nt/i,
            /macintosh/i,
            /linux/i,
            /x11/i,
            /electron/i // Telegram Desktop часто использует Electron
        ];

        // Check for desktop patterns first
        const isDesktop = desktopPatterns.some(pattern => pattern.test(userAgent));
        if (isDesktop) return false;

        // Check for mobile patterns
        const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));

        // Screen size check (mobile screens are typically smaller)
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const maxDimension = Math.max(screenWidth, screenHeight);
        const minDimension = Math.min(screenWidth, screenHeight);

        // Most mobile devices have max dimension < 1024 and min dimension < 768
        const isMobileScreen = maxDimension <= 1024 && minDimension <= 768;

        // Aspect ratio check (mobile devices typically have tall aspect ratios)
        const aspectRatio = maxDimension / minDimension;
        const isMobileAspectRatio = aspectRatio >= 1.3; // Mobile screens are typically taller

        // Pixel density check (mobile devices often have higher pixel density)
        const pixelRatio = window.devicePixelRatio || 1;
        const isHighDensity = pixelRatio >= 1.5;

        // Touch support is essential for mobile
        const hasTouch = this.detectTouchSupport();

        // Combine multiple checks for more accurate detection
        return (
            (isMobileUA || (isMobileScreen && isMobileAspectRatio && hasTouch)) &&
            hasTouch && // Touch support is mandatory
            !isDesktop
        );
    }

    /**
     * Check if running in Telegram
     */
    private detectTelegram(): boolean {
        if (typeof window === 'undefined') return false;

        const userAgent = navigator.userAgent.toLowerCase();
        const hasTelegramInUA = userAgent.includes('telegram');
        const hasTelegramWebApp = !!(window.Telegram?.WebApp);

        return hasTelegramInUA || hasTelegramWebApp;
    }

    /**
     * Get Telegram platform information
     */
    private getTelegramPlatform(): string {
        if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
            return 'unknown';
        }

        return window.Telegram.WebApp.platform || 'unknown';
    }

    /**
     * Validate that this is a legitimate mobile Telegram session
     */
    private validateMobileTelegram(): boolean {
        const isMobile = this.detectMobileDevice();
        const isTelegram = this.detectTelegram();

        if (!isMobile || !isTelegram) return false;

        // Additional validation for Telegram platform
        const telegramPlatform = this.getTelegramPlatform();
        const validMobilePlatforms = ['android', 'ios', 'android_x'];

        // If we have platform info, it must be mobile
        if (telegramPlatform !== 'unknown') {
            return validMobilePlatforms.includes(telegramPlatform);
        }

        // If no platform info, rely on other mobile checks
        return isMobile && this.detectTouchSupport();
    }

    /**
     * Get comprehensive device information
     */
    getDeviceInfo(): DeviceInfo {
        if (this.deviceInfo) return this.deviceInfo;

        if (typeof window === 'undefined') {
            return {
                isMobile: false,
                isTelegram: false,
                isValidMobileTelegram: false,
                platform: 'unknown',
                userAgent: '',
                screenInfo: {
                    width: 0,
                    height: 0,
                    aspectRatio: 0,
                    pixelRatio: 1
                },
                touchSupport: false
            };
        }

        const isMobile = this.detectMobileDevice();
        const isTelegram = this.detectTelegram();
        const touchSupport = this.detectTouchSupport();
        const telegramPlatform = this.getTelegramPlatform();

        this.deviceInfo = {
            isMobile,
            isTelegram,
            isValidMobileTelegram: this.validateMobileTelegram(),
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            screenInfo: {
                width: window.screen.width,
                height: window.screen.height,
                aspectRatio: Math.max(window.screen.width, window.screen.height) /
                    Math.min(window.screen.width, window.screen.height),
                pixelRatio: window.devicePixelRatio || 1
            },
            touchSupport,
            telegramPlatform
        };

        return this.deviceInfo;
    }

    /**
     * Check if current device should be allowed access
     */
    isAccessAllowed(): boolean {
        const deviceInfo = this.getDeviceInfo();
        return deviceInfo.isValidMobileTelegram;
    }

    /**
     * Get reason for access denial
     */
    getAccessDenialReason(): string {
        const deviceInfo = this.getDeviceInfo();

        if (!deviceInfo.isTelegram) {
            return 'not_telegram';
        }

        if (!deviceInfo.isMobile) {
            return 'not_mobile';
        }

        if (!deviceInfo.touchSupport) {
            return 'no_touch';
        }

        if (deviceInfo.telegramPlatform === 'web' ||
            deviceInfo.telegramPlatform === 'unknown') {
            return 'desktop_telegram';
        }

        return 'unknown';
    }

    /**
     * Reset detection cache (useful for testing)
     */
    reset(): void {
        this.deviceInfo = null;
    }
}

// Convenience functions for easy usage
export const deviceDetector = DeviceDetector.getInstance();

export const isAccessAllowed = (): boolean => {
    return deviceDetector.isAccessAllowed();
};

export const getDeviceInfo = (): DeviceInfo => {
    return deviceDetector.getDeviceInfo();
};

export const getAccessDenialReason = (): string => {
    return deviceDetector.getAccessDenialReason();
};