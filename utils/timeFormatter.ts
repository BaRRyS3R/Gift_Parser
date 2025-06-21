// src/utils/timeFormatter.ts - Centralized time formatting utilities

export function formatSurvivalTime(timeMs: number): string {
    if (timeMs <= 0) return "0s";

    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${seconds}s`;
}

export function formatPhysicsTime(timeMs: number): string {
    if (timeMs <= 0) return "0.000s";

    const seconds = timeMs / 1000;
    return `${seconds.toFixed(3)}s`;
}

export function formatPhysicsTimeCompact(timeMs: number): string {
    if (timeMs <= 0) return "0.000";

    const seconds = timeMs / 1000;
    return seconds.toFixed(3);
}

export function formatReactionTime(timeMs: number): string {
    if (timeMs <= 0) return "0ms";
    return `${Math.round(timeMs)}ms`;
}

export function formatCountdownTime(timeMs: number): string {
    if (timeMs <= 0) return "0:00";

    const totalSeconds = Math.ceil(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${seconds}s`;
}

export function formatResetTimer(timeMs: number): string {
    if (timeMs <= 0) return "0:00";

    const totalSeconds = Math.ceil(timeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDuration(timeMs: number): string {
    if (timeMs <= 0) return "0s";

    const totalSeconds = Math.floor(timeMs / 1000);

    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes < 60) {
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}