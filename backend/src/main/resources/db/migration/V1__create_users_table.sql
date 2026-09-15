-- V1: users table
-- Implements PRD §29: users(id, email, password_hash, email_verified, enabled, account_locked, locked_at, created_at, updated_at)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    display_name    VARCHAR(255),
    email_verified  BOOLEAN         NOT NULL DEFAULT FALSE,
    enabled         BOOLEAN         NOT NULL DEFAULT TRUE,
    account_locked  BOOLEAN         NOT NULL DEFAULT FALSE,
    locked_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Normalized email index (lowercase) for case-insensitive lookups
CREATE UNIQUE INDEX idx_users_email_unique ON users (LOWER(email));
CREATE INDEX idx_users_created_at ON users (created_at);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'Core user identities for SecureID';
COMMENT ON COLUMN users.email IS 'Normalized (lowercase, trimmed) unique email';
COMMENT ON COLUMN users.password_hash IS 'BCrypt hash, never returned or logged';
