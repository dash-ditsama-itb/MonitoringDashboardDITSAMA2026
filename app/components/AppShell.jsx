// Kerangka bersama kedua dashboard: gerbang login, menu kiri (rail) + tombol pindah dashboard, topbar, profil.
import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";
import { useShallow } from "zustand/react/shallow";
import { DASHBOARDS } from "../config.js";
import { refreshUser } from "../lib/api.js";
import { byLabel, grantLabel, programLabel, roleName } from "../lib/format.js";
import { useAuthStore } from "../stores/auth.js";
import { useUiStore } from "../stores/ui.js";
import { ACCESS } from "./Access.jsx";
import { loginTarget } from "./AuthGate.jsx";
import { FeedbackHost } from "./feedback.jsx";
import { Icon } from "./Icon.jsx";
import { Refreshing, Sheet, Spinner } from "./ui.jsx";

const navClass = ({ isActive }) => "nav-item" + (isActive ? " active" : "");

// tautan menu; untuk peran tanpa akses tetap tampil tapi nonaktif
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

/** Belum masuk -> ke halaman masuk "/" (dengan ?next= agar kembali ke sini setelah masuk; lihat loginTarget). */
export function Gate({ children }) {
  const session = useAuthStore((s) => s.session);
  const signedOut = useAuthStore((s) => s.signedOut);
  const location = useLocation();
  // hak akses selalu diambil ulang saat dashboard dibuka, jadi perubahan peran langsung terasa
  useEffect(() => { if (session?.token) refreshUser(); }, [session?.token]);
  if (!session) return <Navigate replace to={signedOut && !location.hash ? "/" : loginTarget(location)} />;
  if (!session.permissions) return <p className="gate-loading"><Spinner />Memuat akses akun…</p>;
  return children(session);
}

/**
 * dashboard: salah satu DASHBOARDS. nav: isi menu. control: panel tambahan di samping (mis. Filter).
 * topbarEnd: tombol di kanan topbar. profile: baris <div><dt/><dd/></div> tambahan di panel Profil.
 */
export function AppShell({ session, dashboard, nav, control, topbarEnd, profile }) {
  const ui = useUiStore(useShallow((s) => ({
    railOpen: s.railOpen, railHidden: s.railHidden, controlOpen: s.controlOpen, pending: s.pending, set: s.set,
  })));
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  // menu hanya milik dashboard ini; dashboard lain lewat satu tombol "Pindah ke …" di bawah menu
  const other = DASHBOARDS.find((d) => d.key !== dashboard.key);

  // tutup laci menu (ponsel) setiap pindah halaman
  useEffect(() => { ui.set({ railOpen: false, controlOpen: false }); }, [location.pathname]);

  return (
    <div className={"app" + (ui.railHidden ? " rail-hidden" : "")}>
      <a className="skip" href="#main">Langsung ke konten</a>
      <aside className={"rail" + (ui.railOpen ? " open" : "")} aria-label="Menu utama">
        <div className="rail-top">
          {/* kepala rail: dashboard yang sedang dibuka, dan di bawahnya pindah ke dashboard lain */}
          <div className="rail-head">
            <Link to="/" className="rail-brand" title="Ke halaman pilih dashboard">
              <img className="badge-itb" src={import.meta.env.BASE_URL + "assets/itb-logo.png"} alt="Logo ITB" width="36" height="36" />
              <span><small>Dashboard DITSAMA 2026</small><b>{dashboard.label}</b></span>
            </Link>
            <Link className="rail-switch" to={other.to}>
              <span className="rail-switch-ic"><Icon name="swap" size={16} /></span>
              <span><small>Pindah ke</small><b>{other.label}</b></span>
            </Link>
          </div>
          <button className="icon-btn on-dark rail-close" type="button" onClick={() => ui.set({ railOpen: false })} aria-label="Tutup menu"><Icon name="x" size={18} /></button>
        </div>
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
          {/* nama dashboard saat menu kiri tersembunyi (ponsel, atau menu disembunyikan) */}
          <span className="topbar-dash"><Icon name={dashboard.icon} size={16} />{dashboard.label}</span>
          {/* satu penanda muat ulang untuk seluruh halaman; topbar menempel di atas, jadi selalu terlihat */}
          {ui.pending > 0 && <span className="topbar-busy"><Refreshing /></span>}
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
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <Sheet open={open} onClose={onClose} title="Profil" footer={(
      <><span className="grow" /><button className="btn btn-danger-ghost" type="button" onClick={() => { onClose(); signOut(); }}><Icon name="logout" size={16} />Keluar</button></>
    )}>
      <div className="profile">
        <span className="ava lg">{(session.name || "?").slice(0, 1).toUpperCase()}</span>
        <div><b>{session.name}</b><div className="muted">{session.email}</div></div>
      </div>
      <dl className="facts">
        <div><dt>Peran</dt><dd>{roleName(session)}</dd></div>
        <div><dt>Akses</dt><dd>{session.role.isSuperAdmin ? "Super Admin (semua akses)"
          : session.role.grants.map((g) => (g === "pic" ? `PIC ${session.role.programs.map(programLabel).sort(byLabel()).join(", ")}` : grantLabel(g))).join(" · ")}</dd></div>
        {children}
      </dl>
      <p className="hint"><Icon name="info" size={14} />Satu akun untuk kedua dashboard. Keluar berlaku untuk Pra-Universitas dan Pendidikan Persiapan.</p>
    </Sheet>
  );
}
