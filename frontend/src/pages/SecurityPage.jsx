import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, X, ShieldCheck, KeyRound, Timer, Lock, ServerCrash } from "lucide-react";
import { api } from "../services/api";
import { PageHeader, Panel, Badge, StatusPill, Skeleton } from "../components/ui";
import BlurText from "../lib/reactbits/TextAnimations/BlurText/BlurText";
import TrueFocus from "../lib/reactbits/TextAnimations/TrueFocus/TrueFocus";
import GradientText from "../lib/reactbits/TextAnimations/GradientText/GradientText";

const ARC_R = 84;
const ARC_LEN = Math.PI * ARC_R;

function PostureGauge({ score }) {
  const frac = Math.min(score / 100, 1);
  return (
    <div className="gauge">
      <svg viewBox="0 0 210 118" width="210" height="118">
        <path d="M 21 100 A 84 84 0 1 1 189 100" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="13" strokeLinecap="round" />
        <motion.path
          d="M 21 100 A 84 84 0 1 1 189 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="13"
          strokeLinecap="round"
          initial={{ strokeDasharray: `${ARC_LEN} ${ARC_LEN}`, strokeDashoffset: ARC_LEN }}
          animate={{ strokeDashoffset: ARC_LEN * (1 - frac) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="55%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="gauge-center">
        <strong>{score}</strong>
        <span>/100</span>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const [posture, setPosture] = useState(null);
  const [events, setEvents] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    Promise.all([api.security.posture(), api.security.events(), api.security.policy()]).then(([p, e, c]) => {
      if (p.success) setPosture(p.data);
      if (e.success) setEvents(e.data);
      if (c.success) setConfig(c.data);
    });
  }, []);

  const weights = posture?.weights ?? {};
  const thresholds = posture?.thresholds ?? {};
  const maxWeight = Math.max(...(Object.values(weights).length ? Object.values(weights) : [40]), 1);

  const policy = config?.passwordPolicy;
  const limits = config?.rateLimits;
  const lockout = config?.lockout;
  const jwt = config?.jwt;

  return (
    <div className="page">
      <div className="security-hero">
        <TrueFocus
          sentence="Zero Trust Access Control"
          blurAmount={4}
          animationDuration={0.5}
          pauseBetweenAnimations={2.4}
          borderColor="#22d3ee"
          glowColor="rgba(34,211,238,0.5)"
        />
        <p className="security-hero-sub">
          Every sign-in is scored against adaptive signals before a token is issued.
        </p>
      </div>

      <PageHeader
        eyebrow="Security & risk"
        title={<BlurText text="Security Posture" delay={60} animateBy="words" className="page-title blur-title" />}
        subtitle="How the risk engine weights signals like new device, new location and impossible travel."
        actions={<span className="env-pill"><span className="env-dot" /> risk engine: running</span>}
      />

      <section className="grid-2 grid-2-uneven">
        <Panel
          title="Perimeter score"
          subtitle="Rolling 7-day identity security score"
          className="posture-panel"
          actions={<Badge tone="success">{posture?.posture.grade ?? "Strong"}</Badge>}
        >
          {posture ? (
            <div className="posture-body">
              <PostureGauge score={posture.posture.score} />
              <div className="posture-copy">
                <p>
                  <GradientText colors={["#34d399", "#22d3ee"]} animationSpeed={6}>
                    {posture.posture.grade} posture.
                  </GradientText>{" "}
                  {posture.posture.summary}
                </p>
                <ul className="posture-list">
                  <li><Check size={13} /> Access tokens live 15 min — short TTL surface</li>
                  <li><Check size={13} /> Refresh tokens rotate on every refresh (reuse ⇒ revoke)</li>
                  <li><X size={13} /> Token replay events from a single ASN need review</li>
                  <li><X size={13} /> MFA not enforced for non-technical departments</li>
                </ul>
              </div>
            </div>
          ) : (
            <Skeleton height={220} />
          )}
        </Panel>

        <Panel
          title="Signal weights"
          subtitle="Each factor raises login risk by its weight — thresholds below"
          className="chart-panel"
        >
          {posture ? (
            <div>
              <div className="factor-list">
                {Object.entries(weights).map(([key, value]) => (
                  <div className="factor" key={key}>
                    <div className="factor-head">
                      <span className="factor-name">{key.replace(/-/g, " ")}</span>
                      <span className="factor-meta"><Badge tone="info">+{value} pts</Badge></span>
                    </div>
                    <div className="factor-track">
                      <div
                        className="factor-fill"
                        style={{ width: `${(value / maxWeight) * 100}%`, background: value >= 30 ? "#fbbf24" : "#22d3ee" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="thresholds">
                {[
                  ["Low", 0, thresholds.low],
                  ["Medium", thresholds.low, thresholds.medium],
                  ["High", thresholds.medium, thresholds.high],
                  ["Critical", thresholds.high, "∞"]
                ].map(([label, lo, hi]) => (
                  <span key={label} className="threshold-row">
                    <StatusPill status={label.toUpperCase()} />
                    <span>{lo}–{hi}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <Skeleton height={200} />
          )}
        </Panel>
      </section>

      <section className="grid-2">
        <Panel title="Active security events" subtitle="Threats the engine is currently tracking" className="chart-panel" pad={false}>
          <div className="alert-list">
            {!events
              ? <div style={{ padding: 16 }}><Skeleton height={120} /></div>
              : events.map(e => (
                  <div className="alert-row" key={e.id}>
                    <StatusPill status={e.level} />
                    <div className="alert-text">
                      <strong>{e.event}</strong>
                      <span>{e.source} · factor: {e.factor.replace(/-/g, " ")}</span>
                    </div>
                    <time>{new Date(e.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                ))}
          </div>
        </Panel>

        <Panel title="Auth policy" subtitle="Enforced at the API edge — these settings come straight from secureid.*" className="chart-panel">
          {config ? (
            <div className="policy-grid">
              <div className="policy-card">
                <KeyRound size={15} />
                <h4>Password strength</h4>
                <ul>
                  <li>{policy.minLength}+ characters</li>
                  <li>{policy.requireUppercase ? "Uppercase" : "No uppercase"} required</li>
                  <li>{policy.requireLowercase ? "Lowercase" : "No lowercase"} required</li>
                  <li>{policy.requireDigit ? "Digit" : "No digit"} required</li>
                  <li>{policy.requireSpecial ? "Special character" : "No special"} required</li>
                </ul>
              </div>
              <div className="policy-card">
                <Timer size={15} />
                <h4>Token lifetime</h4>
                <ul>
                  <li>Access: {Math.round(jwt.accessExpirationMs / 60000)} min</li>
                  <li>Refresh: {Math.round(jwt.refreshExpirationMs / 86400000)} days</li>
                  <li>Issuer: <code>{jwt.issuer}</code></li>
                  <li>Rotation: on every refresh</li>
                </ul>
              </div>
              <div className="policy-card">
                <ServerCrash size={15} />
                <h4>Throttling · /min</h4>
                <ul>
                  <li>Login: {limits.login}</li>
                  <li>Register / forgot: {limits.register} / {limits.forgotPassword}</li>
                  <li>Reset password: {limits.resetPassword}</li>
                  <li>Refresh: {limits.refresh}</li>
                </ul>
              </div>
              <div className="policy-card">
                <Lock size={15} />
                <h4>Account lockout</h4>
                <ul>
                  <li>{lockout.maxAttempts} failed attempts → locked</li>
                  <li>Lock duration: {lockout.durationMinutes} min</li>
                  <li>Fail window: {lockout.failWindowMinutes} min</li>
                  <li>Password reset revokes all sessions</li>
                </ul>
              </div>
            </div>
          ) : (
            <Skeleton height={220} />
          )}
        </Panel>
      </section>

      <div className="audit-note">
        <ShieldCheck size={14} />
        Risk response is enforced server-side — a client can never self-exempt a challenge. Scores above{" "}
        <strong>{thresholds.medium || 60}</strong> require step-up (MFA or re-auth) before tokens are minted.
      </div>
    </div>
  );
}