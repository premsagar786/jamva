# SECUREID — ENTERPRISE IDENTITY & ACCESS MANAGEMENT SYSTEM
### COMPLETE SYSTEM SPECIFICATION & ARCHITECTURAL BLUEPRINT
**Version:** 1.0.0  
**Authors:** Lead Security Architect & Identity Engineer  
**Date:** September 2026  
**Status:** Infrastructure Active (Skeleton Layer Complete)  

---

## 1. Executive Summary & Platform Vision

### 1.1 Overview
SecureID is a production-grade, highly optimized Identity and Access Management (IAM) engine built with **Java 21**, **Spring Boot 3.4**, and **Spring Security 6**. Designed to centralize and replace third-party identity providers (such as Okta or Auth0) for cloud-native applications, SecureID implements a stateless, token-based authentication pipeline coupled with a real-time, adaptive risk and anomaly evaluation engine.

### 1.2 Core Problem Statement
Modern distributed applications routinely reimplement authentication, user registration, token management, session auditing, role-based access control, Google OAuth integrations, and brute-force prevention. Reimplementing these security boundaries repeatedly increases the surface area for logic errors, memory leaks, and protocol misalignments. SecureID mitigates this by providing a single, hardened, RESTful security engine that handles the full user identity lifecycle under rigorous, standardized protocols.

### 1.3 Key Architectural Deliverables
*   **Zero-Trust Session Filter Chain:** Seamless verification using custom, stateless JWT interceptors.
*   **Cryptographically Sound Token Rotation:** Refresh Token Rotation (RTR) to block token interception and reuse replay attacks.
*   **Adaptive Risk Engine:** Metadata-driven evaluation analyzing device fingerprints, geographic locations, impossible travel metrics, and unusual hours.
*   **Dual-Storage Infrastructure:** Relational reliability via **PostgreSQL 16** (with Flyway database migrations V1-V6) paired with high-throughput in-memory state control via **Redis 7** (for sliding rate limits, login attempt lockouts, and live session caching).

---

## 2. Complete Technology Stack

| Technology Layer | Solution Chosen | Technical Justification |
| :--- | :--- | :--- |
| **Language Runtime** | Java 21 (LTS) | Access to modern JVM features, virtual threads (Project Loom) compatibility, and strong static typing. |
| **Application Framework** | Spring Boot 3.4.x | Highly reliable dependency injection, mature starter libraries, and modular security pipelines. |
| **Security Pipeline** | Spring Security 6 | Standardized interceptor filter chains, native OAuth2 Client configurations, and annotation-driven RBAC. |
| **Relational Database** | PostgreSQL 16 | ACID-compliant storage, GIN indexes for JSONB audit log lookups, and strong relation constraint validation. |
| **Database Migrations** | Flyway | Version-controlled, reproducible SQL migration files (V1 through V6) to enforce database versioning. |
| **In-Memory Cache & State** | Redis 7 | High-speed cache for token blacklists, sliding rate-limiting windows, and brute-force lockout counters. |
| **Cryptography / Hashing** | BCrypt / SHA-256 | BCrypt (work factor 12) for primary passwords; SHA-256 hashes for raw refresh tokens before DB storage. |
| **Documentation Standards** | Springdoc OpenAPI / Swagger | Automated OpenAPI contract rendering mapped directly from REST Controller annotations. |
| **Container Engine** | Docker / Docker Compose | Multi-stage build process generating minimal JRE Alpine runtimes running on non-privileged system accounts. |

---

## 3. High-Level Architectural Design

