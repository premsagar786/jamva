// Grounded mock data for the SecureID Console.
// Mirrors the documented ApiResponse envelope and real backend config (application.yml).

const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
const hoursAgo = n => new Date(Date.now() - n * 3600000).toISOString();
const minutesAgo = n => new Date(Date.now() - n * 60000).toISOString();

export const CONFIG = {
  jwt: {
    accessExpirationMs: 900000, // 15 minutes (application.yml secureid.jwt.expiration)
    refreshExpirationMs: 604800000, // 7 days (refresh-expiration)
    issuer: "secureid"
  },
  rateLimits: {
    login: 5,
    register: 3,
    forgotPassword: 3,
    resetPassword: 5,
    refresh: 10,
    windowSeconds: 60
  },
  lockout: {
    maxAttempts: 5,
    durationMinutes: 15,
    failWindowMinutes: 15
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireSpecial: true
  },
  riskWeights: {
    "new-device": 20,
    "new-location": 30,
    "failed-attempts": 20,
    "impossible-travel": 40,
    "unusual-time": 10
  },
  riskThresholds: {
    low: 30,
    medium: 60,
    high: 100,
    critical: 101
  }
};

export const users = [
  { id: "u-001", displayName: "Ava Chen", email: "ava.chen@secureid.local", roles: ["ROLE_ADMIN"], status: "ACTIVE", mfa: true, department: "Platform", location: { city: "Berlin", country: "DE" }, lastLoginAt: minutesAgo(4), createdAt: daysAgo(412), riskScore: 12 },
  { id: "u-002", displayName: "Liam Novak", email: "liam.novak@secureid.local", roles: ["ROLE_USER"], status: "ACTIVE", mfa: true, department: "Engineering", location: { city: "Prague", country: "CZ" }, lastLoginAt: minutesAgo(22), createdAt: daysAgo(388), riskScore: 18 },
  { id: "u-003", displayName: "Sofia Marino", email: "sofia.marino@secureid.local", roles: ["ROLE_MANAGER", "ROLE_SUPPORT"], status: "ACTIVE", mfa: false, department: "Support", location: { city: "Milan", country: "IT" }, lastLoginAt: daysAgo(1), createdAt: daysAgo(356), riskScore: 26 },
  { id: "u-004", displayName: "Noah Okafor", email: "noah.okafor@secureid.local", roles: ["ROLE_USER"], status: "ACTIVE", mfa: true, department: "Data", location: { city: "Lagos", country: "NG" }, lastLoginAt: minutesAgo(58), createdAt: daysAgo(321), riskScore: 34 },
  { id: "u-005", displayName: "Emma Larsson", email: "emma.larsson@secureid.local", roles: ["ROLE_USER"], status: "PENDING_VERIFICATION", mfa: false, department: "Marketing", location: { city: "Stockholm", country: "SE" }, lastLoginAt: daysAgo(3), createdAt: daysAgo(2), riskScore: 8 },
  { id: "u-006", displayName: "Ethan Gray", email: "ethan.gray@secureid.local", roles: ["ROLE_USER"], status: "LOCKED", mfa: true, department: "Finance", location: { city: "London", country: "GB" }, lastLoginAt: daysAgo(6), createdAt: daysAgo(289), riskScore: 74 },
  { id: "u-007", displayName: "Mia Tanaka", email: "mia.tanaka@secureid.local", roles: ["ROLE_USER"], status: "ACTIVE", mfa: true, department: "Engineering", location: { city: "Tokyo", country: "JP" }, lastLoginAt: minutesAgo(9), createdAt: daysAgo(264), riskScore: 21 },
  { id: "u-008", displayName: "Olivia Smith", email: "olivia.smith@secureid.local", roles: ["ROLE_USER"], status: "ACTIVE", mfa: false, department: "Sales", location: { city: "Austin", country: "US" }, lastLoginAt: daysAgo(2), createdAt: daysAgo(231), riskScore: 29 },
  { id: "u-009", displayName: "Lucas Weber", email: "lucas.weber@secureid.local", roles: ["ROLE_USER"], status: "ACTIVE", mfa: true, department: "Engineering", location: { city: "Munich", country: "DE" }, lastLoginAt: minutesAgo(37), createdAt: daysAgo(198), riskScore: 15 },
  { id: "u-010", displayName: "Amara Diallo", email: "amara.diallo@secureid.local", roles: ["ROLE_MANAGER"], status: "ACTIVE", mfa: true, department: "Security", location: { city: "Dakar", country: "SN" }, lastLoginAt: daysAgo(1), createdAt: daysAgo(154), riskScore: 11 },
  { id: "u-011", displayName: "James Carter", email: "james.carter@secureid.local", roles: ["ROLE_USER"], status: "LOCKED", mfa: false, department: "Operations", location: { city: "Toronto", country: "CA" }, lastLoginAt: daysAgo(11), createdAt: daysAgo(122), riskScore: 88 },
  { id: "u-012", displayName: "Zoe Papadakis", email: "zoe.papadakis@secureid.local", roles: ["ROLE_USER"], status: "ACTIVE", mfa: true, department: "Research", location: { city: "Athens", country: "GR" }, lastLoginAt: minutesAgo(73), createdAt: daysAgo(96), riskScore: 24 },
  { id: "u-013", displayName: "Daniel Ross", email: "daniel.ross@secureid.local", roles: ["ROLE_SUPPORT"], status: "ACTIVE", mfa: true, department: "Support", location: { city: "Chicago", country: "US" }, lastLoginAt: daysAgo(2), createdAt: daysAgo(64), riskScore: 19 },
  { id: "u-014", displayName: "Freya Hansen", email: "freya.hansen@secureid.local", roles: ["ROLE_USER"], status: "ACTIVE", mfa: false, department: "Legal", location: { city: "Copenhagen", country: "DK" }, lastLoginAt: daysAgo(4), createdAt: daysAgo(31), riskScore: 41 },
  { id: "u-015", displayName: "Mateo Rivera", email: "mateo.rivera@secureid.local", roles: ["ROLE_USER"], status: "PENDING_VERIFICATION", mfa: false, department: "Finance", location: { city: "Madrid", country: "ES" }, lastLoginAt: null, createdAt: daysAgo(1), riskScore: 5 }
];

