// src/lib/security/ShadowSecurityManager.ts - Enhanced with gyroscope monitoring capabilities

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
 * Enhanced Shadow Security Manager with gyroscope monitoring capabilities
 * Operates in stealth mode to detect both suspicious clicking patterns and lack of device movement
 * that may indicate automated/scripted gameplay
 */
export class ShadowSecurityManager {
    private state: ShadowSecurityState;
    private gyroscopeConfig: GyroscopeMonitoringConfig;
    private deviceOrientationListener: ((event: DeviceOrientationEvent) => void) | null = null;
    private gyroscopeCheckTimeout: NodeJS.Timeout | null = null;
    private initialOrientationData: { alpha: number | null; beta: number | null; gamma: number | null } | null = null;

    // Configuration constants
    private static readonly DEFAULT_SUSPICIOUS_CLICK_THRESHOLD = 250; // milliseconds
    private static readonly DEFAULT_GYROSCOPE_SENSITIVITY = 1.0; // degrees - MUCH MORE SENSITIVE than Nebula's 12 degrees
    private static readonly DEFAULT_GYROSCOPE_SUSPICIOUS_THRESHOLD = 90.0; // percentage - configurable threshold
    private static readonly DEFAULT_MAX_CHECK_INTERVAL = 5000; // 5 seconds maximum
    private static readonly DEFAULT_MIN_CHECK_INTERVAL = 3000; // 1 second minimum

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
            maxCheckInterval: ShadowSecurityManager.DEFAULT_MAX_CHECK_INTERVAL,
            minCheckInterval: ShadowSecurityManager.DEFAULT_MIN_CHECK_INTERVAL,
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
     * Start gyroscope monitoring with random interval checking
     */
    private startGyroscopeMonitoring(): void {
        if (!this.state.gyroscopeMonitoring.enabled) {
            return;
        }

        // Set up device orientation event listener
        this.deviceOrientationListener = (event: DeviceOrientationEvent) => {
            this.handleDeviceOrientationEvent(event);
        };

        window.addEventListener("deviceorientation", this.deviceOrientationListener);

        // Schedule first check
        this.scheduleNextGyroscopeCheck();
    }

    /**
     * Handle device orientation event data
     */
    private handleDeviceOrientationEvent(event: DeviceOrientationEvent): void {
        // Store initial orientation for baseline comparison
        if (!this.initialOrientationData &&
            (event.alpha !== null || event.beta !== null || event.gamma !== null)) {
            this.initialOrientationData = {
                alpha: event.alpha,
                beta: event.beta,
                gamma: event.gamma
            };
        }
    }

    /**
     * Schedule the next gyroscope movement check at a random interval
     */
    private scheduleNextGyroscopeCheck(): void {
        if (!this.state.gyroscopeMonitoring.enabled || !this.state.isEnabled) {
            return;
        }

        // Calculate random interval between min and max
        const randomInterval = Math.random() *
            (this.gyroscopeConfig.maxCheckInterval - this.gyroscopeConfig.minCheckInterval) +
            this.gyroscopeConfig.minCheckInterval;

        const nextCheckTime = Date.now() + randomInterval;
        this.state.gyroscopeMonitoring.nextCheckTime = nextCheckTime;

        // Store interval for analysis
        if (this.state.gyroscopeMonitoring.lastCheckTime > 0) {
            const actualInterval = Date.now() - this.state.gyroscopeMonitoring.lastCheckTime;
            this.state.gyroscopeMonitoring.checkIntervals.push(actualInterval);
        }

        this.gyroscopeCheckTimeout = setTimeout(() => {
            this.performGyroscopeMovementCheck();
            this.scheduleNextGyroscopeCheck(); // Schedule next check
        }, randomInterval);
    }

    /**
     * Perform a gyroscope movement check
     */
    private performGyroscopeMovementCheck(): void {
        if (!this.state.gyroscopeMonitoring.enabled || !this.initialOrientationData) {
            return;
        }

        const currentTime = Date.now();
        this.state.gyroscopeMonitoring.lastCheckTime = currentTime;

        // Get current orientation through a temporary listener
        let currentOrientation: { alpha: number | null; beta: number | null; gamma: number | null } | null = null;

        const checkListener = (event: DeviceOrientationEvent) => {
            currentOrientation = {
                alpha: event.alpha,
                beta: event.beta,
                gamma: event.gamma
            };
        };

        window.addEventListener("deviceorientation", checkListener);

        // Wait briefly to get current data
        setTimeout(() => {
            window.removeEventListener("deviceorientation", checkListener);

            if (currentOrientation) {
                const movementDetected = this.detectMovement(this.initialOrientationData!, currentOrientation);

                // Record movement data
                const movementRecord: GyroscopeMovementRecord = {
                    timestamp: currentTime,
                    alpha: currentOrientation.alpha,
                    beta: currentOrientation.beta,
                    gamma: currentOrientation.gamma,
                    movementDetected,
                    sensitivityThreshold: this.gyroscopeConfig.sensitivityThreshold
                };

                this.state.gyroscopeMonitoring.movementRecords.push(movementRecord);
            }
        }, 100);
    }

    /**
     * Detect significant movement between two orientation states
     * Uses much higher sensitivity than Nebula verification (1 degree vs 12 degrees)
     */
    private detectMovement(
        initial: { alpha: number | null; beta: number | null; gamma: number | null },
        current: { alpha: number | null; beta: number | null; gamma: number | null }
    ): boolean {
        if (!initial.alpha || !initial.beta || !initial.gamma ||
            !current.alpha || !current.beta || !current.gamma) {
            return false;
        }

        // Calculate differences for each axis
        const alphaDiff = Math.abs(current.alpha - initial.alpha);
        const betaDiff = Math.abs(current.beta - initial.beta);
        const gammaDiff = Math.abs(current.gamma - initial.gamma);

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
     * Only call this when suspicious activity is detected or at game end
     */
    public generateSuspiciousActivityData(telegramId: number, gameEndTime: number): SuspiciousActivityData | null {
        const clickRecords = this.state.clickRecords;
        const suspiciousClicks = clickRecords.filter(record => record.isSuspicious);
        const gyroscopeResult = this.generateGyroscopeResult();

        // Only generate data if there's suspicious activity (clicks OR gyroscope)
        const hasSuspiciousClicks = suspiciousClicks.length > 0;
        const hasSuspiciousGyroscope = this.state.gyroscopeMonitoring.enabled && gyroscopeResult.isSuspicious;

        if (!hasSuspiciousClicks && !hasSuspiciousGyroscope) {
            return null; // No suspicious activity detected
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

        // Verify that the data qualifies as suspicious before returning
        if (!hasAnySuspiciousActivity(activityData)) {
            return null;
        }

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

        if (this.gyroscopeCheckTimeout) {
            clearTimeout(this.gyroscopeCheckTimeout);
            this.gyroscopeCheckTimeout = null;
        }

        // Clear all recorded data
        this.state.clickRecords = [];
        this.state.circleActivationTimes.clear();
        this.state.gyroscopeMonitoring.movementRecords = [];
        this.state.gyroscopeMonitoring.checkIntervals = [];
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