// src/lib/botDetectionServerService.ts - Server-side bot detection management

import { supabase } from './supabase';

export interface BotDetectionLog {
    id?: string;
    user_id?: string;
    telegram_id?: number;
    bot_probability: number;
    bot_detected: boolean;
    detection_details: any;
    user_agent?: string;
    ip_address?: string;
    request_endpoint: string;
    request_action?: string;
    session_id?: string;
    request_count?: number;
    time_since_last_request?: number;
    action_taken: 'blocked' | 'flagged' | 'allowed';
    risk_score: number;
    created_at?: string;
}

export interface BotDetectionSettings {
    id?: string;
    bot_probability_threshold: number;
    risk_score_threshold: number;
    auto_block_enabled: boolean;
    log_all_requests: boolean;
    max_requests_per_minute: number;
    max_requests_per_hour: number;
    is_active: boolean;
}

export interface DetectionAnalysisResult {
    shouldBlock: boolean;
    actionTaken: 'blocked' | 'flagged' | 'allowed';
    riskScore: number;
    reasons: string[];
}

class BotDetectionServerService {
    /**
     * Log bot detection result to database
     */
    async logDetection(logData: Partial<BotDetectionLog>): Promise<BotDetectionLog | null> {
        try {
            const { data, error } = await supabase
                .from('bot_detection_logs')
                .insert({
                    user_id: logData.user_id,
                    telegram_id: logData.telegram_id,
                    bot_probability: logData.bot_probability || 0,
                    bot_detected: logData.bot_detected || false,
                    detection_details: logData.detection_details || {},
                    user_agent: logData.user_agent,
                    ip_address: logData.ip_address,
                    request_endpoint: logData.request_endpoint || 'unknown',
                    request_action: logData.request_action,
                    session_id: logData.session_id,
                    request_count: logData.request_count || 1,
                    time_since_last_request: logData.time_since_last_request,
                    action_taken: logData.action_taken || 'allowed',
                    risk_score: logData.risk_score || 0,
                })
                .select()
                .single();

            if (error) {
                console.error('Error logging bot detection:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Failed to log bot detection:', error);
            return null;
        }
    }

    /**
     * Get current bot detection settings
     */
    async getSettings(): Promise<BotDetectionSettings | null> {
        try {
            const { data, error } = await supabase
                .from('bot_detection_settings')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                console.error('Error fetching bot detection settings:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Failed to fetch bot detection settings:', error);
            return null;
        }
    }

    /**
     * Analyze detection results and determine action
     */
    async analyzeDetection(
        detection: any,
        userId?: string,
        telegramId?: number,
        requestInfo?: {
            endpoint: string;
            action?: string;
            userAgent?: string;
            ipAddress?: string;
            sessionId?: string;
            requestCount?: number;
            timeSinceLastRequest?: number;
        }
    ): Promise<DetectionAnalysisResult> {
        const settings = await this.getSettings();

        if (!settings) {
            // Default safe settings if none found
            return {
                shouldBlock: false,
                actionTaken: 'allowed',
                riskScore: 0,
                reasons: ['Settings unavailable'],
            };
        }

        let riskScore = Math.round((detection?.probability || 0) * 100);
        const reasons: string[] = [];
        let actionTaken: 'blocked' | 'flagged' | 'allowed' = 'allowed';

        // Analyze bot probability
        if (detection?.bot && detection?.probability > settings.bot_probability_threshold) {
            riskScore += 30;
            reasons.push(`High bot probability: ${(detection.probability * 100).toFixed(1)}%`);
        }

        // Check request frequency
        if (requestInfo?.requestCount && requestInfo.requestCount > settings.max_requests_per_minute) {
            riskScore += 25;
            reasons.push(`High request frequency: ${requestInfo.requestCount} requests`);
        }

        // Check for suspicious patterns
        if (requestInfo?.timeSinceLastRequest !== undefined && requestInfo.timeSinceLastRequest < 100) {
            riskScore += 20;
            reasons.push('Very fast consecutive requests');
        }

        // Check user history if available
        if (userId || telegramId) {
            const recentSuspiciousActivity = await this.checkRecentSuspiciousActivity(userId, telegramId);
            if (recentSuspiciousActivity > 3) {
                riskScore += 15;
                reasons.push('Recent suspicious activity detected');
            }
        }

        // Apply detection reasons
        if (detection?.reasons && Array.isArray(detection.reasons)) {
            reasons.push(...detection.reasons);
        }

        // Determine final action
        riskScore = Math.min(riskScore, 100);

        if (settings.auto_block_enabled && riskScore >= settings.risk_score_threshold) {
            actionTaken = 'blocked';
        } else if (riskScore >= 50) {
            actionTaken = 'flagged';
        }

        // Log the detection
        await this.logDetection({
            user_id: userId,
            telegram_id: telegramId,
            bot_probability: detection?.probability || 0,
            bot_detected: detection?.bot || false,
            detection_details: detection || {},
            user_agent: requestInfo?.userAgent,
            ip_address: requestInfo?.ipAddress,
            request_endpoint: requestInfo?.endpoint || 'unknown',
            request_action: requestInfo?.action,
            session_id: requestInfo?.sessionId,
            request_count: requestInfo?.requestCount,
            time_since_last_request: requestInfo?.timeSinceLastRequest,
            action_taken: actionTaken,
            risk_score: riskScore,
        });

        return {
            shouldBlock: actionTaken === 'blocked',
            actionTaken,
            riskScore,
            reasons,
        };
    }

    /**
     * Check for recent suspicious activity
     */
    private async checkRecentSuspiciousActivity(
        userId?: string,
        telegramId?: number
    ): Promise<number> {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

            let query = supabase
                .from('bot_detection_logs')
                .select('id', { count: 'exact' })
                .gte('created_at', oneHourAgo)
                .in('action_taken', ['blocked', 'flagged']);

            if (userId) {
                query = query.eq('user_id', userId);
            } else if (telegramId) {
                query = query.eq('telegram_id', telegramId);
            } else {
                return 0;
            }

            const { count, error } = await query;

            if (error) {
                console.error('Error checking recent suspicious activity:', error);
                return 0;
            }

            return count || 0;
        } catch (error) {
            console.error('Failed to check recent suspicious activity:', error);
            return 0;
        }
    }

