-- V4: sessions table
-- PRD §29: sessions(id, user_id, device_name, ip_address, user_agent, created_at, last_active_at, expires_at, revoked, revoked_at)

CREATE TABLE sessions (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name     VARCHAR(255),
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ   NOT NULL,
    revoked         BOOLEAN       NOT NULL DEFAULT FALSE,
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX idx_sessions_revoked ON sessions (revoked);
CREATE INDEX idx_sessions_last_active ON sessions (last_active_at);

-- Now add FK from refresh_tokens.session_id to sessions after both exist
ALTER TABLE refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_session
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

COMMENT ON TABLE sessions IS 'User sessions per login (device, ip, ua) with revocation support';
COMMENT ON COLUMN sessions.device_name IS 'Derived from User-Agent, e.g., Chrome / Windows';
