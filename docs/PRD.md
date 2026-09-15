# SecureID — Product Requirements Document
**Version:** 1.0  
**Project:** SecureID — Identity & Access Management Platform  
**Type:** Production-grade backend / portfolio project  
**Stack:** Java 21 + Spring Boot 3.x + Spring Security + PostgreSQL 16 + Redis 7 + Flyway + Maven  
**Auth:** JWT (15m) + Refresh Token Rotation (7d) + OAuth2/OIDC (Google)  
**AuthZ:** RBAC (USER, MANAGER, SUPPORT, ADMIN)  
**Extra:** Email verification, password reset, account lockout, session management, audit logs, rate limiting, risk engine

---

## 1. Vision
Centralized Auth0/Okta-style service for: user identities, authentication, authorization, sessions, tokens, OAuth2, password recovery, email verification, security events, suspicious-login detection.

## 2. Problem
Every app re-implements registration, login, JWT, RBAC, OAuth2, password recovery, session mgmt, lockout, monitoring. SecureID centralizes via REST API.

## 3. Goals
1. Secure authentication 2. Short-lived JWT 3. Refresh rotation 4. RBAC 5. OAuth2/OIDC 6. Session mgmt 7. Email verification 8. Password reset 9. Failed-login detection 10. Account lockout 11. Audit logs 12. Risk-based auth 13. Anomaly detection 14. Admin controls 15. Docker-ready 16. Testable/production-oriented 17. OpenAPI docs

## 4. Non-Goals (v1)
SAML, SCIM, hardware keys, multi-region, billing, org-level SaaS tenancy, IDP marketplace, directory sync.

## 5. Users
- **Developer:** integrates SecureID into app
- **Normal User:** register/login/logout/verify email/change/reset password/view & revoke sessions/manage profile
- **Admin:** view users, role change, lock/unlock, revoke sessions, audit logs, investigate suspicious activity

## 6. Core Functional Requirements
### FR-001 Registration `POST /api/auth/register`
```json
{"email":"user@example.com","password":"StrongPassword@123"}
```
Email unique+normalized, configurable strength, BCrypt/Argon2 hash, ROLE_USER, emailVerified=false, hashed verification token, email sent.

### Login `POST /api/auth/login`
Returns `{accessToken, refreshToken, tokenType:"Bearer", expiresIn:900}`. Flow: validate → find user → check enabled/locked → verify password → risk → session → tokens → audit.

### JWT Access Token (15m configurable)
Claims: sub=user-id, email, roles, iss=secureid, iat, exp. Signed, short-lived.

### Refresh Tokens (7d)
Random, hashed before storage, expiry, revoked, session-linked, replaced_by.
Table: `refresh_tokens(id, user_id, token_hash, session_id, expires_at, revoked, created_at, revoked_at, replaced_by)`

### Rotation `POST /api/auth/refresh`
hash → find → validate → expiry/revoked check → revoke old → issue new pair. Reuse = suspicious → optionally revoke session/all.

### Logout
`POST /api/auth/logout` revokes refresh+session. `POST /api/auth/logout-all` revokes all.

### Email Verification
`POST /api/auth/resend-verification`, `GET /api/auth/verify-email?token=...` — hashed token, 15-30m expiry.

### Password Reset
`POST /api/auth/forgot-password` (generic response) + `POST /api/auth/reset-password` → validates, invalidates token, revokes sessions, audits. Also `POST /api/auth/change-password`.

### RBAC
Roles: USER, MANAGER, SUPPORT, ADMIN. Matrix: USER→user APIs only, SUPPORT/MANAGER limited admin, ADMIN full. Server-side `@PreAuthorize`.

### User Mgmt
`GET/PUT/DELETE /api/users/me` + `GET /api/admin/users`, `GET /api/admin/users/{id}`, `PUT /admin/users/{id}/role`, `/lock`, `/unlock`, `DELETE /admin/users/{id}`. No privilege escalation via input.

