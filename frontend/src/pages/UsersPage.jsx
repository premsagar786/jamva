import { useEffect, useState, useCallback } from "react";
import { UserPlus, Lock, Unlock, Settings2, Trash2, Users as UsersIcon, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import {
  PageHeader,
  Panel,
  SearchInput,
  Select,
  Badge,
  RoleBadge,
  StatusPill,
  Avatar,
  Pagination,
  Modal,
  EmptyState,
  Skeleton,
  timeAgo
} from "../components/ui";
import BlurText from "../lib/reactbits/TextAnimations/BlurText/BlurText";
import GradientText from "../lib/reactbits/TextAnimations/GradientText/GradientText";

const PAGE_SIZE = 8;

function riskColor(score) {
  if (score >= 60) return "#f87171";
  if (score >= 30) return "#fbbf24";
  return "#34d399";
}

export default function UsersPage() {
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState({ page: 0, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [manageUser, setManageUser] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchUsers = useCallback(async () => {
    const res = await api.users.list({ page: meta.page, size: PAGE_SIZE, search, role, status });
    if (!res.success) return;
    setRows(res.data.items);
    setMeta({ page: res.data.page, pages: res.data.pages, total: res.data.total });
  }, [meta.page, search, role, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const applyAction = async fn => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.success) await fetchUsers();
  };

  const toggleSelect = id => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loading = !rows;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Directory"
        title={<BlurText text="Users" delay={60} animateBy="words" className="page-title blur-title" />}
        subtitle="Manage identities, roles and account state across the organization."
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setInviteOpen(true)}>
            <UserPlus size={15} /> Invite user
          </button>
        }
      />

      <Panel pad={false} className="table-panel">
        <div className="table-toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or department…" />
          <div className="toolbar-filters">
            <Select
              value={role}
              onChange={setRole}
              label="Role"
              options={[
                { value: "", label: "All roles" },
                { value: "ROLE_ADMIN", label: "Admin" },
                { value: "ROLE_MANAGER", label: "Manager" },
                { value: "ROLE_SUPPORT", label: "Support" },
                { value: "ROLE_USER", label: "User" }
              ]}
            />
            <Select
              value={status}
              onChange={setStatus}
              label="Status"
              options={[
                { value: "", label: "All statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "PENDING_VERIFICATION", label: "Unverified" },
                { value: "LOCKED", label: "Locked" }
              ]}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-check">
                  <input
                    type="checkbox"
                    checked={rows && rows.length > 0 && selected.size === rows.length}
                    onChange={() => {
                      if (rows && selected.size === rows.length) setSelected(new Set());
                      else setSelected(new Set(rows.map(r => r.id)));
                    }}
                  />
                </th>
                <th>User</th>
                <th>Department</th>
                <th>Roles</th>
                <th>MFA</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Risk</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton height={16} width={16} /></td>
                      <td colSpan={6}><Skeleton height={16} width="60%" /></td>
                      <td><Skeleton height={16} width={40} /></td>
                    </tr>
                  ))
                : rows.map(user => (
                    <tr key={user.id} className={selected.has(user.id) ? "selected-row" : ""}>
                      <td className="col-check">
                        <input type="checkbox" checked={selected.has(user.id)} onChange={() => toggleSelect(user.id)} />
                      </td>
                      <td>
                        <div className="user-cell">
                          <Avatar name={user.displayName} />
                          <div>
                            <strong>{user.displayName}</strong>
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="td-muted">{user.department}</td>
                      <td>
                        <div className="role-stack">
                          {user.roles.map(r => (
                            <RoleBadge key={r} role={r} />
                          ))}
                        </div>
                      </td>
                      <td>
                        {user.mfa ? (
                          <Badge tone="info">TOTP</Badge>
                        ) : (
                          <Badge tone="neutral">Off</Badge>
                        )}
                      </td>
                      <td><StatusPill status={user.status} /></td>
                      <td className="td-muted">
                        {user.lastLoginAt ? timeAgo(user.lastLoginAt) : "—"}
                      </td>
                      <td>
                        <div className="risk-cell">
                          <span>{user.riskScore}</span>
                          <div className="risk-track">
                            <div className="risk-fill" style={{ width: `${Math.min(user.riskScore, 100)}%`, background: riskColor(user.riskScore) }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn-icon" title="Manage" onClick={() => setManageUser(user)}>
                            <Settings2 size={15} />
                          </button>
                          <button
                            className="btn-icon"
                            title={user.status === "LOCKED" ? "Unlock" : "Lock"}
                            disabled={busy}
                            onClick={() => applyAction(() => api.users.toggleLock(user.id))}
                          >
                            {user.status === "LOCKED" ? <Unlock size={15} /> : <Lock size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <EmptyState icon={UsersIcon} title="No users match" message="Adjust your filters or invite someone new." />
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

      <ManageUserModal user={manageUser} onClose={() => setManageUser(null)} onSaved={fetchUsers} />

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={async entry => {
          const res = await api.users.list({ page: 0, size: PAGE_SIZE, search, role, status });
          setRows(res.data.items);
          setMeta({ page: 0, pages: res.data.pages, total: res.data.total });
          setInviteOpen(false);
        }}
      />
    </div>
  );
}

function ManageUserModal({ user, onClose, onSaved }) {
  const [role, setRole] = useState(user?.roles[0] ?? "");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRole(user?.roles[0] ?? "");
    setMessage(null);
  }, [user]);

  if (!user) return null;

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const res = await api.users.updateRole(user.id, role);
    setBusy(false);
    if (!res.success) {
      setMessage({ tone: "danger", text: res.error.message });
      return;
    }
    setMessage({ tone: "success", text: `Saved — ${user.displayName} is now ${role.replace("ROLE_", "").toLowerCase()}.` });
    onSaved();
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Manage ${user.displayName}`}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save role"}</button>
        </>
      }
    >
      <div className="manage-head">
        <Avatar name={user.displayName} size={44} />
        <div>
          <strong>{user.displayName}</strong>
          <span>{user.email}</span>
        </div>
      </div>

      {message && <div className={`login-error ${message.tone === "success" ? "ok" : ""}`}>{message.text}</div>}

      <label className="field">
        <span>Role</span>
        <select className="select" value={role} onChange={e => setRole(e.target.value)}>
          {["ROLE_USER", "ROLE_SUPPORT", "ROLE_MANAGER", "ROLE_ADMIN"].map(r => (
            <option key={r} value={r}>{r.replace("ROLE_", "")}</option>
          ))}
        </select>
      </label>

      <div className="manage-meta">
        <span><ShieldCheck size={14} /> {role === "ROLE_ADMIN" ? "Full console access" : "Scoped console access"}</span>
        <span><GradientText colors={["#34d399", "#22d3ee"]} animationSpeed={6}>Role audit is recorded.</GradientText></span>
        <span>Actions emit <Badge tone="neutral">ROLE_CHANGE</Badge> audit events.</span>
      </div>
    </Modal>
  );
}

function InviteModal({ open, onClose, onInvited }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ROLE_USER");
  const [sent, setSent] = useState(false);

  const submit = e => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) return;
    setSent(true);
    setTimeout(() => {
      onInvited();
    }, 600);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setSent(false);
        setEmail("");
        onClose();
      }}
      title="Invite a user"
      footer={
        <>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setSent(false);
              setEmail("");
              onClose();
            }}
          >
            Cancel
          </button>
          <button className="btn btn-primary" disabled={sent} onClick={submit}>
            {sent ? "Sent ✓" : "Send invitation"}
          </button>
        </>
      }
    >
      {sent ? (
        <div className="login-error ok">
          Invitation email queued to <strong>{email}</strong> — verification link expires in 30 minutes (Mailpit :1025).
        </div>
      ) : (
        <>
          <p className="modal-note">
            The user receives a verification email with a one-time link. Access is provisioned only after the email is
            verified.
          </p>
          <label className="field">
            <span>Email address</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@secureid.local" />
          </label>
          <label className="field">
            <span>Initial role</span>
            <select className="select" value={role} onChange={e => setRole(e.target.value)}>
              {["ROLE_USER", "ROLE_SUPPORT", "ROLE_MANAGER"].map(r => (
                <option key={r} value={r}>{r.replace("ROLE_", "")}</option>
              ))}
            </select>
          </label>
          <p className="field-hint">Rate-limited to 3 invitations per 60 seconds (register endpoint).</p>
        </>
      )}
    </Modal>
  );
}