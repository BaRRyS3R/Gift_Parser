// src/types/game-logging.ts - Система логирования для отладки игрового процесса

export interface GameLogEntry {
    timestamp: number;
    relativeTime: number; // Время относительно начала игры в миллисекундах
    type: LogEventType;
    data: LogEventData;
}

export enum LogEventType {
    GAME_START = "GAME_START",
    GAME_END = "GAME_END",
    LEVEL_CHANGE = "LEVEL_CHANGE",
    CIRCLE_ACTIVATED = "CIRCLE_ACTIVATED",
    CIRCLE_DEACTIVATED = "CIRCLE_DEACTIVATED",
    CIRCLE_TIMEOUT = "CIRCLE_TIMEOUT",
    PLAYER_CLICK = "PLAYER_CLICK",
    ACTIVATION_SCHEDULED = "ACTIVATION_SCHEDULED",
    ERROR_OCCURRED = "ERROR_OCCURRED",
}

export type LogEventData =
    | GameStartEventData
    | GameEndEventData
    | LevelChangeEventData
    | CircleActivatedEventData
    | CircleDeactivatedEventData
    | CircleTimeoutEventData
    | PlayerClickEventData
    | ActivationScheduledEventData
    | ErrorEventData;

export interface GameStartEventData {
    mode: string;
    initialLevel: number;
    circleCount: number;
}

export interface GameEndEventData {
    finalLevel: number;
    totalTime: number;
    cause: string;
    finalScore: number;
    correctHits: number;
    wrongHits: number;
    missedCircles: number;
    decoyHits: number;
}

export interface LevelChangeEventData {
    fromLevel: number;
    toLevel: number;
    timeInPreviousLevel: number;
    totalSurvivalTime: number;
}

export interface CircleActivatedEventData {
    circleId: number;
    isDecoy: boolean;
    activeTime: number; // Время жизни круга в миллисекундах
    simultaneousCircles: number; // Сколько кругов активно одновременно
    currentLevel: number;
    batchId: string; // Уникальный ID для группы одновременно активированных кругов
}

export interface CircleDeactivatedEventData {
    circleId: number;
    reason: "clicked" | "timeout" | "game_end";
    wasDecoy: boolean;
    lifeTime: number; // Сколько времени круг был активен
}

export interface CircleTimeoutEventData {
    circleId: number;
    wasDecoy: boolean;
    scheduledLifeTime: number;
    actualLifeTime: number;
}

export interface PlayerClickEventData {
    circleId: number;
    result: "correct" | "wrong" | "decoy";
    reactionTime?: number; // Время от активации до клика (только для правильных кликов)
    circleWasActive: boolean;
    circleWasDecoy: boolean;
    clickX?: number; // Координаты клика для анализа точности
    clickY?: number;
}

export interface ActivationScheduledEventData {
    delay: number; // Задержка до следующей активации
    currentActiveCircles: number;
    level: number;
    nextBatchSize: number; // Сколько кругов будет активировано
}

export interface ErrorEventData {
    errorType: string;
    message: string;
    stackTrace?: string;
    gameState?: any; // Снимок состояния игры на момент ошибки
}

export interface GameLogger {
    entries: GameLogEntry[];
    gameStartTime: number | null;
    addEntry: (type: LogEventType, data: LogEventData) => void;
    clear: () => void;
    getFormattedLog: () => string;
    exportLog: () => GameLogExport;
}

export interface GameLogExport {
    sessionId: string;
    gameMode: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
    entries: GameLogEntry[];
    summary: GameLogSummary;
}

export interface GameLogSummary {
    totalEvents: number;
    circlesActivated: number;
    circlesClickedCorrectly: number;
    circlesTimedOut: number;
    averageReactionTime: number;
    levelChanges: number;
    errors: number;
}

// Утилитарные функции для работы с логами
export const createLogger = (): GameLogger => {
    const logger: GameLogger = {
        entries: [],
        gameStartTime: null,

        addEntry: (type: LogEventType, data: LogEventData) => {
            const timestamp = Date.now();
            const relativeTime = logger.gameStartTime ? timestamp - logger.gameStartTime : 0;

            logger.entries.push({
                timestamp,
                relativeTime,
                type,
                data,
            });

            // Ограничиваем размер лога для производительности
            if (logger.entries.length > 1000) {
                logger.entries = logger.entries.slice(-800);
            }
        },

        clear: () => {
            logger.entries = [];
            logger.gameStartTime = null;
        },

        getFormattedLog: () => {
            return logger.entries
                .map((entry) => {
                    const timeStr = (entry.relativeTime / 1000).toFixed(3).padStart(8);
                    const typeStr = entry.type.padEnd(20);
                    const dataStr = JSON.stringify(entry.data);
                    return `[${timeStr}s] ${typeStr} ${dataStr}`;
                })
                .join('\n');
        },

        exportLog: () => {
            const summary = calculateLogSummary(logger.entries);
            const sessionId = generateSessionId();

            return {
                sessionId,
                gameMode: "survival",
                startTime: logger.gameStartTime ? new Date(logger.gameStartTime).toISOString() : "",
                endTime: new Date().toISOString(),
                totalDuration: logger.gameStartTime ? Date.now() - logger.gameStartTime : 0,
                entries: [...logger.entries],
                summary,
            };
        },
    };

    return logger;
};

const calculateLogSummary = (entries: GameLogEntry[]): GameLogSummary => {
    const summary: GameLogSummary = {
        totalEvents: entries.length,
        circlesActivated: 0,
        circlesClickedCorrectly: 0,
        circlesTimedOut: 0,
        averageReactionTime: 0,
        levelChanges: 0,
        errors: 0,
    };

    const reactionTimes: number[] = [];

    entries.forEach((entry) => {
        switch (entry.type) {
            case LogEventType.CIRCLE_ACTIVATED:
                summary.circlesActivated++;
                break;
            case LogEventType.CIRCLE_TIMEOUT:
                summary.circlesTimedOut++;
                break;
            case LogEventType.PLAYER_CLICK:
                const clickData = entry.data as PlayerClickEventData;
                if (clickData.result === "correct") {
                    summary.circlesClickedCorrectly++;
                    if (clickData.reactionTime) {
                        reactionTimes.push(clickData.reactionTime);
                    }
                }
                break;
            case LogEventType.LEVEL_CHANGE:
                summary.levelChanges++;
                break;
            case LogEventType.ERROR_OCCURRED:
                summary.errors++;
                break;
        }
    });

    if (reactionTimes.length > 0) {
        summary.averageReactionTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
    }

    return summary;
};

const generateSessionId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};