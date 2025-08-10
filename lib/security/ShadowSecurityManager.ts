// src/lib/security/ShadowSecurityManager.ts - Enhanced with fixed gyroscope monitoring at 3-second intervals

import { GameMode } from "@/types/game-modes/common";
import {
    ClickRecord,
    GyroscopeMovementRecord,
    GyroscopeMonitoringState,
    GyroscopeMonitoringConfig,
    GyroscopeMonitoringResult,
    GyroscopeCapabilityResult,
    GyroscopeErrorReason,
    SuspiciousActivityData,
    ShadowSecurityState,
    hasAnySuspiciousActivity
} from "@/types/security/shadowSecurity";

/**
 * Enhanced Shadow Security Manager with fixed 3-second interval gyroscope monitoring
 * Operates in stealth mode to detect both suspicious clicking patterns and lack of device movement
 * that may indicate automated/scripted gameplay
 */
export class ShadowSecurityManager {
    private state: ShadowSecurityState;
    private gyroscopeConfig: GyroscopeMonitoringConfig;
    private deviceOrientationListener: ((event: DeviceOrientationEvent) => void) | null = null;
    private gyroscopeCheckInterval: NodeJS.Timeout | null = null;
    private currentOrientationData: { alpha: number | null; beta: number | null; gamma: number | null } | null = null;
    private lastOrientationData: { alpha: number | null; beta: number | null; gamma: number | null } | null = null;

    // Configuration constants
    private static readonly DEFAULT_SUSPICIOUS_CLICK_THRESHOLD = 250; // milliseconds
    private static readonly DEFAULT_GYROSCOPE_SENSITIVITY = 1.0; // degrees - MUCH MORE SENSITIVE than Nebula's 12 degrees
    private static readonly DEFAULT_GYROSCOPE_SUSPICIOUS_THRESHOLD = 10.0; // percentage - configurable threshold
    private static readonly FIXED_CHECK_INTERVAL = 3000; // Fixed 3 seconds interval

    constructor(
        gameMode: GameMode,
        gameStartTime: number,
        gyroscopeConfig?: Partial<GyroscopeMonitoringConfig>
    ) {
        // Initialize gyroscope configuration with defaults
        this.gyroscopeConfig = {
            enabled: true,
            sensitivityThreshold: ShadowSecurityManager.DEFAULT_GYROSCOPE_SENSITIVITY,
            suspiciousMovementThreshold: ShadowSecurityManager.DEFAULT_GYROSCOPE_SUSPICIOUS_THRESHOLD,
            maxCheckInterval: ShadowSecurityManager.FIXED_CHECK_INTERVAL,
            minCheckInterval: ShadowSecurityManager.FIXED_CHECK_INTERVAL,
            requirePermissionCheck: false, // We assume permission is already granted from the game page
            ...gyroscopeConfig
        };

        // Initialize shadow security state
        this.state = {
            isEnabled: true,
            gameMode,
            gameStartTime,
            suspiciousThreshold: ShadowSecurityManager.DEFAULT_SUSPICIOUS_CLICK_THRESHOLD,
            clickRecords: [],
            circleActivationTimes: new Map(),
            gyroscopeMonitoring: {
                enabled: this.gyroscopeConfig.enabled,
                permissionGranted: false,
                dataAvailable: false,
                errorReason: null,
                checkIntervals: [],
                movementRecords: [],
                lastCheckTime: 0,
                nextCheckTime: 0,
                minimumSensitivity: this.gyroscopeConfig.sensitivityThreshold
            }
        };

        // Initialize gyroscope monitoring if enabled
        if (this.gyroscopeConfig.enabled) {
            this.initializeGyroscopeMonitoring();
        }
    }

    /**
     * Initialize gyroscope monitoring in stealth mode
     * Detects device capabilities and starts monitoring if available
     */
    private async initializeGyroscopeMonitoring(): Promise<void> {
        try {
            const capability = await this.detectGyroscopeCapability();

            this.state.gyroscopeMonitoring.permissionGranted = capability.permissionGranted;
            this.state.gyroscopeMonitoring.dataAvailable = capability.dataAvailable;

            if (!capability.isSupported) {
                this.state.gyroscopeMonitoring.errorReason = GyroscopeErrorReason.NOT_SUPPORTED;
                this.state.gyroscopeMonitoring.enabled = false;
                return;
            }

            if (!capability.permissionGranted) {
                this.state.gyroscopeMonitoring.errorReason = GyroscopeErrorReason.PERMISSION_DENIED;
                this.state.gyroscopeMonitoring.enabled = false;
                return;
            }

            if (!capability.dataAvailable) {
                this.state.gyroscopeMonitoring.errorReason = GyroscopeErrorReason.DATA_UNAVAILABLE;
                this.state.gyroscopeMonitoring.enabled = false;
                return;
            }

            // Start monitoring if all checks pass
            this.startGyroscopeMonitoring();
        } catch (error) {
            console.warn("Shadow Security: Failed to initialize gyroscope monitoring", error);
            this.state.gyroscopeMonitoring.errorReason = GyroscopeErrorReason.INITIALIZATION_FAILED;
            this.state.gyroscopeMonitoring.enabled = false;
        }
    }

