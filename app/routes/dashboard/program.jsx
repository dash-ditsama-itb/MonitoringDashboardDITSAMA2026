import { useState } from "react";
import { data } from "react-router";
import { RequireAccess } from "../../components/Access.jsx";
import { ActivitiesTable, useActivityActions } from "../../components/Activities.jsx";
import { ActivityForm } from "../../components/ActivityForm.jsx";
import { Gantt } from "../../components/Gantt.jsx";
import { Icon } from "../../components/Icon.jsx";
import { InfoTip } from "../../components/InfoTip.jsx";
import { lastPerformed, ProgramProgress } from "../../components/ProgressSummary.jsx";
import { ErrorNote, PageHead, ProgramAbout, Refreshing, SkeletonCard } from "../../components/ui.jsx";
import { canEditActivity, fmtDate, phaseLabel, programByKey, PROG_COLORS } from "../../lib/format.js";
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
  return <RequireAccess area="activities" page="Dashboard program"><ProgramPage loaderData={loaderData} /></RequireAccess>;
}

function ProgramPage({ loaderData }) {
  const { program } = loaderData;
  const { data: res, error, loading, reload } = useApi("/dashboard/activity/program/" + program.api);
  const d = res?.data;

  return (
    <div className="page">
      <PageHead title={<>{program.fullName}<span className="title-abbr">{program.label}</span></>}>
        {loading && d && <Refreshing />}
      </PageHead>
      <ErrorNote error={error} onRetry={() => reload()} />
      <ProgramAbout program={program} />
      {!d ? <><div className="grid g-2"><SkeletonCard /><SkeletonCard /></div></> : (
        <>
          <ProgramProgress program={program} kpi={d.kpi} last={lastPerformed(d.activities)} />
          {program.api === "sugt" && <SugtSummary />}
          <div className="grid g-2">
            <MilestoneCard title="Sedang Berlangsung" info="ongoing" tone="red" items={d.milestones.ongoing} program={program}
              empty="Tidak ada kegiatan dalam rentang H-2 sampai H+7." />
            <MilestoneCard title="Agenda Mendatang" info="upcoming" tone="yellow" items={d.milestones.upcoming} program={program}
              empty="Belum ada agenda. Tambahkan lewat Data Kegiatan dengan jenis “Agenda mendatang”." />
          </div>
          <section className="card">
            <div className="card-head"><div><h2 className="card-title with-info">Linimasa fase kegiatan<InfoTip k="timeline" /></h2><div className="card-sub">Rentang tanggal tiap fase program ini</div></div></div>
            <Gantt rows={d.timeline.map((t) => ({
              key: t.phase, label: phaseLabel(t.phase), color: phaseColor(t.phase), start: t.startDate, end: t.endDate, count: t.activityCount,
            }))} />
          </section>
        </>
      )}
      <RekapPeserta program={program.api} programLabel={program.label} />
      <ActivitiesTable fixedProgram={program.api} title={"Kegiatan " + program.label} />
    </div>
  );
}

// daftar kegiatan Berlangsung / Agenda + tombol Isi data / Selesai / Hapus
function MilestoneCard({ title, info, tone, items, program, empty }) {
  const session = useAuthStore((s) => s.session);
  const can = canEditActivity(session, program.api);
  const actions = useActivityActions();
  const [form, setForm] = useState(null);
  return (
    <section className="card">
      <div className="card-head">
        <div className="card-title-row"><h2 className="card-title with-info">{title}<InfoTip k={info} /></h2><span className={"nav-badge " + tone}>{items.length}</span></div>
      </div>
      {!items.length ? <div className="empty-inline">{empty}</div> : (
        <ul className="ms-list">
          {items.map((a) => (
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
      <ActivityForm open={!!form} activity={form} defaultProgram={program.api} initialMode="ongoing" onClose={() => setForm(null)} />
    </section>
  );
}
