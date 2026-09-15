-- V6: oauth accounts
-- PRD §29: oauth_accounts(id, user_id, provider, provider_user_id, created_at, UNIQUE(provider, provider_user_id))

CREATE TABLE oauth_accounts (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(50)   NOT NULL,
    provider_user_id    VARCHAR(255)  NOT NULL,
    provider_email      VARCHAR(255),
    access_token_hash   VARCHAR(255),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_oauth_provider_user UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_oauth_user_id ON oauth_accounts (user_id);
CREATE INDEX idx_oauth_provider ON oauth_accounts (provider);
CREATE INDEX idx_oauth_provider_user ON oauth_accounts (provider, provider_user_id);

CREATE TRIGGER trg_oauth_updated_at
    BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE oauth_accounts IS 'OAuth2 linked accounts (Google OIDC), local user creation with ROLE_USER only';
COMMENT ON COLUMN oauth_accounts.provider IS 'e.g., google, github';
COMMENT ON COLUMN oauth_accounts.provider_user_id IS 'Sub claim from IdP, unique per provider';
