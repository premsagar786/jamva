import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Users, MonitorSmartphone, ShieldAlert, Gauge, Download, Radio } from "lucide-react";
import { api } from "../services/api";
import { StatCard, Panel, PageHeader, Badge, StatusPill, Skeleton } from "../components/ui";
import BlurText from "../lib/reactbits/TextAnimations/BlurText/BlurText";
import AnimatedList from "../lib/reactbits/Components/AnimatedList/AnimatedList";

const AXIS = { tick: { fill: "#77839a", fontSize: 11 }, axisLine: false, tickLine: false };
const TOOLTIP = {
  contentStyle: {
    background: "#0d1322",
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: 10,
    fontSize: 12,
    color: "#e6edf7",
    boxShadow: "0 12px 32px rgba(0,0,0,0.5)"
  },
  labelStyle: { color: "#8b97ab", marginBottom: 4 }
};

const MFA_COLORS = { enabled: "#22d3ee", disabled: "#6366f1", locked: "#f43f5e" };

export default function OverviewPage() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [activity, setActivity] = useState(null);
  const [factors, setFactors] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.overview.stats(), api.overview.trends(), api.overview.activity(), api.overview.riskFactors()]).then(
      ([statsRes, trendsRes, activityRes, factorsRes]) => {
        if (!alive) return;
        setStats(statsRes.data);
        setTrends(trendsRes.data);
        setActivity(activityRes.data);
        setFactors(factorsRes.data);
      }
    );
    return () => {
      alive = false;
    };
  }, []);

  const mfaPie = useMemo(
    () =>
      stats
        ? [
            { name: "MFA enabled", value: stats.mfaAdoption, color: MFA_COLORS.enabled },
            { name: "MFA off", value: Math.max(5, 100 - stats.mfaAdoption - 3), color: MFA_COLORS.disabled },
            { name: "Locked", value: 3, color: MFA_COLORS.locked }
          ]
        : [],
    [stats]
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow={null}
        title={
          <BlurText
            text="Overview"
            delay={60}
            animateBy="words"
            direction="top"
            className="page-title blur-title"
          />
        }
        subtitle="Security posture across your identity perimeter, updated in real time."
        actions={
          <>
            <button className="btn btn-ghost btn-sm">
              <Radio size={14} /> Live
            </button>
            <button className="btn btn-ghost btn-sm">
              <Download size={14} /> Export
            </button>
          </>
        }
      />

      <section className="stats-grid">
        <StatCard label="Total users" value={stats?.totalUsers ?? 12847} delta={stats?.userDelta ?? "+4.2%"} up icon={Users} tone="info" />
        <StatCard label="Active sessions" value={stats?.activeSessions ?? 2394} delta={stats?.sessionDelta ?? "+1.8%"} up icon={MonitorSmartphone} tone="success" />
        <StatCard label="Blocked events · 24h" value={stats?.blockedToday ?? 0} delta={stats?.blockedDelta ?? "-6%"} up={false} icon={ShieldAlert} tone="danger" />
        <StatCard label="Avg risk score" value={stats?.avgRisk ?? 0} suffix="/100" delta={stats?.riskDelta ?? "-2.1%"} up icon={Gauge} tone="warning" />
      </section>

      <section className="grid-2">
        <Panel
          title="Sign-in activity"
          subtitle="Successful logins vs. new sign-ups, trailing 14 days"
          className="chart-panel"
          pad={false}
        >
          {trends ? (
            <ResponsiveContainer width="100%" height={272}>
              <AreaChart data={trends} margin={{ top: 14, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gLogins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="day" {...AXIS} dy={6} />
                <YAxis {...AXIS} />
                <Tooltip {...TOOLTIP} />
                <Area type="monotone" dataKey="logins" name="Logins" stroke="#22d3ee" strokeWidth={2} fill="url(#gLogins)" />
                <Area type="monotone" dataKey="signups" name="Sign-ups" stroke="#818cf8" strokeWidth={2} fill="url(#gSignups)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartSkeleton />
          )}
        </Panel>

        <Panel
          title="Identity coverage"
          subtitle="MFA adoption and lock state across active accounts"
          className="chart-panel"
          pad={false}
        >
          <div className="donut-wrap">
            {mfaPie.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={mfaPie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3} stroke="none">
                    {mfaPie.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartSkeleton height={200} />
            )}
            <div className="donut-center">
              <strong>{stats?.mfaAdoption ?? 84}%</strong>
              <span>MFA</span>
            </div>
          </div>
          <ul className="legend">
            {mfaPie.map(i => (
              <li key={i.name}>
                <span className="legend-dot" style={{ background: i.color }} />
                {i.name}
                <strong>{i.value}%</strong>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="grid-2 grid-2-uneven">
        <Panel
          title="Threat volume"
          subtitle="Failed sign-ins vs. high-risk events, trailing 14 days"
          className="chart-panel"
          pad={false}
        >
          {trends ? (
            <ResponsiveContainer width="100%" height={252}>
              <ComposedChart data={trends} margin={{ top: 14, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="day" {...AXIS} dy={6} />
                <YAxis {...AXIS} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="failed" name="Failed logins" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={18} opacity={0.9} />
                <Line type="monotone" dataKey="risky" name="High-risk" stroke="#fbbf24" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ChartSkeleton />
          )}
        </Panel>

        <Panel title="Top risk factors" subtitle="Weighted signals driving the risk engine" className="risk-factors-panel" pad={false}>
          {factors ? (
            <div className="factor-list">
              {factors.map(f => (
                <div className="factor" key={f.factor}>
                  <div className="factor-head">
                    <span>{f.factor}</span>
                    <span className="factor-meta">
                      <Badge tone="neutral">+{f.weight} pts</Badge>
                      <em>{f.events14d} events</em>
                    </span>
                  </div>
                  <div className="factor-track">
                    <div className="factor-fill" style={{ width: `${f.weight * 2.5}%`, background: f.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ChartSkeleton height={216} />
          )}
        </Panel>
      </section>

      <section className="grid-2">
        <Panel
          title="Live activity"
          subtitle="Recent events streamed from the risk engine"
          className="activity-panel"
          actions={<span className="live-pill"><span className="ops-dot" /> streaming</span>}
        >
          {activity ? (
            <div className="activity-scroll">
              <AnimatedList
                items={activity}
                showGradients
                displayScrollbar={false}
                className="activity-list"
                itemClassName="activity-item"
              />
            </div>
          ) : (
            <ChartSkeleton height={220} />
          )}
        </Panel>

        <Panel
          title="Priority alerts"
          subtitle="Highest-signal events awaiting triage"
          className="chart-panel"
          actions={<span className="panel-hint">Auto-triaged</span>}
        >
          <div className="alert-list">
            {[
              { id: 1, title: "Refresh token replay", who: "freya.hansen@secureid.local", level: "CRITICAL", at: "31 min ago" },
              { id: 2, title: "Impossible travel", who: "noah.okafor@secureid.local", level: "HIGH", at: "7 h ago" },
              { id: 3, title: "Password spray pattern", who: "Berlin, DE egress", level: "HIGH", at: "3 h ago" },
              { id: 4, title: "New device torrent", who: "Paris, FR egress", level: "MEDIUM", at: "6 h ago" },
              { id: 5, title: "Geo-unlikely access", who: "liam.novak@secureid.local", level: "MEDIUM", at: "22 min ago" }
            ].map(a => (
              <div className="alert-row" key={a.id}>
                <StatusPill status={a.level} />
                <div className="alert-text">
                  <strong>{a.title}</strong>
                  <span>{a.who}</span>
                </div>
                <time>{a.at}</time>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function ChartSkeleton({ height = 252 }) {
  return (
    <div className="chart-skeleton" style={{ height }}>
      <Skeleton height={12} width="40%" />
      <Skeleton height={160} width="100%" />
      <Skeleton height={12} width="70%" />
    </div>
  );
}