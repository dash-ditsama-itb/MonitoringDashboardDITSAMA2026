// Ringkasan kelas luring & daring SUGT dari aplikasi SUGT (GET /dashboard/sugt dan field `sugt` di GET /dashboard).
// Kegiatan SUGT lainnya dicatat di dashboard ini seperti program lain.
import { SUGT_PIC, SUGT_URL } from "../config.js";
import { fmtDateTime, fmtNum, fmtRelative, pct } from "../lib/format.js";
import { useApi } from "../stores/data.js";
import { Icon } from "./Icon.jsx";
import { InfoTip } from "./InfoTip.jsx";
import { Performance } from "./ProgressSummary.jsx";
import { Bar, EmptyState, ErrorNote, Pending, RefreshButton, SkeletonCard } from "./ui.jsx";

// kegiatan SUGT = 10 per sekolah (8 sesi + pretest + posttest)
export const sugtUnits = (s) => s.progress.kegiatanTerlaksana;
export const isSugtDone = (s) => !!s && sugtUnits(s).total > 0 && sugtUnits(s).completed === sugtUnits(s).total;

// status program: [label, nada pill], sama dengan programStatus program lain
export function sugtStatus(s) {
  if (isSugtDone(s)) return ["Selesai", "ok"];
  if (sugtUnits(s).completed > 0) return ["Sedang berlangsung", ""];
  return ["Belum dilaksanakan", "idle"];
}

export const sugtTone = (v) => (v >= 80 ? "ok" : v >= 50 ? "" : "warn");

// tautan "Lihat detail" ke aplikasi SUGT (tab baru)
export function DetailLink({ href, children = "Lihat detail" }) {
  return (
    <a className="link-btn" href={href} target="_blank" rel="noopener noreferrer">
      {children}<Icon name="external" size={13} />
    </a>
  );
}

const METERS = [
  ["offline", "Sesi Luring", "delivered", "terlaksana", "building", "sugtOffline"],
  ["online", "Sesi Daring", "delivered", "terlaksana", "layers", "sugtOnline"],
  ["pretest", "Pretest", "completed", "terisi", "clipboard", "sugtPretest"],
  ["posttest", "Posttest", "completed", "terisi", "checkCircle", "sugtPosttest"],
];

/** Empat capaian SUGT: sesi luring, sesi daring, pretest, posttest. */
export function SugtMeters({ s, links }) {
  return (
    <div className="kpi-row sugt-meters">
      {METERS.map(([k, label, field, verb, icon, info]) => {
        const m = s.sessions[k];
        const p = pct(m[field], m.total);
        return (
          <div className="kpi" key={k}>
            <div className="kpi-lab"><Icon name={icon} size={15} />{label}<InfoTip k={info} /></div>
            <div className="kpi-val">{p}%</div>
            <Bar value={p} tone={sugtTone(p)} />
            <div className="kpi-hint">{fmtNum(m[field])} dari {fmtNum(m.total)} {verb}</div>
            {links && <DetailLink href={m.detailUrl} />}
          </div>
        );
      })}
    </div>
  );
}

