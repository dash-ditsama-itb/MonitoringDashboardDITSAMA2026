import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { AppShell, Gate, NavItem } from "../../components/AppShell.jsx";
import { Icon } from "../../components/Icon.jsx";
import { buildTree, flattenReports, reportPath, useReports } from "../../components/Reports.jsx";
import { DASHBOARDS } from "../../config.js";
import { KARAKTER_BASE, KARAKTER_PROGRAMS } from "../../lib/karakter.js";
import { canManageReports } from "../../lib/format.js";
import dashboardCss from "../../styles/dashboard.css?url";

export function links() {
  return [{ rel: "stylesheet", href: dashboardCss }];
}

const DASHBOARD = DASHBOARDS.find((d) => d.key === "persiapan");

export function meta() {
  return [{ title: DASHBOARD.title }];
}

export default function PersiapanLayout() {
  return <Gate dashboard={DASHBOARD}>{(session) => <Shell session={session} />}</Gate>;
}

// laporan & subbagian di dalam satu bagian; subbagian bisa dibuka-tutup
function NavItems({ items, session }) {
  return items.map((it) => (it.report ? (
    <NavItem key={it.report.id} session={session} to={reportPath(it.report.id)}>
      <Icon name="trend" /><span className="nav-txt nav-txt-2" title={it.report.title}>{it.report.title}</span>
    </NavItem>
  ) : <NavFolder key={it.group.key} group={it.group} session={session} />));
}

function NavFolder({ group, session }) {
  const { pathname } = useLocation();
  const holdsActive = flattenReports(group).some((r) => pathname.endsWith(reportPath(r.id)));
  // subbagian terbuka sejak awal agar semua laporan terlihat; bisa ditutup dengan klik.
  // Membuka laporan di dalamnya (mis. dari tautan) membuka subbagiannya lagi.
  const [open, setOpen] = useState(true);
  useEffect(() => { if (holdsActive) setOpen(true); }, [holdsActive]);
  const id = "nav-folder-" + group.key.replace(/[^a-z0-9]+/gi, "-");
  return (
    <div className={"nav-folder" + (open ? " open" : "")}>
      <button type="button" className={"nav-item nav-folder-btn" + (holdsActive && !open ? " holds-active" : "")}
        aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <Icon name="right" className="nav-chev" /><span className="nav-txt nav-txt-2" title={group.name}>{group.name}</span>
      </button>
      {open && <div className="nav-sub" id={id}><NavItems items={group.items} session={session} /></div>}
    </div>
  );
}

function Shell({ session }) {
  const { reports, error } = useReports();
  return (
    <AppShell session={session} dashboard={DASHBOARD}
      nav={(
        <>
          {!reports && !error && <div className="nav-note">Memuat laporan…</div>}
          {reports && !reports.length && <div className="nav-note">Belum ada laporan.</div>}
          {buildTree(reports).items.map(({ group }) => (
            <div key={group.key} className="nav-group">
              <div className="nav-label">{group.name}</div>
              <NavItems items={group.items} session={session} />
            </div>
          ))}
          <div className="nav-label">Pengaturan</div>
          <NavItem session={session} area="reports" to="/pendidikan-persiapan/kelola"><Icon name="layers" />Kelola laporan</NavItem>
          <div className="nav-group">
            <div className="nav-label">Pembinaan Karakter TPB</div>
            <NavItem session={session} to={KARAKTER_BASE} end><Icon name="home" /><span className="nav-txt">Beranda program</span></NavItem>
            {KARAKTER_PROGRAMS.map((p) => [
              <NavItem key={p.key} session={session} to={`${KARAKTER_BASE}/${p.key}`}><Icon name={p.icon} /><span className="nav-txt">{p.no}. {p.short}</span></NavItem>,
              // Mapping Banner bagian dari Kampanye Etika Mahasiswa
              p.key === "kampanye" && <NavItem key="mapping" session={session} to={`${KARAKTER_BASE}/mapping`}><Icon name="pin" /><span className="nav-txt">Mapping Banner</span></NavItem>,
            ])}
            <NavItem session={session} to={`${KARAKTER_BASE}/dokumentasi`}><Icon name="folder" /><span className="nav-txt">Dokumentasi Kegiatan</span></NavItem>
          </div>
        </>
      )}
      profile={(
        <div><dt>Hak ubah</dt><dd>{canManageReports(session) ? "Melihat dan mengelola laporan" : "Hanya melihat laporan"}</dd></div>
      )} />
  );
}
