import { useMemo } from "react";
import { useMatches } from "react-router";
import { useShallow } from "zustand/react/shallow";
import { ACCESS } from "../../components/Access.jsx";
import { AppShell, Gate, NavItem } from "../../components/AppShell.jsx";
import { Icon } from "../../components/Icon.jsx";
import { SUGT_PROGRAM } from "../../components/Sugt.jsx";
import { SelectField, Spinner } from "../../components/ui.jsx";
import { DASHBOARDS, PROGRAMS } from "../../config.js";
import { byLabel, isAllAccess, levelLabel, programByApi, progColor, sortLabels, withoutAll } from "../../lib/format.js";
import { useApi } from "../../stores/data.js";
import { useUiStore } from "../../stores/ui.js";
import dashboardCss from "../../styles/dashboard.css?url";

export function links() {
  return [{ rel: "stylesheet", href: dashboardCss }];
}

const DASHBOARD = DASHBOARDS.find((d) => d.key === "pra");

export function meta() {
  return [{ title: DASHBOARD.title }];
}

// menu "Dashboard program" urut abjad (termasuk SUGT); urutan PROGRAMS tetap karena dipakai untuk warna program
const NAV_PROGRAMS = [
  ...PROGRAMS.map((p) => ({ api: p.api, label: p.label, to: `/dashboard/program/${p.key}` })),
  { api: "sugt", label: "SUGT", to: "/dashboard/sugt" },
].sort(byLabel((p) => p.label));

export default function DashboardLayout() {
  return <Gate dashboard={DASHBOARD}>{(session) => <Shell session={session} />}</Gate>;
}

function Shell({ session }) {
  const ui = useUiStore(useShallow((s) => ({ controlOpen: s.controlOpen, controlHidden: s.controlHidden, set: s.set })));
  const matches = useMatches();
  const withControl = matches.some((m) => m.handle?.control);

  // badge jumlah Berlangsung (merah) & Akan Datang (kuning) per program dari kalender dashboard utama
  const canActivities = ACCESS.activities.can(session);
  const { data } = useApi("/dashboard", {}, { enabled: canActivities });
  const badges = useMemo(() => {
    const out = {};
    (data?.data?.calendar || []).forEach((e) => {
      const b = (out[e.program] = out[e.program] || { on: 0, up: 0 });
      if (e.status === "ongoing") b.on++;
      if (e.status === "upcoming") b.up++;
    });
    return out;
  }, [data]);

  const progs = isAllAccess(session) ? "Semua program" : session.role === "finance" ? "Hanya Keuangan"
    : sortLabels((session.programs || []).map((p) => programByApi(p)?.label || p)).join(", ") || "–";

  return (
    <AppShell session={session} dashboard={DASHBOARD}
      nav={(
        <>
          <NavItem session={session} area="activities" to="/dashboard" end><Icon name="grid" />Portofolio Program</NavItem>
          <NavItem session={session} area="finance" to="/dashboard/financial"><Icon name="wallet" />Keuangan</NavItem>
          <NavItem session={session} area="activities" to="/dashboard/peserta"><Icon name="users" />Peserta</NavItem>
          <NavItem session={session} area="activities" to="/dashboard/dosen"><Icon name="grad" />Portofolio Pengajar</NavItem>
          <NavItem session={session} area="activities" to="/dashboard/input"><Icon name="clipboard" />Data Kegiatan</NavItem>
          <NavItem session={session} area="activities" to="/dashboard/sdm"><Icon name="userCheck" />SDM</NavItem>
          <div className="nav-label">Dashboard program</div>
          {NAV_PROGRAMS.map((p) => {
            const b = badges[p.api];
            return (
              <NavItem key={p.api} session={session} area="activities" to={p.to}>
                <span className="nav-dot" style={{ background: progColor(p.api) }} aria-hidden="true" />
                <span className="nav-txt">{p.label}</span>
                {b?.on > 0 && <span className="nav-badge red" title={`${b.on} kegiatan berlangsung`}>{b.on}</span>}
                {b?.up > 0 && <span className="nav-badge yellow" title={`${b.up} kegiatan akan datang`}>{b.up}</span>}
              </NavItem>
            );
          })}
        </>
      )}
      control={withControl && canActivities && <ControlPanel open={ui.controlOpen} hidden={ui.controlHidden} />}
      topbarEnd={withControl && canActivities && (
        <button className="btn btn-sm topbar-filter" type="button"
          onClick={() => (window.matchMedia("(max-width: 1100px)").matches ? ui.set({ controlOpen: true }) : ui.set({ controlHidden: !ui.controlHidden }))}>
          <Icon name="filter" size={16} />Filter
        </button>
      )}
      profile={(
        <>
          <div><dt>Akses program</dt><dd>{progs}</dd></div>
          <div><dt>Hak ubah</dt><dd>{{
            finance: "Data keuangan",
            pic: "Data kegiatan program Anda (Keuangan tidak tersedia)",
            leader: "Hanya melihat: tidak dapat menambah, mengubah, atau menghapus data",
          }[session.role] || "Semua data kegiatan & keuangan"}</dd></div>
        </>
      )} />
  );
}

