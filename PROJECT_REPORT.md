# SecureID — Project Report

## Identity & Access Management Platform
**Version:** 1.0.0 &nbsp;·&nbsp; **Date:** September 2026 &nbsp;·&nbsp; **Status:** Backend Skeleton (Security Spine Complete)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Vision & Problem Statement](#2-project-vision--problem-statement)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Repository Layout](#5-repository-layout)
6. [Backend Implementation](#6-backend-implementation)
7. [Database Schema & Flyway Migrations](#7-database-schema--flyway-migrations)
8. [Security Model](#8-security-model)
9. [Token Design: JWT + Refresh Rotation](#9-token-design-jwt--refresh-rotation)
10. [Risk & Anomaly Engine](#10-risk--anomaly-engine)
11. [API Contract](#11-api-contract)
12. [Role-Based Access Control](#12-role-based-access-control)
13. [Infrastructure: Docker, Compose & CI](#13-infrastructure-docker-compose--ci)
14. [Configuration & Environment](#14-configuration--environment)
15. [Frontend & Interactive Showcases](#15-frontend--interactive-showcases)
16. [Documentation Set](#16-documentation-set)
17. [Implemented vs. Specified — The Honest Gap](#17-implemented-vs-specified--the-honest-gap)
18. [Roadmap & Milestones](#18-roadmap--milestones)
19. [Getting Started](#19-getting-started)
20. [Conclusion](#20-conclusion)

---

## 1. Executive Summary

**SecureID** is a production-oriented **Identity and Access Management (IAM) platform** built as a central, self-hosted alternative to commercial identity providers such as Okta and Auth0. It centralizes the entire user identity lifecycle — registration, authentication, authorization, sessions, tokens, OAuth2 federation, password recovery, email verification, security events, and suspicious-login detection — behind one hardened REST API.

The repository currently delivers a **complete backend security spine** rather than a finished application. What is real and running today:

- A **stateless JWT authentication pipeline** (`JwtService`, `JwtAuthenticationFilter`) that validates a signed, short-lived access token on every request.
- A **hardened Spring Security filter chain** (`SecurityConfig`) with CORS, CSRF-off, stateless sessions, RBAC-ready method security, and defensive HTTP headers.
- A **standardized JSON envelope** (`ApiResponse`, `ErrorCode`, `GlobalExceptionHandler`) with typed error codes and no stack-trace leakage.
- A **six-version Flyway PostgreSQL schema** (V1–V6) covering users, roles, hashed refresh tokens, sessions, audit logs, login attempts, and OAuth accounts — the most complete part of the system.
- **Docker multi-stage builds, Docker Compose orchestration, and a GitHub Actions CI pipeline.**
- **Documentation set** (`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SECURITY.md`) and **two interactive HTML explainers** plus a React/Vite "repo explainer" landing page.

The business layer that logically sits on top of this spine — the auth controllers/services, the risk engine, the admin APIs — is specified in detail in the docs but **not yet implemented**. The report makes this distinction explicit throughout.

---

## 2. Project Vision & Problem Statement

### 2.1 Vision

To become a centralized, Okta/Auth0-style identity service that handles: user identities, authentication, authorization, sessions, token management, OAuth2, password recovery, email verification, security events, and suspicious-login detection — delivered as a self-contained REST API.

### 2.2 Problem Statement

Modern distributed applications routinely re-implement authentication, user registration, token management, session auditing, role-based access control, Google OAuth integration, and brute-force prevention. Each re-implementation widens the attack surface and invites logic errors, protocol misalignments, and inconsistent security boundaries. SecureID solves this by providing a single, hardened, RESTful security engine — deployed once and consumed by many applications.

### 2.3 Goals (from the PRD)

1. Secure authentication
2. Short-lived JWT access tokens
3. Refresh-token rotation with replay detection
4. Role-based access control (RBAC)
5. OAuth2 / OIDC (Google)
6. Session management and revocation
7. Email verification
8. Password reset and change
9. Failed-login detection
10. Account lockout (brute-force defense)
11. Audit logging
12. Risk-based authentication
13. Behavioral anomaly detection
14. Admin controls
15. Docker-ready, testable, production-oriented
16. OpenAPI documentation

### 2.4 Non-Goals (v1)

SAML, SCIM provisioning, hardware security keys, multi-region failover, billing, organization-level SaaS tenancy, an IdP marketplace, and directory sync are explicitly out of scope for version 1.

---

## 3. Technology Stack

| Layer | Choice | Justification |
| :--- | :--- | :--- |
| Language | **Java 21 (LTS)** | Modern JVM, virtual threads, strong static typing |
| Framework | **Spring Boot 3.3.5** | Mature DI, starters, modular security pipeline |
| Security | **Spring Security 6** | Filter chains, OAuth2 Client + Resource Server, method security |
| Database | **PostgreSQL 16** | ACID, JSONB + GIN indexes for audit data |
| Migrations | **Flyway** | Versioned, reproducible SQL (V1–V6), `validate` mode |
| Cache/State | **Redis 7** (Lettuce) | Rate limits, lockout counters, sessions, risk state |
| JWT | **JJWT 0.12.6** | HS256 dev / RS256 prod signing, parsing, validation |
| Validation | **Jakarta Validation** | Bean validation on DTOs |
| ORM | **Spring Data JPA** | `ddl-auto: validate` (never `create` in prod) |
| API Docs | **springdoc-openapi 2.6.0** | Swagger UI at `/swagger-ui.html` |
| Mail | **Spring Boot Mail** (MailHog in dev) | Verification/reset email delivery |
| Build | **Maven** (MapStruct 1.5.5) | Declarative builds, annotation processing |
| Testing | **JUnit 5, Mockito, Testcontainers, H2** | Unit + integration support |
| Infra | **Docker / Docker Compose / GitHub Actions** | Multi-stage images, orchestration, CI |

---

## 4. System Architecture

### 4.1 High-Level Diagram

```
        +---------------------------------------------+
        |           SecureID API Client                |
        |     (Web UI / Mobile / Third-Party App)      |
        +---------------------------------------------+
                            |
                      HTTPS (443)
                            v
        +---------------------------------------------+
        |       Nginx Reverse Proxy  [production]     |
        |      (SSL termination / TLS via certbot)    |
        +---------------------------------------------+
                            |
                      HTTP (8080)
                            v
        +---------------------------------------------+
        |          SecureID Spring Boot API           |
        |  Auth · Users · Sessions · OAuth2 · Audit   |
        |  Risk Engine · Rate Limit · Lockout         |
        +---------------------------------------------+
          |                       |              |
   Spring Data JPA          Lettuce        OAuth2 Client
          |                       |              |
          v                       v              v
 +-----------------+      +---------------+  +-----------------+
 |  PostgreSQL 16  |      |    Redis 7    |  |   Google OIDC   |
 | users, roles,   |      | rate-limit:*  |  +-----------------+
 | tokens (hashed),|      | login:failed: |
 | sessions, audit |      | risk counters |
 | oauth_accounts  |      +---------------+
 +-----------------+
```

### 4.2 Request Flow Through the Security Pipeline

Every inbound request traverses a defensive filter chain configured in `SecurityConfig`:

1. **CorsFilter** — enforces the explicit origin allowlist derived from `CORS_ORIGINS` (never `*` with credentials).
2. **JwtAuthenticationFilter** — extracts the `Bearer` token from the `Authorization` header, verifies the cryptographic signature and expiry, and populates `SecurityContextHolder` with the user id (`principal`), email, and roles (`authorities`). Fail-closed on expired tokens.
3. **AuthorizationFilter** — evaluates whether the authenticated principal holds the `GrantedAuthority` required by the matching controller (RBAC via `@PreAuthorize` / request matchers).

A JSON `ApiResponse` is produced for 401 (unauthenticated) and 403 (forbidden) outcomes via a custom authentication entry point and access-denied handler.

### 4.3 Package Structure (target layout)

```
com.secureid
    SecureIdApplication.java        @SpringBootApplication + @EnableAsync
    ├── common/         ApiResponse, PageResponse, ErrorCode
    ├── exception/      BusinessException, GlobalExceptionHandler
    ├── security/       JwtService, JwtAuthenticationFilter
    ├── config/         SecurityConfig, CorsConfig, RedisConfig,
    │                   JacksonConfig, OpenApiConfig
    ├── auth/           (upcoming) controllers/services/dto/entity
    ├── user/  role/  session/  token/  oauth/  audit/  risk/
    │   admin/  notification/     (planned feature domains)
    └── resources/db/migration/   V1__ ... V6__
```

---

## 5. Repository Layout

```
jamva/
├── backend/                        Spring Boot application
│   ├── Dockerfile                  multi-stage, non-root
│   ├── pom.xml                     Maven build
│   └── src/main/
│       ├── java/com/secureid/      13 Java source files
│       └── resources/
│           ├── application.yml     main config (env-overridable)
│           ├── application-test.yml H2 test profile
│           └── db/migration/       Flyway V1–V6
├── frontend/                       React 18 + Vite 5 "repo explainer"
│   ├── package.json / vite.config.js
│   └── src/                        components, data, utils, styles
├── docs/                           PRD, Architecture, Security, API
├── .github/workflows/ci.yml        three-job GitHub Actions pipeline
├── docker-compose.yml              api + postgres + redis + mailhog
├── Dockerfile                      root convenience build
├── .env.example                    documented environment template
├── index.html                      single-file interactive explainer
├── showcase.html                   architecture showcase (810 lines)
├── README.md                       main documentation entry point
└── SECUREID_REPORT.md              prior deployment/blueprint report
```

---

## 6. Backend Implementation

The backend consists of exactly **13 compiled Java files** (no tests are present yet). Each is described below.

### 6.1 `SecureIdApplication.java`

The entry point. Declares `@SpringBootApplication` and `@EnableAsync` — async processing is enabled up front so the future `AuditService` and `NotificationService` can write audit logs and send mail off the request thread without further wiring.

### 6.2 `common/ApiResponse.java`

A generic envelope record for every API response:

```java
public record ApiResponse<T>(boolean success, T data, ErrorBody error, Instant timestamp) { ... }
```

- `ApiResponse.ok(data)` / `ApiResponse.created(data)` for success.
- `ApiResponse.fail(code, message)` for errors, embedding a nested `ErrorBody`.
- `@JsonInclude(NON_NULL)` keeps the payload minimal.

This satisfies the PRD contract: success paths never carry an `error` object and failures never carry `data`. The uniform shape makes client-side handling trivial.

### 6.3 `common/ErrorCode.java`

An enum mapping machine-readable codes to HTTP statuses — the single source of truth for error semantics:

| Code | HTTP | Meaning |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 400 | Bean/constraint validation failed |
| `INVALID_CREDENTIALS` | 401 | Bad email/password |
| `UNAUTHORIZED` | 401 | Authentication required/expired |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource missing |
| `CONFLICT` | 409 | Duplicate (e.g., email already registered) |
| `ACCOUNT_LOCKED` | 423 | Locked after failed attempts |
| `ACCOUNT_DISABLED` | 403 | Account disabled |
| `EMAIL_NOT_VERIFIED` | 403 | Verification pending |
| `TOKEN_EXPIRED` | 401 | JWT/refresh expired |
| `TOKEN_REVOKED` | 401 | Refresh revoked |
| `TOKEN_REUSE_DETECTED` | 401 | Rotated token replayed |
| `RATE_LIMITED` | 429 | Per-endpoint budget exceeded |
| `INVALID_TOKEN` | 400 | Malformed token |
| `INTERNAL_ERROR` | 500 | Unhandled exception |

### 6.4 `common/PageResponse.java`

A pagination wrapper used by paged admin endpoints (user lists, audit logs). It mirrors Spring Data's `Page` into a stable contract: `content`, `page`, `size`, `totalElements`, `totalPages`, `last`, `first` — with a convenience factory `of(Page<T>)`.

### 6.5 `exception/BusinessException.java`

A `RuntimeException` carrying an `ErrorCode`. Business rules (e.g., "credentials invalid", "account locked") throw this; the handler maps it to the correct HTTP status and code without leaking internals.

### 6.6 `exception/GlobalExceptionHandler.java`

A `@RestControllerAdvice` that converts exceptions into uniform `ApiResponse` bodies. Notable behaviors:

- `BusinessException` → its own `ErrorCode`.
- `MethodArgumentNotValidException` / `ConstraintViolationException` → 400 with a joined field-error message.
- `BadCredentialsException` → 401 **always "Invalid credentials"** (anti-enumeration — same message for wrong email or wrong password).
- `AccessDeniedException` → 403; `AuthenticationException` → 401.
- Malformed JSON, missing params, wrong method, and unknown routes each get a specific, sanitized 400/404/405.
- A catch-all `Exception` handler returns 500 `INTERNAL_ERROR` and logs the full stack server-side — **never** to the client.

### 6.7 `security/JwtService.java`

The token engine. Key responsibilities:

- **Construction-time guard:** the HMAC secret must be ≥ 32 bytes (256 bits) or the application refuses to start.
- `generateAccessToken(userId, email, roles)` — builds a JWT with claims `sub` (user UUID), `email`, `roles`, `iss` ("secureid"), `iat`, `exp`. Lifetime is 15 minutes by default (`secureid.jwt.expiration`).
- `generateRefreshTokenRaw()` — 32 bytes from `SecureRandom`, Base64URL-encoded, no padding. This raw value is shown to the client once; only its SHA-256 hash is persisted (by the future refresh service).
- `parse(token)` / `isValid(token)` — verifies signature and claims; throws on tampering/expiry.
- `getUserId` / `getEmail` / `getRoles` — typed claim accessors.

HS256 is used for dev with `JWT_SECRET`; the production path is RS256 via a private/public key pair (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`), already anticipated in `.env.example`.

### 6.8 `security/JwtAuthenticationFilter.java`

A `OncePerRequestFilter` that runs before `UsernamePasswordAuthenticationFilter` on every request:

1. Reads `Authorization: Bearer <token>`; skips with no header.
2. Validates signature + expiry via `JwtService`; invalid tokens are rejected without authentication (fail-closed).
3. Parses roles from the `roles` claim and maps them to `SimpleGrantedAuthority`s.
4. Builds a `UsernamePasswordAuthenticationToken` with **userId as principal** and **email as credentials**, attaches web details (remote IP, session id), and stores it in `SecurityContextHolder`.
5. **Expired JWT** → writes a `401` `ApiResponse` (`TOKEN_EXPIRED`) directly to the response.
6. **Malformed/JwtException** → clears the context so unauthenticated access is handled by the entry point (prevents privilege confusion).

### 6.9 `config/SecurityConfig.java`

The central security declaration:

- **Stateless sessions** (`SessionCreationPolicy.STATELESS`), **CSRF disabled** (JWT has no cookie CSRF surface).
- **CORS** wired to the `CorsConfigurationSource` bean.
- **Hardening headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS (1 year, includeSubDomains), `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; form-action 'self'`.
- **Permit-all paths:** `/api/auth/register`, `/login`, `/refresh`, `/verify-email`, `/forgot-password`, `/reset-password`, `/actuator/health`, `/v3/api-docs/**`, `/swagger-ui/**`, `/login/oauth2/code/**`, `/oauth2/authorization/**`; **everything else requires authentication**.
- Custom JSON 401/403 responses.
- **`PasswordEncoder` bean: BCrypt work factor 12** (centralized, never logged, never returned).
- `@EnableMethodSecurity` — `@PreAuthorize`/`@PostAuthorize` are enabled and ready for RBAC on controllers.
- `AuthenticationManager` exported for the future login flow.

### 6.10 `config/CorsConfig.java`

Builds a `CorsConfigurationSource` from `secureid.cors.*`:

- Origin allowlist parsed from comma-separated `CORS_ORIGINS` (dev: `http://localhost:3000`, `http://127.0.0.1:3000`).
- `allowCredentials = true` **never combined with `*`**.
- Exposes `Authorization`, `X-Correlation-ID`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers.
- `maxAge = 3600s` to cache preflights.

### 6.11 `config/RedisConfig.java`

Provides a `StringRedisTemplate` bean — the primitive used by the future `RateLimitService`, `AccountLockoutService`, and session cache. Redis is otherwise unutilized until those services are built.

### 6.12 `config/JacksonConfig.java`

Configures the `ObjectMapper` with `JavaTimeModule` and ISO-8601 timestamps (no epoch millis), giving consistent `Instant` serialization across responses.

### 6.13 `config/OpenApiConfig.java`

Defines the OpenAPI bean: title, description, and a global `bearerAuth` (HTTP Bearer JWT) security scheme — so Swagger UI renders a working Authorize button against live endpoints once controllers exist.

---

## 7. Database Schema & Flyway Migrations

All relational schema lives in `backend/src/main/resources/db/migration/` and is applied at startup by Flyway (`baseline-on-migrate: true`). This is the **most complete part of the system** — every table the business layer needs already exists.

| Version | File | Creates | Key Points |
| :--- | :--- | :--- | :--- |
| V1 | `create_users_table.sql` | `users` | `pgcrypto` UUID PK, unique `LOWER(email)` index, `email_verified`/`enabled`/`account_locked`/`locked_at`, `updated_at` trigger |
| V2 | `create_roles_and_user_roles.sql` | `roles`, `user_roles` | Seeds `ROLE_USER`, `ROLE_SUPPORT`, `ROLE_MANAGER`, `ROLE_ADMIN`; cascade FKs |
| V3 | `create_tokens_tables.sql` | `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens` | Hashed tokens, `revoked`, `replaced_by` rotation chain |
| V4 | `create_sessions_table.sql` | `sessions` | Device/IP/UA telemetry; FK `refresh_tokens.session_id` added post-creation |
| V5 | `create_audit_tables.sql` | `audit_logs`, `login_attempts` | JSONB `metadata` + **GIN index**; per-attempt login history |
| V6 | `create_oauth_accounts.sql` | `oauth_accounts` | Unique `(provider, provider_user_id)`, FK to `users` |

### 7.1 Notable schema decisions

- **Refreshed tokens are stored hashed** — the raw value is never persisted, so a DB leak does not expose usable session secrets.
- **Rotation is modeled in data**: `refresh_tokens.replaced_by` points to the successor token, and `revoked_at` records when a token was spent — the data layer for `TOKEN_REUSE_DETECTED` is already present.
- **Audit metadata is JSONB with a GIN index** — flexible, queryable event payloads without schema churn.
- **A deferred FK** (V3→V4) orders table creation correctly: `sessions` must exist before `refresh_tokens.session_id` can reference it.
- **Case-insensitive email uniqueness** enforced with `UNIQUE INDEX ON users (LOWER(email))` — normalization at the database, not just the application, layer.

### 7.2 Entity relationship summary

```
users 1 ──── n refresh_tokens n ──── 1 sessions
  │                                    │
  ├── n user_roles n ── roles          (one session per login,
  ├── n email_verification_tokens         device+ip+ua tracked)
  ├── n password_reset_tokens
  ├── n audit_logs
  ├── n login_attempts
  └── n oauth_accounts
```

---

## 8. Security Model

### 8.1 Principles

Defense in depth, least privilege, fail closed, no sensitive data in logs, and secrets kept out of version control.

### 8.2 Password Security

- **BCrypt with work factor 12** via a centralized `PasswordEncoder` bean.
- Password-strength rules are configurable (`secureid.password.*`): min 8 chars, mixed case, digit, symbol.
- Passwords are never logged, never placed in audit metadata, never returned by any endpoint.

### 8.3 Account Lockout & Rate Limiting (designed)

Two complementary Redis-backed mechanisms are specified (config values already in `application.yml`):

- **Lockout** — key `login:failed:{email}`, incremented per failed password, TTL 15 min. At **5 failures** the account locks for 15 minutes, tracked by `account_locked` / `locked_at`. The lock is **per-email, not per-IP** — an attacker cycling proxies still hits the wall, while users on shared NATs are not hit with collateral damage.
- **Rate limiting** — fixed-window keys `rate-limit:{endpoint}:{ip}` and `rate-limit:{endpoint}:{email}`, TTL 60 s, per-endpoint budgets: login `5/min`, register `3/min`, forgot-password `3/min`, reset-password `5/min`, refresh `10/min`. Exceeding returns `429 RATE_LIMITED` with a `Retry-After` header.

> These mechanisms are **designed but not coded** — the keys, budgets, and config exist; the `RateLimitService` / `AccountLockoutService` do not (yet).

### 8.4 Anti-Enumeration & Input Hardening

- Forgot-password and resend-verification return **generic success** regardless of account existence.
- Login returns the same "Invalid credentials" for a wrong email as for a wrong password.
- Jakarta Validation on DTOs, email normalization (lowercase/trim), JPA parameterized queries, JSON-escaping against XSS.

### 8.5 Secrets Management

- `.env` is git-ignored; `.env.example` is committed as a documented template.
- `JWT_SECRET` must be ≥ 32 chars (256 bits); production uses RS256 keys.
- Compose/CI feed secrets via environment, never hard-coded.

---

## 9. Token Design: JWT + Refresh Rotation

### 9.1 Two-token model

- **Access token (JWT, 15 min):** stateless — any server can validate signature + `exp` without a DB round-trip. Short life limits what a stolen token buys. Cannot be instantly revoked, which is why it is short-lived.
- **Refresh token (7 days):** 32-byte secure random, stored as a SHA-256 hash in Postgres, bound to a session, **single-use**, revocable. It is the long-lived key to the account — and exactly why rotation exists.

### 9.2 Rotation flow

```
POST /api/auth/refresh  { refreshToken }
  → hash(token) → lookup row
  → validate: not expired, not revoked
  → revoke old row (revoked_at, replaced_by = new id)
  → issue new access + new refresh pair
```

### 9.3 Reuse detection (the payoff)

If an attacker replays an already-spent refresh token, the server detects the row is `revoked` with a `replaced_by` successor → emits `TOKEN_REUSE_DETECTED`, revokes the **entire session chain** for that device, and responds `401 TOKEN_REVOKED`. The attacker never receives a second token.

**Real-world scenario:** a user signs in on a shared laptop; later someone tries to use the saved session. When the thief submits the spent refresh token, the server flags the replay, knows exactly which device it came from, and kills the chain before any of it is usable.

> The schema (V3/V4) and the `TOKEN_REUSE_DETECTED` error code are **implemented**; the rotation service itself is **not yet**.

### 9.4 Access token claims

`sub` (user UUID), `email`, `roles`, `iss` ("secureid"), `iat`, `exp` — assembled by `JwtService.generateAccessToken(...)`.

---

## 10. Risk & Anomaly Engine

Specified in detail (weights and thresholds already configured in `application.yml` under `secureid.risk.*`); the evaluation logic is a documented future milestone.

### 10.1 Scoring model

Input `LoginContext(userId, ip, location, device, ua, loginTime, failedAttempts)` → output `RiskResult(score, level, reasons, action)`.

| Signal | Weight | Logic |
| :--- | :---: | :--- |
| New device | +20 | UA differs from session history |
| New location | +30 | Country unseen in last 30 sessions |
| Failed attempts | +20 | Redis still holds failed state for the email |
| Impossible travel | +40 | Implied velocity ≫ ~800 km/h gate |
| Unusual access hour | +10 | Outside the user's normal windows |

### 10.2 Escalation policy

| Score | Level | Policy |
| :--- | :--- | :--- |
| 0–30 | LOW | Allow authentication |
| 31–60 | MEDIUM | Require MFA (email OTP) |
| 61–100 | HIGH | Block request + notify by email |
| ≥101 | CRITICAL | Lock account 15 min + revoke all sessions |

The weights/thresholds in `application.yml` (`new-device: 20`, `new-location: 30`, `failed-attempts: 20`, `impossible-travel: 40`, `unusual-time: 10`, thresholds `low: 30 / medium: 60 / high: 100 / critical: 101`) are already wired and ready to be consumed by the future `RiskEngine`.

---

## 11. API Contract

Base URL: `http://localhost:8080/api` — Authentication: `Authorization: Bearer <accessToken>`.

### 11.1 Response envelope

```json
// success
{"success": true, "data": {}, "timestamp": "2026-09-15T..."}

// error
{"success": false, "error": {"code": "INVALID_CREDENTIALS", "message": "Invalid credentials"}, "timestamp": "..."}
```

### 11.2 Auth endpoints

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | Public | Create account, BCrypt hash, verification token, email |
| POST | `/api/auth/login` | Public | Credentials → lockout check → risk → session → token pair |
| POST | `/api/auth/refresh` | Public | Rotate refresh; reuse → `TOKEN_REUSE_DETECTED` |
| POST | `/api/auth/logout` | Auth | Revoke refresh token + session |
| POST | `/api/auth/logout-all` | Auth | Revoke all sessions/tokens |
| GET | `/api/auth/verify-email?token=` | Public | Verify email |
| POST | `/api/auth/resend-verification` | Public | Generic reply (anti-enumeration) |
| POST | `/api/auth/forgot-password` | Public | Generic reply (anti-enumeration) |
| POST | `/api/auth/reset-password` | Public | Validate token, revoke sessions |
| POST | `/api/auth/change-password` | Auth | Current+new; revokes other sessions |

### 11.3 User & session endpoints

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| GET / PUT / DELETE | `/api/users/me` | Auth | Profile read/update/delete (delete revokes all) |
| GET | `/api/sessions` | Auth | List own devices |
| DELETE | `/api/sessions/{id}` | Auth | Revoke one (only own, else 404) |
| DELETE | `/api/sessions` | Auth | Revoke all |

### 11.4 Admin endpoints (RBAC-gated)

| Method | Path | Min Role |
| :--- | :--- | :--- |
| GET | `/api/admin/users?page=&size=&search=` | SUPPORT |
| GET | `/api/admin/users/{id}` | SUPPORT |
| PUT | `/api/admin/users/{id}/role` | ADMIN (no self-escalation) |
| PUT | `/api/admin/users/{id}/lock` | SUPPORT |
| PUT | `/api/admin/users/{id}/unlock` | SUPPORT |
| DELETE | `/api/admin/users/{id}` | ADMIN |
| GET | `/api/admin/audit-logs` | MANAGER |
| GET | `/api/admin/security-events` | MANAGER |
| GET | `/api/admin/risk?userId=` | MANAGER |

### 11.5 OAuth2 & utility

- `GET /oauth2/authorization/google` — public redirect to Google.
- `GET /login/oauth2/code/google` — callback; issues SecureID tokens, redirects to `FRONTEND_URL`.
- `GET /actuator/health`, `/v3/api-docs`, `/swagger-ui.html` — permitted by the security config and live today.

> All endpoints above are specified in `docs/API.md`. Only the permit-list paths (health, Swagger, OAuth2 entry) respond as of the current milestone.

---

## 12. Role-Based Access Control

### 12.1 Roles (seeded in Flyway V2)

`ROLE_USER`, `ROLE_SUPPORT`, `ROLE_MANAGER`, `ROLE_ADMIN`.

### 12.2 Permission matrix

| Endpoint | USER | SUPPORT | MANAGER | ADMIN |
| :--- | :---: | :---: | :---: | :---: |
| `/api/auth/**` (public) | ✔ | ✔ | ✔ | ✔ |
| `/api/users/me` | ✔ | ✔ | ✔ | ✔ |
| `/api/sessions/**` | ✔ | ✔ | ✔ | ✔ |
| `/api/admin/users` (list) | ✖ | ✔ | ✔ | ✔ |
| `/api/admin/users/{id}/lock` | ✖ | ✔ | ✖ | ✔ |
| `/api/admin/users/{id}/role` | ✖ | ✖ | ✖ | ✔ |
| `/api/admin/audit-logs` | ✖ | ✖ | ✔ | ✔ |
| `/api/admin/security-events` | ✖ | ✖ | ✔ | ✔ |

### 12.3 Design notes

- Enforcement is **server-side only** (`@PreAuthorize` + the filter chain) — never trust the client. `@EnableMethodSecurity` is already active.
- **Support can lock** users but **cannot change roles**; only **Admin** assigns roles — the division keeps operational privileges separate from privilege management.
- Self-promotion is blocked by design; role changes validate against the known enum.

---

## 13. Infrastructure: Docker, Compose & CI

### 13.1 Docker build (`backend/Dockerfile`)

A **multi-stage** build:

- **Builder stage:** `maven:3.9-eclipse-temurin-21`. Copies `pom.xml`, runs `dependency:go-offline` (best-effort — a note documents that `testcontainers-redis` may be absent from central, hence the `|| echo` continuing), then `mvn clean package -DskipTests`.
- **Runtime stage:** `eclipse-temurin:21-jre-alpine` — minimal JRE. Creates a non-root system user `secureid`, copies the jar, `chown`s it, runs as `USER secureid`.
- **Healthcheck** hits `/actuator/health`; exposes 8080.

The root `Dockerfile` mirrors this so `docker build -f Dockerfile .` works from the project root.

### 13.2 Docker Compose

Four services, all with healthchecks and `depends_on` ordering:

| Service | Image | Ports | Notes |
| :--- | :--- | :--- | :--- |
| `api` | build from `./backend` | 8080 | env-injected, `service_healthy` deps |
| `postgres` | `postgres:16-alpine` | 5432 | named volume, `pg_isready` probe |
| `redis` | `redis:7-alpine` | 6379 | `--appendonly yes`, named volume |
| `mailhog` | `mailhog/mailhog:latest` | 1025 + 8025 UI | dev mail capture |

The API container wires `DATABASE_URL` (pointing at the `postgres` service name) and `REDIS_HOST=redis`, so no host-path configuration is needed inside Compose.

### 13.3 GitHub Actions CI (`.github/workflows/ci.yml`)

Triggers on push/PR to `main`, `master`, `develop`, plus manual dispatch. Three jobs:

1. **`validate`** — JDK 21 setup + `mvn -B validate`; then **file-integrity checks** asserting every skeleton class, migration V1–V6, Dockerfile, compose file, `.env.example`, and README exists.
2. **`build`** — depends on `validate`; runs real Postgres 16 and Redis 7 as service containers; `mvn clean package -DskipTests`, then `mvn test` (`continue-on-error` for now, since no tests exist), then a Docker image build sanity check.
3. **`docker-validate`** — repeats `mvn validate` inside `maven:3.9-eclipse-temurin-21`, mirroring the documented local workflow.

---

## 14. Configuration & Environment

### 14.1 `application.yml` key sections

- **Datasource** — PostgreSQL with Hikari pool (max 10 / min 2); `ddl-auto: validate` (Flyway owns DDL).
- **Flyway** — enabled, `classpath:db/migration`, `baseline-on-migrate: true`.
- **Redis** — host/port, 2 s timeout.
- **Mail** — defaults to localhost:1025 (MailHog dev); SMTP auth off in dev.
- **OAuth2 client** — Google registration (`openid, profile, email` scope, authorization-code grant, issuer `https://accounts.google.com`).
- **`secureid.*`** — JWT (secret/expiration/refresh-expiration/issuer), CORS, rate-limit budgets per endpoint, lockout policy (5 attempts / 15 min), password-strength rules, email token expiries, frontend URL, and risk weights/thresholds.
- **Actuator** — health/info/metrics/prometheus exposed; health details shown only when authorized.
- **Logging** — pattern includes `%X{correlationId}` MDC, ready for the correlation filter.

### 14.2 Environment template (`.env.example`)

Documents every overridable knob: `DATABASE_*`, `REDIS_*`, `JWT_SECRET`/`JWT_EXPIRATION`/`JWT_REFRESH_EXPIRATION`, `CORS_ORIGINS`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID/SECRET`, `MAIL_*`, `API_PORT`, plus commented production notes for RS256 keys.

### 14.3 Test profile (`application-test.yml`)

H2 in PostgreSQL-compatibility mode, `ddl-auto: create-drop`, Flyway disabled, and a valid ≥32-char test JWT secret — ready for `mvn test` runs.

---

## 15. Frontend & Interactive Showcases

Three artifacts explain the project to humans:

### 15.1 `index.html` (single-file explainer)

A self-contained HTML/CSS/JS page: "SecureID — what's real in this repo". It drives home the **implemented vs. spec'd** distinction, including:

- An annotated **auth-flow trace** (register → login → token pair → rotation → replay → `TOKEN_REUSE_DETECTED`).
- A **token-theft simulation widget** with console output.
- A **rate-limit / lockout** explainer with the per-endpoint budgets.
- An **interactive risk calculator** using the real weights from `application.yml`.
- Full **database map**, **API surface**, **RBAC matrix**, **run-it** instructions, **deployment notes** (AWS/GCP), and an **honest roadmap** table.

### 15.2 `showcase.html` (810-line architecture showcase)

A richer, paneled showcase of the Identity Engine architecture — tech-stack cards, pipeline diagrams, and the same simulation widgets, styled as a portfolio piece.

### 15.3 `frontend/` (React 18 + Vite 5)

A componentized version of the explainer ("repo explainer" landing page): `Hero` (with a canvas constellation + orbiting stack chips), `RealState` (implemented vs spec'd audit), `AuthFlow` (animated login flow), `TokenRotation` (login/rotate/replay console), `Guard` (rate-limit + lockout simulators), `RiskGauge` (interactive risk needle gauge), `Layout` (nav with scroll progress + footer), all driven by `data.js` (single source of truth grounded in the repo) and `utils.js` (scroll-reveal, count-up, typing, progress hooks).

> Note: `frontend/` is currently untracked in git and its `main.jsx` references an `App` module that has not landed, so the React app does not yet build/run cleanly — the static `index.html` is the reliable explainer today.

---

## 16. Documentation Set

| File | Purpose |
| :--- | :--- |
| `README.md` | Entry point; stack, quick start, migration table, API excerpt, security model, Docker/CI, verification commands |
| `docs/PRD.md` | Product requirements: vision, goals, functional requirements FR-001+, security requirements, milestones |
| `docs/ARCHITECTURE.md` | System design, package structure, DB schema, Redis model, auth flows, observability |
| `docs/API.md` | Endpoint-by-endpoint contract with request/response shapes and error codes |
| `docs/SECURITY.md` | Security model: passwords, tokens, lockout, rate limits, audit, RBAC, CORS, headers, secrets |
| `SECUREID_REPORT.md` | Prior blueprint report: requirements matrix, full SQL listings, deployment playbooks (AWS/GCP), PDF-generation guide |
| `PROJECT_REPORT.md` | This document |

---

## 17. Implemented vs. Specified — The Honest Gap

The project is explicit about what works today versus what is documented for later:

**Implemented (verified from source):**

- `JwtService` — HS256 signing/parsing, access + refresh generation, ≥32-char secret guard.
- `JwtAuthenticationFilter` — Bearer extraction, signature/expiry check, `SecurityContext` population, fail-closed handling.
- `SecurityConfig` — stateless sessions, permit-all list, BCrypt(12), hardening headers.
- `CorsConfig` — origin allowlist with credentials, exposed auth/rate-limit headers.
- `ApiResponse` / `ErrorCode` / `GlobalExceptionHandler` — uniform envelope with typed error codes (including 423 `ACCOUNT_LOCKED`, 429 `RATE_LIMITED`, 401 `TOKEN_REUSE_DETECTED`).
- Six Flyway migrations — the complete schema for the planned domain layer.
- Docker/Compose + CI + env/docs infrastructure.

**Specified but not implemented:**

- All `/api/auth/*`, `/api/users/*`, `/api/sessions/*`, `/api/admin/*` endpoints — no controllers, entities, or services yet.
- Refresh rotation + reuse-detection service — the error code and schema exist; the check does not.
- Risk engine — weights/thresholds configured; evaluation logic absent.
- Redis rate-limit/lockout services — keys and budgets specced; code is a stub.
- OAuth2 business logic and audit service — feed the existing schema and config.

This framing is not a shortcoming of the report — it is one of the project's strengths: the docs and schema deliberately move ahead of the code so the next milestone has a precise target.

---

## 18. Roadmap & Milestones

| Milestone | Contents | Status |
| :--- | :--- | :--- |
| **M1** Foundation | Boot, Postgres, Flyway, User/Role, Docker | ✅ Mostly done (migrations + Docker ship) |
| **M2** Auth | BCrypt, JWT issue/verify | 🔶 Half — engine + filter done, login endpoint missing |
| **M3** Rotation | Refresh rotation + reuse detection | 🔶 Schema + error code only |
| **M4** RBAC | `@PreAuthorize` enforcement | 🔶 Roles seeded, no guards yet |
| **M5** Account security | Rate limit + lockout (Redis) | 🔶 Keys/limits specced |
| **M6** Session/Audit | Session list, audit logging | 🔶 Tables exist (V4/V5) |
| **M7** OAuth | Google sign-in | 🔶 V6 + client config present |
| **M8** Risk | Anomaly scoring engine | 🔶 Weights/thresholds configured |
| **M9 – M10** | AI hardening / Production deployment | ⬜ Not started |

**The next step** is the auth domain: controllers, services, entities, and repositories for register/login/refresh — the parts the existing code and schema already assume exist.

---

## 19. Getting Started

### 19.1 Prerequisites

Java 21, Maven 3.9+, Docker & Compose v2, Git.

### 19.2 Run with Docker (recommended)

```bash
cp .env.example .env
docker compose up --build

# API        → http://localhost:8080
# Health     → http://localhost:8080/actuator/health
# Swagger UI → http://localhost:8080/swagger-ui.html
# MailHog UI → http://localhost:8025
# Postgres   → localhost:5432 · Redis → localhost:6379
```

### 19.3 Run without Docker

```bash
createdb secureid
redis-server
cd backend && mvn spring-boot:run
```

Flyway applies V1–V6 automatically on startup.

### 19.4 Verification commands

```bash
docker compose config --quiet                       # compose sanity
mvn -f backend/pom.xml flyway:info                  # migration state
mvn -f backend/pom.xml clean package -DskipTests    # build
```

> Today the API boots and Flyway applies all migrations, but no controllers answer yet — most routes return 401/404 from the security layer. That is the current milestone boundary, not a broken install.

---

## 20. Conclusion

SecureID is a thoughtfully engineered **IAM backend skeleton** whose architecture, schema, and security posture are ready for a domain layer that has not yet been written. The distinguishing quality of the repository is honesty: implemented code, documented specifications, and the gap between them are all clearly labeled and verifiable from source. With a hardened token pipeline, a complete six-migration PostgreSQL schema, production-shaped Docker/CI plumbing, and a detailed PRD/API/security specification, the project is positioned to grow from skeleton to full identity platform — milestone by milestone.