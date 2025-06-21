// src/utils/timeFormatter.ts - Centralized time formatting utilities

/**
 * Formats survival game time from milliseconds to human-readable format
 * @param timeMs - Time in milliseconds
 * @returns Formatted time string (e.g., "1:23.456" or "45.123s")
 */
export function formatSurvivalTime(timeMs: number): string {
    if (timeMs <= 0) return "0.000s";

    const totalSeconds = timeMs / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    if (minutes > 0) {
        const wholeSeconds = Math.floor(remainingSeconds);
        const milliseconds = Math.floor((remainingSeconds - wholeSeconds) * 1000);
        return `${minutes}:${wholeSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }

    return `${totalSeconds.toFixed(3)}s`;
}

/**
 * Formats physics game time from milliseconds to seconds with 3 decimal places
 * @param timeMs - Time in milliseconds
 * @returns Formatted time string (e.g., "53.421s")
 */
export function formatPhysicsTime(timeMs: number): string {
    if (timeMs <= 0) return "0.000s";

    // Handle case where time might be stored as seconds instead of milliseconds
    // If number is too large (> 3600), assume it's in milliseconds
    // If number is small (< 3600), assume it's in seconds
    let seconds: number;
    if (timeMs > 3600) {
        // Assume milliseconds
        seconds = timeMs / 1000;
    } else {
        // Assume already in seconds
        seconds = timeMs;
    }

    return `${seconds.toFixed(3)}s`;
}

/**
 * Formats physics game time for display in compact format
 * @param timeMs - Time in milliseconds
 * @returns Formatted time string without 's' suffix for tight spaces
 */
export function formatPhysicsTimeCompact(timeMs: number): string {
    if (timeMs <= 0) return "0.000";

    const seconds = timeMs / 1000;
    return seconds.toFixed(3);
}

/**
 * Formats reaction time in milliseconds
 * @param timeMs - Time in milliseconds
 * @returns Formatted time string (e.g., "150ms")
 */
export function formatReactionTime(timeMs: number): string {
    if (timeMs <= 0) return "0ms";
    return `${Math.round(timeMs)}ms`;
}

/**
 * Formats countdown timer display
 * @param timeMs - Time remaining in milliseconds
 * @returns Formatted countdown string (e.g., "2:30" or "45s")
 */
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

/**
 * Formats reset timer display (hours and minutes)
 * @param timeMs - Time remaining in milliseconds
 * @returns Formatted reset timer string (e.g., "1:30" for 1 hour 30 minutes)
 */
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

/**
 * Formats duration for display in statistics
 * @param timeMs - Duration in milliseconds
 * @returns Formatted duration string with appropriate units
 */
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