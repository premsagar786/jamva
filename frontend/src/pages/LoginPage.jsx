import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, Loader2, LockKeyhole, ArrowRight, AlertTriangle } from "lucide-react";
import { useAuth } from "../App";
import { api } from "../services/api";
import { users } from "../services/mockData";
import SphericalNetwork from "../components/three/SphericalNetwork";
import SplitText from "../lib/reactbits/TextAnimations/SplitText/SplitText";
import ShinyText from "../lib/reactbits/TextAnimations/ShinyText/ShinyText";
import Magnet from "../lib/reactbits/Animations/Magnet/Magnet";
import Threads from "../lib/reactbits/Backgrounds/Threads/Threads";

const SSO = ["Google", "GitHub", "Passkey"];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setError(null);
    setBusy(false);
    setStep("credentials");
    setCode("");
  };

  const submitCredentials = async e => {
    e.preventDefault();
    setError(null);
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError({ code: "VALIDATION_ERROR", message: "Enter a valid email address" });
      return;
    }
    if (password.length < 1) {
      setError({ code: "VALIDATION_ERROR", message: "Enter your password" });
      return;
    }
    setBusy(true);
    // Step 1: the console asks the API for a challenge / lockout status.
    const probe = await api.auth.login({ email });
    if (!probe.success) {
      setError(probe.error);
      setBusy(false);
      return;
    }
    const account = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (account?.mfa) {
      setStep("mfa");
      setBusy(false);
      return;
    }
    await finishLogin(email);
  };

  const submitMfa = async e => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError({ code: "VALIDATION_ERROR", message: "Enter the 6-digit code" });
      return;
    }
    setBusy(true);
    await finishLogin(email);
  };

  const finishLogin = async mail => {
    const res = await api.auth.login({ email: mail });
    if (!res.success) {
      setError(res.error);
      setBusy(false);
      return;
    }
    await login(mail);
    navigate("/overview", { replace: true });
  };

  return (
    <div className="login">
      <div className="login-bg">
        <div className="login-bg-threads">
          <Threads color={[0.1, 0.45, 0.55]} amplitude={0.5} distance={0.2} />
        </div>
        <div className="login-bg-vignette" />
        <div className="login-bg-glow login-bg-glow-a" />
        <div className="login-bg-glow login-bg-glow-b" />
      </div>

      <section className="login-hero">
        <div className="login-hero-scene">
          <SphericalNetwork color="#22d3ee" pointCount={1600} speed={0.16} parallax={1} />
        </div>
        <div className="login-hero-front">
          <span className="login-eyebrow">
            <span className="brand-mark">
              <ShieldCheck size={16} />
            </span>
            SecureID · Identity &amp; Access Management
          </span>
          <SplitText
            text="Defense, at the speed of identity."
            tag="h1"
            className="login-hero-title"
            splitType="chars"
            from={{ opacity: 0, y: 34 }}
            to={{ opacity: 1, y: 0 }}
            delay={28}
            duration={0.9}
            textAlign="left"
          />
          <p className="login-hero-sub">
            Adaptive risk scoring, session intelligence and a tamper-evident audit trail — protecting{" "}
            <ShinyText text="12,847 identities" speed={3} shineColor="#67e8f9" color="#8b97ab" /> across 34 countries.
          </p>
          <div className="login-hero-stats">
            <div className="hero-stat">
              <strong>12.8k</strong>
              <span>Identities</span>
            </div>
            <div className="hero-stat">
              <strong>99.98%</strong>
              <span>Auth availability</span>
            </div>
            <div className="hero-stat">
              <strong>84%</strong>
              <span>MFA adoption</span>
            </div>
            <div className="hero-stat">
              <strong>40</strong>
              <span>Risk factors tracked</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-form-side">
        <div className="login-card">
          <div className="login-card-head">
            <span className="brand-mark login-card-mark">
              <ShieldCheck size={20} />
            </span>
            <h2>{step === "mfa" ? "Two-factor verification" : "Sign in to Console"}</h2>
            <p>
              {step === "mfa"
                ? "Enter the 6-digit code from your authenticator app."
                : "Use your SecureID workspace credentials."}
            </p>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <AlertTriangle size={15} />
              <span>
                <strong>{error.code.replace(/_/g, " ")}.</strong> {error.message}
              </span>
            </div>
          )}

          {step === "credentials" ? (
            <form onSubmit={submitCredentials} className="login-form">
              <label className="field">
                <span>Work email</span>
                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@secureid.local"
                  spellCheck={false}
                />
              </label>
              <label className="field">
                <span>Password</span>
                <div className="pw-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)} aria-label="Toggle password">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              <div className="login-row">
                <label className="checkbox">
                  <input type="checkbox" defaultChecked />
                  <span>Remember this device</span>
                </label>
                <button type="button" className="text-link" onClick={reset}>
                  Forgot password?
                </button>
              </div>

              <Magnet padding={60} magnetStrength={6}>
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 size={16} className="spin" /> Checking…
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </Magnet>

              <div className="login-divider">
                <span>or continue with single sign-on</span>
              </div>

              <div className="sso-grid">
                {SSO.map(provider => (
                  <Magnet key={provider} padding={30} magnetStrength={8}>
                    <button type="button" className="btn btn-ghost sso-btn" onClick={() => setError({ code: "OAUTH_SETUP", message: `${provider} SSO is wired in the backend (Spring Security OAuth2). Configure client credentials to enable it.` })}>
                      {provider}
                    </button>
                  </Magnet>
                ))}
              </div>
            </form>
          ) : (
            <form onSubmit={submitMfa} className="login-form">
              <div className="otp-row">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <span key={i} className={`otp-cell ${code[i] ? "filled" : ""}`}>
                    {code[i] || ""}
                  </span>
                ))}
              </div>
              <input
                className="sr-only-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                autoFocus
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                aria-label="6-digit code"
              />
              <Magnet padding={60} magnetStrength={6}>
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 size={16} className="spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      Verify &amp; continue <LockKeyhole size={15} />
                    </>
                  )}
                </button>
              </Magnet>
              <button type="button" className="text-link login-back" onClick={reset}>
                ← Back to sign in
              </button>
            </form>
          )}

          <div className="login-hint">
            <strong>Demo account</strong> · any password works. <br />
            <code>ava.chen@secureid.local</code> (MFA), <code>ethan.gray@secureid.local</code> (locked),
            <code> emma.larsson@secureid.local</code> (unverified).
          </div>
        </div>

        <p className="login-footer">
          Rate-limited to 5 attempts / min · locked after 5 failures for 15 min ·
          <span className="ops-dot" /> risk engine active
        </p>
      </section>
    </div>
  );
}