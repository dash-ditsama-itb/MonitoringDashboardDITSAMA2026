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
  return <Gate>{(session) => <Shell session={session} />}</Gate>;
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
  return (
    <Folder name={group.name} id={group.key} holdsActive={holdsActive}>
      <NavItems items={group.items} session={session} />
    </Folder>
  );
}

// kelompok menu yang bisa dibuka-tutup (panah). Terbuka sejak awal agar semua menu terlihat;
// membuka halaman di dalamnya (mis. dari tautan) membuka kelompoknya lagi. top: kelompok utama (tulisan lebih besar & tebal)
function Folder({ name, id: key, holdsActive, top, children }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { if (holdsActive) setOpen(true); }, [holdsActive]);
  const id = "nav-folder-" + key.replace(/[^a-z0-9]+/gi, "-");
  return (
    <div className={"nav-folder" + (open ? " open" : "")}>
      <button type="button" className={"nav-item nav-folder-btn" + (top ? " nav-folder-top" : "") + (holdsActive && !open ? " holds-active" : "")}
        aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <Icon name="right" className="nav-chev" /><span className="nav-txt nav-txt-2" title={name}>{name}</span>
      </button>
      {open && <div className="nav-sub" id={id}>{children}</div>}
    </div>
  );
}

// menu Pembinaan Karakter TPB; Mapping Banner bagian dari Kampanye Etika Mahasiswa
const KARAKTER_NAV = [
  { to: KARAKTER_BASE, label: "Beranda program", end: true },
  ...KARAKTER_PROGRAMS.flatMap((p) => [
    { to: `${KARAKTER_BASE}/${p.key}`, label: p.short },
    ...(p.key === "kampanye" ? [{ to: `${KARAKTER_BASE}/mapping`, label: "Mapping Banner", sub: true }] : []),
  ]),
  { to: `${KARAKTER_BASE}/dokumentasi`, label: "Dokumentasi Kegiatan" },
];

const navLink = (session, { to, label, end }) => (
  <NavItem key={to} session={session} to={to} end={end}><Icon name="trend" /><span className="nav-txt nav-txt-2" title={label}>{label}</span></NavItem>
);

function Shell({ session }) {
  const { pathname } = useLocation();
  const { reports, error } = useReports();
  const tree = buildTree(reports).items;
  // satu bagian laporan (Layanan): isinya langsung di kelompok Data TPB; lebih dari satu: tiap bagian jadi subkelompok
  const reportItems = tree.length === 1 ? tree[0].group.items : tree;
  return (
    <AppShell session={session} dashboard={DASHBOARD}
      nav={(
        <>
          <div className="nav-label">Layanan</div>
          <Folder top name="Data Tahap Persiapan Bersama" id="data-tpb"
            holdsActive={pathname.includes("/pendidikan-persiapan/laporan/") || pathname.endsWith("/pendidikan-persiapan/kelola")}>
            {!reports && !error && <div className="nav-note">Memuat laporan…</div>}
            {reports && !reports.length && <div className="nav-note">Belum ada laporan.</div>}
            <NavItems items={reportItems} session={session} />
            <NavItem session={session} area="reports" to="/pendidikan-persiapan/kelola"><Icon name="layers" /><span className="nav-txt nav-txt-2">Kelola laporan</span></NavItem>
          </Folder>
          <Folder top name="Pembinaan Karakter TPB" id="karakter" holdsActive={pathname.includes(KARAKTER_BASE)}>
            {KARAKTER_NAV.map((it) => (it.sub ? <div key={it.to} className="nav-sub">{navLink(session, it)}</div> : navLink(session, it)))}
          </Folder>
        </>
      )}
      profile={(
        <div><dt>Hak ubah</dt><dd>{canManageReports(session) ? "Melihat dan mengelola laporan" : "Hanya melihat laporan"}</dd></div>
      )} />
  );
}
