// Mock API service. Mirrors the SecureID backend contract (docs/API.md):
// every call resolves to the standard ApiResponse envelope:
//   success -> { success: true, data, meta, timestamp }
//   error   -> { success: false, error: { code, message }, timestamp }
// Swap these for real fetch() calls when the backend ships.

import {
  users,
  sessions,
  auditEvents,
  trends,
  recentActivity,
  riskFactorBreakdown,
  securityEvents,
  posture,
  CONFIG
} from "./mockData";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const jitter = () => 180 + Math.random() * 320;

const ok = (data, meta = {}) => ({ success: true, data, meta, timestamp: new Date().toISOString() });
const err = (code, message, status = 400) => ({
  success: false,
  error: { code, message },
  status,
  timestamp: new Date().toISOString()
});

// Mutable, in-memory store so console actions feel real for the session.
let store = {
  users: users.map(u => ({ ...u })),
  sessions: sessions.map(s => ({ ...s })),
  auditEvents: [...auditEvents]
};

const sessionUser = () => store.users.find(u => u.status === "ACTIVE" && u.roles.includes("ROLE_ADMIN"));

export const api = {
  auth: {
    login: async ({ email }) => {
      await delay(jitter());
      const user = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return err("INVALID_CREDENTIALS", "Invalid credentials", 401);
      if (user.status === "LOCKED") {
        return err("ACCOUNT_LOCKED", `Account locked until ${CONFIG.lockout.durationMinutes} min after 5 failed attempts`, 423);
      }
      if (user.status === "PENDING_VERIFICATION") {
        return err("VALIDATION_ERROR", "Please verify your email before signing in", 400);
      }
      return ok({
        session: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          roles: user.roles,
          mfa: user.mfa,
          department: user.department
        },
        tokens: {
          accessToken: "mock." + btoa(JSON.stringify({ sub: email, iss: CONFIG.jwt.issuer, exp: 900 })) + "." + Math.random().toString(36).slice(2, 14),
          refreshToken: "mock.r." + Math.random().toString(36).slice(2, 14),
          tokenType: "Bearer",
          expiresIn: 900
        }
      });
    },
    logout: async () => {
      await delay(220);
      return ok(null);
    }
  },

  me: async () => {
    await delay(jitter());
    const me = sessionUser();
    if (!me) return err("UNAUTHORIZED", "Not authenticated", 401);
    return ok(me);
  },

  overview: {
    stats: async () => {
      await delay(jitter());
      const active = store.users.filter(u => u.status === "ACTIVE");
      const locked = store.users.filter(u => u.status === "LOCKED");
      const risky = store.users.filter(u => u.riskScore >= 60);
      const totalAudit = store.auditEvents.length;
      let blockedToday = 0;
      const dayStart = Date.now() - 86400000;
      store.auditEvents.forEach(e => {
        if (new Date(e.timestamp).getTime() > dayStart && ["LOGIN_FAILED", "MFA_FAILED", "ACCOUNT_LOCKED"].includes(e.type)) blockedToday++;
      });
      return ok({
        totalUsers: 12847,
        userDelta: "+4.2%",
        activeSessions: 2394,
        sessionDelta: "+1.8%",
        blockedToday,
        blockedDelta: `-${totalAudit % 7 + 3}%`,
        avgRisk: Math.round(
          store.users.reduce((acc, u) => acc + u.riskScore, 0) / store.users.length
        ),
        riskDelta: "-2.1%",
        mfaAdoption: Math.round((active.filter(u => u.mfa).length / Math.max(active.length, 1)) * 100),
        lockedCount: locked.length,
        riskyUsers: risky.length,
        unverified: store.users.filter(u => u.status === "PENDING_VERIFICATION").length
      });
    },
    trends: async () => {
      await delay(jitter());
      return ok(trends);
    },
    activity: async () => {
      await delay(jitter());
      return ok(recentActivity);
    },
    riskFactors: async () => {
      await delay(jitter());
      return ok(riskFactorBreakdown);
    }
  },

  users: {
    list: async ({ page = 0, size = 8, search = "", role = "", status = "" } = {}) => {
      await delay(jitter());
      const q = search.trim().toLowerCase();
      let rows = store.users.filter(u => {
        const matchesQ =
          !q ||
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q);
        const matchesRole = !role || u.roles.includes(role);
        const matchesStatus = !status || u.status === status;
        return matchesQ && matchesRole && matchesStatus;
      });
      const total = rows.length;
      const start = page * size;
      rows = rows.slice(start, start + size);
      return ok(
        { items: rows, page, size, total, pages: Math.max(1, Math.ceil(total / size)) },
        { page }
      );
    },
    updateRole: async (id, role) => {
      await delay(240);
      const user = store.users.find(u => u.id === id);
      if (!user) return err("NOT_FOUND", "User not found", 404);
      if (role === "ROLE_ADMIN") {
        const admins = store.users.filter(u => u.roles.includes("ROLE_ADMIN") && u.status === "ACTIVE");
        if (admins.length <= 1 && user.roles.includes("ROLE_ADMIN")) {
          return err("VALIDATION_ERROR", "Cannot remove the last active admin", 400);
        }
      }
      user.roles = [role];
      return ok({ id, roles: user.roles });
    },
    toggleLock: async id => {
      await delay(240);
      const user = store.users.find(u => u.id === id);
      if (!user) return err("NOT_FOUND", "User not found", 404);
      user.status = user.status === "LOCKED" ? "ACTIVE" : "LOCKED";
      return ok({ id, status: user.status });
    },
    remove: async id => {
      await delay(260);
      store.users = store.users.filter(u => u.id !== id);
      return ok({ id });
    }
  },

  sessions: {
    list: async () => {
      await delay(jitter());
      return ok(store.sessions);
    },
    revoke: async id => {
      await delay(240);
      const s = store.sessions.find(x => x.id === id);
      if (!s) return err("NOT_FOUND", "Session not found", 404);
      if (s.current) return err("VALIDATION_ERROR", "Cannot revoke the current session", 400);
      store.sessions = store.sessions.filter(x => x.id !== id);
      store.auditEvents.unshift({
        id: "a-" + Date.now(),
        type: "SESSION_REVOKED",
        actor: sessionUser()?.email ?? "console",
        target: s.device,
        ip: s.ip,
        location: `${s.location.city}, ${s.location.country}`,
        timestamp: new Date().toISOString(),
        riskLevel: s.riskLevel,
        details: "Session revoked from console"
      });
      return ok({ id });
    },
    revokeAllOthers: async () => {
      await delay(300);
      store.sessions = store.sessions.filter(s => s.current);
      return ok({ revoked: sessions.length - 1 });
    }
  },

  audit: {
    list: async ({ page = 0, size = 10, type = "", level = "", q = "", from = "", to = "" } = {}) => {
      await delay(jitter());
      const needle = q.trim().toLowerCase();
      let rows = store.auditEvents.filter(e => {
        const matchesType = !type || e.type === type;
        const matchesLevel = !level || e.riskLevel === level;
        const matchesQ =
          !needle ||
          e.actor.toLowerCase().includes(needle) ||
          e.details.toLowerCase().includes(needle) ||
          (e.target ?? "").toLowerCase().includes(needle);
        const at = new Date(e.timestamp).getTime();
        const matchesFrom = !from || at >= new Date(from).getTime();
        const matchesTo = !to || at <= new Date(to + "T23:59:59").getTime();
        return matchesType && matchesLevel && matchesQ && matchesFrom && matchesTo;
      });
      const total = rows.length;
      const start = page * size;
      return ok({
        items: rows.slice(start, start + size),
        page,
        size,
        total,
        pages: Math.max(1, Math.ceil(total / size))
      });
    }
  },

  security: {
    posture: async () => {
      await delay(jitter());
      return ok({ posture, weights: CONFIG.riskWeights, thresholds: CONFIG.riskThresholds });
    },
    events: async () => {
      await delay(jitter());
      return ok(securityEvents);
    },
    policy: async () => {
      await delay(jitter());
      return ok(CONFIG);
    }
  }
};

export { CONFIG };