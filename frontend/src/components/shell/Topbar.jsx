import { useState, useRef, useEffect } from "react";
import { ShieldCheck, Bell, Search, LogOut, UserRound, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "../../App";
import DecryptedText from "../../lib/reactbits/TextAnimations/DecryptedText/DecryptedText";

const notifications = [
  { id: 1, title: "Impossible travel detected", body: "noah.okafor signed in 4,200 km from Berlin.", at: "12 min ago", level: "danger" },
  { id: 2, title: "Refresh token replay", body: "freya.hansen — all sessions revoked.", at: "31 min ago", level: "danger" },
  { id: 3, title: "New MFA adoption milestone", body: "MFA adoption reached 84% of active users.", at: "3 h ago", level: "success" },
  { id: 4, title: "Security scan complete", body: "No new findings on the identity perimeter.", at: "6 h ago", level: "success" }
];

function Dropdown({ trigger, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="dropdown" ref={ref}>
      {trigger(setOpen)}
      {open && children(setOpen)}
    </div>
  );
}

export default function Topbar() {
  const { session, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <a className="brand" href="/overview">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          <span className="brand-name">
            <DecryptedText
              text="SecureID"
              speed={22}
              maxIterations={12}
              sequential
              revealDirection="start"
              useOriginalCharsOnly
              animateOn="view"
              characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*"
            />
          </span>
          <span className="brand-badge">Console</span>
        </a>
        <span className="env-pill">
          <span className="env-dot" /> Production
        </span>
      </div>

      <div className="topbar-search">
        <Search size={14} />
        <input placeholder="Search users, sessions, events…" readOnly />
        <kbd>⌘K</kbd>
      </div>

      <div className="topbar-right">
        <span className="ops-pill">
          <span className="ops-dot" /> All systems operational
        </span>

        <Dropdown
          trigger={setOpen => (
            <button className="btn-icon topbar-icon" onClick={() => setOpen(o => !o)} aria-label="Notifications">
              <Bell size={17} />
              <span className="notif-dot" />
            </button>
          )}
        >
          {close => (
            <div className="menu notif-menu">
              <div className="menu-head">
                <strong>Notifications</strong>
                <span className="menu-count">4</span>
              </div>
              {notifications.map(n => (
                <button key={n.id} className="notif-item" onClick={close}>
                  <span className={`notif-bar ${n.level}`} />
                  <div>
                    <p className="notif-title">{n.title}</p>
                    <p className="notif-body">{n.body}</p>
                    <span className="notif-at">{n.at}</span>
                  </div>
                </button>
              ))}
              <button className="menu-foot" onClick={close}>
                View all alerts
              </button>
            </div>
          )}
        </Dropdown>

        <Dropdown
          trigger={setOpen => (
            <button className="user-chip" onClick={() => setOpen(o => !o)}>
              <span className="avatar avatar-sm">{session.displayName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}</span>
              <span className="user-chip-text">
                <strong>{session.displayName}</strong>
                <small>{session.roles[0] === "ROLE_ADMIN" ? "Administrator" : "Member"}</small>
              </span>
              <ChevronDown size={14} className="user-chevron" />
            </button>
          )}
        >
          {close => (
            <div className="menu user-menu">
              <div className="menu-identity">
                <strong>{session.displayName}</strong>
                <span>{session.email}</span>
              </div>
              <div className="menu-groups">
                <button className="menu-item" onClick={close}>
                  <UserRound size={15} /> Profile
                </button>
                <button className="menu-item" onClick={close}>
                  <Settings size={15} /> Preferences
                </button>
                <button
                  className="menu-item danger"
                  onClick={() => {
                    close();
                    logout();
                  }}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          )}
        </Dropdown>
      </div>
    </header>
  );
}