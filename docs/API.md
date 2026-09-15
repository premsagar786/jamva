# SecureID — API Specification

Base URL: `http://localhost:8080/api`  
Auth: `Authorization: Bearer <accessToken>` (except public endpoints)  
Content-Type: `application/json`  
Standard wrappers per PRD §32.

## Auth
### POST /api/auth/register
Public. Body: `{"email":"...","password":"..."}`  
201 → `{"success":true,"data":{"id":"...","email":"...","emailVerified":false}}`  
409 if email exists. Validations: email format, password strength (min 8, upper+lower+digit+special).

### POST /api/auth/login
Public. Body: email/password. 200 → `{"success":true,"data":{"accessToken":"...","refreshToken":"...","tokenType":"Bearer","expiresIn":900}}`  
401 invalid, 423 locked, 429 rate-limited.

### POST /api/auth/refresh
Body: `{"refreshToken":"..."}` 200 → new pair. 401 expired/revoked. Reuse → 401 + audit TOKEN_REUSE_DETECTED.

### POST /api/auth/logout
Auth required. Header Bearer. Body optional `{"refreshToken":"..."}`. 204. Revokes token+session.

### POST /api/auth/logout-all
Auth. 204. Revokes all sessions/tokens for user.

### GET /api/auth/verify-email?token=...
Public. 200 → verified. 400 invalid/expired.

### POST /api/auth/resend-verification
Body: `{"email":"..."}` 200 always (avoid enumeration) `{"message":"If account exists..."}` Rate-limited.

### POST /api/auth/forgot-password
Body: `{"email":"..."}` 200 generic `{"message":"If the account exists, a password reset link has been sent."}`

### POST /api/auth/reset-password
Body: `{"token":"...","newPassword":"..."}` 200 → `{"message":"Password reset successful"}` . Revokes sessions.

### POST /api/auth/change-password
Auth. Body: `{"currentPassword":"...","newPassword":"..."}` 200. Revokes other sessions.

## Users
### GET /api/users/me
Auth. 200 → user profile.

### PUT /api/users/me
Auth. Body: `{"displayName":"..."}` (extensible) 200.

### DELETE /api/users/me
Auth. 204. Soft or hard delete + revoke all.

## Sessions
### GET /api/sessions
Auth. 200 → `[{"id":"...","device":"Chrome / Windows","ipAddress":"...","lastActiveAt":"...","current":true}]`

### DELETE /api/sessions/{id}
Auth. 204 or 404 if not owned.

### DELETE /api/sessions
Auth. 204 revoke all except current? Spec: revokes all (logout-all equivalent for sessions).

## Admin (ROLE_ADMIN, MANAGER/SUPPORT limited)
### GET /api/admin/users?page=0&size=20&search=
200 paged list.

### GET /api/admin/users/{id}
200 user detail + roles + sessions + lock status.

### PUT /api/admin/users/{id}/role
Body: `{"role":"ROLE_ADMIN"}` Validates allowed roles, prevents self-escalation? 200.

### PUT /api/admin/users/{id}/lock
Body: `{"reason":"..."}` 200.

### PUT /api/admin/users/{id}/unlock
200.

### DELETE /api/admin/users/{id}
204.

### GET /api/admin/audit-logs?eventType=&userId=&from=&to=&page=
200 paged.

### GET /api/admin/security-events?riskLevel=&from=&to=
200.

### GET /api/admin/risk?userId=
200 RiskResult or history.

## OAuth2
### GET /oauth2/authorization/google
Redirect to Google.

### GET /login/oauth2/code/google
Callback, issues tokens, redirects to `FRONTEND_URL/auth/callback?accessToken=...&refreshToken=...` or JSON.

## Standard Responses
Success: `{"success":true,"data":{},"timestamp":"2026-09-15T..."}`  
Error: `{"success":false,"error":{"code":"INVALID_CREDENTIALS","message":"Invalid credentials"},"timestamp":"..."}`  
Codes: `VALIDATION_ERROR(400)`, `UNAUTHORIZED(401)`, `FORBIDDEN(403)`, `NOT_FOUND(404)`, `CONFLICT(409)`, `RATE_LIMITED(429)`, `ACCOUNT_LOCKED(423)`, `TOKEN_EXPIRED(401)`, `TOKEN_REVOKED(401)`

## Rate Limit Headers
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` on 429.

## OpenAPI
Swagger UI: `http://localhost:8080/swagger-ui.html`  
JSON: `http://localhost:8080/v3/api-docs`