```
                     +---------------------------------------+
                     |         SecureID API Client           |
                     |       (Web UI / Mobile Apps)          |
                     +---------------------------------------+
                                         │
                                   HTTPS (Port 443)
                                         ▼
                     +---------------------------------------+
                     |         Nginx Reverse Proxy           |
                     |     (SSL Termination & Certbot)       |
                     +---------------------------------------+
                                         │
                                   HTTP (Port 8080)
                                         ▼
                     +---------------------------------------+
                     |       Spring Boot 3.4 API Host        |
                     +---------------------------------------+
                        │                 │             │
              Spring Data JPA          Lettuce       REST API
                        │                 │             │
                        ▼                 ▼             ▼
               +---------------+  +---------------+  +------------------+
               | PostgreSQL 16 |  |    Redis 7    |  |  Google Identity |
               | (User, Tokens,|  | (Rate Limits, |  |   (OAuth 2.0)    |
               | Sessions,     |  | Lockouts,     |  +------------------+
               | Audit Logs)   |  | Temp Counters)|
               +---------------+  +---------------+
```

### 3.1 Spring Security 6 Interceptor Pipeline
All inbound requests are intercepted by a security chain that ensures zero-trust access control.
1.  **CorsFilter / CsrfFilter:** Restricts domains utilizing values supplied by `CORS_ORIGINS` and enforces stateless double-submit cookies if session cookies are active.
2.  **JwtAuthenticationFilter:** Extracts the Bearer token from the `Authorization` header, decrypts the token, validates the cryptographic signature and expiration dates, and populates the `SecurityContextHolder` with an authenticated principal.
3.  **AuthorizationFilter (RBAC Check):** Evaluates whether the authenticated principal contains the necessary `GrantedAuthority` required to invoke the matched controller method.

---

## 4. Product Requirements Document (PRD)

### 4.1 Functional Requirements Matrix

| ID | Module | Title | Detailed Specification |
| :--- | :--- | :--- | :--- |
| **FR-001** | Auth | User Registration | Endpoint: `POST /api/auth/register`. Enforces unique, lowercase, trimmed email addresses. Validates password strength (min 8 characters, requiring mixed case, digits, and symbols). Hashes password with BCrypt and generates a transient verification token with a 30-minute TTL. |
| **FR-002** | Auth | User Login | Endpoint: `POST /api/auth/login`. Authenticates credentials, executes brute-force and lockout checks, evaluates metadata in the Risk Engine, registers a session record, and returns a short-lived Access Token and rotated Refresh Token. |
| **FR-003** | Auth | Refresh Rotation | Endpoint: `POST /api/auth/refresh`. Accepts an active Refresh Token, rotates it by invalidating the old token and issuing a brand new token pair. Protects against token capture through automatic session revocation. |
| **FR-004** | Auth | User Logout | Endpoint: `POST /api/auth/logout`. Revokes the active Refresh Token and sets the related database `Session` to inactive. `POST /api/auth/logout-all` revokes all active tokens/sessions. |
| **FR-005** | Security | Account Lockout | Enforces account safety by capturing failed login attempts in Redis (`login:failed:{email}`). Locks the account for 15 minutes after 5 consecutive failures. |
| **FR-006** | Security | Rate Limiting | Dynamic sliding-window rate limiting on critical endpoints (login, reset, registration) using Redis compound keys `rate-limit:{endpoint}:{ip}`. |
| **FR-007** | Identity | OAuth2 Google | Integration with Google Identity Services. Exchanges access codes for secure local identities, maps users to `ROLE_USER`, and registers Google account identifiers. |
| **FR-008** | Audit | Telemetry Logging | Captures and persists security events (e.g., `TOKEN_REUSE_DETECTED`, `LOGIN_SUCCESS`, `ROLE_CHANGED`) using GIN-indexed JSONB structures inside PostgreSQL. |

### 4.2 Role-Based Access Control (RBAC) Permissions Matrix

| Platform Endpoint | USER | SUPPORT | MANAGER | ADMIN |
| :--- | :---: | :---: | :---: | :---: |
| `/api/auth/**` (Public Endpoints) | ✔ | ✔ | ✔ | ✔ |
| `/api/users/me` (Profile Edit / View) | ✔ | ✔ | ✔ | ✔ |
| `/api/sessions/**` (Session Management) | ✔ | ✔ | ✔ | ✔ |
| `/api/admin/users` (List Accounts) | ✖ | ✔ | ✔ | ✔ |
| `/api/admin/users/{id}/lock` | ✖ | ✔ | ✖ | ✔ |
| `/api/admin/users/{id}/role` | ✖ | ✖ | ✖ | ✔ |
| `/api/admin/audit-logs` (Log Inspection) | ✖ | ✖ | ✔ | ✔ |
| `/api/admin/security-events` | ✖ | ✖ | ✔ | ✔ |

