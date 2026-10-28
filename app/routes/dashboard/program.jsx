import { useState } from "react";
import { data } from "react-router";
import { RequireAccess } from "../../components/Access.jsx";
import { ActivitiesTable, useActivityActions } from "../../components/Activities.jsx";
import { ActivityForm } from "../../components/ActivityForm.jsx";
import { Gantt } from "../../components/Gantt.jsx";
import { Icon } from "../../components/Icon.jsx";
import { InfoTip } from "../../components/InfoTip.jsx";
import { lastPerformed, ProgramProgress } from "../../components/ProgressSummary.jsx";
import { ErrorNote, PageHead, PageSkeleton, Pending, ProgramAbout } from "../../components/ui.jsx";
import { activityStatus, canEditActivity, fmtDate, phaseLabel, programByKey, PROG_COLORS } from "../../lib/format.js";
import { RekapPeserta } from "../../components/RekapPeserta.jsx";
import { SugtSummary } from "../../components/Sugt.jsx";
import { PHASES } from "../../config.js";
import { useAuthStore } from "../../stores/auth.js";
import { useApi } from "../../stores/data.js";

export function clientLoader({ params }) {
  const program = programByKey(params.programKey ?? "SUGT");
  if (!program) throw data(`Program "${params.programKey}" tidak dikenal.`, { status: 404 });
  return { program };
}

const phaseColor = (ph) => PROG_COLORS[Math.max(0, PHASES.findIndex(([v]) => v === ph)) % PROG_COLORS.length];

export default function ProgramDashboard({ loaderData }) {
  return <RequireAccess area="activities" page="Dashboard program">
    {/* program lain = halaman baru: dipasang ulang agar data program sebelumnya tidak tampil di bawah judul baru */}
    <ProgramPage key={loaderData.program.key} loaderData={loaderData} />
  </RequireAccess>;
}

function ProgramPage({ loaderData }) {
  const { program } = loaderData;
  const { data: res, error, loading, reload } = useApi("/dashboard/activity/program/" + program.api);
  const d = res?.data;

  return (
    <div className="page">
      <PageHead title={<>{program.fullName}<span className="title-abbr">{program.label}</span></>} />
      <ErrorNote error={error} onRetry={() => reload()} />
      <ProgramAbout program={program} />
      {!d ? <PageSkeleton kpis={0} /> : (
        <Pending busy={loading}>
          <ProgramProgress program={program} kpi={d.kpi} last={lastPerformed(d.activities)} />
          {program.api === "sugt" && <SugtSummary />}
          <div className="grid g-2">
            <MilestoneCard title="Sedang berlangsung" info="ongoing" tone="red" items={d.milestones.ongoing} program={program}
              empty="Tidak ada kegiatan dalam rentang H-2 sampai hari H." />
            <MilestoneCard title="Telat update" info="late" tone="orange" items={d.milestones.late || []} program={program}
              empty="Semua kegiatan yang sudah lewat sudah ditandai selesai." />
          </div>
          <MilestoneCard title="Agenda mendatang" info="upcoming" tone="yellow" items={upcomingOf(d.activities)} program={program}
            empty="Belum ada kegiatan yang tanggalnya lebih dari 2 hari lagi." />
          <section className="card">
            <div className="card-head"><div><h2 className="card-title with-info">Linimasa fase kegiatan<InfoTip k="timeline" /></h2><div className="card-sub">Rentang tanggal tiap fase program ini</div></div></div>
            <Gantt rows={d.timeline.map((t) => ({
              key: t.phase, label: phaseLabel(t.phase), color: phaseColor(t.phase), start: t.startDate, end: t.endDate, count: t.activityCount,
            }))} />
          </section>
        </Pending>
      )}
      <RekapPeserta program={program.api} programLabel={program.label} />
      <ActivitiesTable fixedProgram={program.api} title={"Kegiatan " + program.label} />
    </div>
  );
}

// agenda = semua kegiatan berstatus Akan Datang (tanggal > H+2, atau agenda belum bertanggal), terdekat di atas
const upcomingOf = (activities = []) => activities.filter((a) => activityStatus(a) === "upcoming")
  .sort((a, b) => (a.date ? new Date(a.date) : Infinity) - (b.date ? new Date(b.date) : Infinity));

const MILESTONE_LIMIT = 8; // sisanya lewat "Lihat semua"

// daftar kegiatan Berlangsung / Telat update / Agenda + tombol Isi data / Selesai / Hapus
function MilestoneCard({ title, info, tone, items, program, empty }) {
  const session = useAuthStore((s) => s.session);
  const can = canEditActivity(session, program.api);
  const actions = useActivityActions();
  const [form, setForm] = useState(null);
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, MILESTONE_LIMIT);
  return (
    <section className="card">
      <div className="card-head">
        <div className="card-title-row"><h2 className="card-title with-info">{title}<InfoTip k={info} /></h2><span className={"nav-badge " + tone}>{items.length}</span></div>
      </div>
      {!items.length ? <div className="empty-inline">{empty}</div> : (
        <ul className="ms-list">
          {shown.map((a) => (
            <li key={a.id} className={actions.busyId === a.id ? "busy" : ""}>
              <div className="ms-txt"><b>{a.name}</b>
                <small><Icon name="calendar" size={13} />{a.date ? fmtDate(a.date, { weekday: "short" }) : "Belum dijadwalkan"}{a.phase && " · " + phaseLabel(a.phase)}{a.location && " · " + a.location}</small>
              </div>
              {can && (
                <div className="row-actions">
                  <button type="button" className="btn btn-sm" onClick={() => setForm(a)}><Icon name="pencil" size={15} />Isi data</button>
                  <button type="button" className="icon-btn" title="Tandai selesai" aria-label={"Tandai selesai " + a.name} onClick={() => actions.toggleDone(a)}><Icon name="check" size={16} /></button>
                  <button type="button" className="icon-btn danger" title="Hapus" aria-label={"Hapus " + a.name} onClick={() => actions.remove(a)}><Icon name="trash" size={16} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {items.length > MILESTONE_LIMIT && (
        <button type="button" className="see-more" onClick={() => setAll(!all)}>
          {all ? "Tampilkan lebih sedikit" : `Lihat semua (${items.length})`}<Icon name={all ? "up" : "down"} size={15} />
        </button>
      )}
      <ActivityForm open={!!form} activity={form} defaultProgram={program.api} initialMode="ongoing" onClose={() => setForm(null)} />
    </section>
  );
}
