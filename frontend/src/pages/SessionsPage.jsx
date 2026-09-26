import { useEffect, useState } from "react";
import { Globe, Compass, Flame, Smartphone, Monitor, LogOut, ShieldCheck, MapPin, RefreshCw } from "lucide-react";
import { api } from "../services/api";
import { PageHeader, Panel, Badge, StatusPill, Skeleton, timeAgo, timeFmt } from "../components/ui";
import BlurText from "../lib/reactbits/TextAnimations/BlurText/BlurText";
import TiltedCard from "../lib/reactbits/Components/TiltedCard/TiltedCard";

function deviceIcon(name) {
  if (/safari/i.test(name)) return <Compass size={16} />;
  if (/firefox/i.test(name)) return <Flame size={16} />;
  if (/mobile|android|ios/i.test(name)) return <Smartphone size={16} />;
  if (/edge/i.test(name)) return <Monitor size={16} />;
  return <Globe size={16} />;
}

const frameSvg = accent =>
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d1322"/>
      <stop offset="1" stop-color="#0a1220"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="318" height="198" rx="14" fill="url(#g)" stroke="rgba(148,163,184,.25)" stroke-width="1.5"/>
  <rect x="16" y="14" width="288" height="22" rx="8" fill="#0f1a30" stroke="rgba(148,163,184,.14)"/>
  <circle cx="28" cy="25" r="4" fill="#ff5f57"/><circle cx="42" cy="25" r="4" fill="#febc2e"/><circle cx="56" cy="25" r="4" fill="#28c840"/>
  <rect x="26" y="46" width="268" height="142" rx="9" fill="#0f1a30" stroke="rgba(148,163,184,.10)"/>
  <circle cx="46" cy="58" r="5" fill="${accent}" opacity=".9"/>
  <rect x="58" y="55" width="120" height="6" rx="3" fill="${accent}" opacity=".35"/>
  <rect x="58" y="66" width="90" height="6" rx="3" fill="rgba(148,163,184,.35)"/>
  <rect x="60" y="88" width="200" height="26" rx="6" fill="${accent}" opacity=".18"/>
  <rect x="34" y="130" width="52" height="42" rx="6" fill="${accent}" opacity=".5"/>
  <rect x="96" y="130" width="52" height="42" rx="6" fill="rgba(148,163,184,.16)"/>
  <rect x="158" y="130" width="52" height="42" rx="6" fill="rgba(148,163,184,.16)"/>
  <rect x="220" y="130" width="52" height="42" rx="6" fill="rgba(148,163,184,.16)"/>
