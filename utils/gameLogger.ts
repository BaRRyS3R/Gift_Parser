// src/utils/gameLogger.ts - Game logging utility implementation

import { nanoid } from "nanoid";
import { GameLogger, GameLogEntry, GameLogType, GameLogData } from "@/types/game-modes/logging";

export function createGameLogger(gameStartTime: number = Date.now()): GameLogger {
  const entries: GameLogEntry[] = [];

  const addEntry = (type: GameLogType, data: GameLogData): void => {
    const timestamp = Date.now();
    const entry: GameLogEntry = {
      id: nanoid(8),
      timestamp,
      relativeTime: timestamp - gameStartTime,
      type,
      data,
    };
    entries.push(entry);
  };

  const getFormattedLog = (): string => {
    if (entries.length === 0) {
      return "No game events recorded.";
    }

    const lines: string[] = [];
    lines.push("=== SURVIVAL GAME DEBUG LOG ===");
    lines.push(`Game Start Time: ${new Date(gameStartTime).toISOString()}`);
    lines.push(`Total Events: ${entries.length}`);
    lines.push(`Log Generated: ${new Date().toISOString()}`);
    lines.push("");

    entries.forEach((entry, index) => {
      const relativeTimeStr = formatRelativeTime(entry.relativeTime);
      const timestampStr = new Date(entry.timestamp).toISOString().split('T')[1].split('.')[0];
      
      lines.push(`[${index + 1}] ${timestampStr} (+${relativeTimeStr}) ${entry.type}`);
      
      // Format data based on log type
      switch (entry.type) {
        case GameLogType.GAME_START:
          const gameStartData = entry.data as any;
          lines.push(`    Mode: ${gameStartData.gameMode}`);
          lines.push(`    Config: ${JSON.stringify(gameStartData.config, null, 4).split('\n').map((line, i) => i === 0 ? line : `    ${line}`).join('\n')}`);
          break;

        case GameLogType.CIRCLE_ACTIVATION:
          const activationData = entry.data as any;
          lines.push(`    Activated Circles: [${activationData.circleIds.join(', ')}]`);
          lines.push(`    Red Circles: [${activationData.redCircleIds.join(', ')}]`);
          lines.push(`    Total Active: ${activationData.activeCircleCount}`);
          lines.push(`    Level Config: Lvl ${activationData.levelConfig.level}, Max ${activationData.levelConfig.simultaneousCircles}, Active Time ${activationData.levelConfig.circleActiveTime}ms`);
          if (Object.keys(activationData.recentlyUsedCircles).length > 0) {
            lines.push(`    Recently Used: ${JSON.stringify(activationData.recentlyUsedCircles)}`);
          }
          break;

        case GameLogType.CIRCLE_CLICK:
          const clickData = entry.data as any;
          lines.push(`    Circle ID: ${clickData.circleId}`);
          lines.push(`    Circle State: Active=${clickData.circleState.isActive}, Animating=${clickData.circleState.isAnimating}, Decoy=${clickData.circleState.isDecoy}`);
          lines.push(`    Game State: ${clickData.gameState}`);
          lines.push(`    Active Circle IDs: [${clickData.activeCircleIds.join(', ')}]`);
          lines.push(`    Click Result: ${clickData.result.toUpperCase()}`);
          if (clickData.reactionTime) {
            lines.push(`    Reaction Time: ${clickData.reactionTime}ms`);
          }
          break;

        case GameLogType.CIRCLE_DEACTIVATION:
          const deactivationData = entry.data as any;
          lines.push(`    Circle ID: ${deactivationData.circleId}`);
          lines.push(`    Reason: ${deactivationData.reason.toUpperCase()}`);
          lines.push(`    Was Decoy: ${deactivationData.wasDecoy}`);
          lines.push(`    Active Duration: ${deactivationData.activeTime}ms`);
          break;

        case GameLogType.CIRCLE_TIMEOUT:
          const timeoutData = entry.data as any;
          lines.push(`    Circle ID: ${timeoutData.circleId}`);
          lines.push(`    Was Decoy: ${timeoutData.wasDecoy}`);
          lines.push(`    Scheduled Duration: ${timeoutData.scheduledDuration}ms`);
          break;

        case GameLogType.LEVEL_UP:
          const levelData = entry.data as any;
          lines.push(`    Level: ${levelData.previousLevel} → ${levelData.newLevel}`);
          lines.push(`    Survival Time: ${levelData.survivalTime}ms`);
          break;

        case GameLogType.GAME_STATE_CHANGE:
          const stateData = entry.data as any;
          lines.push(`    State: ${stateData.from} → ${stateData.to}`);
          if (stateData.reason) {
            lines.push(`    Reason: ${stateData.reason}`);
          }
          break;

        case GameLogType.GAME_END:
          const endData = entry.data as any;
          lines.push(`    Cause: ${endData.cause.toUpperCase()}`);
          lines.push(`    Final Stats: ${JSON.stringify(endData.finalStats, null, 4).split('\n').map((line, i) => i === 0 ? line : `    ${line}`).join('\n')}`);
          break;

        case GameLogType.ERROR:
          const errorData = entry.data as any;
          lines.push(`    ERROR: ${errorData.message}`);
          lines.push(`    Context: ${JSON.stringify(errorData.context, null, 4).split('\n').map((line, i) => i === 0 ? line : `    ${line}`).join('\n')}`);
          if (errorData.stack) {
            lines.push(`    Stack: ${errorData.stack}`);
          }
          break;

        default:
          lines.push(`    Data: ${JSON.stringify(entry.data, null, 2)}`);
      }
      
      lines.push("");
    });

    lines.push("=== END OF LOG ===");
    return lines.join("\n");
  };

  const clear = (): void => {
    entries.length = 0;
  };

  return {
    entries,
    gameStartTime,
    addEntry,
    getFormattedLog,
    clear,
  };
}

function formatRelativeTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const ms = milliseconds % 1000;
  
  if (seconds < 60) {
    return `${seconds}.${ms.toString().padStart(3, '0')}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export { GameLogType, type GameLogger, type GameLogEntry, type GameLogData } from "@/types/game-modes/logging";