export const sessions = [
  { id: "s-001", device: "Chrome / Windows 11", ip: "84.152.168.41", location: { city: "Berlin", country: "DE" }, lastActiveAt: minutesAgo(0), current: true, riskLevel: "LOW" },
  { id: "s-002", device: "Safari / macOS 15", ip: "192.168.10.8", location: { city: "Berlin", country: "DE" }, lastActiveAt: hoursAgo(2), current: false, riskLevel: "LOW" },
  { id: "s-003", device: "Firefox / Ubuntu 24.04", ip: "91.198.30.12", location: { city: "Prague", country: "CZ" }, lastActiveAt: hoursAgo(5), current: false, riskLevel: "MEDIUM" },
  { id: "s-004", device: "Mobile Safari / iOS 18", ip: "37.16.74.9", location: { city: "Milan", country: "IT" }, lastActiveAt: daysAgo(1), current: false, riskLevel: "LOW" },
  { id: "s-005", device: "Chrome / Android 15", ip: "105.112.30.77", location: { city: "Lagos", country: "NG" }, lastActiveAt: daysAgo(1), current: false, riskLevel: "HIGH" },
  { id: "s-006", device: "Edge / Windows 10", ip: "163.172.90.5", location: { city: "Paris", country: "FR" }, lastActiveAt: daysAgo(3), current: false, riskLevel: "CRITICAL" },
  { id: "s-007", device: "Chrome / Windows 11", ip: "80.187.19.33", location: { city: "Berlin", country: "DE" }, lastActiveAt: daysAgo(4), current: false, riskLevel: "LOW" }
];

