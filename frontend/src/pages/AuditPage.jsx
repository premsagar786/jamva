import { useEffect, useState, useCallback } from "react";
import {
  LogIn,
  XCircle,
  KeyRound,
  RotateCcw,
  Lock,
  LogOut,
  ShieldCheck,
  UserPlus,
  Plane,
  Download,
  ScrollText
} from "lucide-react";
import { api } from "../services/api";
import {
  PageHeader,
  Panel,
  SearchInput,
  Select,
  StatusPill,
  Badge,
  Pagination,
  EmptyState,
  Skeleton,
  timeAgo,
  timeFmt
} from "../components/ui";
import BlurText from "../lib/reactbits/TextAnimations/BlurText/BlurText";

const PAGE_SIZE = 10;

const EVENT_META = {
  LOGIN: { label: "Login", icon: LogIn, tone: "info" },
  LOGIN_FAILED: { label: "Login failed", icon: XCircle, tone: "danger" },
  MFA_CHALLENGE: { label: "MFA challenge", icon: KeyRound, tone: "success" },
  MFA_FAILED: { label: "MFA failed", icon: KeyRound, tone: "danger" },
  TOKEN_REUSE_DETECTED: { label: "Token reuse", icon: RotateCcw, tone: "danger" },
  ACCOUNT_LOCKED: { label: "Account locked", icon: Lock, tone: "danger" },
  SESSION_REVOKED: { label: "Session revoked", icon: LogOut, tone: "warning" },
  PASSWORD_RESET: { label: "Password reset", icon: KeyRound, tone: "warning" },
  ROLE_CHANGE: { label: "Role change", icon: ShieldCheck, tone: "warning" },
  USER_CREATED: { label: "User created", icon: UserPlus, tone: "info" },
  IMPOSSIBLE_TRAVEL: { label: "Impossible travel", icon: Plane, tone: "danger" }
};

const TYPES = Object.keys(EVENT_META);

export default function AuditPage() {
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState({ page: 0, pages: 1, total: 0 });
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    const res = await api.audit.list({
      page: meta.page,
      size: PAGE_SIZE,
      q: query,
      type,
      level,
      from,
      to
    });
    if (!res.success) return;
    setRows(res.data.items);
    setMeta({ page: res.data.page, pages: res.data.pages, total: res.data.total });
  }, [meta.page, query, type, level, from, to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetFilters = () => {
    setQuery("");
    setType("");
    setLevel("");
    setFrom("");
    setTo("");
  };

  const exportCsv = async () => {
    setExporting(true);
    const res = await api.audit.list({ q: query, type, level, from, to, page: 0, size: 1000 });
    setExporting(false);
    if (!res.success) return;
    const head = "id,type,timestamp,actor,target,ip,location,riskLevel,details";
    const body = res.data.items
      .map(e =>
        [
          e.id,
          e.type,
          new Date(e.timestamp).toISOString(),
          e.actor,
          e.target ?? "",
          e.ip,
          e.location,
          e.riskLevel,
          `"${e.details.replace(/"/g, '""')}"`
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `secureid-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loading = !rows;
  const filtersActive = query || type || level || from || to;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Compliance trail"
        title={<BlurText text="Audit Logs" delay={60} animateBy="words" className="page-title blur-title" />}
        subtitle="Tamper-evident records of every auth, admin and risk-engine event. Correlate by correlation ID in the backend."
        actions={
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={exporting}>
            <Download size={14} /> {exporting ? "Preparing…" : "Export CSV"}
          </button>
        }
      />

      <Panel pad={false} className="table-panel">
        <div className="table-toolbar audit-toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search actor, target or details…" />
          <div className="toolbar-filters">
            <Select
              value={type}
              onChange={setType}
              label="Type"
              options={[{ value: "", label: "All events" }, ...TYPES.map(t => ({ value: t, label: EVENT_META[t].label }))]}
            />
            <Select
              value={level}
              onChange={setLevel}
              label="Risk"
              options={[
                { value: "", label: "All levels" },
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
                { value: "CRITICAL", label: "Critical" }
              ]}
            />
            <input type="date" className="date-input" value={from} onChange={e => setFrom(e.target.value)} title="From" />
            <input type="date" className="date-input" value={to} onChange={e => setTo(e.target.value)} title="To" />
            {filtersActive && (
              <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table audit-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Source</th>
                <th>Risk</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6}><Skeleton height={16} width={`${60 + ((i * 7) % 35)}%`} /></td>
                    </tr>
                  ))
                : rows.map(e => {
                    const metaItem = EVENT_META[e.type] || { label: e.type, icon: ScrollText, tone: "neutral" };
                    const Icon = metaItem.icon;
                    return (
                      <tr key={e.id}>
                        <td>
                          <div className="event-cell">
                            <span className={`event-icon ${metaItem.tone}`}>
                              <Icon size={14} />
                            </span>
                            <div>
                              <strong>{metaItem.label}</strong>
                              <span className="td-muted">{e.details}</span>
                            </div>
                          </div>
                        </td>
                        <td className="td-mono">{e.actor}</td>
                        <td className="td-muted">{e.target ?? "—"}</td>
                        <td className="td-muted">
                          {e.ip}
                          <span className="td-loc">{e.location}</span>
                        </td>
                        <td><StatusPill status={e.riskLevel} /></td>
                        <td className="td-muted" title={timeFmt(e.timestamp)}>
                          {timeAgo(e.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <EmptyState icon={ScrollText} title="No audit events found" message="Try widening the date range or clearing filters." />
          )}
        </div>

        {!loading && rows.length > 0 && (
          <Pagination
            page={meta.page}
            pages={meta.pages}
            total={meta.total}
            onPage={p => setMeta(m => ({ ...m, page: p }))}
            sizeLabel={`${rows.length} of ${meta.total}`}
          />
        )}
      </Panel>

      <div className="audit-note">
        <Badge tone="info">Correlation ID</Badge>
        The backend logs a <code>correlationId</code> on every request (<code>%X{{correlationId}}</code> in logback) — match
        console events to service logs 1:1.
      </div>
    </div>
  );
}