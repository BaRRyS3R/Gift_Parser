// src/utils/deviceSensors.ts - Device sensor utilities for gyroscope verification

export interface MotionData {
    alpha: number;  // Z-axis rotation (0-360 degrees)
    beta: number;   // X-axis rotation (-180 to 180 degrees)
    gamma: number;  // Y-axis rotation (-90 to 90 degrees)
    timestamp: number;
}

export interface MotionDetectionConfig {
    threshold: number;        // Motion intensity threshold
    timeWindow: number;       // Time window for detection (ms)
    requiredMotion: number;   // Required motion amount
}

export class GyroscopeDetector {
    private isListening = false;
    private motionHistory: MotionData[] = [];
    private totalMotion = 0;
    private lastMotionTime = 0;
    private config: MotionDetectionConfig;
    private onMotionCallback?: (intensity: number, detected: boolean) => void;

    constructor(config: Partial<MotionDetectionConfig> = {}) {
        this.config = {
            threshold: 50,      // Motion threshold
            timeWindow: 1000,   // 1 second window
            requiredMotion: 50, // Required motion amount
            ...config,
        };
    }

    /**
     * Check if device orientation is supported
     */
    static isSupported(): boolean {
        return typeof window !== "undefined" &&
            "DeviceOrientationEvent" in window;
    }

    /**
     * Request permission for iOS 13+
     */
    static async requestPermission(): Promise<boolean> {
        if (typeof window === "undefined") return false;

        // Check if permission request is needed (iOS 13+)
        if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
            try {
                const response = await (DeviceOrientationEvent as any).requestPermission();
                return response === "granted";
            } catch (error) {
                console.error("Error requesting device orientation permission:", error);
                return false;
            }
        }

        // For other browsers, assume permission is granted
        return true;
    }

    /**
     * Start motion detection
     */
    async startDetection(onMotion?: (intensity: number, detected: boolean) => void): Promise<boolean> {
        if (!GyroscopeDetector.isSupported()) {
            console.warn("Device orientation not supported");
            return false;
        }

        // Request permission if needed
        const hasPermission = await GyroscopeDetector.requestPermission();
        if (!hasPermission) {
            console.warn("Device orientation permission denied");
            return false;
        }

        this.onMotionCallback = onMotion;
        this.isListening = true;
        this.motionHistory = [];
        this.totalMotion = 0;
        this.lastMotionTime = Date.now();

        window.addEventListener("deviceorientation", this.handleOrientation);

        console.log("Gyroscope detection started");
        return true;
    }

    /**
     * Stop motion detection
     */
    stopDetection(): void {
        this.isListening = false;
        window.removeEventListener("deviceorientation", this.handleOrientation);
        this.motionHistory = [];
        this.totalMotion = 0;
        console.log("Gyroscope detection stopped");
    }

    /**
     * Get current motion intensity
     */
    getMotionIntensity(): number {
        return this.totalMotion;
    }

    /**
     * Check if motion threshold has been reached
     */
    isMotionDetected(): boolean {
        return this.totalMotion >= this.config.requiredMotion;
    }

    /**
     * Reset motion detection
     */
    reset(): void {
        this.motionHistory = [];
        this.totalMotion = 0;
        this.lastMotionTime = Date.now();
    }

    /**
     * Handle device orientation events
     */
    private handleOrientation = (event: DeviceOrientationEvent): void => {
        if (!this.isListening) return;

        const now = Date.now();
        const timeDiff = now - this.lastMotionTime;

        // Throttle events to prevent overwhelming
        if (timeDiff < 100) return; // Max 10 FPS

        const motionData: MotionData = {
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0,
            timestamp: now,
        };

        // Calculate motion intensity
        if (this.motionHistory.length > 0) {
            const lastMotion = this.motionHistory[this.motionHistory.length - 1];
            const deltaAlpha = this.calculateAngleDifference(motionData.alpha, lastMotion.alpha);
            const deltaBeta = Math.abs(motionData.beta - lastMotion.beta);
            const deltaGamma = Math.abs(motionData.gamma - lastMotion.gamma);

            const motionIntensity = deltaAlpha + deltaBeta + deltaGamma;
            this.totalMotion += motionIntensity;

            // Clean old motion data outside time window
            this.cleanOldMotionData(now);

            // Notify callback
            if (this.onMotionCallback) {
                const isDetected = this.isMotionDetected();
                this.onMotionCallback(this.totalMotion, isDetected);
            }
        }

        // Add to history
        this.motionHistory.push(motionData);
        this.lastMotionTime = now;

        // Limit history size
        if (this.motionHistory.length > 50) {
            this.motionHistory.shift();
        }
    };

    /**
     * Calculate angle difference (handles 360-degree wraparound)
     */
    private calculateAngleDifference(angle1: number, angle2: number): number {
        const diff = Math.abs(angle1 - angle2);
        return Math.min(diff, 360 - diff);
    }

    /**
     * Clean motion data outside the time window
     */
    private cleanOldMotionData(currentTime: number): void {
        const cutoffTime = currentTime - this.config.timeWindow;
        this.motionHistory = this.motionHistory.filter(
            (motion) => motion.timestamp > cutoffTime
        );
    }

    /**
     * Get motion statistics
     */
    getMotionStats(): {
        totalMotion: number;
        detectionProgress: number;
        isDetected: boolean;
        historyLength: number;
    } {
        return {
            totalMotion: this.totalMotion,
            detectionProgress: Math.min(100, (this.totalMotion / this.config.requiredMotion) * 100),
            isDetected: this.isMotionDetected(),
            historyLength: this.motionHistory.length,
        };
    }
}

/**
 * Simple utility for quick motion detection
 */
export async function detectDeviceMotion(
    timeout: number = 10000,
    requiredMotion: number = 50,
): Promise<{ success: boolean; motionDetected: boolean; intensity: number }> {
    return new Promise((resolve) => {
        const detector = new GyroscopeDetector({ requiredMotion });
        let resolved = false;

        const cleanup = () => {
            detector.stopDetection();
            resolved = true;
        };

        const onMotion = (intensity: number, detected: boolean) => {
            if (resolved) return;

            if (detected) {
                cleanup();
                resolve({
                    success: true,
                    motionDetected: true,
                    intensity,
                });
            }
        };

        // Start detection
        detector.startDetection(onMotion).then((started) => {
            if (!started && !resolved) {
                cleanup();
                resolve({
                    success: false,
                    motionDetected: false,
                    intensity: 0,
                });
            }
        });

        // Timeout handler
        setTimeout(() => {
            if (!resolved) {
                const stats = detector.getMotionStats();
                cleanup();
                resolve({
                    success: true,
                    motionDetected: stats.isDetected,
                    intensity: stats.totalMotion,
                });
            }
        }, timeout);
    });
}

/**
 * Test device motion capabilities
 */
export async function testDeviceMotion(): Promise<{
    supported: boolean;
    permissionGranted: boolean;
    error?: string;
}> {
    try {
        const supported = GyroscopeDetector.isSupported();

        if (!supported) {
            return {
                supported: false,
                permissionGranted: false,
                error: "Device orientation not supported by browser",
            };
        }

        const permissionGranted = await GyroscopeDetector.requestPermission();

        return {
            supported,
            permissionGranted,
            error: permissionGranted ? undefined : "Permission denied",
        };
    } catch (error) {
        return {
            supported: false,
            permissionGranted: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}