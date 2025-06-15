// src/types/telegram.d.ts - Complete with latest Telegram WebApp API

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: {
      id: number;
      is_bot?: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
    };
    receiver?: {
      id: number;
      is_bot?: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
    };
    chat?: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      photo_url?: string;
    };
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
    section_bg_color?: string;
    section_header_text_color?: string;
    subtitle_text_color?: string;
    destructive_text_color?: string;
    header_bg_color?: string;
    accent_text_color?: string;
    section_separator_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  isClosingConfirmationEnabled: boolean;
  headerColor: string;
  backgroundColor: string;

  // ✨ NEW: Orientation control (Bot API 7.7+)
  isOrientationLocked?: boolean;

  // ✨ NEW: Vertical swipes control (Bot API 7.7+)
  isVerticalSwipesEnabled?: boolean;

  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };

  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setText: (text: string) => void;
    setParams: (params: {
      text?: string;
      color?: string;
      text_color?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }) => void;
  };

  // ✨ NEW: Settings Button (Bot API 6.10+)
  SettingsButton?: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };

  HapticFeedback: {
    impactOccurred: (
      style: "light" | "medium" | "heavy" | "rigid" | "soft",
    ) => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };

  // ✨ NEW: Cloud Storage (Bot API 6.9+)
  CloudStorage?: {
    setItem: (
      key: string,
      value: string,
      callback?: (error: string | null, success: boolean) => void,
    ) => void;
    getItem: (
      key: string,
      callback: (error: string | null, value: string | null) => void,
    ) => void;
    getItems: (
      keys: string[],
      callback: (error: string | null, values: Record<string, string>) => void,
    ) => void;
    removeItem: (
      key: string,
      callback?: (error: string | null, success: boolean) => void,
    ) => void;
    removeItems: (
      keys: string[],
      callback?: (error: string | null, success: boolean) => void,
    ) => void;
    getKeys: (callback: (error: string | null, keys: string[]) => void) => void;
  };

  // ✨ NEW: Biometric Manager (Bot API 7.2+)
  BiometricManager?: {
    isInited: boolean;
    isBiometricAvailable: boolean;
    biometricType: "finger" | "face" | "unknown";
    isAccessRequested: boolean;
    isAccessGranted: boolean;
    isBiometricTokenSaved: boolean;
    deviceId: string;
    init: (callback?: () => void) => void;
    requestAccess: (
      params: { reason?: string },
      callback?: (success: boolean) => void,
    ) => void;
    authenticate: (
      params: { reason?: string },
      callback?: (success: boolean, token?: string) => void,
    ) => void;
    updateBiometricToken: (
      token: string,
      callback?: (success: boolean) => void,
    ) => void;
    openSettings: () => void;
  };

  // Basic methods
  close: () => void;
  expand: () => void;
  sendData: (data: string) => void;
  ready: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, eventHandler: (...args: any[]) => void) => void;
  offEvent: (eventType: string, eventHandler: (...args: any[]) => void) => void;
  openLink: (
    url: string,
    options?: { try_instant_view?: boolean; try_browser?: string },
  ) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;

  // Popup methods
  showPopup: (
    params: {
      title?: string;
      message: string;
      buttons?: Array<{
        id?: string;
        type?: "default" | "ok" | "close" | "cancel" | "destructive";
        text?: string;
      }>;
    },
    callback?: (button_id: string) => void,
  ) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (
    message: string,
    callback?: (confirmed: boolean) => void,
  ) => void;

  // QR Scanner methods (Bot API 6.4+)
  showScanQrPopup: (
    params: {
      text?: string;
    },
    callback?: (text: string) => boolean | void,
  ) => void;
  closeScanQrPopup: () => void;

  // Clipboard methods (Bot API 6.4+)
  readTextFromClipboard?: (callback?: (text: string) => void) => void;

  // Contact/Access methods
  requestWriteAccess: (callback?: (granted: boolean) => void) => void;
  requestContact: (callback?: (sent: boolean) => void) => void;

  // Inline query methods (Bot API 6.7+)
  switchInlineQuery?: (query: string, choose_chat_types?: string[]) => void;

  // Custom methods
  invokeCustomMethod: (
    method: string,
    params: any,
    callback?: (error: string | null, result?: any) => void,
  ) => void;

  // ✨ NEW METHODS (Bot API 7.7+)

  // 🔒 ORIENTATION CONTROL
  lockOrientation?: () => void;
  unlockOrientation?: () => void;

  // 🚫 VERTICAL SWIPES CONTROL (блокирует pull-to-refresh и свайп-закрытие)
  disableVerticalSwipes?: () => void;
  enableVerticalSwipes?: () => void;

  // ✨ NEW: Device Motion (Bot API 7.6+)
  Accelerometer?: {
    isStarted: boolean;
    x: number;
    y: number;
    z: number;
    start: (params?: { refresh_rate?: number }, callback?: () => void) => void;
    stop: (callback?: () => void) => void;
  };

  DeviceOrientation?: {
    isStarted: boolean;
    absolute: boolean;
    alpha: number;
    beta: number;
    gamma: number;
    start: (
      params?: { refresh_rate?: number; need_absolute?: boolean },
      callback?: () => void,
    ) => void;
    stop: (callback?: () => void) => void;
  };

  Gyroscope?: {
    isStarted: boolean;
    x: number;
    y: number;
    z: number;
    start: (params?: { refresh_rate?: number }, callback?: () => void) => void;
    stop: (callback?: () => void) => void;
  };

  // ✨ NEW: Share to Story (Bot API 7.8+)
  shareToStory?: (
    media_url: string,
    params?: {
      text?: string;
      widget_link?: {
        url: string;
        name?: string;
      };
    },
  ) => void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}

declare module "@twa-dev/sdk" {
  export default TelegramWebApp;
}
