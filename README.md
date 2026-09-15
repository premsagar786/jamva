# SecureID — Identity & Access Management Platform

Production-grade backend scaffold: Spring Boot 3.x, Java 21, Spring Security 6, PostgreSQL 16, Redis 7, Flyway, JWT (15m) + Refresh Rotation (7d), OAuth2 Google, RBAC, Audit, Risk Engine, Docker & CI.

> **Scope of this skeleton:** common + exception + security filter (ApiResponse, PageResponse, ErrorCode, JwtService, JwtAuthenticationFilter, SecurityConfig, CORS), Flyway migrations V1–V6, Docker/Compose, env, CI.

---

## Tech Stack

- **Java 21**, **Spring Boot 3.3.5**, Spring Security, Data JPA, Validation, OAuth2 Client + Resource Server, Data Redis, Mail, AOP, Actuator
- **PostgreSQL 16** + **Flyway** (never `ddl-auto=create` in prod)
- **Redis 7** (Lettuce) — rate limits, lockout, sessions, risk counters
- **JWT** — HS256 (dev `JWT_SECRET`) / RS256 prod, JJWT 0.12.6
- **Docs** — springdoc-openapi, Swagger UI at `/swagger-ui.html`
- **Testing** — JUnit5, Mockito, Testcontainers (Postgres+Redis), H2
- **Infra** — Docker multi-stage, Compose, GitHub Actions

---

## Package Structure

```
com.secureid
├── SecureIdApplication.java
├── common/         ApiResponse, PageResponse, ErrorCode
├── exception/      BusinessException, GlobalExceptionHandler
├── security/       JwtService, JwtAuthenticationFilter (+ RateLimit/AccountLockout stubs)
├── config/         SecurityConfig, CorsConfig, RedisConfig, JacksonConfig, OpenApiConfig
├── auth/           (upcoming) controller/service/dto
├── user/ role/ session/ token/ oauth/ audit/ risk/ admin/ notification/
└── resources/db/migration/  V1..V6
```

---

## Quick Start

### 1. Prerequisites

- Java 21, Maven 3.9+, Docker & Compose v2, Git

### 2. Clone & env

```bash
git clone <repo> && cd jamva
cp .env.example .env   # adjust JWT_SECRET etc.
```

**Required env:** `DATABASE_URL`, `DATABASE_USERNAME/PASSWORD`, `REDIS_HOST/PORT`, `JWT_SECRET` (>=32 chars), `GOOGLE_CLIENT_ID/SECRET` (optional), `MAIL_*`, `FRONTEND_URL`, `CORS_ORIGINS`, `JWT_EXPIRATION` (900000), `REFRESH_EXPIRATION` (604800000).

### 3. Run with Docker (recommended)

```bash
docker compose up --build
# api: http://localhost:8080
# postgres: 5432, redis: 6379, mailhog: http://localhost:8025
# health: http://localhost:8080/actuator/health
# docs:   http://localhost:8080/swagger-ui.html
```

Compose provides: `postgres:16-alpine`, `redis:7-alpine`, `mailhog` (dev mail), `api` (multi-stage, non-root, `depends_on` healthy).

### 4. Run without Docker

```bash
createdb secureid   # or docker run postgres:16-alpine
redis-server
cd backend
mvn spring-boot:run
```

Flyway runs automatically on startup (`baseline-on-migrate: true`, location `classpath:db/migration`).

---

## Flyway Migrations V1–V6

| Version | File | Contents |
|---------|------|----------|
| V1 | `V1__create_users_table.sql` | `users` + `pgcrypto`, email unique index, `updated_at` trigger |
| V2 | `V2__create_roles_and_user_roles.sql` | `roles`, `user_roles` + seed `ROLE_USER/MANAGER/SUPPORT/ADMIN` |
| V3 | `V3__create_tokens_tables.sql` | `email_verification_tokens`, `password_reset_tokens`, `refresh_tokens` (hashed, unique, `replaced_by`, `revoked`) |
| V4 | `V4__create_sessions_table.sql` | `sessions` + FK `refresh_tokens.session_id` added post-creation |
| V5 | `V5__create_audit_tables.sql` | `audit_logs` (JSONB + GIN), `login_attempts` + indexes |
| V6 | `V6__create_oauth_accounts.sql` | `oauth_accounts` unique(provider, provider_user_id) + FK |

Validate: `mvn -f backend/pom.xml flyway:info` or via Docker.

---

## API Contract (excerpt)

