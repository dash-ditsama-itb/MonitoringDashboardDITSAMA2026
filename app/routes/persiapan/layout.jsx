import { AppShell, Gate, NavItem } from "../../components/AppShell.jsx";
import { Icon } from "../../components/Icon.jsx";
import { groupBySection, reportPath, useReports } from "../../components/Reports.jsx";
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

function Shell({ session }) {
  const { reports, error } = useReports();
  return (
    <AppShell session={session} dashboard={DASHBOARD}
      nav={(
        <>
          {!reports && !error && <div className="nav-note">Memuat laporan…</div>}
          {reports && !reports.length && <div className="nav-note">Belum ada laporan.</div>}
          {groupBySection(reports).map(([section, items]) => (
            <div key={section} className="nav-group">
              <div className="nav-label">{section}</div>
              {items.map((r) => (
                <NavItem key={r.id} session={session} to={reportPath(r.id)}>
                  <Icon name="trend" /><span className="nav-txt">{r.title}</span>
                </NavItem>
              ))}
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
