import { motion } from "motion/react";
import { X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import CountUp from "../lib/reactbits/TextAnimations/CountUp/CountUp";
import GradientText from "../lib/reactbits/TextAnimations/GradientText/GradientText";

export function fmtNum(n) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function timeAgo(iso) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function timeFmt(iso) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const TONES = {
  neutral: { bg: "rgba(148,163,184,0.12)", fg: "#b8c2d4", border: "rgba(148,163,184,0.25)" },
  info: { bg: "rgba(34,211,238,0.12)", fg: "#67e8f9", border: "rgba(34,211,238,0.3)" },
  success: { bg: "rgba(52,211,153,0.12)", fg: "#6ee7b7", border: "rgba(52,211,153,0.3)" },
  warning: { bg: "rgba(251,191,36,0.12)", fg: "#fcd34d", border: "rgba(251,191,36,0.3)" },
  danger: { bg: "rgba(248,113,113,0.12)", fg: "#fca5a5", border: "rgba(248,113,113,0.3)" }
};

export function Badge({ tone = "neutral", children, style }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      className="badge"
      style={{ background: t.bg, color: t.fg, borderColor: t.border, ...style }}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }) {
  const map = {
    ACTIVE: { label: "Active", tone: "success" },
    PENDING_VERIFICATION: { label: "Unverified", tone: "warning" },
    LOCKED: { label: "Locked", tone: "danger" },
    LOW: { label: "Low", tone: "success" },
    MEDIUM: { label: "Medium", tone: "warning" },
    HIGH: { label: "High", tone: "danger" },
    CRITICAL: { label: "Critical", tone: "danger" }
  };
  const item = map[status] || { label: status, tone: "neutral" };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export function RoleBadge({ role }) {
  const map = {
    ROLE_ADMIN: { label: "Admin", tone: "info" },
    ROLE_MANAGER: { label: "Manager", tone: "warning" },
    ROLE_SUPPORT: { label: "Support", tone: "neutral" },
    ROLE_USER: { label: "User", tone: "neutral" }
  };
  const item = map[role] || { label: role.replace("ROLE_", ""), tone: "neutral" };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

const AVATAR_COLORS = ["#22d3ee", "#818cf8", "#34d399", "#fbbf24", "#fb7185", "#a78bfa"];

export function Avatar({ name, size = 34 }) {
  const initials = name
    .split(" ")
    .map(p => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = AVATAR_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, background: color + "26", color, borderColor: color + "44", lineHeight: `${size - 2}px` }}
    >
      {initials}
    </span>
  );
}

export function Panel({ title, subtitle, actions, children, className = "", pad = true, style }) {
  return (
    <section className={`panel ${className}`} style={style}>
      {(title || actions) && (
        <header className="panel-header">
          <div>
            {title && <h3 className="panel-title">{title}</h3>}
            {subtitle && <p className="panel-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      {pad ? <div className="panel-body">{children}</div> : children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function StatCard({ label, value, delta, up = true, icon: Icon, tone = "info", suffix }) {
  const d = TONES[tone] || TONES.info;
  return (
    <article className="panel kpi">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {Icon && (
          <span className="kpi-icon" style={{ background: d.bg, color: d.fg }}>
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
      </div>
      <p className="kpi-value">
        <CountUp to={value} separator="," duration={1.6} />
        {suffix && <span className="kpi-suffix">{suffix}</span>}
      </p>
      {delta && (
        <p className={`kpi-delta ${up ? "" : "down"}`}>
          {up ? "▲" : "▼"} {delta} <span>vs last period</span>
        </p>
      )}
    </article>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", style }) {
  return (
    <div className="search-input" style={style}>
      <Search size={14} />
      <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

export function Select({ value, onChange, options, label }) {
  return (
    <label className="select">
      {label && <span className="select-label">{label}</span>}
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <header className="modal-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </motion.div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={22} />}
      <p className="empty-title">{title}</p>
      {message && <p className="empty-message">{message}</p>}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage, sizeLabel }) {
  return (
    <footer className="pagination">
      <span className="pagination-info">
        Showing <strong>{sizeLabel}</strong> · {total} total
      </span>
      <div className="pagination-controls">
        <button className="btn-icon" disabled={page <= 0} onClick={() => onPage(page - 1)} aria-label="Previous">
          <ChevronLeft size={15} />
        </button>
        <span className="pagination-page">
          Page {page + 1} of {pages}
        </span>
        <button className="btn-icon" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label="Next">
          <ChevronRight size={15} />
        </button>
      </div>
    </footer>
  );
}

export function Skeleton({ width = "100%", height = 14, style }) {
  return <span className="skeleton" style={{ width, height, ...style }} />;
}

export function Chip({ active, onClick, children }) {
  return (
    <button className={`chip ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function GradientHeading({ children, ...rest }) {
  return (
    <GradientText colors={["#22d3ee", "#818cf8", "#34d399", "#22d3ee"]} animationSpeed={7} {...rest}>
      {children}
    </GradientText>
  );
}

export function PanelBody({ children }) {
  return <div className="panel-body">{children}</div>;
}