---

## 5. Database Schema & Flyway Executables

All relational schemas are defined inside the `backend/src/main/resources/db/migration/` directory as Flyway SQL scripts. They run sequentially on startup to establish the schema.

### V1__create_users_table.sql
Creates the primary identity records. Enforces email validation patterns, lowercase indexing, and tracks lock status, creation timestamps, and soft-delete states.
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    account_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));
```

### V2__create_roles_and_user_roles.sql
Defines system capabilities and user-to-role relationships with optimized foreign key indexes.
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

INSERT INTO roles (name) VALUES ('ROLE_USER'), ('ROLE_SUPPORT'), ('ROLE_MANAGER'), ('ROLE_ADMIN');
```

### V3__create_tokens_tables.sql
Establishes the refresh token rotation database, tracking token lifetimes, invalidation, and parent replacement IDs to detect reuse.
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    session_id UUID, -- Foreign Key is linked in V4
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP,
    replaced_by UUID
);
```

### V4__create_sessions_table.sql
Enables multi-device tracking, capturing physical access telemetry such as IP addresses, web user agents, and geolocation keys.
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP
);

ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_session 
FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
```

### V5__create_audit_tables.sql
Contains advanced telemetry logs storing execution metadata inside a JSONB column with GIN speed indexes.
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);
```

### V6__create_oauth_accounts.sql
Maps localized primary users to external identity entities, linking federated login platforms.
```sql
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);
```

---

## 6. Adaptive Risk & Anomaly Engine Specification

SecureID evaluates each login attempt using a configurable score-based algorithm to verify the authenticity of an authentication attempt.

### 6.1 Anomaly Weighting
Each signal triggers a specific penalty weight that increases the request's overall risk score:

$$\text{Risk Score} = w_{\text{device}} + w_{\text{location}} + w_{\text{attempts}} + w_{\text{travel}} + w_{\text{time}}$$

| Risk Vector Signal | Weight Penalty | Calculation Criteria |
| :--- | :---: | :--- |
| **New Device Detected** | $+20$ | Matches current browser User-Agent against historical session fingerprints. |
| **New Geographic Location** | $+30$ | IP address location geolocation country differs from the last 30 successful sessions. |
| **Failed Attempts Count** | $+20$ | Associated IP address or account email holds active failed states in Redis. |
| **Impossible Travel** | $+40$ | Calculated velocity between current login IP and previous login location exceeds physical travel possibilities ($>800\text{ km/h}$). |
| **Unusual Access Hour** | $+10$ | Request timestamp falls outside the calculated normal access hour windows of the matched identity. |

### 6.2 Mitigation Escalation Policy
The cumulative score triggers specific defensive policies to isolate suspicious connections:

```
[ Calculated Risk Score ]
       │
       ├──► 0  - 30  (LOW)      ──► Allow Authentication
       │
       ├──► 31 - 60  (MEDIUM)   ──► Require Multi-Factor Verification (Email OTP)
       │
       ├──► 61 - 100 (HIGH)     ──► Block Request & Notify Account via Email
       │
       └──► 101+     (CRITICAL) ──► Lock Account for 15m & Revoke All Sessions
```

---

## 7. Complete Production Deployment Playbooks

---

### Playbook A: Amazon Web Services (AWS EC2 t3.micro Free Tier)

#### Infrastructure Specifications
*   **Instance:** `t3.micro` (1 vCPU, 1 GB RAM, 30 GB EBS SSD). Free for 12 months under AWS Free Tier.
*   **Operating System:** Ubuntu Server 24.04 LTS.

#### Step 1: VM Server Setup
Launch instance inside the AWS Console and SSH into the system:
```bash
# Update and upgrade package registry
sudo apt update && sudo apt upgrade -y

# Install Docker Engine and Docker Compose
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker

