// src/utils/gameLogger.ts - Comprehensive game logging system

import { GameMode } from "@/types/game-modes/common";

export interface GameLogEntry {
  timestamp: number;
  gameTime: number; // Time since game start in ms
  level: number;
  event: string;
  details: Record<string, any>;
  component: string;
  userAgent?: string;
}

export interface GameLogContext {
  gameStartTime: number;
  currentLevel: number;
  gameMode: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
    isIOS: boolean;
    screenWidth: number;
    screenHeight: number;
  };
}

export class GameLogger {
  private logs: GameLogEntry[] = [];
  private context: GameLogContext;

  constructor(gameMode: string) {
    this.context = {
      gameStartTime: Date.now(),
      currentLevel: 1,
      gameMode,
      deviceInfo: this.getDeviceInfo(),
    };

    this.log('GAME_INIT', {
      gameMode,
      deviceInfo: this.context.deviceInfo,
    }, 'GameLogger');
  }

  private getDeviceInfo() {
    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : 'unknown';
    const platform = typeof window !== 'undefined' ? navigator.platform : 'unknown';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    return {
      userAgent,
      platform,
      isMobile,
      isIOS,
      screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
      screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    };
  }

  public updateLevel(level: number): void {
    this.context.currentLevel = level;
    this.log('LEVEL_CHANGED', { newLevel: level }, 'GameLogger');
  }

  public log(event: string, details: Record<string, any> = {}, component: string = 'Unknown'): void {
    const now = Date.now();
    const gameTime = now - this.context.gameStartTime;
    
    const logEntry: GameLogEntry = {
      timestamp: now,
      gameTime,
      level: this.context.currentLevel,
      event,
      details: {
        ...details,
        // Add iOS-specific debugging info
        ...(this.context.deviceInfo.isIOS && {
          iosDebugInfo: {
            touchSupported: 'ontouchstart' in window,
            visualViewportSupported: 'visualViewport' in window,
            safariVersion: this.getSafariVersion(),
          }
        })
      },
      component,
      userAgent: this.context.deviceInfo.userAgent,
    };

    this.logs.push(logEntry);

    // Log to console in production for debugging
    console.log(`[${component}] ${event}:`, details);
  }

  private getSafariVersion(): string {
    const ua = navigator.userAgent;
    const safariMatch = ua.match(/Version\/(\d+\.?\d*)/);
    return safariMatch ? safariMatch[1] : 'unknown';
  }

  public getLogs(): GameLogEntry[] {
    return [...this.logs];
  }

  public getFormattedLogs(): string {
    const header = `=== GAME LOG EXPORT ===
Game Mode: ${this.context.gameMode}
Device: ${this.context.deviceInfo.platform}
iOS: ${this.context.deviceInfo.isIOS}
User Agent: ${this.context.deviceInfo.userAgent}
Screen: ${this.context.deviceInfo.screenWidth}x${this.context.deviceInfo.screenHeight}
Game Duration: ${Date.now() - this.context.gameStartTime}ms
Total Events: ${this.logs.length}

=== EVENTS ===\n`;

    const events = this.logs.map(log => {
      const timeFormatted = (log.gameTime / 1000).toFixed(3);
      const detailsStr = Object.keys(log.details).length > 0 
        ? ` | ${JSON.stringify(log.details)}` 
        : '';
      
      return `[${timeFormatted}s] L${log.level} [${log.component}] ${log.event}${detailsStr}`;
    }).join('\n');

    return header + events + '\n\n=== END LOG ===';
  }

  public exportToClipboard(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const logData = this.getFormattedLogs();
        
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(logData).then(() => {
            this.log('LOG_COPIED_TO_CLIPBOARD', { size: logData.length }, 'GameLogger');
            resolve(true);
          }).catch(() => {
            this.fallbackCopyToClipboard(logData);
            resolve(false);
          });
        } else {
          this.fallbackCopyToClipboard(logData);
          resolve(false);
        }
      } catch (error) {
        this.log('LOG_EXPORT_ERROR', { error: error?.toString() }, 'GameLogger');
        resolve(false);
      }
    });
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.log('LOG_COPIED_FALLBACK', { size: text.length }, 'GameLogger');
    } catch (error) {
      this.log('LOG_COPY_FAILED', { error: error?.toString() }, 'GameLogger');
    }
    
    document.body.removeChild(textArea);
  }

  public clear(): void {
    this.log('LOG_CLEARED', { previousLogCount: this.logs.length }, 'GameLogger');
    this.logs = [];
  }
}

// Global logger instance
let globalGameLogger: GameLogger | null = null;

export function initializeGameLogger(gameMode: string): GameLogger {
  globalGameLogger = new GameLogger(gameMode);
  return globalGameLogger;
}

export function getGameLogger(): GameLogger | null {
  return globalGameLogger;
}

export function clearGameLogger(): void {
  globalGameLogger = null;
}