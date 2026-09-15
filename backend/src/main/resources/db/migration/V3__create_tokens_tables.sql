-- V3: tokens tables
-- Covers refresh_tokens, email_verification_tokens, password_reset_tokens per PRD §29
-- Note: refresh_tokens.session_id FK is deferred to V4 after sessions table creation

CREATE TABLE email_verification_tokens (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255)  NOT NULL,
    expires_at  TIMESTAMPTZ   NOT NULL,
    used        BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verif_user_id ON email_verification_tokens (user_id);
CREATE INDEX idx_email_verif_token_hash ON email_verification_tokens (token_hash);
CREATE INDEX idx_email_verif_expires_at ON email_verification_tokens (expires_at);

CREATE TABLE password_reset_tokens (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255)  NOT NULL,
    expires_at  TIMESTAMPTZ   NOT NULL,
    used        BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pwd_reset_user_id ON password_reset_tokens (user_id);
CREATE INDEX idx_pwd_reset_token_hash ON password_reset_tokens (token_hash);
CREATE INDEX idx_pwd_reset_expires_at ON password_reset_tokens (expires_at);

-- refresh_tokens with session_id as UUID (FK added in V4 after sessions exists)
CREATE TABLE refresh_tokens (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255)  NOT NULL UNIQUE,
    session_id  UUID,
    expires_at  TIMESTAMPTZ   NOT NULL,
    revoked     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ,
    replaced_by UUID          REFERENCES refresh_tokens(id) ON DELETE SET NULL
);

CREATE INDEX idx_refresh_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_session_id ON refresh_tokens (session_id);
CREATE INDEX idx_refresh_token_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_expires_at ON refresh_tokens (expires_at);
CREATE INDEX idx_refresh_revoked ON refresh_tokens (revoked);

COMMENT ON TABLE email_verification_tokens IS 'Hashed email verification tokens, 15-30m expiry';
COMMENT ON TABLE password_reset_tokens IS 'Hashed password reset tokens, 15m expiry, revoked after use';
COMMENT ON TABLE refresh_tokens IS 'Hashed refresh tokens with rotation and reuse detection, 7d expiry';
