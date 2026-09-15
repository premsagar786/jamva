# SecureID — Security Model

## Principles
- Defense in depth, least privilege, fail closed, no sensitive data in logs, secrets outside VCS.

## Password Security
- BCrypt strength 12 (or Argon2id) centralized bean `PasswordEncoder` in `SecurityConfig`.
- Never logged, never in audit metadata, never returned.
- Strength rule: >=8 chars, upper+lower+digit+special, configurable via `secureid.password.*`.

## Token Security
- Access JWT: short-lived 15m (config `secureid.jwt.expiration`), claims sub/email/roles/iss/iat/exp, signed HS256 (dev `JWT_SECRET`) or RS256 (prod `JWT_PRIVATE_KEY`). Validated on every request via `JwtAuthenticationFilter`.
- Refresh: 32-byte secure random (Base64URL), SHA-256 hash before storage, 7d expiry (`secureid.jwt.refresh-expiration`), revocable, rotation with reuse detection. Reuse triggers `TOKEN_REUSE_DETECTED` and optional full revocation.

## Account Lockout
- Redis `login:failed:{email}` INCR with TTL 15m. Threshold 5 → `account_locked=true`, `locked_at`. Prevents brute force without DoS on valid users (lock is per-account, not IP-only; IP rate limit separate).

## Rate Limiting
- Redis fixed window: `rate-limit:{endpoint}:{ip}` and `rate-limit:{endpoint}:{email}` TTL 60s. Limits configurable per endpoint (login 5/min, register 3/min, forgot 3/min, refresh 10/min). Returns 429 with Retry-After.

## Audit Logging
- All security events §23. `AuditService` writes asynchronously (optional). Metadata sanitized: no password, tokens, OTP, secrets. Queryable by admin only.

## RBAC
- Server-side enforcement only (`@PreAuthorize`, `SecurityFilterChain`). Never trust client. Role changes validated against enum, self-promotion blocked, SUPPORT/MANAGER limited.

## Session Management
- One session per login (device, ip, ua). `last_active_at` updated on refresh. Revocation on logout, password reset, reuse detection, admin action. User can list/revoke own; admin can revoke any.

## CORS & Headers
- CORS allowlist from `CORS_ORIGINS` (comma-separated). `allowCredentials=true` never with `*`. Dev `http://localhost:3000,http://127.0.0.1:3000`. Production must set explicit frontend URL.
- Headers: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`.

## Input Validation & Enumeration
- Jakarta Validation on DTOs, email normalization, SQL injection via JPA parameterized, XSS via JSON escaping.
- Forgot-password and resend-verification return generic success to prevent enumeration. Login returns generic "Invalid credentials" for both wrong email/password.

## Secrets Management
- `.env` not committed, `.env.example` committed. Production secrets via env vars or secret manager. `JWT_SECRET` must be >=256 bits. Rotate via `JWT_PRIVATE_KEY`.

## OAuth2
- Google OIDC via Spring OAuth2 Client. Local user creation with ROLE_USER only. Existing link via `oauth_accounts`. Never auto-admin. State param validated.

## Monitoring
- Metrics for security events, correlation ID, structured logs. Alerts on `risk.critical`, `token.reuse`, `account.locked` spikes.
