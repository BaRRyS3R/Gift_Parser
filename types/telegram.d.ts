// src/types/telegram.d.ts - Обновленная версия с новыми методами Mini Apps 2.0 (без нового SDK)

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
      photo_url?: string; // 🆕 Доступно в Mini Apps 2.0
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
    bottom_bar_bg_color?: string; // 🆕 Mini Apps 2.0
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  isClosingConfirmationEnabled: boolean;
  headerColor: string;
  backgroundColor: string;
  bottomBarColor?: string; // 🆕 Mini Apps 2.0

  // 🆕 НОВЫЕ СВОЙСТВА MINI APPS 2.0
  isActive?: boolean; // Активно ли приложение
  isFullscreen?: boolean; // В полноэкранном режиме ли приложение
  isOrientationLocked?: boolean; // Заблокирована ли ориентация
  isVerticalSwipesEnabled?: boolean; // Включены ли вертикальные свайпы

  // 🆕 SAFE AREA INSETS (Mini Apps 2.0)
  safeAreaInset?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  contentSafeAreaInset?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };

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

  // 🆕 SECONDARY BUTTON (Mini Apps 2.0)
  SecondaryButton?: {
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

  // 🆕 DEVICE MOTION (Mini Apps 2.0)
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

  // Базовые методы
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

  // 🆕 НОВЫЕ МЕТОДЫ MINI APPS 2.0 (доступны через window.Telegram.WebApp)

  // FULLSCREEN МЕТОДЫ
  requestFullscreen?: () => Promise<void> | void;
  exitFullscreen?: () => Promise<void> | void;

  // ORIENTATION МЕТОДЫ
  lockOrientation?: () => void;
  unlockOrientation?: () => void;

  // VERTICAL SWIPES МЕТОДЫ
  disableVerticalSwipes?: () => void;
  enableVerticalSwipes?: () => void;

  // BOTTOM BAR МЕТОДЫ
  setBottomBarColor?: (color: string) => void;

  // HOME SCREEN МЕТОДЫ
  addToHomeScreen?: () => void;
  checkHomeScreenStatus?: (callback: (status: string) => void) => void;

  // MEDIA SHARING МЕТОДЫ
  shareMessage?: (params: {
    text?: string;
    parse_mode?: string;
    entities?: any[];
  }) => void;

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

  // FILE DOWNLOAD МЕТОДЫ
  downloadFile?: (params: { url: string; filename: string }) => void;

  // EMOJI STATUS МЕТОДЫ
  setEmojiStatus?: (params: {
    custom_emoji_id: string;
    duration?: number;
  }) => void;

  requestEmojiStatusAccess?: (callback?: (granted: boolean) => void) => void;

  // GEOLOCATION МЕТОДЫ
  requestLocation?: (
    params?: {
      live_period?: number;
    },
    callback?: (
      location: {
        latitude: number;
        longitude: number;
        altitude?: number;
        course?: number;
        speed?: number;
        horizontal_accuracy?: number;
        live_period?: number;
      } | null,
    ) => void,
  ) => void;

  openLocationSettings?: () => void;

  // SAFE AREA МЕТОДЫ
  requestSafeAreaInset?: () => void;
  requestContentSafeAreaInset?: () => void;

  // Остальные методы
  openLink: (
    url: string,
    options?: { try_instant_view?: boolean; try_browser?: string },
  ) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;

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

  showScanQrPopup: (
    params: {
      text?: string;
    },
    callback?: (text: string) => boolean | void,
  ) => void;
  closeScanQrPopup: () => void;

  readTextFromClipboard?: (callback?: (text: string) => void) => void;

  requestWriteAccess: (callback?: (granted: boolean) => void) => void;
  requestContact: (callback?: (sent: boolean) => void) => void;

  switchInlineQuery?: (query: string, choose_chat_types?: string[]) => void;

  invokeCustomMethod: (
    method: string,
    params: any,
    callback?: (error: string | null, result?: any) => void,
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
