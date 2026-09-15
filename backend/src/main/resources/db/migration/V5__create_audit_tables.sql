-- V5: audit tables
-- PRD §29: audit_logs(id, user_id, event_type, ip_address, user_agent, timestamp, metadata JSONB)
--         login_attempts(id, user_id, email, success, ip_address, timestamp)

CREATE TABLE audit_logs (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
    event_type  VARCHAR(50)   NOT NULL,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    timestamp   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    metadata    JSONB
);

CREATE INDEX idx_audit_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_event_type ON audit_logs (event_type);
CREATE INDEX idx_audit_timestamp ON audit_logs (timestamp);
CREATE INDEX idx_audit_event_time ON audit_logs (event_type, timestamp);
CREATE INDEX idx_audit_metadata_gin ON audit_logs USING GIN (metadata);

CREATE TABLE login_attempts (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
    email       VARCHAR(255),
    success     BOOLEAN       NOT NULL,
    ip_address  VARCHAR(45),
    timestamp   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_user_id ON login_attempts (user_id);
CREATE INDEX idx_login_attempts_email ON login_attempts (email);
CREATE INDEX idx_login_attempts_timestamp ON login_attempts (timestamp);
CREATE INDEX idx_login_attempts_success ON login_attempts (success);
CREATE INDEX idx_login_attempts_email_time ON login_attempts (email, timestamp);

COMMENT ON TABLE audit_logs IS 'Security audit trail, queryable by admin, no sensitive data in metadata';
COMMENT ON TABLE login_attempts IS 'Per-attempt login history for anomaly detection and baseline';

-- Check constraint for event_type values (mirrors PRD §77 audit events)
-- Not enforced strictly to allow future events, but documented:
-- USER_REGISTERED, LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, TOKEN_REFRESH,
-- TOKEN_REUSE_DETECTED, PASSWORD_CHANGED, PASSWORD_RESET_REQUESTED, PASSWORD_RESET,
-- EMAIL_VERIFIED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED, ROLE_CHANGED, SESSION_CREATED,
-- SESSION_REVOKED, OAUTH_LOGIN, SUSPICIOUS_LOGIN
