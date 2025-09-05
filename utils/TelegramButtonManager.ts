// src/utils/TelegramButtonManager.ts - Centralized Telegram button management system

interface TelegramWebApp {
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
}

class TelegramButtonManager {
  private webApp: TelegramWebApp | null = null;
  private currentState: 'normal' | 'modal' = 'normal';
  private modalHandler: (() => void) | null = null;
  private allHandlers: Set<() => void> = new Set();
  
  constructor() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      this.webApp = window.Telegram.WebApp as TelegramWebApp;
    }
  }

  /**
   * Aggressively clear all button handlers
   */
  private clearAllHandlers(): void {
    if (!this.webApp) return;

    console.log('[TelegramButtonManager] Clearing all handlers');

    // Method 1: Clear known handlers
    this.allHandlers.forEach(handler => {
      try {
        if (this.webApp?.BackButton?.offClick) {
          this.webApp.BackButton.offClick(handler);
        }
        if (this.webApp?.MainButton?.offClick) {
          this.webApp.MainButton.offClick(handler);
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    });

    // Method 2: Brute force handler removal
    for (let i = 0; i < 20; i++) {
      try {
        const dummyHandler = () => {};
        if (this.webApp?.BackButton?.offClick) {
          this.webApp.BackButton.offClick(dummyHandler);
        }
        if (this.webApp?.MainButton?.offClick) {
          this.webApp.MainButton.offClick(dummyHandler);
        }
      } catch (error) {
        // Expected when no more handlers to remove
      }
    }

    // Method 3: Try to access internal handler arrays (if available)
    try {
      const backButton = this.webApp?.BackButton as any;
      const mainButton = this.webApp?.MainButton as any;
      
      if (backButton && backButton.__handlers) {
        backButton.__handlers = [];
      }
      if (backButton && backButton.callbacks) {
        backButton.callbacks = [];
      }
      
      if (mainButton && mainButton.__handlers) {
        mainButton.__handlers = [];
      }
      if (mainButton && mainButton.callbacks) {
        mainButton.callbacks = [];
      }
    } catch (error) {
      // Internal structure might not be available
    }

    this.allHandlers.clear();
    this.modalHandler = null;
  }

  /**
   * Force set normal app state (profile page)
   */
  public setNormalState(): void {
    if (!this.webApp) return;

    console.log('[TelegramButtonManager] Setting normal state');
    
    this.currentState = 'normal';
    
    // Clear all handlers first
    this.clearAllHandlers();
    
    // Force hide all buttons
    try {
      this.webApp.BackButton?.hide();
      this.webApp.MainButton?.hide();
    } catch (error) {
      console.warn('[TelegramButtonManager] Error hiding buttons:', error);
    }

    // Enable close confirmation
    try {
      this.webApp.enableClosingConfirmation();
      console.log('[TelegramButtonManager] Close confirmation enabled');
    } catch (error) {
      console.warn('[TelegramButtonManager] Error enabling close confirmation:', error);
    }
  }

  /**
   * Force set modal state with back button
   */
  public setModalState(onBack: () => void): void {
    if (!this.webApp) return;

    console.log('[TelegramButtonManager] Setting modal state');
    
    this.currentState = 'modal';
    
    // Clear all handlers first
    this.clearAllHandlers();
    
    // Disable close confirmation immediately
    try {
      this.webApp.disableClosingConfirmation();
      console.log('[TelegramButtonManager] Close confirmation disabled');
    } catch (error) {
      console.warn('[TelegramButtonManager] Error disabling close confirmation:', error);
    }

    // Force hide all buttons first
    try {
      this.webApp.BackButton?.hide();
      this.webApp.MainButton?.hide();
    } catch (error) {
      console.warn('[TelegramButtonManager] Error hiding buttons:', error);
    }

    // Create and store the modal handler
    this.modalHandler = () => {
      console.log('[TelegramButtonManager] Modal back button clicked');
      onBack();
    };
    
    this.allHandlers.add(this.modalHandler);

    // Wait for clean state, then show back button with handler
    setTimeout(() => {
      if (this.currentState === 'modal' && this.webApp && this.modalHandler) {
        try {
          // Show back button
          this.webApp.BackButton?.show();
          // Add handler
          this.webApp.BackButton?.onClick(this.modalHandler);
          console.log('[TelegramButtonManager] Back button shown with modal handler');
        } catch (error) {
          console.warn('[TelegramButtonManager] Error setting up back button:', error);
        }
      }
    }, 200);
  }

  /**
   * Emergency reset - force clean state
   */
  public emergencyReset(): void {
    if (!this.webApp) return;

    console.log('[TelegramButtonManager] Emergency reset triggered');
    
    this.clearAllHandlers();
    
    try {
      this.webApp.BackButton?.hide();
      this.webApp.MainButton?.hide();
      this.webApp.disableClosingConfirmation();
    } catch (error) {
      console.warn('[TelegramButtonManager] Error during emergency reset:', error);
    }
    
    this.currentState = 'normal';
    
    // Wait and restore normal state
    setTimeout(() => {
      this.setNormalState();
    }, 300);
  }

  /**
   * Get current state
   */
  public getCurrentState(): 'normal' | 'modal' {
    return this.currentState;
  }

  /**
   * Check if WebApp is available
   */
  public isAvailable(): boolean {
    return this.webApp !== null;
  }
}

// Create singleton instance
export const telegramButtonManager = new TelegramButtonManager();

// Export the class for testing purposes
export default TelegramButtonManager;