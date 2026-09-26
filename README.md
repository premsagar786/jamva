# SecureID — Identity & Access Management Platform

Full-stack IAM: **Spring Boot 3.x / Java 21** backend (PostgreSQL 16, Redis 7, Flyway, JWT + Refresh Rotation, OAuth2 Google, RBAC, Audit, Risk Engine, Docker & CI) plus a **React 18 + Vite** admin console in `frontend/`.

> **Scope of this skeleton:** backend — common + exception + security filter (ApiResponse, PageResponse, ErrorCode, JwtService, JwtAuthenticationFilter, SecurityConfig, CORS), Flyway migrations V1–V6, Docker/Compose, env, CI. Frontend — runnable console UI on a mock service layer that mirrors the backend contract.

---

## Tech Stack

- **Java 21**, **Spring Boot 3.3.5**, Spring Security, Data JPA, Validation, OAuth2 Client + Resource Server, Data Redis, Mail, AOP, Actuator
- **PostgreSQL 16** + **Flyway** (never `ddl-auto=create` in prod)
- **Redis 7** (Lettuce) — rate limits, lockout, sessions, risk counters
- **JWT** — HS256 (dev `JWT_SECRET`) / RS256 prod, JJWT 0.12.6
- **Frontend** — React 18, Vite 5, React Router 7, Recharts, Framer Motion / GSAP / Three.js, Lucide icons
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

```
frontend/          React 18 + Vite admin console
├── src/pages/     Login, Overview, Users, Sessions, Audit, Security
├── src/components/ shell/ (AppShell, Topbar), three/ (SphericalNetwork), ui.jsx
├── src/lib/reactbits/  vendored animation/text/background components
├── src/services/  api.js (mock, mirrors docs/API.md) + mockData.js
└── vite.config.js  dev server 127.0.0.1:5173, manual vendor chunks
```

---

## Quick Start (Backend)

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

## Frontend (React + Vite)

The admin console runs standalone — **no backend or Docker needed**. It talks to a mock service layer (`frontend/src/services/api.js`) that returns the same `ApiResponse` envelope as the real API, with realistic latency. Swapping in `fetch()` calls is a one-file change.

### 1. Prerequisites

- **Node.js 20+** (verified on v22.15.1) and npm 10+ — check with `node -v` / `npm -v`

### 2. Install & run

```bash
cd frontend
npm install          # once; creates node_modules/ (~185 MB, gitignored)
npm run dev          # Vite dev server with HMR
```

Open **http://127.0.0.1:5173** (host/port pinned in `frontend/vite.config.js`). HMR applies JSX edits instantly; Three.js/GSAP scenes are the only heavy part on first load.

### 3. Build & preview

```bash
npm run build        # production bundle -> frontend/dist/
npm run preview      # serve the built bundle locally
```

`vite.config.js` splits the bundle into `react`, `motion`, `charts`, `three`, `gsap`, `icons` chunks, so heavy 3D/animation code caches separately from app code.

### 4. Sign in (demo)

Any password works — auth is mocked. Pick an account to see a different state:

| Email | What it demonstrates |
|-------|----------------------|
| `ava.chen@secureid.local` | Admin happy path + MFA challenge |
| `ethan.gray@secureid.local` | Locked account (`ACCOUNT_LOCKED`, 423) |
| `emma.larsson@secureid.local` | Unverified email (redirect to verify) |

Session persists in `sessionStorage` under `sid.session`; `/overview`, `/users`, `/sessions`, `/audit`, `/security` are behind the auth guard, anything else redirects.

### 5. Notes

- **API calls** — all data flows through `src/services/api.js`; mock fixtures in `src/services/mockData.js`. Nothing else in the app fetches directly.
- **Wiring the real backend** — point a `fetch` wrapper at `http://localhost:8080/api` and add `http://127.0.0.1:5173` to `CORS_ORIGINS` in `.env` (dev default allows port 3000, not 5173).
- **Static hosting** — `dist/` is a plain SPA. It uses `BrowserRouter`, so the host needs a rewrite of unknown paths to `index.html`.

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

## Push to GitHub

Remote is `https://github.com/premsagar786/jamva.git` (already configured).

```bash
# 1. Confirm what will be committed — node_modules/, dist/, .env must be ignored
git status

# 2. Stage (all tracked changes + the new frontend)
git add -A

# 3. Commit
git commit -m "feat(frontend): add React + Vite admin console"

# 4. Push
git push origin main
```

**What is deliberately not committed** (see `.gitignore`): `node_modules/` (~185 MB), `frontend/dist/` (build output), `.env` / `.env.*.local` (secrets — only `.env.example` is tracked), `target/`, `*.jar`, IDE folders.

First push to a new repo on GitHub? If the branch is not yet `main` or has no upstream:

```bash
git branch -M main
git push -u origin main
```

Useful extras:

```bash
git log --oneline -10          # review before pushing
git push --dry-run origin main # see what would go up
git restore --staged <file>    # unstage a file you didn't mean to add
```

CI (`.github/workflows/ci.yml`) runs on every push to `main`/`master`/`develop` and on pull requests.

---

## License

Internal / portfolio — adjust as needed.