export const auditEvents = [
  { id: "a-001", type: "LOGIN", actor: "ava.chen@secureid.local", target: null, ip: "84.152.168.41", location: "Berlin, DE", timestamp: minutesAgo(4), riskLevel: "LOW", details: "Successful login (password + MFA)" },
  { id: "a-002", type: "LOGIN_FAILED", actor: "unknown", target: "ethan.gray@secureid.local", ip: "185.220.101.4", location: "Rotterdam, NL", timestamp: minutesAgo(9), riskLevel: "MEDIUM", details: "Invalid credentials — 3rd failure" },
  { id: "a-003", type: "MFA_CHALLENGE", actor: "mia.tanaka@secureid.local", target: null, ip: "133.16.44.8", location: "Tokyo, JP", timestamp: minutesAgo(9), riskLevel: "LOW", details: "TOTP challenge passed" },
  { id: "a-004", type: "LOGIN", actor: "liam.novak@secureid.local", target: null, ip: "91.198.30.12", location: "Prague, CZ", timestamp: minutesAgo(22), riskLevel: "MEDIUM", details: "Login from new device + new location (+50 risk)" },
  { id: "a-005", type: "TOKEN_REUSE_DETECTED", actor: "unknown", target: "freya.hansen@secureid.local", ip: "45.155.205.233", location: "Moscow, RU", timestamp: minutesAgo(31), riskLevel: "CRITICAL", details: "Refresh token replay — all sessions revoked" },
  { id: "a-006", type: "ACCOUNT_LOCKED", actor: "system", target: "james.carter@secureid.local", ip: "185.220.101.4", location: "Rotterdam, NL", timestamp: hoursAgo(1), riskLevel: "HIGH", details: "Auto-lock after 5 failed attempts (15 min)" },
  { id: "a-007", type: "SESSION_REVOKED", actor: "ava.chen@secureid.local", target: null, ip: "84.152.168.41", location: "Berlin, DE", timestamp: hoursAgo(2), riskLevel: "LOW", details: "User revoked session s-002" },
  { id: "a-008", type: "PASSWORD_RESET", actor: "unknown", target: "zoe.papadakis@secureid.local", ip: "133.16.44.8", location: "Tokyo, JP", timestamp: hoursAgo(3), riskLevel: "MEDIUM", details: "Reset via emailed link (expiry 15 min)" },
  { id: "a-009", type: "ROLE_CHANGE", actor: "ava.chen@secureid.local", target: "sofia.marino@secureid.local", ip: "84.152.168.41", location: "Berlin, DE", timestamp: hoursAgo(5), riskLevel: "HIGH", details: "Granted ROLE_MANAGER, ROLE_SUPPORT" },
  { id: "a-010", type: "LOGIN", actor: "olivia.smith@secureid.local", target: null, ip: "163.172.90.5", location: "Paris, FR", timestamp: hoursAgo(6), riskLevel: "MEDIUM", details: "Login via Google OAuth2" },
  { id: "a-011", type: "IMPOSSIBLE_TRAVEL", actor: "system", target: "noah.okafor@secureid.local", ip: "105.112.30.77", location: "Lagos, NG", timestamp: hoursAgo(7), riskLevel: "HIGH", details: "Login 4,200 km from Berlin 2h earlier (+40)" },
  { id: "a-012", type: "MFA_FAILED", actor: "ethan.gray@secureid.local", target: null, ip: "185.220.101.4", location: "Rotterdam, NL", timestamp: hoursAgo(9), riskLevel: "HIGH", details: "TOTP verification failed" },
  { id: "a-013", type: "LOGIN", actor: "amara.diallo@secureid.local", target: null, ip: "41.82.13.9", location: "Dakar, SN", timestamp: hoursAgo(11), riskLevel: "LOW", details: "Successful login" },
  { id: "a-014", type: "USER_CREATED", actor: "ava.chen@secureid.local", target: "mateo.rivera@secureid.local", ip: "84.152.168.41", location: "Berlin, DE", timestamp: daysAgo(1), riskLevel: "LOW", details: "Invitation sent — email verification pending" },
  { id: "a-015", type: "LOGIN_FAILED", actor: "unknown", target: "emma.larsson@secureid.local", ip: "45.155.205.233", location: "Moscow, RU", timestamp: daysAgo(1), riskLevel: "HIGH", details: "Blocked: account unverified" },
  { id: "a-016", type: "SESSION_REVOKED", actor: "system", target: "freya.hansen@secureid.local", ip: "system", location: "-", timestamp: daysAgo(1), riskLevel: "LOW", details: "Token reuse sweep" },
  { id: "a-017", type: "LOGIN", actor: "lucas.weber@secureid.local", target: null, ip: "80.187.19.33", location: "Munich, DE", timestamp: daysAgo(1), riskLevel: "LOW", details: "Successful login" },
  { id: "a-018", type: "ACCOUNT_LOCKED", actor: "system", target: "ethan.gray@secureid.local", ip: "45.155.205.233", location: "Moscow, RU", timestamp: daysAgo(2), riskLevel: "HIGH", details: "Auto-lock after 5 failed attempts" },
  { id: "a-019", type: "ROLE_CHANGE", actor: "ava.chen@secureid.local", target: "daniel.ross@secureid.local", ip: "84.152.168.41", location: "Berlin, DE", timestamp: daysAgo(2), riskLevel: "LOW", details: "Granted ROLE_SUPPORT" },
  { id: "a-020", type: "LOGIN", actor: "sofia.marino@secureid.local", target: null, ip: "37.16.74.9", location: "Milan, IT", timestamp: daysAgo(2), riskLevel: "LOW", details: "Successful login" },
  { id: "a-021", type: "LOGIN_FAILED", actor: "unknown", target: "james.carter@secureid.local", ip: "185.220.101.4", location: "Rotterdam, NL", timestamp: daysAgo(3), riskLevel: "HIGH", details: "Invalid credentials" },
  { id: "a-022", type: "LOGIN", actor: "emma.larsson@secureid.local", target: null, ip: "91.198.30.12", location: "Stockholm, SE", timestamp: daysAgo(3), riskLevel: "MEDIUM", details: "Login while pending verification" },
  { id: "a-023", type: "SESSION_REVOKED", actor: "ava.chen@secureid.local", target: "noah.okafor@secureid.local", ip: "84.152.168.41", location: "Berlin, DE", timestamp: daysAgo(4), riskLevel: "HIGH", details: "Admin revoked suspicious session" },
  { id: "a-024", type: "LOGIN", actor: "zoe.papadakis@secureid.local", target: null, ip: "105.112.30.77", location: "Athens, GR", timestamp: daysAgo(4), riskLevel: "LOW", details: "Successful login" }
];

