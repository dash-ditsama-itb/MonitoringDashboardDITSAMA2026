import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon.jsx";
import { DASHBOARDS, ORG } from "../config.js";
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

// kotak jabatan bergaya bagan resmi: jabatan + nama pejabat (nama kosong = belum tercantum di sumber)
function Post({ person, lead }) {
  return (
    <div className={"org-box" + (lead ? " lead" : "")}>
      <span className="org-role">{person.role}</span>
      {person.name && <b className="org-name">{person.name}</b>}
    </div>
  );
}

// Beranda: pilih dashboard Pra-Universitas atau Pendidikan Persiapan + Struktur Organisasi Ditsama
export default function Home() {
  const session = useAuthStore((s) => s.session);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="landing">
      <header className="landing-top">
        <span className="landing-org">
          <img className="badge-itb" src={import.meta.env.BASE_URL + "assets/itb-logo.png"} alt="Logo ITB" width="40" height="40" />
          <h1>Dashboard DITSAMA 2026</h1>
        </span>
        {session && (
          <span className="landing-who">
            <span className="ava">{(session.name || "?").slice(0, 1).toUpperCase()}</span>
            <span><b>{session.name}</b><small>{roleLabel(session.role)}</small></span>
          </span>
        )}
      </header>

      <main className="landing-main">
        <div className="landing-hero">
          {logoFailed
            ? <div className="landing-logo-text"><b>Direktorat Persiapan Bersama</b><span>Institut Teknologi Bandung</span></div>
            : <img className="landing-logo" src={import.meta.env.BASE_URL + "assets/dpb-logo.png"} alt="Direktorat Persiapan Bersama ITB" onError={() => setLogoFailed(true)} />}
        </div>

        <section className="landing-sec" aria-labelledby="pilih-dashboard">
          <h2 id="pilih-dashboard" className="landing-h2">Pilih Dashboard</h2>
          <nav className="landing-choices" aria-label="Pilih dashboard">
            {DASHBOARDS.map((d) => (
              <Link key={d.key} to={d.to} className="dash-choice">
                <span className="dash-choice-ic"><Icon name={d.icon} size={24} /></span>
                <span className="dash-choice-txt"><b>{d.label}</b><span>{d.desc}</span></span>
                <Icon name="right" size={20} className="dash-choice-go" />
              </Link>
            ))}
          </nav>
        </section>

        <section className="landing-sec" aria-labelledby="struktur-organisasi">
          <h2 id="struktur-organisasi" className="landing-h2">Struktur Organisasi Ditsama</h2>
          <div className="org">
            <div className="org-head"><Post person={ORG.director} lead /></div>
            <div className="org-staff"><span aria-hidden="true" /><Post person={ORG.secretariat} /></div>
            <div className="org-branches">
              {ORG.subdirectorates.map((unit) => (
                <div key={unit.key} className="org-branch">
                  <Post person={unit} />
                  <ul className="org-sections">
                    {unit.sections.map((s) => <li key={s.role}><Post person={s} /></li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