// ============== PANEL FILTER (Portofolio Program) ==============
const ALL = "Semua";
function ControlPanel({ open, hidden }) {
  const dash = useUiStore((s) => s.dash);
  const patch = useUiStore((s) => s.patch);
  const set = useUiStore((s) => s.set);
  // SUGT punya data sendiri (tanpa tahun, bulan, fase, kegiatan, isu): filter lain dinonaktifkan
  const isSugt = dash.program === SUGT_PROGRAM;
  const main = useApi("/dashboard", isSugt ? {} : withoutAll(dash));
  const sugt = useApi("/dashboard/sugt", {}, { enabled: isSugt });
  const { loading, reload } = isSugt ? sugt : main;
  const fo = main.data?.data?.filterOptions;
  const programs = sortLabels([...(fo?.programs || []).filter((p) => p !== SUGT_PROGRAM), SUGT_PROGRAM]);
  const opts = (list) => [ALL, ...(list || [])];
  const keep = (list, v) => (v === ALL || (list || []).includes(v) ? v : ALL);
  const active = Object.values(dash).filter((v) => v !== ALL).length;
  const reset = { year: ALL, month: ALL, phase: ALL, activity: ALL, issueLevel: ALL };
  const sel = (key, label, list, fmt) => (
    <SelectField label={label} value={keep(list, dash[key])} options={opts(list).map((o) => [o, fmt && o !== ALL ? fmt(o) : o])}
      disabled={isSugt && key !== "program"}
      onChange={(v) => patch("dash", { [key]: v, ...(key === "program" ? (v === SUGT_PROGRAM ? reset : { activity: ALL }) : {}) })} />
  );
  return (
    <aside className={"control" + (open ? " open" : "") + (hidden ? " hide" : "")} aria-label="Filter dashboard">
      <div className="control-head">
        <span><Icon name="filter" size={17} />Filter{active > 0 && <span className="count">{active}</span>}</span>
        <button className="icon-btn on-dark" type="button" onClick={() => set({ controlOpen: false, controlHidden: !open })} aria-label="Tutup filter"><Icon name="x" size={18} /></button>
      </div>
      <div className="control-body">
        {sel("program", "Program", programs)}
        {isSugt && <p className="control-note">Filter lain tidak berlaku untuk SUGT.</p>}
        {sel("year", "Tahun", fo?.years)}
        {sel("month", "Bulan", fo?.months)}
        {sel("phase", "Fase", fo?.phases)}
        {sel("activity", "Kegiatan", fo?.activities)}
        {sel("issueLevel", "Level isu", fo?.issueLevels, (v) => levelLabel(v.toLowerCase()))}
        <div className="control-actions">
          {active > 0 && <button className="btn btn-sm on-dark" type="button" onClick={() => patch("dash", { program: ALL, year: ALL, month: ALL, phase: ALL, activity: ALL, issueLevel: ALL })}>Reset</button>}
          <button className="btn btn-sm on-dark" type="button" disabled={loading} onClick={() => reload(isSugt ? undefined : { refresh: true })}>
            {loading ? <Spinner size={14} /> : <Icon name="refresh" size={15} />}Muat ulang
          </button>
        </div>
      </div>
    </aside>
  );
}
