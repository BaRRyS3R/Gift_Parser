// src/lib/security/ShadowSecurityManager.ts - Complete shadow security tracking system

import { GameMode } from "@/types/game-modes/common";
import {
    ClickRecord,
    SuspiciousActivityData,
    ShadowSecurityState,
} from "@/types/security/shadowSecurity";

/**
 * Shadow Security Manager
 * Tracks suspicious clicking patterns without interfering with game logic
 * Designed to detect automated clicking scripts by monitoring reaction times
 */
export class ShadowSecurityManager {
    private state: ShadowSecurityState;

    /**
     * Initialize the shadow security manager for a new game session
     * @param gameMode - The current game mode being played
     * @param gameStartTime - Timestamp when the game started (defaults to current time)
     */
    constructor(gameMode: GameMode, gameStartTime: number = Date.now()) {
        this.state = {
            isEnabled: true,
            clickRecords: [],
            circleActivationTimes: new Map(),
            gameMode,
            gameStartTime,
            suspiciousThreshold: 250, // 250ms threshold for suspicious activity
        };
    }

    /**
     * Record when a white circle becomes active
     * This should be called only for white (target) circles, not red (decoy) circles
     * @param circleId - Unique identifier for the circle
     * @param activationTime - Timestamp when the circle became active (defaults to current time)
     */
    recordCircleActivation(circleId: number, activationTime: number = Date.now()): void {
        if (!this.state.isEnabled) {
            return;
        }

        // Store the activation time for this circle
        this.state.circleActivationTimes.set(circleId, activationTime);
    }

    /**
     * Record when a white active circle is successfully clicked
     * This should only be called for successful hits on white circles
     * @param circleId - Unique identifier for the clicked circle
     * @param clickTime - Timestamp when the circle was clicked (defaults to current time)
     */
    recordCircleClick(circleId: number, clickTime: number = Date.now()): void {
        if (!this.state.isEnabled) {
            return;
        }

        // Get the activation time for this circle
        const activationTime = this.state.circleActivationTimes.get(circleId);

        if (activationTime === undefined) {
            // Circle activation time not recorded, skip this click
            // This can happen if the circle was activated before security tracking started
            return;
        }

        // Calculate reaction time
        const reactionTime = clickTime - activationTime;

        // Determine if this click is suspicious (faster than human reaction time)
        const isSuspicious = reactionTime < this.state.suspiciousThreshold;

        // Create click record
        const clickRecord: ClickRecord = {
            circleId,
            activationTime,
            clickTime,
            reactionTime,
            isSuspicious,
        };

        // Store the click record
        this.state.clickRecords.push(clickRecord);

        // Clean up the activation time record since it's no longer needed
        this.state.circleActivationTimes.delete(circleId);
    }

    /**
     * Clean up activation time tracking for circles that were not clicked
     * This should be called when a circle times out, is deactivated, or the game ends
     * @param circleId - Unique identifier for the circle to clean up
     */
    cleanupCircleActivation(circleId: number): void {
        if (!this.state.isEnabled) {
            return;
        }

        // Remove the activation time record for this circle
        this.state.circleActivationTimes.delete(circleId);
    }

    /**
     * Generate aggregated suspicious activity data for submission to server
     * This should be called at the end of a game session
     * @param telegramId - The user's Telegram ID
     * @param gameEndTime - Timestamp when the game ended (defaults to current time)
     * @returns SuspiciousActivityData if suspicious activity detected, null otherwise
     */
    generateSuspiciousActivityData(
        telegramId: number,
        gameEndTime: number = Date.now()
    ): SuspiciousActivityData | null {
        if (!this.state.isEnabled || this.state.clickRecords.length === 0) {
            return null;
        }

        // Filter for suspicious clicks
        const suspiciousClicks = this.state.clickRecords.filter(record => record.isSuspicious);

        // Only generate data if there are suspicious clicks
        if (suspiciousClicks.length === 0) {
            return null;
        }

        // Calculate reaction time statistics
        const reactionTimes = this.state.clickRecords.map(record => record.reactionTime);
        const minReactionTime = Math.min(...reactionTimes);
        const maxReactionTime = Math.max(...reactionTimes);
        const avgReactionTime = Math.round(
            reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length
        );

        return {
            telegramId,
            gameMode: this.state.gameMode,
            totalClicks: this.state.clickRecords.length,
            suspiciousClicksCount: suspiciousClicks.length,
            minReactionTime,
            maxReactionTime,
            avgReactionTime,
            gameStartTime: this.state.gameStartTime,
            gameEndTime,
        };
    }

