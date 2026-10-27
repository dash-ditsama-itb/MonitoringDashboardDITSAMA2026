// Kartu kemajuan: persentase + uraian kegiatan terakhir yang sudah terlaksana.
import { useState } from "react";
import {
  activityStatus, attendance, fmtDate, fmtDateLong, fmtNum, fmtRelative, phaseLabel, programLabel, progressLabel,
} from "../lib/format.js";
import { ActivityDetail } from "./Activities.jsx";
import { Icon } from "./Icon.jsx";
import { InfoTip } from "./InfoTip.jsx";
import { Bar, StatusBadge } from "./ui.jsx";

// kegiatan terakhir yang sudah terlaksana (tanggal hari ini atau sebelumnya, paling baru)
export function lastPerformed(activities) {
  const today = new Date(); today.setHours(23, 59, 59, 999);
  return activities
    .filter((a) => a.date && new Date(a.date) <= today)
    .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

// kalimat ringkas dari data kegiatan: kapan, di mana, kehadiran, nilai, isu
function describe(a) {
  const att = attendance(a.participants);
  const parts = [`Dilaksanakan ${fmtDateLong(a.date)}${a.location ? ` di ${a.location}` : ""}${a.phase ? ` (${phaseLabel(a.phase)})` : ""}.`];
  if (att.reg) parts.push(`Dihadiri ${att.pres.toLocaleString("id-ID")} dari ${att.reg.toLocaleString("id-ID")} peserta terdaftar (${att.pct}%).`);
  const scores = [a.achievementValue != null && `nilai capaian ${a.achievementValue}`, a.feedback != null && `umpan balik ${a.feedback}`].filter(Boolean);
  if (scores.length) parts.push(scores.join(" dan ").replace(/^./, (c) => c.toUpperCase()) + ".");
  if (a.progress) parts.push(`Keberjalanan: ${progressLabel(a.progress)}.`);
  if (a.issues?.length) parts.push(`${a.issues.length} isu tercatat.`);
  return parts.join(" ");
}

/**
 * last: kegiatan lengkap (rincian bisa dibuka) atau ringkasan kalender (tanpa peserta/nilai).
 * info: kunci keterangan (lib/kpi.js); kpi: jumlah kegiatan per status, ditampilkan di keterangan.
 * value/unit/note opsional: angka besar (mis. "3/10") + satuannya + keterangan di bawah bar; default `${progress}%`.
 * status opsional: [label, nada] status program, tampil di samping angka.
 * second opsional: angka kedua di bawahnya { label, value, unit, progress } (mis. Aktivitas Selesai).
 */
export function ProgressSummary({ label, info, progress, value, unit, note, status, second, kpi, last, showProgram }) {
  const [open, setOpen] = useState(false);
  const full = !!last?.participants;
  const name = showProgram ? `${programLabel(last?.program)} — ${last?.name}` : last?.name;
  return (
    <section className="card progress-card">
      <div className="pc-progress">
        <span className="kpi-lab"><Icon name="trend" size={15} />{label}<InfoTip k={info} now={kpi && `Saat ini: ${kpi.totalDone} selesai dari ${kpi.totalActivities} aktivitas (${kpi.totalOngoing} berlangsung, ${kpi.totalUpcoming} akan datang).`} /></span>
        <div className="pc-valrow"><b className="pc-val">{value ?? progress + "%"}</b>{unit && <span className="pc-unit">{unit}</span>}
          {status && <span className={"pill pc-status " + status[1]}>{status[0]}</span>}</div>
        <Bar value={progress} tone={progress >= 80 ? "ok" : progress >= 50 ? "" : "warn"} />
        {note && <span className="pc-note">{note}</span>}
        {second && (
          <div className="pc-second">
            <span className="kpi-lab"><Icon name="checkCircle" size={15} />{second.label}</span>
            <div className="pc-valrow"><b className="pc-val sm">{second.value}</b>{second.unit && <span className="pc-unit">{second.unit}</span>}</div>
            <Bar value={second.progress} tone={second.progress >= 80 ? "ok" : second.progress >= 50 ? "" : "warn"} />
          </div>
        )}
      </div>
      <div className="pc-last">
        <span className="kpi-lab"><Icon name="checkCircle" size={15} />Aktivitas Terakhir<InfoTip k="lastActivity" /></span>
        {!last ? <p className="pc-desc muted">Belum ada aktivitas yang terlaksana.</p> : (
          <>
            <div className="pc-head">
              {full
                ? <button type="button" className="row-link" onClick={() => setOpen(true)}>{name}</button>
                : <b className="pc-name">{name}</b>}
              <StatusBadge status={activityStatus(last)} />
            </div>
            <p className="pc-desc">{describe(last)}</p>
            <div className="row-meta">
              <span title={fmtDate(last.date)}>{fmtRelative(last.date)}</span>
              {last.pic && <span>PIC {last.pic}</span>}
            </div>
          </>
        )}
      </div>
      {full && <ActivityDetail activity={open ? last : null} onClose={() => setOpen(false)} canEdit={false} />}
    </section>
  );
}

// lima indikator performa kegiatan (strip dari backend, nilai 0–100; 0 = belum terisi, tidak ada = tidak tersedia)
export const PERF = [
  ["achievementValue", "Nilai Capaian Peserta", "target"],
  ["attendancePercentage", "Performa Kehadiran Peserta", "userCheck"],
  ["activityProgress", "Performa Keberjalanan Aktivitas", "trend"],
  ["feedback", "Umpan Balik Peserta", "message"],
  ["issueAlert", "Nilai Isu & Peringatan", "alert"],
];

/** Kartu Performa 5 indikator. info: ganti kunci keterangan per indikator, empty: teks indikator kosong. */
export function Performance({ strip, title, sub = "Rata-rata seluruh kegiatan sesuai filter · tekan (i) untuk cara hitungnya",
  info = {}, empty = "belum ada kegiatan yang mengisi" }) {
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">{title}</h2><div className="card-sub">{sub}</div></div></div>
      <ul className="perf">
        {PERF.map(([k, label, icon]) => {
          const v = strip[k];
          return (
            <li key={k}>
              <span className="perf-ic"><Icon name={icon} size={16} /></span>
              <span className="perf-lab">{label}<InfoTip k={info[k] || k} />{!v && <small>{empty}</small>}</span>
              <Bar value={v} tone={!v ? "" : v < 60 ? "crit" : v < 80 ? "warn" : "ok"} />
              <b className={"perf-val" + (v ? "" : " muted")}>{v == null ? "–" : v + "%"}</b>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// program dihitung Selesai bila punya aktivitas dan semuanya Selesai
export const isProgramDone = (p) => p.totalActivities > 0 && p.completedActivities === p.totalActivities;

// status program dari aktivitasnya: [label, nada pill]
export function programStatus(p) {
  if (isProgramDone(p)) return ["Selesai", "ok"];
  if (p.completedActivities > 0 || p.ongoingActivities > 0) return ["Sedang berlangsung", ""];
  return ["Belum dilaksanakan", "idle"];
}

/** Kemajuan satu program (dashboard utama terfilter & dashboard program): aktivitas selesai / total + status program. */
export function ProgramProgress({ program, kpi, last, showProgram }) {
  const note = kpi.totalActivities
    ? `${fmtNum(kpi.totalDone)} dari ${fmtNum(kpi.totalActivities)} total aktivitas program selesai (${kpi.progress}%)`
    : "Belum ada aktivitas tercatat";
  const status = programStatus({ completedActivities: kpi.totalDone, ongoingActivities: kpi.totalOngoing, totalActivities: kpi.totalActivities });
  return <ProgressSummary label={"Kemajuan " + program.label} info="programProgress" kpi={kpi} progress={kpi.progress}
    value={`${kpi.totalDone}/${kpi.totalActivities}`} unit={`aktivitas (${kpi.progress}%)`} note={note} status={status}
    last={last} showProgram={showProgram} />;
}