    /**
     * Detect gyroscope capability on the current device
     */
    private async detectGyroscopeCapability(): Promise<GyroscopeCapabilityResult> {
        if (typeof window === "undefined") {
            return {
                isSupported: false,
                requiresPermission: false,
                permissionGranted: false,
                dataAvailable: false,
                errorReason: GyroscopeErrorReason.NOT_SUPPORTED
            };
        }

        // Check if DeviceOrientationEvent is supported
        if (!window.DeviceOrientationEvent) {
            return {
                isSupported: false,
                requiresPermission: false,
                permissionGranted: false,
                dataAvailable: false,
                errorReason: GyroscopeErrorReason.DEVICE_ORIENTATION_UNAVAILABLE
            };
        }

        // Check if permission is required (iOS 13+)
        const DeviceOrientationEvent = window.DeviceOrientationEvent as any;
        const requiresPermission = typeof DeviceOrientationEvent.requestPermission === "function";

        let permissionGranted = !requiresPermission;

        // If permission is required, check if it's already granted
        if (requiresPermission) {
            try {
                // Try to get permission status without requesting
                const permission = await DeviceOrientationEvent.requestPermission();
                permissionGranted = permission === "granted";
            } catch (error) {
                permissionGranted = false;
            }
        }

        // Test data availability
        const dataAvailable = await this.testGyroscopeDataAvailability();

        return {
            isSupported: true,
            requiresPermission,
            permissionGranted,
            dataAvailable,
            errorReason: (!permissionGranted ? GyroscopeErrorReason.PERMISSION_DENIED :
                !dataAvailable ? GyroscopeErrorReason.DATA_UNAVAILABLE : null)
        };
    }

