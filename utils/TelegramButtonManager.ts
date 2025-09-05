// src/utils/TelegramButtonManager.ts - Исправленная версия с корректным управлением обработчиками

interface ButtonState {
  backButtonVisible: boolean;
  backButtonHandler: (() => void) | null;
  mainButtonVisible: boolean;
  mainButtonHandler: (() => void) | null;
  mainButtonText: string;
  closingConfirmationEnabled: boolean;
}

interface StateSnapshot {
  timestamp: number;
  state: ButtonState;
  context: string;
}

class TelegramButtonManager {
  private isInitialized = false;
  private webApp: any = null;
  private stateHistory: StateSnapshot[] = [];
  private currentContext = "unknown";
  private maxHistorySize = 10;
  
  // Сохраняем ссылки на текущие обработчики для корректного удаления
  private currentBackButtonHandler: (() => void) | null = null;
  private currentMainButtonHandler: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (window.Telegram?.WebApp) {
      this.webApp = window.Telegram.WebApp;
      this.isInitialized = true;
      console.log("TelegramButtonManager: Initialized successfully");
    } else {
      console.warn("TelegramButtonManager: Telegram WebApp not available");
    }
  }

  public isAvailable(): boolean {
    return this.isInitialized && this.webApp !== null;
  }

  private getCurrentState(): ButtonState {
    if (!this.isAvailable()) {
      return this.getDefaultState();
    }

    return {
      backButtonVisible: this.webApp.BackButton?.isVisible || false,
      backButtonHandler: this.currentBackButtonHandler,
      mainButtonVisible: this.webApp.MainButton?.isVisible || false,
      mainButtonHandler: this.currentMainButtonHandler,
      mainButtonText: this.webApp.MainButton?.text || "",
      closingConfirmationEnabled: this.webApp.isClosingConfirmationEnabled || false,
    };
  }

  private getDefaultState(): ButtonState {
    return {
      backButtonVisible: false,
      backButtonHandler: null,
      mainButtonVisible: false,
      mainButtonHandler: null,
      mainButtonText: "",
      closingConfirmationEnabled: false,
    };
  }

  private saveStateSnapshot(context: string): void {
    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      state: this.getCurrentState(),
      context: context,
    };

    this.stateHistory.push(snapshot);

    // Ограничиваем размер истории
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory = this.stateHistory.slice(-this.maxHistorySize);
    }

    console.log(`TelegramButtonManager: Saved state snapshot for context: ${context}`, snapshot);
  }

  private clearAllHandlers(): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Удаляем BackButton обработчики используя сохраненные ссылки
      if (this.webApp.BackButton && this.currentBackButtonHandler) {
        this.webApp.BackButton.offClick(this.currentBackButtonHandler);
        this.currentBackButtonHandler = null;
      }

      // Удаляем MainButton обработчики используя сохраненные ссылки
      if (this.webApp.MainButton && this.currentMainButtonHandler) {
        this.webApp.MainButton.offClick(this.currentMainButtonHandler);
        this.currentMainButtonHandler = null;
      }

      // Скрываем кнопки
      if (this.webApp.BackButton) {
        this.webApp.BackButton.hide();
      }
      if (this.webApp.MainButton) {
        this.webApp.MainButton.hide();
      }

      console.log("TelegramButtonManager: Cleared all handlers successfully");
    } catch (error) {
      console.error("TelegramButtonManager: Error clearing handlers:", error);
      
      // Экстренная очистка через принудительное скрытие
      try {
        if (this.webApp.BackButton) {
          this.webApp.BackButton.hide();
        }
        if (this.webApp.MainButton) {
          this.webApp.MainButton.hide();
        }
        this.currentBackButtonHandler = null;
        this.currentMainButtonHandler = null;
      } catch (emergencyError) {
        console.error("TelegramButtonManager: Emergency cleanup failed:", emergencyError);
      }
    }
  }

  private applyState(state: ButtonState): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Сначала очищаем все существующие обработчики
      this.clearAllHandlers();

      // Применяем состояние BackButton
      if (state.backButtonVisible && state.backButtonHandler) {
        this.currentBackButtonHandler = state.backButtonHandler;
        this.webApp.BackButton.onClick(this.currentBackButtonHandler);
        this.webApp.BackButton.show();
        console.log("TelegramButtonManager: BackButton configured and shown");
      } else {
        this.webApp.BackButton.hide();
        console.log("TelegramButtonManager: BackButton hidden");
      }

      // Применяем состояние MainButton
      if (state.mainButtonVisible) {
        if (state.mainButtonText) {
          this.webApp.MainButton.setText(state.mainButtonText);
        }
        if (state.mainButtonHandler) {
          this.currentMainButtonHandler = state.mainButtonHandler;
          this.webApp.MainButton.onClick(this.currentMainButtonHandler);
        }
        this.webApp.MainButton.show();
        console.log("TelegramButtonManager: MainButton configured and shown");
      } else {
        this.webApp.MainButton.hide();
        console.log("TelegramButtonManager: MainButton hidden");
      }

      // Применяем состояние подтверждения закрытия
      if (state.closingConfirmationEnabled) {
        this.webApp.enableClosingConfirmation();
      } else {
        this.webApp.disableClosingConfirmation();
      }

      console.log("TelegramButtonManager: State applied successfully");
    } catch (error) {
      console.error("TelegramButtonManager: Error applying state:", error);
    }
  }

  /**
   * Устанавливает нормальное состояние для страниц приложения
   * Скрывает все кнопки и отключает подтверждение закрытия
   */
  public setNormalState(): void {
    console.log("TelegramButtonManager: Setting normal state");
    
    this.saveStateSnapshot(this.currentContext);
    this.currentContext = "normal";

    const normalState: ButtonState = {
      backButtonVisible: false,
      backButtonHandler: null,
      mainButtonVisible: false,
      mainButtonHandler: null,
      mainButtonText: "",
      closingConfirmationEnabled: false,
    };

    this.applyState(normalState);
  }

  /**
   * Устанавливает состояние модального окна
   * Показывает BackButton с обработчиком закрытия модала
   */
  public setModalState(onClose: () => void): void {
    console.log("TelegramButtonManager: Setting modal state");
    
    this.saveStateSnapshot(this.currentContext);
    this.currentContext = "modal";

    const modalState: ButtonState = {
      backButtonVisible: true,
      backButtonHandler: onClose,
      mainButtonVisible: false,
      mainButtonHandler: null,
      mainButtonText: "",
      closingConfirmationEnabled: false,
    };

    this.applyState(modalState);
  }

  /**
   * Устанавливает состояние навигации для страниц с возвратом
   * Показывает BackButton с обработчиком навигации
   */
  public setNavigationState(onBack: () => void): void {
    console.log("TelegramButtonManager: Setting navigation state with handler:", onBack.toString().substring(0, 100));
    
    this.saveStateSnapshot(this.currentContext);
    this.currentContext = "navigation";

    const navigationState: ButtonState = {
      backButtonVisible: true,
      backButtonHandler: onBack,
      mainButtonVisible: false,
      mainButtonHandler: null,
      mainButtonText: "",
      closingConfirmationEnabled: false,
    };

    this.applyState(navigationState);
  }

  /**
   * Устанавливает состояние закрытия для страниц, которые должны закрывать приложение
   * Показывает BackButton с обработчиком закрытия приложения
   */
  public setClosingState(options?: {
    showConfirmation?: boolean;
    confirmationMessage?: string;
  }): void {
    console.log("TelegramButtonManager: Setting closing state");
    
    this.saveStateSnapshot(this.currentContext);
    this.currentContext = "closing";

    const showConfirmation = options?.showConfirmation ?? true;

    const closingHandler = () => {
      if (!this.isAvailable()) {
        console.warn("TelegramButtonManager: WebApp not available for closing");
        return;
      }

      if (showConfirmation && options?.confirmationMessage) {
        // Показываем кастомное подтверждение
        this.webApp.showConfirm(options.confirmationMessage, (confirmed: boolean) => {
          if (confirmed) {
            this.webApp.close();
          }
        });
      } else if (showConfirmation) {
        // Используем стандартное подтверждение закрытия
        this.webApp.enableClosingConfirmation();
        this.webApp.close();
      } else {
        // Закрываем без подтверждения
        this.webApp.close();
      }
    };

    const closingState: ButtonState = {
      backButtonVisible: true,
      backButtonHandler: closingHandler,
      mainButtonVisible: false,
      mainButtonHandler: null,
      mainButtonText: "",
      closingConfirmationEnabled: showConfirmation,
    };

    this.applyState(closingState);
  }

  /**
   * Восстанавливает предыдущее состояние из истории
   */
  public restorePreviousState(): void {
    if (this.stateHistory.length === 0) {
      console.log("TelegramButtonManager: No previous state to restore, setting normal state");
      this.setNormalState();
      return;
    }

    // Получаем последнее сохраненное состояние
    const previousSnapshot = this.stateHistory.pop();
    
    if (!previousSnapshot) {
      console.log("TelegramButtonManager: No valid previous state, setting normal state");
      this.setNormalState();
      return;
    }

    console.log(`TelegramButtonManager: Restoring previous state from context: ${previousSnapshot.context}`);
    
    this.currentContext = previousSnapshot.context;

    // Для восстановления состояния навигации нужна новая ссылка на обработчик
    if (previousSnapshot.context === "navigation") {
      console.warn("TelegramButtonManager: Cannot restore navigation handler, setting normal state");
      this.setNormalState();
      return;
    }

    this.applyState(previousSnapshot.state);
  }

  /**
   * Экстренный сброс - очищает все и устанавливает нормальное состояние
   */
  public emergencyReset(): void {
    console.log("TelegramButtonManager: Emergency reset");
    
    this.stateHistory = [];
    this.currentContext = "emergency_reset";
    this.currentBackButtonHandler = null;
    this.currentMainButtonHandler = null;
    
    if (this.isAvailable()) {
      try {
        this.webApp.BackButton.hide();
        this.webApp.MainButton.hide();
        this.webApp.disableClosingConfirmation();
      } catch (error) {
        console.error("TelegramButtonManager: Error during emergency reset:", error);
      }
    }
  }

  /**
   * Получить информацию о текущем состоянии для отладки
   */
  public getDebugInfo(): object {
    return {
      isAvailable: this.isAvailable(),
      currentContext: this.currentContext,
      stateHistoryLength: this.stateHistory.length,
      hasBackButtonHandler: this.currentBackButtonHandler !== null,
      hasMainButtonHandler: this.currentMainButtonHandler !== null,
      currentState: this.getCurrentState(),
      stateHistory: this.stateHistory,
    };
  }

  /**
   * Устанавливает кастомное состояние с полным контролем
   */
  public setCustomState(
    config: {
      showBackButton?: boolean;
      onBackClick?: () => void;
      showMainButton?: boolean;
      mainButtonText?: string;
      onMainButtonClick?: () => void;
      enableClosingConfirmation?: boolean;
    },
    context: string = "custom"
  ): void {
    console.log(`TelegramButtonManager: Setting custom state for context: ${context}`);
    
    this.saveStateSnapshot(this.currentContext);
    this.currentContext = context;

    const customState: ButtonState = {
      backButtonVisible: config.showBackButton || false,
      backButtonHandler: config.onBackClick || null,
      mainButtonVisible: config.showMainButton || false,
      mainButtonHandler: config.onMainButtonClick || null,
      mainButtonText: config.mainButtonText || "",
      closingConfirmationEnabled: config.enableClosingConfirmation || false,
    };

    this.applyState(customState);
  }

  /**
   * Принудительно устанавливает обработчик для навигации (для отладки)
   */
  public forceNavigationHandler(onBack: () => void): void {
    console.log("TelegramButtonManager: Force setting navigation handler");
    
    if (!this.isAvailable()) {
      console.warn("TelegramButtonManager: WebApp not available");
      return;
    }

    try {
      // Очищаем текущий обработчик
      if (this.currentBackButtonHandler) {
        this.webApp.BackButton.offClick(this.currentBackButtonHandler);
      }
      
      // Устанавливаем новый обработчик
      this.currentBackButtonHandler = onBack;
      this.webApp.BackButton.onClick(this.currentBackButtonHandler);
      this.webApp.BackButton.show();
      
      console.log("TelegramButtonManager: Navigation handler forced successfully");
    } catch (error) {
      console.error("TelegramButtonManager: Error forcing navigation handler:", error);
    }
  }
}

// Создаем и экспортируем единственный экземпляр
export const telegramButtonManager = new TelegramButtonManager();