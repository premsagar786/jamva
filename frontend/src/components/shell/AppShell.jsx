import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, MonitorSmartphone, ScrollText, ShieldCheck } from "lucide-react";
import Topbar from "./Topbar";
import Threads from "../../lib/reactbits/Backgrounds/Threads/Threads";
import Dock from "../../lib/reactbits/Components/Dock/Dock";

export default function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = [
    { label: "Overview", path: "/overview", icon: <LayoutDashboard size={20} /> },
    { label: "Users", path: "/users", icon: <Users size={20} /> },
    { label: "Sessions", path: "/sessions", icon: <MonitorSmartphone size={20} /> },
    { label: "Audit Logs", path: "/audit", icon: <ScrollText size={20} /> },
    { label: "Security", path: "/security", icon: <ShieldCheck size={20} /> }
  ];

  return (
    <div className="app">
      <div className="app-bg">
        <div className="app-bg-threads">
          <Threads color={[0.15, 0.55, 0.6]} amplitude={0.55} distance={0.18} />
        </div>
        <div className="app-bg-vignette" />
        <div className="app-bg-glow app-bg-glow-a" />
        <div className="app-bg-glow app-bg-glow-b" />
      </div>

      <Topbar />

      <main className="app-main">
        <Outlet />
        <footer className="app-footer">
          SecureID Console · access tokens expire after {`15 min`} · refresh tokens after 7 days · issuer <code>secureid</code>
        </footer>
      </main>

      <div className="console-dock">
        <Dock
          items={items.map(item => ({
            label: item.label,
            icon: item.icon,
            className: pathname === item.path ? "dock-item-active" : "",
            onClick: () => navigate(item.path)
          }))}
          magnification={64}
          distance={160}
          panelHeight={62}
          baseItemSize={46}
        />
      </div>
    </div>
  );
}