-- V2: roles and user_roles
-- PRD §29 + ARCHITECTURE.md: roles(id, name) + user_roles(user_id, role_id)

CREATE TABLE roles (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50)   NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID        NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);
CREATE INDEX idx_roles_name ON roles (name);

-- Seed default RBAC roles per PRD §58
INSERT INTO roles (name, description) VALUES
    ('ROLE_USER', 'Default user role'),
    ('ROLE_MANAGER', 'Manager with limited admin access'),
    ('ROLE_SUPPORT', 'Support staff with limited admin access'),
    ('ROLE_ADMIN', 'Full administrator access')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE roles IS 'RBAC roles: USER, MANAGER, SUPPORT, ADMIN';
COMMENT ON TABLE user_roles IS 'Many-to-many user <-> roles';