# Add active login user to docker group (removes sudo requirement)
sudo usermod -aG docker ubuntu
```
*(Log out and log back in to apply the group modification).*

#### Step 2: Codebase Mapping
```bash
# Clone the repository
git clone https://github.com/your-username/secureid.git
cd secureid

# Setup the production variables file
cp .env.example .env
nano .env
```
Key production fields inside `.env`:
```ini
SPRING_PROFILES_ACTIVE=prod
DATABASE_URL=jdbc:postgresql://postgres:5432/secureid_prod
DATABASE_USERNAME=admin_secureid
DATABASE_PASSWORD=YOUR_STRONG_DATABASE_PASS_123_#
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=YOUR_SUPER_LONG_CRYPTOGRAPHICALLY_SECURE_JWT_SECRET_KEY_SHA256
GOOGLE_CLIENT_ID=YOUR_GOOGLE_ID_FROM_CONSOLE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_SECRET_FROM_CONSOLE
MAIL_HOST=smtp.sendgrid.net # Real production mail host
MAIL_PORT=587
MAIL_FROM=security@yourdomain.com
CORS_ORIGINS=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

#### Step 3: Spin Up Containers
```bash
# Compile multi-stage builder and run services in background
docker-compose -f docker-compose.yml up -d --build
```

#### Step 4: Configure Reverse Proxy with SSL (Nginx & Certbot)
```bash
# Install packages
sudo apt install -y nginx certbot python3-certbot-nginx
```
Write Nginx virtual host configurations in `/etc/nginx/sites-available/secureid`:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable the configuration and execute SSL creation:
```bash
sudo ln -s /etc/nginx/sites-available/secureid /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# Run Certbot to generate and auto-renew TLS/SSL certificates
sudo certbot --nginx -d api.yourdomain.com
```

---

### Playbook B: Google Cloud Platform (GCP e2-micro Always Free)

#### Infrastructure Specifications
*   **Instance:** Series `E2` $\rightarrow$ Machine type: `e2-micro` (0.25 vCPU, 1 GB RAM, 30 GB Standard Boot Disk).
*   **Eligibility:** Standard GCP Always Free eligibility (must select `us-central1`, `us-east1`, or `us-west1`).
*   **Operating System:** Debian 12 (Bookworm).

#### Step 1: Open VPC Network Firewall
GCP blocks inbound HTTP and HTTPS ports by default. Create ingress rules in the Cloud Shell or GCP console:
```bash
# Create Firewall rules to permit web traffic
gcloud compute firewall-rules create allow-http-https-ingress \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:80,tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server,https-server
```

#### Step 2: Launch Compute Engine VM and Run Stack
Open the browser SSH client on the VM Instance table and execute:
```bash
# Update local packages
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
sudo apt-get install -y docker.io docker-compose

# Pull project and configure environment
git clone https://github.com/your-username/secureid.git && cd secureid
cp .env.example .env
nano .env # (Insert production credentials as shown above)

# Build stack
sudo docker-compose up -d --build
```

---

## 8. Portfolio PDF Generation Instructions

To compile this technical blueprint into an enterprise-grade report PDF, follow these steps to preserve its code syntax highlighting and table formatting:

### Method A: Browser Printing (Zero Dependencies)
1. Open this file inside any browser supporting Markdown rendering (or view the rendered output on GitHub).
2. Right-click and choose **Print** (or press `Ctrl + P` / `Cmd + P`).
3. Set the destination to **Save as PDF**.
4. Inside **More Settings**, check the **Background graphics** option to preserve colored alert boxes, table borders, and code snippets.
5. Click **Save**.

### Method B: VS Code (Markdown PDF Extension)
1. Open the repository inside VS Code.
2. Install the Extension **Markdown PDF** (`yzane.markdown-pdf`).
3. Open `SECUREID_REPORT.md` in your workspace.
4. Right-click the markdown file and select **Markdown PDF: Export (pdf)**.
5. A beautifully styled, paginated, and structured PDF will compile directly in the root directory as `SECUREID_REPORT.pdf`.

---
