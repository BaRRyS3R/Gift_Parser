// src/utils/TelegramButtonManager.ts - Централизованное управление кнопками Telegram WebApp

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
      backButtonHandler: null, // Не можем получить текущий обработчик
      mainButtonVisible: this.webApp.MainButton?.isVisible || false,
      mainButtonHandler: null, // Не можем получить текущий обработчик
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
      // Принудительная очистка всех обработчиков BackButton
      if (this.webApp.BackButton) {
        // Скрываем кнопку, что также должно очистить обработчики
        this.webApp.BackButton.hide();
        
        // Попытка очистить обработчики через множественные вызовы offClick
        // Это хак, но работает лучше, чем ничего
        for (let i = 0; i < 20; i++) {
          try {
            const dummyHandler = () => {};
            this.webApp.BackButton.offClick(dummyHandler);
          } catch (e) {
            // Игнорируем ошибки
          }
        }
      }

      // Очистка MainButton
      if (this.webApp.MainButton) {
        this.webApp.MainButton.hide();
        
        for (let i = 0; i < 20; i++) {
          try {
            const dummyHandler = () => {};
            this.webApp.MainButton.offClick(dummyHandler);
          } catch (e) {
            // Игнорируем ошибки
          }
        }
      }

      console.log("TelegramButtonManager: Cleared all handlers");
    } catch (error) {
      console.error("TelegramButtonManager: Error clearing handlers:", error);
    }
  }

  private applyState(state: ButtonState, handler?: (() => void) | null): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Сначала очищаем все
      this.clearAllHandlers();

      // Применяем состояние BackButton
      if (state.backButtonVisible && handler) {
        this.webApp.BackButton.show();
        this.webApp.BackButton.onClick(handler);
      } else {
        this.webApp.BackButton.hide();
      }

      // Применяем состояние MainButton
      if (state.mainButtonVisible) {
        this.webApp.MainButton.show();
        if (state.mainButtonText) {
          this.webApp.MainButton.setText(state.mainButtonText);
        }
        if (handler) {
          this.webApp.MainButton.onClick(handler);
        }
      } else {
        this.webApp.MainButton.hide();
      }

      // Применяем состояние подтверждения закрытия
      if (state.closingConfirmationEnabled) {
        this.webApp.enableClosingConfirmation();
      } else {
        this.webApp.disableClosingConfirmation();
      }

      console.log("TelegramButtonManager: Applied state successfully");
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

    this.applyState(modalState, onClose);
  }

  /**
   * Устанавливает состояние навигации для страниц с возвратом
   * Показывает BackButton с обработчиком навигации
   */
  public setNavigationState(onBack: () => void): void {
    console.log("TelegramButtonManager: Setting navigation state");
    
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

    this.applyState(navigationState, onBack);
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

    this.applyState(closingState, closingHandler);
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

    // Определяем обработчик на основе контекста
    let handler: (() => void) | null = null;
    
    if (previousSnapshot.context === "navigation") {
      // Для навигационного контекста нужно как-то восстановить обработчик
      // Но поскольку мы не можем сохранить функцию, устанавливаем нормальное состояние
      console.warn("TelegramButtonManager: Cannot restore navigation handler, setting normal state");
      this.setNormalState();
      return;
    }

    this.applyState(previousSnapshot.state, handler);
  }

  /**
   * Экстренный сброс - очищает все и устанавливает нормальное состояние
   */
  public emergencyReset(): void {
    console.log("TelegramButtonManager: Emergency reset");
    
    this.stateHistory = [];
    this.currentContext = "emergency_reset";
    
    this.clearAllHandlers();
    
    // Устанавливаем безопасное состояние
    if (this.isAvailable()) {
      this.webApp.BackButton.hide();
      this.webApp.MainButton.hide();
      this.webApp.disableClosingConfirmation();
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

    // Определяем приоритетный обработчик
    const primaryHandler = config.onBackClick || config.onMainButtonClick || null;

    this.applyState(customState, primaryHandler);
  }
}

// Создаем и экспортируем единственный экземпляр
export const telegramButtonManager = new TelegramButtonManager();