### Sessions
`GET /api/sessions`, `DELETE /api/sessions/{id}`, `DELETE /api/sessions` (all). Fields: id, user_id, device, ip, ua, created_at, last_active, expires_at, revoked.

### Account Lockout
5 failed → locked. Redis `login:failed:{email}` with TTL. Track failed/success/last.

### Rate Limiting
Sensitive endpoints: login/register/forgot/reset/refresh via Redis `rate-limit:{endpoint}:{ip}` and `account:{email}` counters with TTL.

### OAuth2 Google
Auth Code → callback → identity → find/create local user → assign local roles (never admin) → session + SecureID tokens.

### Audit Logging
Events: USER_REGISTERED, LOGIN_SUCCESS/FAILURE, LOGOUT, TOKEN_REFRESH, TOKEN_REUSE_DETECTED, PASSWORD_CHANGED/RESET_REQUESTED/RESET, EMAIL_VERIFIED, ACCOUNT_LOCKED/UNLOCKED, ROLE_CHANGED, SESSION_CREATED/REVOKED, OAUTH_LOGIN, SUSPICIOUS_LOGIN. Table `audit_logs(id,user_id,event_type,ip,ua,timestamp,metadata)`. Never log password/tokens/OTP.

### Risk Engine
Signals: new device +20, new location +30, failed attempts +20, impossible travel +40, unusual time +10. Levels 0-30 LOW, 31-60 MEDIUM, 61-100 HIGH, 101+ CRITICAL. Configurable. LOW→normal, MEDIUM→extra verification, HIGH→block+notify, CRITICAL→lock+revoke+alert.

### Behavioral Anomaly
Baseline: hours, countries, devices, IP ranges, frequency, UA. Rules-based v1, ML later.

### AI Security Assistant
Admin natural language → intent → validated read-only service call (no raw SQL).

### RiskEngine Service
Input `LoginContext(userId,ip,location,device,ua,loginTime,failedAttempts)` → Output `RiskResult(score,level,reasons,action)`.

## 7. API Structure
```
/api/auth/{register,login,refresh,logout,logout-all,verify-email,resend-verification,forgot-password,reset-password,change-password}
/api/users/me
/api/sessions
/api/admin/{users,audit-logs,security-events,risk}
```

## 8. Standard Response
Success: `{"success":true,"data":{},"timestamp":"..."}` Error: `{"success":false,"error":{"code":"...","message":"..."},"timestamp":"..."}` No stack traces.

## 9. Status Codes
200,201,204,400,401,403,404,409,422,429,500

## 10. Security Requirements
HTTPS prod, hash passwords/refresh tokens, secure random, validate inputs, server-side authz, rate limit, secure CORS allowlist (never *), security headers, short-lived JWT, rotation, reuse detection, revoke on reset, prevent enumeration, secrets outside VCS.

## 11. Env Vars
DATABASE_URL, DATABASE_USERNAME/PASSWORD, REDIS_HOST/PORT, JWT_PRIVATE_KEY/PUBLIC_KEY (or JWT_SECRET for HS256 dev), GOOGLE_CLIENT_ID/SECRET, MAIL_*, FRONTEND_URL, CORS_ORIGINS, JWT_EXPIRATION, REFRESH_EXPIRATION, RATE_LIMIT_*, LOCKOUT_*

## 12. Definition of Done Checklist
See PRD §46 — all checked impl sections: auth, authz, account security, session, OAuth, risk, audit, engineering (Postgres, Redis, Flyway, Docker, tests, OpenAPI, CI, docs).

## 13. Milestones M1-M10
M1 Foundation (Boot, Postgres, Flyway, User/Role, Docker) → M2 Auth (BCrypt, JWT) → M3 Token rotation → M4 RBAC → M5 Account Security → M6 Session/Audit → M7 OAuth → M8 Risk → M9 AI → M10 Production (tests, Docker, CI, docs, monitoring).