export const trends = [
  { day: "Sep 12", logins: 812, failed: 41, signups: 88, risky: 19 },
  { day: "Sep 13", logins: 897, failed: 52, signups: 96, risky: 27 },
  { day: "Sep 14", logins: 764, failed: 38, signups: 71, risky: 15 },
  { day: "Sep 15", logins: 985, failed: 63, signups: 104, risky: 31 },
  { day: "Sep 16", logins: 942, failed: 47, signups: 92, risky: 22 },
  { day: "Sep 17", logins: 1081, failed: 71, signups: 118, risky: 44 },
  { day: "Sep 18", logins: 1013, failed: 59, signups: 109, risky: 36 },
  { day: "Sep 19", logins: 902, failed: 44, signups: 97, risky: 21 },
  { day: "Sep 20", logins: 1138, failed: 82, signups: 124, risky: 51 },
  { day: "Sep 21", logins: 1046, failed: 66, signups: 111, risky: 39 },
  { day: "Sep 22", logins: 971, failed: 55, signups: 103, risky: 28 },
  { day: "Sep 23", logins: 1184, failed: 78, signups: 132, risky: 47 },
  { day: "Sep 24", logins: 1097, failed: 69, signups: 119, risky: 40 },
  { day: "Sep 25", logins: 1264, failed: 91, signups: 141, risky: 58 }
];

export const recentActivity = [
  "MFA failed for ethan.gray · Rotterdam, NL",
  "Login from new location · liam.novak · Prague, CZ (+50)",
  "Token reuse detected · freya.hansen · Moscow, RU",
  "Account locked · james.carter · 5 failed attempts",
  "Password reset requested · zoe.papadakis",
  "Role change · sofia.marino → ROLE_MANAGER",
  "Impossible travel · noah.okafor · Lagos, NG (+40)",
  "Google OAuth2 login · olivia.smith · Paris, FR",
  "New user invited · mateo.rivera",
  "Session revoked · noah.okafor · suspicious device"
];

export const riskFactorBreakdown = [
  { factor: "Impossible travel", weight: 40, events14d: 26, color: "#f87171" },
  { factor: "New location", weight: 30, events14d: 88, color: "#fb923c" },
  { factor: "New device", weight: 20, events14d: 129, color: "#fbbf24" },
  { factor: "Failed attempts", weight: 20, events14d: 342, color: "#facc15" },
  { factor: "Unusual time", weight: 10, events14d: 187, color: "#22d3ee" }
];

export const securityEvents = [
  { id: "e-001", event: "Password spray pattern", factor: "failed-attempts", level: "HIGH", source: "Berlin, DE", at: hoursAgo(3) },
  { id: "e-002", event: "Impossible travel burst", factor: "impossible-travel", level: "CRITICAL", source: "Lagos, NG", at: hoursAgo(7) },
  { id: "e-003", event: "Refresh token replay", factor: "impossible-travel", level: "CRITICAL", source: "Moscow, RU", at: minutesAgo(31) },
  { id: "e-004", event: "New device torrent", factor: "new-device", level: "MEDIUM", source: "Paris, FR", at: hoursAgo(6) },
  { id: "e-005", event: "Geographically unlikely access", factor: "new-location", level: "HIGH", source: "Prague, CZ", at: minutesAgo(22) }
];

export const posture = {
  score: 86,
  grade: "Strong",
  summary:
    "Your identity perimeter is in good shape. Two high-signal risk areas need attention: refresh-token replay from a single ASN, and MFA adoption among non-technical departments.",
  openFindings: 3,
  usersProtected: 216
};

export const currentAdmin = users[0];