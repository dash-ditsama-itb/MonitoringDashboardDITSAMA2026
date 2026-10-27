import { useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { AuthGate, Brand, GateShell, nextPath } from "../components/AuthGate.jsx";
import { FeedbackHost } from "../components/feedback.jsx";
import { Icon } from "../components/Icon.jsx";
import { DASHBOARDS } from "../config.js";
import { refreshUser } from "../lib/api.js";
import { roleName } from "../lib/format.js";
import { useAuthStore } from "../stores/auth.js";
import dashboardCss from "../styles/dashboard.css?url";

export function links() {
  return [{ rel: "stylesheet", href: dashboardCss }];
}

export function meta() {
  return [{ title: "Dashboard DITSAMA 2026 — Direktorat Persiapan Bersama ITB" }];
}

// Halaman pertama: masuk (satu akun untuk kedua dashboard), lalu pilih Pra-Universitas atau Pendidikan Persiapan.
// Membuka halaman dashboard sebelum masuk -> diarahkan ke sini dengan ?next=, dan setelah masuk langsung ke halaman itu.
export default function Login() {
  const session = useAuthStore((s) => s.session);
  const { search } = useLocation();
  const next = nextPath(search);
  useEffect(() => { if (session?.token) refreshUser(); }, [session?.token]);

  if (!session) return <><AuthGate /><FeedbackHost /></>;
  if (next) return <Navigate to={next} replace />;
  return <Chooser session={session} />;
}

function Chooser({ session }) {
  const logout = useAuthStore((s) => s.logout);
  return (
    <GateShell>
      <div className="gate-form">
        <Brand />
        <div className="gate-who">
          <span className="ava">{(session.name || "?").slice(0, 1).toUpperCase()}</span>
          <span className="gate-who-txt"><small>Masuk sebagai</small><b>{session.name}</b><small>{roleName(session)}</small></span>
        </div>
        <div>
          <h2 className="gate-title">Pilih dashboard</h2>
          <p className="gate-sub">Anda bisa berpindah dashboard kapan saja lewat menu.</p>
        </div>
        <nav className="dash-choices" aria-label="Pilih dashboard">
          {DASHBOARDS.map((d) => (
            <Link key={d.key} to={d.to} className="dash-choice">
              <span className="dash-choice-ic"><Icon name={d.icon} size={22} /></span>
              <span className="dash-choice-txt"><b>{d.label}</b><span>{d.desc}</span></span>
              <Icon name="right" size={20} className="dash-choice-go" />
            </Link>
          ))}
        </nav>
        <div className="gate-links">
          <button type="button" className="link-btn" onClick={logout}><Icon name="logout" size={15} />Keluar</button>
        </div>
      </div>
    </GateShell>
  );
}
