import { AppShell, Gate, NavItem } from "../../components/AppShell.jsx";
import { Icon } from "../../components/Icon.jsx";
import { groupBySection, reportPath, useReports } from "../../components/Reports.jsx";
import { DASHBOARDS } from "../../config.js";
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
        </>
      )}
      profile={(
        <div><dt>Hak ubah</dt><dd>{canManageReports(session) ? "Melihat dan mengelola laporan" : "Hanya melihat laporan"}</dd></div>
      )} />
  );
}