    /**
     * Test if gyroscope data is actually available
     */
    private async testGyroscopeDataAvailability(): Promise<boolean> {
        return new Promise((resolve) => {
            let dataReceived = false;

            const testListener = (event: DeviceOrientationEvent) => {
                if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
                    dataReceived = true;
                    window.removeEventListener("deviceorientation", testListener);
                    resolve(true);
                }
            };

            window.addEventListener("deviceorientation", testListener);

            // Timeout after 2 seconds
            setTimeout(() => {
                if (!dataReceived) {
                    window.removeEventListener("deviceorientation", testListener);
                    resolve(false);
                }
            }, 2000);
        });
    }

    /**
     * Start gyroscope monitoring with fixed 3-second interval checking
     */
    private startGyroscopeMonitoring(): void {
        if (!this.state.gyroscopeMonitoring.enabled) {
            return;
        }

        // Set up device orientation event listener for continuous data collection
        this.deviceOrientationListener = (event: DeviceOrientationEvent) => {
            this.currentOrientationData = {
                alpha: event.alpha,
                beta: event.beta,
                gamma: event.gamma
            };

            // Store initial data as baseline if not set
            if (!this.lastOrientationData &&
                (event.alpha !== null || event.beta !== null || event.gamma !== null)) {
                this.lastOrientationData = {
                    alpha: event.alpha,
                    beta: event.beta,
                    gamma: event.gamma
                };
            }
        };

        window.addEventListener("deviceorientation", this.deviceOrientationListener);

        // Start fixed interval checking every 3 seconds
        this.gyroscopeCheckInterval = setInterval(() => {
            this.performGyroscopeMovementCheck();
        }, ShadowSecurityManager.FIXED_CHECK_INTERVAL);

        console.log("Shadow Security: Gyroscope monitoring started with 3-second intervals");
    }

    /**
     * Perform a gyroscope movement check comparing current data with baseline
     */
    private performGyroscopeMovementCheck(): void {
        if (!this.state.gyroscopeMonitoring.enabled || !this.lastOrientationData || !this.currentOrientationData) {
            return;
        }

        const currentTime = Date.now();

        // Store interval information for analysis
        if (this.state.gyroscopeMonitoring.lastCheckTime > 0) {
            const actualInterval = currentTime - this.state.gyroscopeMonitoring.lastCheckTime;
            this.state.gyroscopeMonitoring.checkIntervals.push(actualInterval);
        }

        this.state.gyroscopeMonitoring.lastCheckTime = currentTime;

        // Detect movement between last baseline and current data
        const movementDetected = this.detectMovement(this.lastOrientationData, this.currentOrientationData);

        // Record movement data
        const movementRecord: GyroscopeMovementRecord = {
            timestamp: currentTime,
            alpha: this.currentOrientationData.alpha,
            beta: this.currentOrientationData.beta,
            gamma: this.currentOrientationData.gamma,
            movementDetected,
            sensitivityThreshold: this.gyroscopeConfig.sensitivityThreshold
        };

        this.state.gyroscopeMonitoring.movementRecords.push(movementRecord);

        // Update baseline data for next comparison
        if (movementDetected) {
            this.lastOrientationData = {
                alpha: this.currentOrientationData.alpha,
                beta: this.currentOrientationData.beta,
                gamma: this.currentOrientationData.gamma
            };
        }

        console.log(`Shadow Security: Gyroscope check ${this.state.gyroscopeMonitoring.movementRecords.length}, Movement: ${movementDetected}`);
    }

    /**
     * Detect significant movement between two orientation states
     * Uses much higher sensitivity than Nebula verification (1 degree vs 12 degrees)
     */
    private detectMovement(
        baseline: { alpha: number | null; beta: number | null; gamma: number | null },
        current: { alpha: number | null; beta: number | null; gamma: number | null }
    ): boolean {
        if (!baseline.alpha || !baseline.beta || !baseline.gamma ||
            !current.alpha || !current.beta || !current.gamma) {
            return false;
        }

        // Calculate differences for each axis
        const alphaDiff = Math.abs(current.alpha - baseline.alpha);
        const betaDiff = Math.abs(current.beta - baseline.beta);
        const gammaDiff = Math.abs(current.gamma - baseline.gamma);

        // Normalize alpha difference for 0-360 wraparound
        const normalizedAlphaDiff = Math.min(alphaDiff, 360 - alphaDiff);

        // Check if any axis exceeds the sensitivity threshold
        const threshold = this.gyroscopeConfig.sensitivityThreshold;

        return normalizedAlphaDiff > threshold ||
            betaDiff > threshold ||
            gammaDiff > threshold;
    }

    /**
     * Record circle activation time for click monitoring
     */
    public recordCircleActivation(circleId: number, timestamp: number): void {
        if (!this.state.isEnabled) {
            return;
        }

        this.state.circleActivationTimes.set(circleId, timestamp);
    }

    /**
     * Record circle click and analyze reaction time
     */
    public recordCircleClick(circleId: number, clickTimestamp: number): void {
        if (!this.state.isEnabled) {
            return;
        }

        const activationTime = this.state.circleActivationTimes.get(circleId);
        if (!activationTime) {
            return; // No activation recorded for this circle
        }

        const reactionTime = clickTimestamp - activationTime;
        const isSuspicious = reactionTime < this.state.suspiciousThreshold;

        const clickRecord: ClickRecord = {
            circleId,
            activationTime,
            clickTime: clickTimestamp,
            reactionTime,
            isSuspicious
        };

        this.state.clickRecords.push(clickRecord);

        // Clean up activation time
        this.state.circleActivationTimes.delete(circleId);
    }

    /**
     * Clean up activation time for a specific circle (for timeouts, etc.)
     */
    public cleanupCircleActivation(circleId: number): void {
        this.state.circleActivationTimes.delete(circleId);
    }

    /**
     * Clean up all pending circle activations
     */
    public cleanupAllPendingActivations(): void {
        this.state.circleActivationTimes.clear();
    }

    /**
     * Generate gyroscope monitoring result
     */
    private generateGyroscopeResult(): GyroscopeMonitoringResult {
        const movements = this.state.gyroscopeMonitoring.movementRecords;
        const totalChecks = movements.length;
        const movementsDetected = movements.filter(record => record.movementDetected).length;
        const movementPercentage = totalChecks > 0 ? (movementsDetected / totalChecks) * 100 : 0;

        // Calculate if suspicious based on configurable threshold
        const isSuspicious = movementPercentage < this.gyroscopeConfig.suspiciousMovementThreshold;

        const checkIntervals = this.state.gyroscopeMonitoring.checkIntervals;
        const averageCheckInterval = checkIntervals.length > 0
            ? checkIntervals.reduce((sum, interval) => sum + interval, 0) / checkIntervals.length
            : 0;

        return {
            totalChecks,
            movementsDetected,
            movementPercentage: Math.round(movementPercentage * 100) / 100,
            isSuspicious,
            errorReason: this.state.gyroscopeMonitoring.errorReason,
            checkIntervals: [...checkIntervals],
            averageCheckInterval: Math.round(averageCheckInterval)
        };
    }

    /**
     * Generate comprehensive suspicious activity data for server submission
     * Now triggers with minimum 1 gyroscope check or any suspicious clicks
     */
    public generateSuspiciousActivityData(telegramId: number, gameEndTime: number): SuspiciousActivityData | null {
        const clickRecords = this.state.clickRecords;
        const suspiciousClicks = clickRecords.filter(record => record.isSuspicious);
        const gyroscopeResult = this.generateGyroscopeResult();

        // Check for suspicious activity with lowered threshold for gyroscope checks
        const hasSuspiciousClicks = suspiciousClicks.length > 0;
        const hasSuspiciousGyroscope = this.state.gyroscopeMonitoring.enabled &&
            gyroscopeResult.totalChecks >= 1 && // Minimum 1 check required
            gyroscopeResult.isSuspicious;

        // Always generate data if there are any suspicious activities OR if gyroscope monitoring detected low movement
        if (!hasSuspiciousClicks && !hasSuspiciousGyroscope) {
            console.log("Shadow Security: No suspicious activity detected - skipping submission");
            return null;
        }

        // Calculate click statistics
        const reactionTimes = clickRecords.map(record => record.reactionTime);
        const minReactionTime = reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0;
        const maxReactionTime = reactionTimes.length > 0 ? Math.max(...reactionTimes) : 0;
        const avgReactionTime = reactionTimes.length > 0
            ? Math.round(reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length)
            : 0;

        const activityData: SuspiciousActivityData = {
            telegramId,
            gameMode: this.state.gameMode,

            // Click monitoring data
            totalClicks: clickRecords.length,
            suspiciousClicksCount: suspiciousClicks.length,
            minReactionTime,
            maxReactionTime,
            avgReactionTime,

            // Gyroscope monitoring data
            gyroscopeEnabled: this.state.gyroscopeMonitoring.enabled,
            gyroscopePermissionGranted: this.state.gyroscopeMonitoring.permissionGranted,
            gyroscopeDataAvailable: this.state.gyroscopeMonitoring.dataAvailable,
            totalGyroscopeChecks: gyroscopeResult.totalChecks,
            gyroscopeMovementsDetected: gyroscopeResult.movementsDetected,
            gyroscopeMovementPercentage: gyroscopeResult.movementPercentage,
            gyroscopeSuspicious: gyroscopeResult.isSuspicious,
            gyroscopeErrorReason: gyroscopeResult.errorReason,
            gyroscopeMinSensitivity: this.gyroscopeConfig.sensitivityThreshold,
            gyroscopeCheckIntervals: gyroscopeResult.checkIntervals,

            // Timing data
            gameStartTime: this.state.gameStartTime,
            gameEndTime
        };

        console.log(`Shadow Security: Generated activity data - Clicks: ${hasSuspiciousClicks}, Gyroscope: ${hasSuspiciousGyroscope}, Movement: ${gyroscopeResult.movementPercentage}%`);

        return activityData;
    }

    /**
     * Clean up all monitoring activities
     */
    public cleanup(): void {
        this.state.isEnabled = false;

        // Clean up gyroscope monitoring
        if (this.deviceOrientationListener) {
            window.removeEventListener("deviceorientation", this.deviceOrientationListener);
            this.deviceOrientationListener = null;
        }

        if (this.gyroscopeCheckInterval) {
            clearInterval(this.gyroscopeCheckInterval);
            this.gyroscopeCheckInterval = null;
        }

        // Clear all recorded data
        this.state.clickRecords = [];
        this.state.circleActivationTimes.clear();
        this.state.gyroscopeMonitoring.movementRecords = [];
        this.state.gyroscopeMonitoring.checkIntervals = [];

        console.log("Shadow Security: Cleanup completed");
    }

    /**
     * Get current monitoring status for debugging
     */
    public getMonitoringStatus(): {
        clickMonitoring: boolean;
        gyroscopeMonitoring: boolean;
        gyroscopeError: string | null;
        totalClicks: number;
        suspiciousClicks: number;
        gyroscopeChecks: number;
        gyroscopeMovements: number;
    } {
        const suspiciousClicks = this.state.clickRecords.filter(record => record.isSuspicious).length;
        const gyroscopeMovements = this.state.gyroscopeMonitoring.movementRecords.filter(record => record.movementDetected).length;

        return {
            clickMonitoring: this.state.isEnabled,
            gyroscopeMonitoring: this.state.gyroscopeMonitoring.enabled,
            gyroscopeError: this.state.gyroscopeMonitoring.errorReason,
            totalClicks: this.state.clickRecords.length,
            suspiciousClicks,
            gyroscopeChecks: this.state.gyroscopeMonitoring.movementRecords.length,
            gyroscopeMovements
        };
    }
}