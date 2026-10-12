import { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router";
import { Calendar } from "../../components/Calendar.jsx";
import { ChartCanvas } from "../../components/ChartCanvas.jsx";
import { Gantt } from "../../components/Gantt.jsx";
import { Icon } from "../../components/Icon.jsx";
import { InfoTip } from "../../components/InfoTip.jsx";
import {
  isProgramDone, lastPerformed, ProgramProgress, programStatus, ProgressSummary,
} from "../../components/ProgressSummary.jsx";
import {
  Bar, EmptyState, ErrorNote, LevelBadge, PageHead, ProgramAbout, ProgramLink, SeeMore, Sheet, SkeletonCard,
} from "../../components/ui.jsx";
import { PROGRAMS, TOTAL_PROGRAMS } from "../../config.js";
import { canSeeActivities, fmtDate, fmtNum, pct, phaseLabel, progColor, withoutAll } from "../../lib/format.js";
import { useAuthStore } from "../../stores/auth.js";
import { useApi } from "../../stores/data.js";
import { useUiStore } from "../../stores/ui.js";

// layout menampilkan panel Filter untuk route ini
export const handle = { control: true };

export default function Portfolio() {
  // halaman awal dashboard; Finance langsung diarahkan ke Keuangan
  const session = useAuthStore((s) => s.session);
  return canSeeActivities(session) ? <PortfolioPage /> : <Navigate to="/dashboard/financial" replace />;
}

function PortfolioPage() {
  const dash = useUiStore((s) => s.dash);
  const { data, error, loading, reload, fresh } = useApi("/dashboard", withoutAll(dash));
  const d = data?.data;
  // kegiatan terakhir dari kalender (sudah ikut filter); data lengkapnya (peserta, nilai, isu) diambil terpisah
  const lastEvent = useMemo(() => lastPerformed(d?.calendar || []), [d]);
  const { data: hit } = useApi("/activities", lastEvent ? { programs: [lastEvent.program], search: lastEvent.name, perPage: 10 } : {},
    { enabled: !!lastEvent });
  const full = lastEvent && hit?.data?.find((a) => a.id === lastEvent.id);
  const last = full ? { ...full, status: lastEvent.status } : lastEvent;
  const program = PROGRAMS.find((p) => p.label === dash.program);
  // program milik data yang sedang tampil: saat filter berganti, angka lama tidak diberi label program baru
  const dataProgram = useRef(program);
  if (fresh) dataProgram.current = program;
  const shown = dataProgram.current;
  const filters = Object.entries(dash).filter(([, v]) => v !== "Semua").map(([, v]) => v);

  return (
    <div className="page">
      <PageHead title={program ? program.fullName : "Portofolio Program"}
        sub={filters.length ? "Filter: " + filters.join(" · ") : "Semua program DITSAMA 2026"}>
        {loading && d && <span className="tb-loading"><Icon name="spinner" size={14} className="spin" />Memperbarui…</span>}
      </PageHead>
      <ProgramLink program={program} />
      <ErrorNote error={error} onRetry={() => reload()} />
      {program && <ProgramAbout program={program} />}
      {!d ? <PortfolioSkeleton /> : (
        <>
          <Progress kpi={d.kpi} portfolio={d.portfolio} program={shown} last={last} />

          <div className="grid g-5-7">
            <Performance strip={d.performanceStrip} title={"Performa kegiatan " + (shown ? shown.label : "semua program")} />
            <PortfolioList items={d.portfolio} program={shown} />
          </div>

          <div className="grid g-2">
            <Issues items={d.issues} />
            <Milestones items={d.milestones} calendar={d.calendar} />
          </div>

          <ParticipantAnalysis a={d.participantAnalysis} />
          <Capaian cap={d.capaian} />

          <div className="grid g-2">
            <Sdm sdm={d.sdmMitra.sdm} total={d.sdmMitra.totalSdm} />
            <Mitra items={d.sdmMitra.mitra} />
          </div>

          <section className="card">
            <div className="card-head"><div><h2 className="card-title with-info">Linimasa fase kegiatan<InfoTip k="timeline" /></h2>
              <div className="card-sub">Rentang tanggal tiap fase per program (ikut filter program &amp; bulan)</div></div></div>
            <Gantt
              rows={d.timeline.flatMap((t) => t.phases.map((ph) => ({
                key: t.program + ph.phase, label: `${t.programLabel} · ${phaseLabel(ph.phase)}`, color: progColor(t.program),
                start: ph.startDate, end: ph.endDate, count: ph.count,
              })))}
              legend={d.timeline.map((t) => ({ label: t.programLabel, color: progColor(t.program) }))} />
          </section>

          <Calendar events={d.calendar} />
        </>
      )}
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <>
      <SkeletonCard lines={3} />
      <div className="grid g-5-7"><SkeletonCard lines={5} /><SkeletonCard lines={5} /></div>
      <div className="grid g-2"><SkeletonCard /><SkeletonCard /></div>
    </>
  );
}

// semua program: jumlah program selesai / total program; satu program: aktivitas selesai / total aktivitasnya
function Progress({ kpi, portfolio, program, last }) {
  if (program) return <ProgramProgress program={program} kpi={kpi} last={last} showProgram />;
  const note = kpi.totalActivities
    ? `${fmtNum(kpi.totalDone)} dari ${fmtNum(kpi.totalActivities)} total aktivitas program selesai (${kpi.progress}%)`
    : "Belum ada aktivitas tercatat";
  const done = portfolio.filter(isProgramDone).length;
  const p = pct(done, TOTAL_PROGRAMS);
  return <ProgressSummary label="Program Selesai" info="progress" kpi={kpi} progress={p}
    value={`${done}/${TOTAL_PROGRAMS}`} unit={`program (${p}%)`} note={note} last={last} showProgram />;
}

const PERF = [
  ["achievementValue", "Nilai Capaian Peserta", "target"],
  ["attendancePercentage", "Performa Kehadiran Peserta", "userCheck"],
  ["activityProgress", "Performa Keberjalanan Aktivitas", "trend"],
  ["feedback", "Umpan Balik Peserta", "message"],
  ["issueAlert", "Nilai Isu & Peringatan", "alert"],
];
function Performance({ strip, title }) {
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">{title}</h2><div className="card-sub">Rata-rata seluruh kegiatan sesuai filter · tekan (i) untuk cara hitungnya</div></div></div>
      <ul className="perf">
        {PERF.map(([k, label, icon]) => {
          const v = strip[k];
          return (
            <li key={k}>
              <span className="perf-ic"><Icon name={icon} size={16} /></span>
              <span className="perf-lab">{label}<InfoTip k={k} />{!v && <small>belum ada kegiatan yang mengisi</small>}</span>
              <Bar value={v} tone={!v ? "" : v < 60 ? "crit" : v < 80 ? "warn" : "ok"} />
              <b className={"perf-val" + (v ? "" : " muted")}>{v}%</b>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PortfolioList({ items, program }) {
  // tampilkan semua program monitoring (yang belum punya aktivitas tetap muncul), atau hanya program terpilih
  const rows = (program ? [program] : PROGRAMS).map((pr) => ({
    pics: [], completedActivities: 0, ongoingActivities: 0, totalActivities: 0,
    ...items.find((x) => x.program === pr.api), program: pr.api, label: pr.label,
  }));
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Kinerja Portofolio Program</h2>
        <div className="card-sub">Progres = aktivitas selesai / total aktivitas · Performa = rata-rata indikator performa program</div></div></div>
      <ul className="port">
        <li className="port-head">
          <span />
          <span>Program</span>
          <span className="port-cnt">Selesai / Total<InfoTip k="completedTotal" /></span>
          <span>Progres<InfoTip k="programPercent" /></span>
          <span className="port-st">Status<InfoTip k="status" /></span>
          <span>Performa<InfoTip k="programPerformance" /></span>
        </li>
        {rows.map((p) => {
          const [label, tone] = programStatus(p);
          const prog = pct(p.completedActivities, p.totalActivities);
          const perf = p.totalActivities ? p.performance ?? null : null;
          return (
            <li key={p.program}>
              <span className="port-dot" style={{ background: progColor(p.program) }} />
              <div className="port-nm"><b>{p.label}</b><small>{p.pics.length ? "PIC: " + p.pics.join(", ") : "Belum ada PIC"}</small></div>
              <div className="port-cnt" title={`${p.completedActivities} selesai dari ${p.totalActivities} aktivitas`}>{p.completedActivities}<span className="muted">/{p.totalActivities}</span></div>
              <div className="port-score"><Bar value={prog} tone={tone === "ok" ? "ok" : ""} />
                <b>{p.totalActivities ? prog + "%" : <span className="muted" title="Belum ada aktivitas">–</span>}</b></div>
              <span className={"pill " + tone}>{label}</span>
              <div className="port-perf"><small>Performa</small>
                <Bar value={perf} tone={perf == null ? "" : perf < 60 ? "crit" : perf < 80 ? "warn" : "ok"} />
                <b>{perf == null ? <span className="muted" title="Belum ada indikator terisi">–</span> : perf + "%"}</b></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Issues({ items }) {
  const [open, setOpen] = useState(null);
  const counts = items.reduce((c, i) => ({ ...c, [i.level]: (c[i.level] || 0) + 1 }), {});
  return (
    <section className="card">
      <div className="card-head">
        <div><h2 className="card-title with-info">Isu &amp; Peringatan<InfoTip k="issues" /></h2><div className="card-sub">{items.length ? `${items.length} isu tercatat, terberat di atas` : "Tidak ada isu tercatat"}</div></div>
        <div className="lv-counts">{["high", "medium", "low"].map((l) => counts[l] ? <span key={l} className={"level lv-" + l}>{counts[l]}</span> : null)}</div>
      </div>
      {!items.length ? <EmptyState icon="checkCircle" title="Semua kegiatan berjalan tanpa isu" /> : (
        <SeeMore items={items} limit={4} render={(i) => (
          <button type="button" key={i.id} className={"issue-row lv-" + i.level} onClick={() => setOpen(i)}>
            <span className="issue-txt"><b>{i.name}</b><small>{i.programLabel} · {i.activityName}</small></span>
            <LevelBadge level={i.level} />
          </button>
        )} />
      )}
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name} sub={open && <span className="detail-sub"><span className="ptag">{open.programLabel}</span><LevelBadge level={open.level} /></span>}>
        {open && (
          <dl className="facts">
            <div><dt>Kegiatan</dt><dd>{open.activityName}</dd></div>
            <div><dt>PIC</dt><dd>{open.pic || "–"}</dd></div>
            <div><dt>Dengan pihak</dt><dd>{open.to || "–"}</dd></div>
            <div><dt>Penanganan</dt><dd>{open.problemSolving || "–"}</dd></div>
          </dl>
        )}
      </Sheet>
    </section>
  );
}

// aturan sama dengan dashboard program: agenda berstatus Akan Datang (> H+2); yang masuk H-2 tampil sebagai Berlangsung
function Milestones({ items, calendar }) {
  const statusById = Object.fromEntries(calendar.map((e) => [e.id, e.status]));
  const next = items.filter((m) => statusById[m.id] === "upcoming");
  const past = items.length - next.length;
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title with-info">Agenda Mendatang<InfoTip k="upcoming" /></h2>
        <div className="card-sub">{next.length ? `${next.length} agenda terjadwal` : "Tidak ada agenda terjadwal"}{past > 0 && ` · ${past} agenda sudah berlangsung atau selesai`}</div></div></div>
      {!next.length ? <EmptyState icon="calendar" title="Belum ada agenda ke depan">Agenda dibuat dari Data Kegiatan dengan jenis “Agenda mendatang”.</EmptyState> : (
        <SeeMore items={next} limit={4} render={(m) => {
          const dt = new Date(m.date);
          return (
            <div className="ms" key={m.id}>
              <div className="ms-date"><b>{dt.getDate()}</b><small>{dt.toLocaleDateString("id-ID", { month: "short" })}</small></div>
              <div className="ms-txt"><b>{m.name}</b><small>{m.programLabel} · {fmtDate(m.date, { weekday: "long", year: undefined })}</small></div>
            </div>
          );
        }} />
      )}
    </section>
  );
}

function ParticipantAnalysis({ a }) {
  const per = a.attendancePerActivity.filter((x) => x.registered > 0);
  const chart = useMemo(() => ({
    type: "bar",
    data: {
      labels: per.length ? per.map((x) => (x.activityName.length > 22 ? x.activityName.slice(0, 21) + "…" : x.activityName)) : ["(belum ada data)"],
      datasets: [
        { label: "Terdaftar", data: per.map((x) => x.registered), backgroundColor: "#BCD3EE", borderRadius: 4, maxBarThickness: 26 },
        { label: "Hadir", data: per.map((x) => x.present), backgroundColor: "#3a6db0", borderRadius: 4, maxBarThickness: 26 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", align: "end" },
        tooltip: { callbacks: { title: (items) => per[items[0].dataIndex]?.activityName } },
        zoom: { zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" }, pan: { enabled: true, mode: "x" }, limits: { x: { min: "original", max: "original" } } },
      },
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 50, minRotation: 0 } }, y: { beginAtZero: true } },
    },
  }), [a]);

  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Analisis Peserta</h2><div className="card-sub">Pendaftaran &amp; kehadiran (ikut filter program &amp; bulan)</div></div></div>
      <div className="stat-row">
        <div><span>Jumlah Aktivitas<InfoTip k="totalActivities" /></span><b>{fmtNum(a.totalActivities)}</b></div>
        <div><span>Total Pendaftaran<InfoTip k="totalRegistered" /></span><b>{fmtNum(a.totalRegistered)}</b></div>
        <div><span>Total Kehadiran<InfoTip k="totalPresent" /></span><b>{fmtNum(a.totalPresent)}</b></div>
        <div><span>% Kehadiran (tertimbang)<InfoTip k="weightedAttendance" /></span><b>{a.attendancePercentage}%</b></div>
      </div>
      <div className="grid g-7-5 inner">
        <div>
          <div className="mini-head">Terdaftar vs hadir per kegiatan</div>
          <ChartCanvas config={chart} zoom height={280} />
          <div className="hint">Gulir atau cubit grafik untuk memperbesar, seret untuk menggeser.</div>
        </div>
        <div>
          <div className="mini-head">Per jenis peserta</div>
          {!a.categories.length ? <div className="empty-inline">Belum ada data peserta.</div> : (
            <table className="mini-tbl">
              <thead><tr><th>Jenis</th><th className="num">Terdaftar</th><th className="num">Hadir</th><th className="num">Kehadiran</th></tr></thead>
              <tbody>{a.categories.map((c) => (
                <tr key={c.category}><td>{c.category}</td><td className="num">{fmtNum(c.registered)}</td><td className="num">{fmtNum(c.present)}</td>
                  <td className="num"><span className="att-cell"><Bar value={c.attendancePercentage} />{c.attendancePercentage}%</span></td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

function Capaian({ cap }) {
  const q = useUiStore((s) => s.capSearch);
  const ql = q.trim().toLowerCase();
  const rows = ql ? cap.items.filter((x) => x.names.join(" ").toLowerCase().includes(ql) || x.category.toLowerCase().includes(ql)) : cap.items;
  return (
    <section className="card">
      <div className="card-head">
        <div><h2 className="card-title">Capaian peserta</h2>
          <div className="card-sub">{cap.totalAchievements} capaian · {cap.totalParticipants} peserta (ikut filter program &amp; tahun)</div></div>
        <div className="search compact">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Cari nama / kategori" aria-label="Cari capaian" value={q} onChange={(e) => useUiStore.setState({ capSearch: e.target.value })} />
        </div>
      </div>
      {cap.summary.length > 0 && (
        <div className="medals">{cap.summary.filter((s) => s.count > 0).map((s) => <span key={s.cls} className={"medal " + s.cls}>{s.label}<b>{s.count}</b></span>)}</div>
      )}
      {!rows.length ? <div className="empty-inline">{cap.items.length ? "Tidak ada capaian yang cocok." : "Belum ada data capaian."}</div> : (
        <div className="tbl-scroll"><table className="tbl compact">
          <thead><tr><th className="sm-hide">Program</th><th>Kategori</th><th>Peringkat</th><th>Nama</th><th className="sm-hide">Jenis</th></tr></thead>
          <tbody>{rows.map((x, i) => (
            <tr key={i}><td className="sm-hide">{x.programLabel}</td><td><div className="cell-strong">{x.category || "–"}</div><div className="row-meta sm-only"><span>{x.programLabel}</span><span>{x.type}</span></div></td>
              <td><span className={"medal " + x.rank.cls}>{x.rank.label}</span></td>
              <td className="wrap">{x.names.join(", ")}</td><td className="sm-hide">{x.type}{x.names.length > 1 && <span className="muted"> · {x.names.length} orang</span>}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}

function Sdm({ sdm, total }) {
  const [open, setOpen] = useState(null);
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">SDM terlibat</h2><div className="card-sub">{total} orang berbeda per peran (ikut filter program &amp; bulan)</div></div></div>
      {!sdm.length ? <div className="empty-inline">Belum ada data SDM.</div> : (
        <ul className="sdm-list">
          {sdm.map((s) => (
            <li key={s.position}>
              <button type="button" onClick={() => setOpen(s)}>
                <span>{s.position}</span><Bar value={(s.count / Math.max(...sdm.map((x) => x.count))) * 100} /><b>{s.count}</b><Icon name="right" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `${open.position} · ${open.count} orang` : ""}>
        {open && <ol className="name-list">{open.names.map((n) => <li key={n}>{n}</li>)}</ol>}
      </Sheet>
    </section>
  );
}

function Mitra({ items }) {
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Mitra</h2><div className="card-sub">{items.length} mitra terlibat</div></div></div>
      {!items.length ? <div className="empty-inline">Belum ada data mitra.</div> : (
        <ul className="mitra">
          {items.map((m) => (
            <li key={m.name}>
              <span className="mitra-ava">{m.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
              <span><b>{m.name}</b><small>{m.program}</small></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
