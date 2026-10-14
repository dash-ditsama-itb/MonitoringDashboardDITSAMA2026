// Ringkasan program SUGT (dari GET /dashboard/sugt dan field `sugt` di GET /dashboard).
import { Link } from "react-router";
import { fmtNum, pct } from "../lib/format.js";
import { Icon } from "./Icon.jsx";
import { InfoTip } from "./InfoTip.jsx";
import { Bar } from "./ui.jsx";

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

/** Kartu ringkas SUGT di Portofolio Program (semua program). */
export function SugtSummaryCard({ s }) {
  if (!s) {
    return (
      <section className="card sugt-card">
        <div className="card-head"><div><h2 className="card-title">SUGT</h2>
          <div className="card-sub">Data SUGT tidak dapat dimuat saat ini, sehingga belum ikut dihitung di Program Selesai.</div></div>
          <Link className="btn btn-sm" to="/dashboard/sugt">Buka dashboard SUGT<Icon name="right" size={15} /></Link>
        </div>
      </section>
    );
  }
  const u = sugtUnits(s);
  const f = s.participantFeedback;
  const avg = [f.narasumber, f.materi, f.relevansi, f.handsOnRbl].filter((v) => v != null);
  const mean = avg.length ? Math.round((avg.reduce((a, b) => a + b, 0) / avg.length) * 10) / 10 : null;
  return (
    <section className="card sugt-card">
      <div className="card-head">
        <div><h2 className="card-title with-info">SUGT<InfoTip k="sugtProgress" /></h2>
          <div className="card-sub">{fmtNum(u.completed)} dari {fmtNum(u.total)} kegiatan terlaksana ({u.percent}%)
            {mean != null && <> · umpan balik peserta rata-rata {mean.toLocaleString("id-ID", { minimumFractionDigits: 1 })}/10</>}</div></div>
        <Link className="btn btn-sm" to="/dashboard/sugt">Lihat dashboard SUGT<Icon name="right" size={15} /></Link>
      </div>
      <SugtMeters s={s} />
    </section>
  );
}
