// src/utils/deviceDetection.ts - Simplified approach based on Telegram Mini Apps best practices
export interface DeviceInfo {
  isMobile: boolean;
  isTelegram: boolean;
  isValidMobileTelegram: boolean;
  platform: string;
  userAgent: string;
  touchSupport: boolean;
  telegramPlatform?: string;
  telegramVersion?: string;
}

/**
 * Simplified device detection focused on official Telegram Mini Apps methods
 * Based on Telegram documentation and community best practices
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
   * Detect if device supports touch (essential for mobile)
   */
  private detectTouchSupport(): boolean {
    if (typeof window === "undefined") return false;

    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Primary method: Use official Telegram WebApp platform detection
   */
  private getTelegramPlatform(): string {
    if (typeof window === "undefined" || !window.Telegram?.WebApp) {
      return "unknown";
    }

    return window.Telegram.WebApp.platform || "unknown";
  }

  /**
   * Get Telegram version for additional validation
   */
  private getTelegramVersion(): string {
    if (typeof window === "undefined" || !window.Telegram?.WebApp) {
      return "unknown";
    }

    return window.Telegram.WebApp.version || "unknown";
  }

  /**
   * Check if running in Telegram environment
   */
  private detectTelegram(): boolean {
    if (typeof window === "undefined") return false;

    // Method 1: Check for Telegram WebApp object (most reliable)
    const hasTelegramWebApp = !!window.Telegram?.WebApp;

    // Method 2: Check for TelegramWebviewProxy (for native apps)
    // @ts-ignore
    const hasTelegramProxy = typeof window.TelegramWebviewProxy !== "undefined";

    // Method 3: Check User Agent for Telegram identifiers
    const userAgent = navigator.userAgent.toLowerCase();
    const hasTelegramInUA = userAgent.includes("telegram");

    const isTelegram = hasTelegramWebApp || hasTelegramProxy || hasTelegramInUA;

    console.log("Telegram detection:", {
      hasTelegramWebApp,
      hasTelegramProxy,
      hasTelegramInUA,
      isTelegram,
    });

    return isTelegram;
  }

  /**
   * Simplified mobile detection based on Telegram platform and User Agent
   */
  private detectMobileDevice(): boolean {
    if (typeof window === "undefined") return false;

    const userAgent = navigator.userAgent.toLowerCase();

    // Primary check: Android devices (always mobile)
    if (userAgent.includes("android")) {
      console.log("Device detected as Android (mobile)");

      return true;
    }

    // Primary check: iOS devices (always mobile)
    if (/iphone|ipad|ipod/i.test(userAgent)) {
      console.log("Device detected as iOS (mobile)");

      return true;
    }

    // Check for other mobile indicators in User Agent
    const mobilePatterns = [
      /mobile/i,
      /webos/i,
      /blackberry/i,
      /iemobile/i,
      /windows phone/i,
      /opera mini/i,
    ];

    const isMobileUA = mobilePatterns.some((pattern) =>
      pattern.test(userAgent),
    );

    // Desktop patterns that should explicitly exclude mobile
    const desktopPatterns = [
      /windows nt(?!.*mobile)/i,
      /macintosh(?!.*mobile)/i,
      /linux(?!.*android)(?!.*mobile)/i,
      /electron/i,
    ];

    const isDesktop = desktopPatterns.some((pattern) =>
      pattern.test(userAgent),
    );

    console.log("Mobile detection results:", {
      isMobileUA,
      isDesktop,
      userAgent: userAgent.substring(0, 100),
    });

    return isMobileUA && !isDesktop;
  }

  /**
   * Validate mobile Telegram session using official platform detection
   */
  private validateMobileTelegram(): boolean {
    const isTelegram = this.detectTelegram();

    if (!isTelegram) {
      console.log("Not running in Telegram environment");

      return false;
    }

    // Get official Telegram platform
    const telegramPlatform = this.getTelegramPlatform();

    console.log("Telegram platform detected:", telegramPlatform);

    // Official mobile platforms according to Telegram documentation
    const validMobilePlatforms = ["android", "ios", "android_x"];

    // Check if platform is explicitly mobile
    if (validMobilePlatforms.includes(telegramPlatform)) {
      console.log("Valid mobile Telegram platform confirmed");

      return true;
    }

    // Explicitly block known desktop platforms
    const desktopPlatforms = ["tdesktop", "web", "macos", "windows", "linux"];

    if (desktopPlatforms.includes(telegramPlatform)) {
      console.log("Desktop Telegram platform detected, blocking access");

      return false;
    }

    // If platform is unknown, fall back to mobile detection + touch support
    if (telegramPlatform === "unknown") {
      console.log("Unknown Telegram platform, using fallback detection");
      const isMobile = this.detectMobileDevice();
      const hasTouch = this.detectTouchSupport();
      const isValid = isMobile && hasTouch;

      console.log("Fallback validation:", { isMobile, hasTouch, isValid });

      return isValid;
    }

    // Conservative approach: deny access for unrecognized platforms
    console.log("Unrecognized platform, denying access as safety measure");

    return false;
  }

  /**
   * Get comprehensive device information
   */
  getDeviceInfo(): DeviceInfo {
    if (this.deviceInfo) return this.deviceInfo;

    if (typeof window === "undefined") {
      return {
        isMobile: false,
        isTelegram: false,
        isValidMobileTelegram: false,
        platform: "unknown",
        userAgent: "",
        touchSupport: false,
      };
    }

    const isMobile = this.detectMobileDevice();
    const isTelegram = this.detectTelegram();
    const touchSupport = this.detectTouchSupport();
    const telegramPlatform = this.getTelegramPlatform();
    const telegramVersion = this.getTelegramVersion();
    const isValidMobileTelegram = this.validateMobileTelegram();

    this.deviceInfo = {
      isMobile,
      isTelegram,
      isValidMobileTelegram,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      touchSupport,
      telegramPlatform,
      telegramVersion,
    };

    console.log("Final device info:", this.deviceInfo);

    return this.deviceInfo;
  }

  /**
   * Check if current device should be allowed access
   */
  isAccessAllowed(): boolean {
    const deviceInfo = this.getDeviceInfo();
    const allowed = deviceInfo.isValidMobileTelegram;

    console.log("Access allowed:", allowed);

    return allowed;
  }

  /**
   * Get specific reason for access denial
   */
  getAccessDenialReason(): string {
    const deviceInfo = this.getDeviceInfo();

    if (!deviceInfo.isTelegram) {
      return "not_telegram";
    }

    // Check specific Telegram platform issues
    if (deviceInfo.telegramPlatform === "tdesktop") {
      return "telegram_desktop";
    }

    if (deviceInfo.telegramPlatform === "web") {
      return "telegram_web";
    }

    if (!deviceInfo.isMobile) {
      return "not_mobile";
    }

    if (!deviceInfo.touchSupport) {
      return "no_touch";
    }

    return "unknown";
  }

  /**
   * Test Telegram environment by making API call (optional validation)
   */
  async testTelegramEnvironment(): Promise<boolean> {
    if (typeof window === "undefined" || !window.Telegram?.WebApp) {
      return false;
    }

    try {
      // Alternative: check if WebApp is ready
      if (window.Telegram.WebApp.ready) {
        window.Telegram.WebApp.ready();

        return true;
      }

      return true; // If WebApp object exists, assume valid environment
    } catch (error) {
      console.warn("Telegram environment test failed:", error);

      return false;
    }
  }

  /**
   * Reset detection cache
   */
  reset(): void {
    this.deviceInfo = null;
    console.log("Device detection cache reset");
  }
}

// Convenience functions
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

// Additional utility for testing Telegram environment
export const testTelegramEnvironment = async (): Promise<boolean> => {
  return deviceDetector.testTelegramEnvironment();
};
