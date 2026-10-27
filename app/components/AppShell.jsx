// Kerangka bersama kedua dashboard: gerbang login, menu kiri (rail) + pengalih dashboard, topbar, profil.
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useShallow } from "zustand/react/shallow";
import { DASHBOARDS } from "../config.js";
import { refreshUser } from "../lib/api.js";
import { grantLabel, programLabel, roleName } from "../lib/format.js";
import { useAuthStore } from "../stores/auth.js";
import { useUiStore } from "../stores/ui.js";
import { ACCESS } from "./Access.jsx";
import { AuthGate } from "./AuthGate.jsx";
import { FeedbackHost } from "./feedback.jsx";
import { Icon } from "./Icon.jsx";
import { Sheet, Spinner } from "./ui.jsx";

const navClass = ({ isActive }) => "nav-item" + (isActive ? " active" : "");

// tautan menu; untuk jabatan tanpa akses tetap tampil tapi nonaktif
export function NavItem({ session, area, to, end, children }) {
  const rule = area && ACCESS[area];
  if (rule && !rule.can(session)) {
    const why = `Hanya untuk ${rule.who}`;
    return (
      <span className="nav-item disabled" role="link" aria-disabled="true" title={why}>
        {children}<Icon name="lock" size={14} className="nav-lock" /><span className="sr-only">({why})</span>
      </span>
    );
  }
  return <NavLink className={navClass} to={to} end={end}>{children}</NavLink>;
}

/** Login (satu akun untuk kedua dashboard), lalu isi dashboard sesuai hak akses peran. */
export function Gate({ dashboard, children }) {
  const session = useAuthStore((s) => s.session);
  // hak akses selalu diambil ulang saat dashboard dibuka, jadi perubahan peran langsung terasa
  useEffect(() => { if (session?.token) refreshUser(); }, [session?.token]);
  if (!session) return <><AuthGate title={dashboard.title} /><FeedbackHost /></>;
  if (!session.permissions) return <p className="gate-loading"><Spinner />Memuat akses akun…</p>;
  return children(session);
}

// Pra-Universitas ⇄ Pendidikan Persiapan (ditulis kapital, terpisah dari menu halaman di bawahnya)
function DashboardSwitch({ current }) {
  return (
    <div className="dash-switch-wrap">
      <div className="dash-switch-cap" aria-hidden="true">Pilih dashboard</div>
      <nav className="dash-switch" aria-label="Pilih dashboard">
        {DASHBOARDS.map((d) => (
          <Link key={d.key} to={d.to} className={d.key === current ? "on" : ""} aria-current={d.key === current ? "page" : undefined}>
            <Icon name={d.icon} size={16} />{d.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/**
 * dashboard: salah satu DASHBOARDS. nav: isi menu. control: panel tambahan di samping (mis. Filter).
 * topbarEnd: tombol di kanan topbar. profile: baris <div><dt/><dd/></div> tambahan di panel Profil.
 */
export function AppShell({ session, dashboard, nav, control, topbarEnd, profile }) {
  const ui = useUiStore(useShallow((s) => ({
    railOpen: s.railOpen, railHidden: s.railHidden, controlOpen: s.controlOpen, set: s.set,
  })));
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  // tutup laci menu (ponsel) setiap pindah halaman
  useEffect(() => { ui.set({ railOpen: false, controlOpen: false }); }, [location.pathname]);

  return (
    <div className={"app" + (ui.railHidden ? " rail-hidden" : "")}>
      <a className="skip" href="#main">Langsung ke konten</a>
      <aside className={"rail" + (ui.railOpen ? " open" : "")} aria-label="Menu utama">
        <div className="rail-top">
          <Link to="/" className="rail-brand" title="Ke beranda DITSAMA">
            <img className="badge-itb" src={import.meta.env.BASE_URL + "assets/itb-logo.png"} alt="Logo ITB" width="36" height="36" />
            <span><b>DITSAMA 2026</b><small>Direktorat Persiapan Bersama</small></span>
          </Link>
          <button className="icon-btn on-dark rail-close" type="button" onClick={() => ui.set({ railOpen: false })} aria-label="Tutup menu"><Icon name="x" size={18} /></button>
        </div>
        <DashboardSwitch current={dashboard.key} />
        <nav className="rail-nav" aria-label={"Menu " + dashboard.label}>{nav}</nav>
        <button className="rail-foot" type="button" onClick={() => setProfileOpen(true)}>
          <span className="ava">{(session.name || "?").slice(0, 1).toUpperCase()}</span>
          <span className="rail-who"><b>{session.name}</b><small>{roleName(session)}</small></span>
          <Icon name="right" size={16} />
        </button>
      </aside>
      <div className="scrim" hidden={!ui.railOpen && !ui.controlOpen} onClick={() => ui.set({ railOpen: false, controlOpen: false })} />

      {control}

      <main className="stage" id="main">
        <div className="topbar">
          <button className="icon-btn" type="button" onClick={() => ui.set({ railOpen: true })} aria-label="Buka menu"><Icon name="menu" size={20} /></button>
          <button className="icon-btn desk" type="button" onClick={() => ui.set({ railHidden: !ui.railHidden })}
            aria-label={ui.railHidden ? "Tampilkan menu" : "Sembunyikan menu"} title={ui.railHidden ? "Tampilkan menu" : "Sembunyikan menu"}>
            <Icon name="menu" size={20} />
          </button>
          {topbarEnd}
        </div>
        <Outlet />
      </main>

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} session={session}>{profile}</ProfileSheet>
      <FeedbackHost />
    </div>
  );
}

function ProfileSheet({ open, onClose, session, children }) {
  const logout = useAuthStore((s) => s.logout);
  return (
    <Sheet open={open} onClose={onClose} title="Profil" footer={(
      <><span className="grow" /><button className="btn btn-danger-ghost" type="button" onClick={() => { onClose(); logout(); }}><Icon name="logout" size={16} />Keluar</button></>
    )}>
      <div className="profile">
        <span className="ava lg">{(session.name || "?").slice(0, 1).toUpperCase()}</span>
        <div><b>{session.name}</b><div className="muted">{session.email}</div></div>
      </div>
      <dl className="facts">
        <div><dt>Peran</dt><dd>{roleName(session)}</dd></div>
        <div><dt>Akses</dt><dd>{session.role.isSuperAdmin ? "Super Admin (semua akses)"
          : session.role.grants.map((g) => (g === "pic" ? `PIC ${session.role.programs.map(programLabel).join(", ")}` : grantLabel(g))).join(" · ")}</dd></div>
        {children}
      </dl>
      <p className="hint"><Icon name="info" size={14} />Satu akun untuk kedua dashboard. Keluar berlaku untuk Pra-Universitas dan Pendidikan Persiapan.</p>
    </Sheet>
  );
}