Base: `http://localhost:8080/api` — Auth: `Authorization: Bearer <accessToken>` unless public.

**Standard wrapper:**

```json
// Success
{"success": true, "data": {}, "timestamp": "2026-09-15T..."}
// Error
{"success": false, "error": {"code": "INVALID_CREDENTIALS", "message": "..."}, "timestamp": "..."}
```

Public: `POST /api/auth/{register,login,refresh,verify-email,forgot-password,reset-password}`, `GET /actuator/health`, `GET /v3/api-docs/**`, `/swagger-ui/**`, OAuth2 `/login/oauth2/code/**`.

Full spec: [`docs/API.md`](docs/API.md), [`docs/SECURITY.md`](docs/SECURITY.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Security Model

- **Passwords:** BCrypt strength 12 bean in `SecurityConfig`, never logged/returned.
- **Tokens:** Access JWT 15m (`sub`, `email`, `roles`, `iss`, `iat`, `exp`) signed HS256/RS256; refresh 32-byte secure random Base64URL, SHA-256 hashed, 7d, revocable, rotation with `TOKEN_REUSE_DETECTED`.
- **CORS:** Allowlist from `CORS_ORIGINS` (dev `http://localhost:3000,http://127.0.0.1:3000`), `allowCredentials=true` never with `*`, exposed `Authorization`, `X-Correlation-ID`, rate-limit headers, maxAge 3600.
- **Headers:** `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, `Referrer-Policy`.
- **Validation:** Jakarta Validation on DTOs, email normalization, parameterized JPA.
- **Lockout/RateLimit:** Redis `login:failed:{email}` TTL 15m (5 attempts), `rate-limit:{endpoint}:{ip|email}` TTL 60s (login 5/min, register 3/min etc.) → 429 with `Retry-After`.
- **Audit:** Never password/tokens/OTP; admin queryable.

See [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Docker

**`backend/Dockerfile` (multi-stage):**

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS builder  # mvn dependency:go-offline + package
FROM eclipse-temurin:21-jre-alpine              # non-root secureid, healthcheck
```

**Root `Dockerfile`** mirrors backend for `docker build -f Dockerfile .`.

**`docker-compose.yml`:** `api:8080`, `postgres:5432`, `redis:6379`, `mailhog:8025/1025`, healthchecks, `depends_on` healthy.

Build manually:

```bash
docker build -f backend/Dockerfile -t secureid:local ./backend
docker run --rm -p 8080:8080 --env-file .env secureid:local
```

---

## CI

Workflow `.github/workflows/ci.yml`:

- **validate:** `mvn -B validate` (via `setup-java` + via `maven:3.9-eclipse-temurin-21` Docker), file integrity checks for skeleton + migrations + Docker/env.
- **build:** `mvn clean package -DskipTests`, `mvn test` (Testcontainers), `docker build`.
- Triggers on `push`/`pull_request` to `main/master/develop` + manual.

Validate locally via Docker (as CI does):

```bash
docker run --rm -v $(pwd)/backend:/app -w /app maven:3.9-eclipse-temurin-21 mvn -B validate
# PowerShell:
docker run --rm -v ${PWD}/backend:/app -w /app maven:3.9-eclipse-temurin-21 mvn -B validate
```

---

## Configuration (`application.yml`)

Key `secureid.*` and `spring.*` read from env with defaults for dev (see `.env.example`). `application-test.yml` uses H2 `create-drop`, Flyway disabled.

---

## Verification

```bash
# File integrity (example)
ls backend/src/main/resources/db/migration/V*.sql   # V1..V6
ls backend/src/main/java/com/secureid/common/ApiResponse.java
ls backend/src/main/java/com/secureid/security/JwtService.java
ls backend/src/main/java/com/secureid/security/JwtAuthenticationFilter.java
ls backend/src/main/java/com/secureid/config/SecurityConfig.java
ls backend/src/main/java/com/secureid/config/CorsConfig.java

# Build
mvn -f backend/pom.xml validate
docker run --rm -v ${PWD}/backend:/app -w /app maven:3.9-eclipse-temurin-21 mvn -B validate

# Compose
docker compose config --quiet && echo "compose ok"
```

---

## Next Milestones (M1–M10)

M1 Foundation (Boot, Postgres, Flyway, User/Role, Docker) → M2 Auth (BCrypt, JWT) → M3 Rotation → M4 RBAC → M5 Account Security → M6 Session/Audit → M7 OAuth → M8 Risk → M9 AI → M10 Prod.

---

## License

Internal / portfolio — adjust as needed.
