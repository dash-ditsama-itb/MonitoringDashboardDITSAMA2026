import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon.jsx";
import { DASHBOARDS } from "../config.js";
import { roleLabel } from "../lib/format.js";
import { useAuthStore } from "../stores/auth.js";
import dashboardCss from "../styles/dashboard.css?url";
import homeCss from "../styles/home.css?url";

export function links() {
  return [{ rel: "stylesheet", href: dashboardCss }, { rel: "stylesheet", href: homeCss }];
}

export function meta() {
  return [{ title: "Dashboard DITSAMA 2026 — Direktorat Persiapan Bersama ITB" }];
}

// Beranda: pilih dashboard Pra-Universitas atau Pendidikan Persiapan (satu login untuk keduanya)
export default function Home() {
  const session = useAuthStore((s) => s.session);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="landing">
      <header className="landing-top">
        <span className="landing-org">
          <img className="badge-itb" src={import.meta.env.BASE_URL + "assets/itb-logo.png"} alt="Logo ITB" width="40" height="40" />
          <span><b>Direktorat Persiapan Bersama</b><small>Institut Teknologi Bandung</small></span>
        </span>
        {session && <span className="landing-who"><Icon name="user" size={15} />{session.name}<small>{roleLabel(session.role)}</small></span>}
      </header>

      <main className="landing-main">
        {logoFailed
          ? <div className="landing-logo-text"><b>Direktorat Persiapan Bersama</b><span>Institut Teknologi Bandung</span></div>
          : <img className="landing-logo" src={import.meta.env.BASE_URL + "assets/dpb-logo.png"} alt="Direktorat Persiapan Bersama ITB" onError={() => setLogoFailed(true)} />}
        <h1>Dashboard DITSAMA 2026</h1>
        <p className="landing-sub">Pilih dashboard yang ingin dibuka. Satu akun untuk keduanya.</p>

        <nav className="landing-cards" aria-label="Pilih dashboard">
          {DASHBOARDS.map((d) => (
            <Link key={d.key} to={d.to} className="dash-card">
              <span className="dash-card-ic"><Icon name={d.icon} size={26} /></span>
              <span className="dash-card-txt">
                <b>{d.label}</b>
                <span>{d.desc}</span>
              </span>
              <span className="dash-card-go">{session?.token ? "Buka dashboard" : "Masuk"}<Icon name="right" size={16} /></span>
            </Link>
          ))}
        </nav>
      </main>

      <footer className="landing-foot">© 2026 Direktorat Persiapan Bersama · Institut Teknologi Bandung</footer>
    </div>
  );
}
