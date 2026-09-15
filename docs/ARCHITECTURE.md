# SecureID — Architecture

## High-Level
```
Frontend (React/Angular) --HTTPS--> SecureID API (Spring Boot)
                                    ├── Authentication / Authorization / User / Session / OAuth2 / Risk / Audit
                                    ├── PostgreSQL (users, roles, tokens, audit, login history)
                                    └── Redis (rate limits, login attempts, sessions, temp data, risk counters)
                                    └── External: Google OAuth2, Email, AI/Risk Engine
```

## Technology
- Java 21, Spring Boot 3.4.x, Spring Security 6, Spring Data JPA, Validation, OAuth2 Client + Resource Server, PostgreSQL, Redis (Lettuce), Flyway, Maven
- Testing: JUnit5, Mockito, Spring Boot Test, Security Test, Testcontainers (Postgres+Redis)
- Infra: Docker & Compose, GitHub Actions
- Docs: springdoc-openapi, Swagger UI

## Package Structure (feature-oriented, PRD §36)
```
com.secureid
├── SecureIdApplication.java
├── auth/           # controller, service, dto, entity (refresh_tokens)
├── user/           # controller, service, repo, entity
├── role/
├── session/        # entity, repo, service, controller
├── token/          # email verification + password reset
├── oauth/          # OAuthService, OAuthAccount entity
├── security/       # JwtService, JwtAuthenticationFilter, RateLimitService, AccountLockoutService, SecurityConfig
├── audit/          # AuditService, AuditLog entity, event enum
├── risk/           # RiskEngine, AnomalyDetectionService, RiskResult, LoginContext
├── admin/          # Admin controllers
├── notification/   # EmailService
├── common/         # ApiResponse, PageResponse, ErrorCode
├── exception/      # GlobalExceptionHandler, BusinessException
└── config/         # SecurityConfig, CorsConfig, RedisConfig, JwtConfig, OpenApiConfig, JacksonConfig
```

## Core Services (PRD §37)
AuthService, UserService, RoleService, JwtService, RefreshTokenService, SessionService, OAuthService, EmailVerificationService, PasswordResetService, AuditService, RateLimitService, AccountLockoutService, RiskEngine, AnomalyDetectionService, NotificationService

## Database Schema (PRD §29)
```sql
users(id UUID PK, email VARCHAR UNIQUE, password_hash VARCHAR, email_verified BOOLEAN, enabled BOOLEAN, account_locked BOOLEAN, locked_at TIMESTAMP, created_at TIMESTAMP, updated_at TIMESTAMP)
roles(id UUID PK, name VARCHAR UNIQUE)
user_roles(user_id FK, role_id FK, PK(user_id,role_id))
refresh_tokens(id UUID PK, user_id FK, token_hash VARCHAR UNIQUE, session_id FK, expires_at TIMESTAMP, revoked BOOLEAN, created_at TIMESTAMP, revoked_at TIMESTAMP, replaced_by UUID)
sessions(id UUID PK, user_id FK, device_name VARCHAR, ip_address VARCHAR, user_agent VARCHAR, created_at TIMESTAMP, last_active_at TIMESTAMP, expires_at TIMESTAMP, revoked BOOLEAN, revoked_at TIMESTAMP)
email_verification_tokens(id UUID PK, user_id FK, token_hash VARCHAR, expires_at TIMESTAMP, used BOOLEAN, created_at TIMESTAMP)
password_reset_tokens(id UUID PK, user_id FK, token_hash VARCHAR, expires_at TIMESTAMP, used BOOLEAN, created_at TIMESTAMP)
audit_logs(id UUID PK, user_id FK, event_type VARCHAR, ip_address VARCHAR, user_agent VARCHAR, timestamp TIMESTAMP, metadata JSONB)
oauth_accounts(id UUID PK, user_id FK, provider VARCHAR, provider_user_id VARCHAR, created_at TIMESTAMP, UNIQUE(provider, provider_user_id))
login_attempts(id UUID PK, user_id FK, email VARCHAR, success BOOLEAN, ip_address VARCHAR, timestamp TIMESTAMP)
```

## Redis Model (PRD §30)
- `login:failed:{email}` counter TTL 15m (lockout)
- `rate-limit:{endpoint}:{ip}` TTL 60s
- `rate-limit:{endpoint}:{email}` TTL 60s
- `session:{sessionId}` optional cache
- `risk:{userId}` counters
- `verification:{tokenId}`, `password-reset:{tokenId}`
All temporary keys have TTL.

## Auth Flows
### Login
Credentials → validate → find user → check enabled/locked → verify BCrypt → RiskEngine → create session (device/ip/ua) → JWT 15m + refresh 7d (hashed) → audit USER_REGISTERED/LOGIN_SUCCESS

### Refresh Rotation
hash(token) → find → validate not expired/revoked → revoke old (revoked_at, replaced_by) → issue new pair; reuse of revoked → TOKEN_REUSE_DETECTED → revoke session/all

### OAuth2 Google
User → /oauth2/authorization/google → Google → code → SecureID callback → fetch userinfo → find/create local user (ROLE_USER only) → session + tokens

## Security Design
- Passwords: BCrypt (strength 12) centralized PasswordEncoder bean, never logged/returned
- Tokens: JWT signed (HS256 dev / RS256 prod via JWT_PRIVATE_KEY), refresh hashed SHA-256 before storage, secure random 32+ bytes
- CORS: explicit allowlist from `CORS_ORIGINS` (dev http://localhost:3000), never *
- Headers: HSTS, X-Frame-Options, X-Content-Type-Options, CSP via SecurityConfig
- Validation: jakarta.validation on all DTOs, email normalization (lowercase/trim)
- Rate limiting & lockout via Redis, atomic INCR + EXPIRE
- Audit never includes sensitive fields

## Risk Engine Detail
Input LoginContext, Output RiskResult. Scoring §24, thresholds configurable via `secureid.risk.thresholds.*`. Anomaly compares against baseline (last 30 logins: typical hours/countries/devices/IPs). Version 1 rules-based; interface ready for ML.

## Observability
- Structured JSON logging (logback), correlation ID filter (X-Correlation-ID)
- Actuator health `/actuator/health`, metrics via Micrometer: `login.success/failure/locked`, `token.refresh/reuse`, `session.created/revoked`, `risk.high/critical`
- Audit logs queryable by admin

## Docker
Services: api:8080, postgres:5432, redis:6379, mailhog:8025 optional. api depends_on postgres+redis healthy. Multi-stage Dockerfile (maven build → eclipse-temurin:21-jre-alpine, non-root).

## Migrations
Flyway `db/migration/V1__ ... V6__`. Never `ddl-auto=create` in prod. Validate mode.