    /**
     * Get current tracking statistics for debugging and monitoring
     * @returns Object with current statistics
     */
    getCurrentStats(): {
        totalClicks: number;
        suspiciousClicks: number;
        avgReactionTime: number;
        isEnabled: boolean;
        pendingActivations: number;
    } {
        const suspiciousClicks = this.state.clickRecords.filter(record => record.isSuspicious).length;
        const avgReactionTime = this.state.clickRecords.length > 0
            ? Math.round(
                this.state.clickRecords.reduce((sum, record) => sum + record.reactionTime, 0) /
                this.state.clickRecords.length
            )
            : 0;

        return {
            totalClicks: this.state.clickRecords.length,
            suspiciousClicks,
            avgReactionTime,
            isEnabled: this.state.isEnabled,
            pendingActivations: this.state.circleActivationTimes.size,
        };
    }

    /**
     * Get detailed click records for debugging purposes
     * @returns Array of all recorded clicks
     */
    getClickRecords(): ClickRecord[] {
        return [...this.state.clickRecords];
    }

    /**
     * Get list of suspicious clicks only
     * @returns Array of clicks flagged as suspicious
     */
    getSuspiciousClicks(): ClickRecord[] {
        return this.state.clickRecords.filter(record => record.isSuspicious);
    }

    /**
     * Enable or disable shadow security tracking
     * @param enabled - Whether to enable tracking
     */
    setEnabled(enabled: boolean): void {
        this.state.isEnabled = enabled;

        if (!enabled) {
            // Clear tracking data when disabled
            this.state.clickRecords = [];
            this.state.circleActivationTimes.clear();
        }
    }

    /**
     * Check if shadow security tracking is currently enabled
     * @returns True if tracking is enabled
     */
    isEnabled(): boolean {
        return this.state.isEnabled;
    }

    /**
     * Update the suspicious threshold value
     * @param threshold - New threshold in milliseconds
     */
    setSuspiciousThreshold(threshold: number): void {
        if (threshold > 0) {
            this.state.suspiciousThreshold = threshold;
        }
    }

    /**
     * Get the current suspicious threshold
     * @returns Current threshold in milliseconds
     */
    getSuspiciousThreshold(): number {
        return this.state.suspiciousThreshold;
    }

    /**
     * Reset all tracking data and start fresh
     * This should be called when starting a new game
     * @param gameMode - The game mode for the new session
     * @param gameStartTime - Start time for the new session (defaults to current time)
     */
    reset(gameMode: GameMode, gameStartTime: number = Date.now()): void {
        this.state = {
            isEnabled: true,
            clickRecords: [],
            circleActivationTimes: new Map(),
            gameMode,
            gameStartTime,
            suspiciousThreshold: this.state.suspiciousThreshold, // Preserve threshold setting
        };
    }

    /**
     * Clean up all tracking data and prepare for garbage collection
     * This should be called when the component unmounts or when the manager is no longer needed
     */
    cleanup(): void {
        this.state.clickRecords = [];
        this.state.circleActivationTimes.clear();
        this.state.isEnabled = false;
    }

    /**
     * Clean up all pending circle activations
     * This should be called when the game ends to prevent memory leaks
     */
    cleanupAllPendingActivations(): void {
        this.state.circleActivationTimes.clear();
    }

    /**
     * Get summary of the current game session for logging
     * @returns Summary object with key metrics
     */
    getSessionSummary(): {
        gameMode: GameMode;
        duration: number;
        totalClicks: number;
        suspiciousClicks: number;
        suspiciousPercentage: number;
        avgReactionTime: number;
        minReactionTime: number;
        maxReactionTime: number;
    } {
        const reactionTimes = this.state.clickRecords.map(record => record.reactionTime);
        const suspiciousClicks = this.state.clickRecords.filter(record => record.isSuspicious).length;
        const totalClicks = this.state.clickRecords.length;

        return {
            gameMode: this.state.gameMode,
            duration: Date.now() - this.state.gameStartTime,
            totalClicks,
            suspiciousClicks,
            suspiciousPercentage: totalClicks > 0 ? Math.round((suspiciousClicks / totalClicks) * 100) : 0,
            avgReactionTime: reactionTimes.length > 0
                ? Math.round(reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length)
                : 0,
            minReactionTime: reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0,
            maxReactionTime: reactionTimes.length > 0 ? Math.max(...reactionTimes) : 0,
        };
    }
}