-- src/database/schemas/user_blocks_table.sql
-- Nebula Security System - User Blocks Table

-- Create enum for block reasons
CREATE TYPE block_reason_type AS ENUM (
    'failed_captcha',
    'failed_biometric', 
    'failed_gyroscope',
    'device_unsupported_biometric',
    'device_unsupported_gyroscope',
    'manual_block',
    'suspicious_activity'
);

-- Create user_blocks table
CREATE TABLE user_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    block_reason block_reason_type NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    unblocked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    verification_type VARCHAR(20), -- 'captcha', 'biometric', 'gyroscope'
    trust_score_at_block INTEGER,
    additional_data JSONB DEFAULT '{}', -- For storing additional context
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_blocks_user_id ON user_blocks(user_id);
CREATE INDEX idx_user_blocks_telegram_id ON user_blocks(telegram_id);
CREATE INDEX idx_user_blocks_is_active ON user_blocks(is_active);
CREATE INDEX idx_user_blocks_unblocked_at ON user_blocks(unblocked_at);
CREATE INDEX idx_user_blocks_blocked_at ON user_blocks(blocked_at);

-- Create compound index for active blocks lookup
CREATE INDEX idx_user_blocks_active_lookup ON user_blocks(telegram_id, is_active, unblocked_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER user_blocks_updated_at_trigger
    BEFORE UPDATE ON user_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_user_blocks_updated_at();

-- Create function to automatically unblock expired blocks
CREATE OR REPLACE FUNCTION auto_unblock_expired_blocks()
RETURNS INTEGER AS $$
DECLARE
    unblocked_count INTEGER;
BEGIN
    -- Update expired active blocks to inactive
    UPDATE user_blocks 
    SET is_active = FALSE, updated_at = NOW()
    WHERE is_active = TRUE 
    AND unblocked_at <= NOW();
    
    GET DIAGNOSTICS unblocked_count = ROW_COUNT;
    
    -- Log the unblock operation
    INSERT INTO user_blocks (
        user_id, 
        telegram_id, 
        block_reason, 
        blocked_at, 
        unblocked_at, 
        is_active,
        additional_data
    )
    SELECT 
        ub.user_id,
        ub.telegram_id,
        'auto_unblock'::block_reason_type,
        NOW(),
        NOW(),
        FALSE,
        jsonb_build_object(
            'auto_unblock', true,
            'original_block_id', ub.id,
            'unblocked_count', unblocked_count
        )
    FROM user_blocks ub
    WHERE ub.is_active = FALSE 
    AND ub.updated_at = NOW()
    AND ub.unblocked_at <= NOW()
    LIMIT unblocked_count;
    
    RETURN unblocked_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's current active block
CREATE OR REPLACE FUNCTION get_user_active_block(p_telegram_id BIGINT)
RETURNS TABLE(
    block_id UUID,
    block_reason block_reason_type,
    blocked_at TIMESTAMP WITH TIME ZONE,
    unblocked_at TIMESTAMP WITH TIME ZONE,
    time_remaining_seconds INTEGER,
    verification_type VARCHAR(20),
    trust_score_at_block INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ub.id,
        ub.block_reason,
        ub.blocked_at,
        ub.unblocked_at,
        EXTRACT(EPOCH FROM (ub.unblocked_at - NOW()))::INTEGER,
        ub.verification_type,
        ub.trust_score_at_block
    FROM user_blocks ub
    WHERE ub.telegram_id = p_telegram_id
    AND ub.is_active = TRUE
    AND ub.unblocked_at > NOW()
    ORDER BY ub.blocked_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to block user with specific duration
CREATE OR REPLACE FUNCTION block_user_with_duration(
    p_user_id UUID,
    p_telegram_id BIGINT,
    p_block_reason block_reason_type,
    p_duration_hours INTEGER,
    p_verification_type VARCHAR(20) DEFAULT NULL,
    p_trust_score INTEGER DEFAULT NULL,
    p_additional_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    block_id UUID;
    unblock_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate unblock time
    unblock_time := NOW() + INTERVAL '1 hour' * p_duration_hours;
    
    -- Deactivate any existing active blocks for this user
    UPDATE user_blocks 
    SET is_active = FALSE, updated_at = NOW()
    WHERE telegram_id = p_telegram_id AND is_active = TRUE;
    
    -- Create new block
    INSERT INTO user_blocks (
        user_id,
        telegram_id,
        block_reason,
        blocked_at,
        unblocked_at,
        is_active,
        verification_type,
        trust_score_at_block,
        additional_data
    ) VALUES (
        p_user_id,
        p_telegram_id,
        p_block_reason,
        NOW(),
        unblock_time,
        TRUE,
        p_verification_type,
        p_trust_score,
        p_additional_data
    ) RETURNING id INTO block_id;
    
    RETURN block_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for application access
GRANT SELECT, INSERT, UPDATE ON user_blocks TO postgres;
GRANT USAGE ON SEQUENCE user_blocks_id_seq TO postgres;
GRANT EXECUTE ON FUNCTION auto_unblock_expired_blocks() TO postgres;
GRANT EXECUTE ON FUNCTION get_user_active_block(BIGINT) TO postgres;
GRANT EXECUTE ON FUNCTION block_user_with_duration(UUID, BIGINT, block_reason_type, INTEGER, VARCHAR, INTEGER, JSONB) TO postgres;