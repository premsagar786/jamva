import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { createContext, useContext, useCallback, useState } from "react";
import { api } from "./services/api";
import AppShell from "./components/shell/AppShell";
import LoginPage from "./pages/LoginPage";
import OverviewPage from "./pages/OverviewPage";
import UsersPage from "./pages/UsersPage";
import SessionsPage from "./pages/SessionsPage";
import AuditPage from "./pages/AuditPage";
import SecurityPage from "./pages/SecurityPage";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(() => JSON.parse(sessionStorage.getItem("sid.session") || "null"));
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const login = useCallback(async email => {
    const res = await api.auth.login({ email });
    sessionStorage.setItem("sid.session", JSON.stringify(res.data.session));
    setSession(res.data.session);
  }, []);

  const logout = useCallback(() => {
    api.auth.logout().catch(() => {});
    sessionStorage.removeItem("sid.session");
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, isBootstrapping, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function RequireAuth() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/security" element={<SecurityPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}