// rata-rata penilaian 1–10; null = belum ada penilaian (tampil "—", bukan 0)
export function RatingList({ items }) {
  return (
    <ul className="perf rating">
      {items.map(([label, v, note]) => (
        <li key={label}>
          <span className="perf-lab">{label}{v == null && <small>{note || "belum ada penilaian"}</small>}</span>
          <Bar value={v == null ? 0 : v * 10} tone={v == null ? "" : v >= 8 ? "ok" : v >= 6 ? "warn" : "crit"} />
          <b className={"perf-val" + (v == null ? " muted" : "")}>{v == null ? "—" : v.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b>
        </li>
      ))}
    </ul>
  );
}

export const participantRatings = (f) => [
  ["Narasumber", f.narasumber],
  ["Materi", f.materi],
  ["Relevansi", f.relevansi],
  ["Hands-on RBL", f.handsOnRbl, "belum ada penilaian (hanya kelas siswa)"],
];
export const perjadinRatings = (f) => [
  ["Penginapan", f.penginapan],
  ["Transportasi", f.transportasi],
  ["Konsumsi", f.konsumsi],
  ["Ketepatan Waktu", f.ketepatanWaktu],
  ["Bantuan Pendamping", f.bantuanPendamping, "belum ada penilaian (hanya narasumber & pimpinan)"],
];

// rata-rata aspek yang sudah dinilai (skala 1–10); null bila belum ada
const meanOf = (vals) => {
  const v = vals.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** Umpan balik SUGT (%): (rata-rata Umpan Balik Peserta + rata-rata Evaluasi Perjalanan Dinas) ÷ 2, skala 1–10 → ×10. */
export function sugtFeedback(s) {
  if (!s) return null;
  const parts = [
    meanOf(participantRatings(s.participantFeedback).map(([, v]) => v)),
    meanOf(perjadinRatings(s.perjadinFeedback).map(([, v]) => v)),
  ].filter((v) => v != null);
  return parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) : null;
}

// rata-rata persen yang sudah terisi (> 0); null bila belum ada
const meanPct = (vals) => {
  const v = vals.filter((x) => x > 0);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};

/** Umpan Balik SUGT = rata-rata umpan balik aktivitas di dashboard ini dan umpan balik dari aplikasi SUGT. */
export const withSugtFeedback = (strip, s) => ({ ...strip, feedback: meanPct([strip?.feedback, sugtFeedback(s)]) ?? 0 });

/** Baris SUGT di Kinerja Portofolio Program: aktivitas di dashboard ini + Kegiatan Terlaksana di aplikasi SUGT. */
export function withSugt(p, s) {
  const pics = [...new Set([...p.pics, SUGT_PIC])];
  if (!s) return { ...p, pics };
  const u = sugtUnits(s);
  return {
    ...p, pics,
    completedActivities: p.completedActivities + u.completed,
    totalActivities: p.totalActivities + u.total,
    performance: meanPct([p.totalActivities ? p.performance : null, sugtFeedback(s)]),
    performanceStrip: withSugtFeedback(p.performanceStrip, s),
  };
}

/** Kelas luring & daring dari aplikasi SUGT; tampil di dashboard SUGT dan Portofolio Program (filter Program = SUGT). */
export function SugtSummary() {
  const { data, error, loading, reload } = useApi("/dashboard/sugt");
  const s = data?.data;
  const home = s?.progress.detailUrl || SUGT_URL;

  return (
    <>
      <div className="sugt-head">
        <div>
          <h2 className="sugt-title">Kelas luring &amp; daring dari aplikasi SUGT</h2>
          <div className="card-sub">{s
            ? <span title={fmtDateTime(s.generatedAt)}>Data diperbarui {fmtRelative(s.generatedAt)} · tidak ikut filter</span>
            : "Sesi kelas, pretest, posttest, dan umpan balik dicatat di aplikasi SUGT"}</div>
        </div>
        <div className="sugt-actions">
          <RefreshButton reload={reload} className="btn btn-sm" />
          <a className="btn btn-sm" href={home} target="_blank" rel="noopener noreferrer"><Icon name="external" size={15} />Buka detail web SUGT</a>
        </div>
      </div>
      <ErrorNote error={error} onRetry={() => reload()} />
      {!s ? (
        error ? (
          <section className="card">
            <EmptyState icon="alert" title="Ringkasan kelas SUGT belum bisa ditampilkan">
              Data lengkap tetap bisa dilihat langsung di aplikasi SUGT.
            </EmptyState>
          </section>
        ) : <><SkeletonCard lines={3} /><div className="grid g-2"><SkeletonCard /><SkeletonCard /></div></>
      ) : (
        <Pending busy={loading}>
          <SugtProgress s={s} />
          <SugtMeters s={s} links />
          <Performance title="Umpan balik kelas SUGT" strip={{ feedback: sugtFeedback(s) }}
            sub="Dari aplikasi SUGT · tekan (i) untuk cara hitungnya"
            info={{ feedback: "sugtFeedback" }} empty="belum tersedia dari aplikasi SUGT" />
          <div className="grid g-2">
            <FeedbackCard title="Umpan Balik Peserta" info="sugtParticipantFeedback" f={s.participantFeedback}
              noun="formulir" items={participantRatings(s.participantFeedback)} />
            <FeedbackCard title="Evaluasi Perjalanan Dinas" info="sugtPerjadinFeedback" f={s.perjadinFeedback}
              noun="evaluasi" items={perjadinRatings(s.perjadinFeedback)} />
          </div>
        </Pending>
      )}
    </>
  );
}

function SugtProgress({ s }) {
  const u = sugtUnits(s);
  const [label, tone] = sugtStatus(s);
  const schools = Math.round(u.total / 10);
  const { offline, online } = s.sessions;
  const sessions = { delivered: offline.delivered + online.delivered, total: offline.total + online.total };
  return (
    <section className="card progress-card sugt-progress">
      <div className="pc-progress">
        <span className="kpi-lab"><Icon name="trend" size={15} />Kegiatan Terlaksana<InfoTip k="sugtProgress" /></span>
        <div className="pc-valrow"><b className="pc-val">{fmtNum(u.completed)}/{fmtNum(u.total)}</b><span className="pc-unit">kegiatan ({u.percent}%)</span>
          <span className={"pill pc-status " + tone}>{label}</span></div>
        <Bar value={u.percent} tone={sugtTone(u.percent)} />
        <span className="pc-note">Per sekolah: 8 sesi, 1 pretest, 1 posttest</span>
      </div>
      <dl className="sugt-facts">
        <div><dt>Sekolah</dt><dd>{fmtNum(schools)}</dd></div>
        <div><dt>Sesi terlaksana</dt><dd>{fmtNum(sessions.delivered)}<span className="muted">/{fmtNum(sessions.total)}</span></dd></div>
        <div><dt>Respons peserta</dt><dd>{fmtNum(s.participantFeedback.responseCount)}</dd></div>
        <div><dt>Evaluasi perjadin</dt><dd>{fmtNum(s.perjadinFeedback.responseCount)}</dd></div>
      </dl>
    </section>
  );
}

function FeedbackCard({ title, info, f, noun, items }) {
  return (
    <section className="card">
      <div className="card-head">
        <div><h2 className="card-title with-info">{title}<InfoTip k={info} /></h2>
          <div className="card-sub">{f.responseCount ? `Rata-rata dari ${fmtNum(f.responseCount)} ${noun} · skala 1–10` : `Belum ada ${noun} yang masuk`}</div></div>
        <DetailLink href={f.detailUrl} />
      </div>
      <RatingList items={items} />
    </section>
  );
}