    /**
     * Get detection statistics
     */
    async getDetectionStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
        totalDetections: number;
        botsDetected: number;
        blocked: number;
        flagged: number;
        allowed: number;
        averageRiskScore: number;
    }> {
        try {
            let hoursBack = 24;
            if (timeframe === 'hour') hoursBack = 1;
            else if (timeframe === 'week') hoursBack = 168;

            const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabase
                .from('bot_detection_logs')
                .select('bot_detected, action_taken, risk_score')
                .gte('created_at', since);

            if (error) {
                console.error('Error fetching detection stats:', error);
                return {
                    totalDetections: 0,
                    botsDetected: 0,
                    blocked: 0,
                    flagged: 0,
                    allowed: 0,
                    averageRiskScore: 0,
                };
            }

            const stats = data.reduce(
                (acc, log) => {
                    acc.totalDetections++;
                    if (log.bot_detected) acc.botsDetected++;
                    if (log.action_taken === 'blocked') acc.blocked++;
                    else if (log.action_taken === 'flagged') acc.flagged++;
                    else acc.allowed++;
                    acc.totalRiskScore += log.risk_score || 0;
                    return acc;
                },
                {
                    totalDetections: 0,
                    botsDetected: 0,
                    blocked: 0,
                    flagged: 0,
                    allowed: 0,
                    totalRiskScore: 0,
                }
            );

            return {
                ...stats,
                averageRiskScore: stats.totalDetections > 0
                    ? Math.round(stats.totalRiskScore / stats.totalDetections)
                    : 0,
                totalRiskScore: undefined, // Remove this from return
            } as any;
        } catch (error) {
            console.error('Failed to fetch detection stats:', error);
            return {
                totalDetections: 0,
                botsDetected: 0,
                blocked: 0,
                flagged: 0,
                allowed: 0,
                averageRiskScore: 0,
            };
        }
    }

    /**
     * Update bot detection settings
     */
    async updateSettings(settings: Partial<BotDetectionSettings>): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('bot_detection_settings')
                .update({
                    bot_probability_threshold: settings.bot_probability_threshold,
                    risk_score_threshold: settings.risk_score_threshold,
                    auto_block_enabled: settings.auto_block_enabled,
                    log_all_requests: settings.log_all_requests,
                    max_requests_per_minute: settings.max_requests_per_minute,
                    max_requests_per_hour: settings.max_requests_per_hour,
                    is_active: settings.is_active,
                    updated_at: new Date().toISOString(),
                })
                .eq('is_active', true);

            if (error) {
                console.error('Error updating bot detection settings:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Failed to update bot detection settings:', error);
            return false;
        }
    }

    /**
     * Check if user/IP should be blocked based on recent activity
     */
    async shouldBlockRequest(
        userId?: string,
        telegramId?: number,
        ipAddress?: string,
        sessionId?: string
    ): Promise<boolean> {
        try {
            const settings = await this.getSettings();
            if (!settings?.auto_block_enabled) {
                return false;
            }

            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

            // Check for recent blocks
            let query = supabase
                .from('bot_detection_logs')
                .select('id')
                .eq('action_taken', 'blocked')
                .gte('created_at', fifteenMinutesAgo);

            if (userId) {
                query = query.eq('user_id', userId);
            } else if (telegramId) {
                query = query.eq('telegram_id', telegramId);
            } else if (sessionId) {
                query = query.eq('session_id', sessionId);
            } else {
                return false;
            }

            const { data, error } = await query.limit(1);

            if (error) {
                console.error('Error checking if should block request:', error);
                return false;
            }

            return (data?.length || 0) > 0;
        } catch (error) {
            console.error('Failed to check if should block request:', error);
            return false;
        }
    }
}

// Singleton instance
export const botDetectionServerService = new BotDetectionServerService();

// Helper functions
export async function analyzeBotDetection(
    detection: any,
    userId?: string,
    telegramId?: number,
    requestInfo?: any
) {
    return botDetectionServerService.analyzeDetection(detection, userId, telegramId, requestInfo);
}

export async function shouldBlockRequest(
    userId?: string,
    telegramId?: number,
    ipAddress?: string,
    sessionId?: string
): Promise<boolean> {
    return botDetectionServerService.shouldBlockRequest(userId, telegramId, ipAddress, sessionId);
}

export async function getBotDetectionStats(timeframe: 'hour' | 'day' | 'week' = 'day') {
    return botDetectionServerService.getDetectionStats(timeframe);
}