</svg>`);

export default function SessionsPage() {
  const [rows, setRows] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    api.sessions.list().then(res => res.success && setRows(res.data));
  }, []);

  const revoke = async id => {
    setBusyId(id);
    setNotice(null);
    const res = await api.sessions.revoke(id);
    setBusyId(null);
    if (!res.success) {
      setNotice({ tone: "danger", text: res.error.message });
      return;
    }
    setRows(prev => prev.filter(s => s.id !== id));
    setNotice({ tone: "success", text: `${res.data.id} session revoked and logged to the audit trail.` });
  };

  const revokeAll = async () => {
    setBusyId("all");
    setNotice(null);
    const res = await api.sessions.revokeAllOthers();
    setBusyId(null);
    if (res.success) {
      setRows(prev => prev.filter(s => s.current));
      setNotice({ tone: "success", text: `${res.data.revoked} sessions revoked — access tokens for those devices are now invalid.` });
    }
  };

  const stale = rows?.filter(s => new Date(s.lastActiveAt).getTime() < Date.now() - 12 * 3600000) ?? [];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Session intelligence"
        title={<BlurText text="Sessions" delay={60} animateBy="words" className="page-title blur-title" />}
        subtitle="Every device and browser holding a valid access token. Revoking a session invalidates its refresh token."
        actions={
          <button className="btn btn-danger btn-sm" disabled={busyId === "all"} onClick={revokeAll}>
            {busyId === "all" ? <RefreshCw size={14} className="spin" /> : <LogOut size={14} />}
            Revoke all others
          </button>
        }
      />

      {notice && <div className={`login-error ${notice.tone === "success" ? "ok" : ""}`}>{notice.text}</div>}

      <section className="stats-grid stats-grid-4">
        <MiniStat label="Active tokens" value={rows?.length ?? 0} />
        <MiniStat label="Current device" value={rows?.filter(s => s.current).length ?? 0} />
        <MiniStat label="High / critical risk" value={rows?.filter(s => s.riskLevel === "HIGH" || s.riskLevel === "CRITICAL").length ?? 0} />
        <MiniStat label="Stale (>12h)" value={stale.length} />
      </section>

      <section className="session-grid">
        {!rows
          ? Array.from({ length: 4 }).map((_, i) => (
              <div className="panel session-card" key={i}>
                <Skeleton height={180} width="100%" />
                <Skeleton height={14} width="70%" />
              </div>
            ))
          : rows.map(s => {
              const accent = s.current ? "#22d3ee" : s.riskLevel === "CRITICAL" || s.riskLevel === "HIGH" ? "#fb7185" : "#38bdf8";
              return (
                <TiltedCard
                  key={s.id}
                  imageSrc={frameSvg(accent)}
                  altText={s.device}
                  containerWidth="100%"
                  containerHeight="250px"
                  imageWidth="100%"
                  imageHeight="205px"
                  rotateAmplitude={9}
                  scaleOnHover={1.04}
                  showMobileWarning={false}
                  showTooltip
                  captionText={`${s.device} · ${s.ip}`}
                  displayOverlayContent
                  overlayContent={
                    <div className={`session-overlay ${s.current ? "current" : ""}`}>
                      <div className="session-overlay-top">
                        <span className="session-overlay-icon">{deviceIcon(s.device)}</span>
                        {s.current ? <Badge tone="info">This device</Badge> : <StatusPill status={s.riskLevel} />}
                      </div>
                      <strong className="session-overlay-name">{s.device}</strong>
                      <span className="session-overlay-meta">
                        <MapPin size={11} /> {s.location.city}, {s.location.country} · {s.ip}
                      </span>
                      <span className="session-overlay-meta last-active">Active {timeAgo(s.lastActiveAt)}</span>
                    </div>
                  }
                />
              );
            })}
      </section>

      {!rows || rows.length === 0 ? null : (
        <Panel title="Revocation history" subtitle="Most recent session events from the audit stream" className="chart-panel">
          <div className="alert-list">
            {[
              { title: "TOKEN_REUSE_DETECTED", who: "freya.hansen · Moscow, RU", level: "CRITICAL", at: timeAgo(new Date(Date.now() - 31 * 60000).toISOString()) },
              { title: "SESSION_REVOKED (admin)", who: "noah.okafor · suspicious device", level: "HIGH", at: timeAgo(new Date(Date.now() - 4 * 3600000).toISOString()) },
              { title: "LOGIN from new device", who: "liam.novak · Prague, CZ", level: "MEDIUM", at: timeAgo(new Date(Date.now() - 22 * 60000).toISOString()) }
            ].map((a, i) => (
              <div className="alert-row" key={i}>
                <StatusPill status={a.level} />
                <div className="alert-text">
                  <strong>{a.title}</strong>
                  <span>{a.who}</span>
                </div>
                <time>{a.at}</time>
              </div>
            ))}
          </div>
          <div className="session-hint">
            <ShieldCheck size={14} />
            Revoked tokens trigger <code>TOKEN_REVOKED</code> on reuse. The audit log records device, IP and geolocation for
            every action.
          </div>
        </Panel>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="panel kpi mini">
      <span className="kpi-label">{label}</span>
      <p className="kpi-value">{value}</p>
    </div>
  );
}