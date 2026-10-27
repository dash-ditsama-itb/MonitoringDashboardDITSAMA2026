import { useMemo } from "react";
import { useMatches } from "react-router";
import { useShallow } from "zustand/react/shallow";
import { ACCESS } from "../../components/Access.jsx";
import { AppShell, Gate, NavItem } from "../../components/AppShell.jsx";
import { Icon } from "../../components/Icon.jsx";
import { Refreshing, SelectField } from "../../components/ui.jsx";
import { DASHBOARDS, PROGRAMS } from "../../config.js";
import { byLabel, canEditFinance, canEditHumanResources, canManageUsers, editablePrograms, levelLabel, monthKeyLabel, progColor, sortLabels, withoutAll } from "../../lib/format.js";
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

// menu "Dashboard program" urut abjad; urutan PROGRAMS tetap karena dipakai untuk warna program
const NAV_PROGRAMS = PROGRAMS
  .map((p) => ({ api: p.api, label: p.label, to: p.api === "sugt" ? "/dashboard/sugt" : `/dashboard/program/${p.key}` }))
  .sort(byLabel((p) => p.label));

export default function DashboardLayout() {
  return <Gate>{(session) => <Shell session={session} />}</Gate>;
}

function Shell({ session }) {
  const ui = useUiStore(useShallow((s) => ({ controlOpen: s.controlOpen, controlHidden: s.controlHidden, set: s.set })));
  const activeFilters = useUiStore((s) => activeCount(s.dash));
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

  const mine = editablePrograms(session);
  const writes = [
    mine.length === PROGRAMS.length ? "Kegiatan semua program" : mine.length ? `Kegiatan ${mine.map((p) => p.label).join(", ")}` : "",
    canEditFinance(session) ? "Keuangan" : "",
    canEditHumanResources(session) ? "Daftar SDM & SK" : "",
    canManageUsers(session) ? "Pengaturan Akun" : "",
  ].filter(Boolean);

  // jumlah akun yang menunggu persetujuan (badge menu Pengaturan Akun)
  const users = useApi("/users", {}, { enabled: canManageUsers(session) });
  const pending = (users.data?.data || []).filter((u) => u.status === "pending").length;

  return (
    <AppShell session={session} dashboard={DASHBOARD}
      nav={(
        <>
          <NavItem session={session} area="activities" to="/dashboard" end><Icon name="grid" />Portofolio Program</NavItem>
          <NavItem session={session} area="finance" to="/dashboard/financial"><Icon name="wallet" />Keuangan</NavItem>
          <NavItem session={session} area="activities" to="/dashboard/peserta"><Icon name="users" />Peserta</NavItem>
          <NavItem session={session} area="activities" to="/dashboard/dosen"><Icon name="grad" />Umpan Balik</NavItem>
          <NavItem session={session} area="activities" to="/dashboard/input"><Icon name="clipboard" />Data Kegiatan</NavItem>
          <NavItem session={session} area="activities" to="/dashboard/sdm"><Icon name="userCheck" />SDM</NavItem>
          {canManageUsers(session) && (
            <NavItem session={session} area="accounts" to="/dashboard/pengaturan-akun">
              <Icon name="lock" /><span className="nav-txt">Pengaturan Akun</span>
              {pending > 0 && <span className="nav-badge yellow" title={`${pending} akun menunggu persetujuan`}>{pending}</span>}
            </NavItem>
          )}
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
          {activeFilters > 0 && <span className="count" aria-label={activeFilters + " filter aktif"}>{activeFilters}</span>}
        </button>
      )}
      profile={(
        <>
          <div><dt>Hak ubah</dt><dd>{writes.join(" · ") || "Hanya melihat: tidak dapat menambah, mengubah, atau menghapus data"}</dd></div>
        </>
      )} />
  );
}

// ============== PANEL FILTER (Portofolio Program) ==============
const ALL = "Semua";
const activeCount = (dash) => Object.values(dash).filter((v) => v !== ALL).length;
// Muat ulang ada di judul halaman Portofolio (sama seperti Peserta & Umpan Balik); panel ini hanya filter
function ControlPanel({ open, hidden }) {
  const dash = useUiStore((s) => s.dash);
  const patch = useUiStore((s) => s.patch);
  const set = useUiStore((s) => s.set);
  const busy = useUiStore((s) => s.pending > 0);
  // data yang sama dengan halaman (cache bersama), hanya untuk daftar pilihan
  const fo = useApi("/dashboard", withoutAll(dash)).data?.data?.filterOptions;
  const programs = sortLabels(fo?.programs);
  const keep = (list, v) => (v === ALL || (list || []).includes(v) ? v : ALL);
  const active = activeCount(dash);
  // pilihan pertama selalu "Semua <nama filter>", sama dengan filter di halaman lain
  const sel = (key, label, list, fmt) => (
    <SelectField label={label} value={keep(list, dash[key])}
      options={[[ALL, "Semua " + label.toLowerCase()], ...(list || []).map((o) => [o, fmt ? fmt(o) : o])]}
      onChange={(v) => patch("dash", { [key]: v, ...(key === "program" ? { activity: ALL } : {}) })} />
  );
  return (
    <aside className={"control" + (open ? " open" : "") + (hidden ? " hide" : "")} aria-label="Filter dashboard">
      <div className="control-head">
        <span><Icon name="filter" size={17} />Filter{active > 0 && <span className="count">{active}</span>}</span>
        {busy && <Refreshing />}
        <button className="icon-btn on-dark" type="button" onClick={() => set({ controlOpen: false, controlHidden: !open })} aria-label="Tutup filter"><Icon name="x" size={18} /></button>
      </div>
      <div className="control-body">
        {sel("program", "Program", programs)}
        {sel("year", "Tahun", fo?.years)}
        {sel("month", "Bulan", fo?.months, monthKeyLabel)}
        {sel("phase", "Fase", fo?.phases)}
        {sel("activity", "Kegiatan", fo?.activities)}
        {sel("issueLevel", "Level isu", fo?.issueLevels, (v) => levelLabel(v.toLowerCase()))}
        {active > 0 && (
          <div className="control-actions">
            <button className="btn btn-sm on-dark" type="button" onClick={() => patch("dash", { program: ALL, year: ALL, month: ALL, phase: ALL, activity: ALL, issueLevel: ALL })}>Reset filter</button>
          </div>
        )}
      </div>
    </aside>
  );
}
