// Pembinaan Karakter TPB (dashboard Pendidikan Persiapan): beranda, 3 program, Mapping Banner, Dokumentasi.
// /pendidikan-persiapan/karakter[/ttb|kampanye|mapping|diskusi|dokumentasi]
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, useBlocker, useParams } from "react-router";
import { confirmAction, toast } from "../../components/feedback.jsx";
import { Icon } from "../../components/Icon.jsx";
import { Bar, EmptyState, ErrorNote, Kpi, PageHead, SearchInput, Segmented, Spinner } from "../../components/ui.jsx";
import {
  BANNER_THEMES, CAMPAIGN_BOOK, CAMPUS_MAPS, CAMPAIGN_YEAR, CAMPAIGN_POSTERS, CAMPAIGN_VIDEOS, DISCUSSIONS, DOCUMENTATION, DOCUMENTATION_FOLDER,
  KARAKTER_ABOUT, KARAKTER_BASE, KARAKTER_API_URL, KARAKTER_PROGRAMS, KARAKTER_YEARS, MAPPING_FALLBACK, TTB, TTB_LIVE_YEAR, mappingFallbackItems,
  driveFile, driveFolder, driveThumb, drivePlayer,
} from "../../lib/karakter.js";
import { api } from "../../lib/api.js";
import { canManageReports, fmtNum } from "../../lib/format.js";
import { useAuthStore } from "../../stores/auth.js";
import karakterCss from "../../styles/karakter.css?url";

export function links() {
  return [{ rel: "stylesheet", href: karakterCss }];
}

export function meta() {
  return [{ title: "Pembinaan Karakter TPB — Pendidikan Persiapan DITSAMA" }];
}

const SECTIONS = {
  "": { title: "Pembinaan Karakter TPB", page: Beranda },
  ttb: { title: "Teman Tumbuh Bersama TPB ITB", page: Ttb },
  kampanye: { title: "Kampanye Etika Mahasiswa", page: Kampanye },
  mapping: { title: "Mapping Banner", parent: "kampanye", page: Mapping },
  diskusi: { title: "Diskusi Interaktif", page: Diskusi, noYear: true },
  dokumentasi: { title: "Dokumentasi Kegiatan", page: Dokumentasi },
};
const pct = (v) => Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + "%";

export default function Karakter() {
  const { section = "" } = useParams();
  const info = SECTIONS[section];
  const defaultYear = info?.year || "2026";
  const [year, setYear] = useState(defaultYear);
  // pindah halaman: kembali ke tahun default halaman itu
  useEffect(() => setYear(defaultYear), [section, defaultYear]);
  if (!info) return <Navigate to={KARAKTER_BASE} replace />;
  const Page = info.page;
  // Diskusi Interaktif tanpa pilihan tahun
  const picker = info.noYear ? null : <Segmented label="Tahun" value={year} onChange={setYear} options={KARAKTER_YEARS.map((y) => [y, "Tahun " + y])} />;
  return (
    <div className="page kr">
      <div className="kr-top">
        {section && <Link className="btn btn-sm" to={KARAKTER_BASE}><Icon name="left" size={15} />Kembali ke Beranda program</Link>}
        <nav className="kr-crumb" aria-label="Lokasi halaman">
          <span>Pendidikan Persiapan</span>
          {section ? <Link to={KARAKTER_BASE}>Pembinaan Karakter TPB</Link> : <span>Pembinaan Karakter TPB</span>}
          {info.parent && <Link to={`${KARAKTER_BASE}/${info.parent}`}>{SECTIONS[info.parent].title}</Link>}
          {section && <span aria-current="page">{info.title}</span>}
        </nav>
      </div>
      <Page year={year} picker={picker} />
    </div>
  );
}

/* ---------------- slideshow: video besar + deretan thumbnail yang bisa diklik ---------------- */
// thumbnail Google Drive: tanpa Referer (Drive menolak permintaan dari situs lain dengan 429), kotak polos bila gagal
function DriveImg({ id, w, lazy }) {
  const [bad, setBad] = useState(false);
  if (bad) return <span className="kr-noimg" aria-hidden="true" />;
  return <img src={driveThumb(id, w)} alt="" referrerPolicy="no-referrer" loading={lazy ? "lazy" : undefined} onError={() => setBad(true)} />;
}

// Video diputar otomatis lewat pemutar Google Drive (Drive menolak <video> langsung dari situs lain),
// lalu lanjut ke video berikutnya setelah durasinya habis dan kembali ke awal.
// Klik thumbnail / panah tetap bisa; "Berhenti di video ini" mematikan perpindahan otomatis.
const LOAD_SLACK = 4; // detik tambahan untuk memuat pemutar Drive
function Slideshow({ items, label }) {
  const [at, setAt] = useState(0);
  const [auto, setAuto] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const n = items.length;
  const i = n ? at % n : 0;
  const it = items[i];
  const pick = (k) => setAt((k + n) % n);
  useEffect(() => setLoaded(false), [it?.id]);
  useEffect(() => {
    if (!auto || !loaded || n < 2) return undefined;
    const t = setTimeout(() => setAt((v) => (v + 1) % n), ((it.dur || 90) + LOAD_SLACK) * 1000);
    return () => clearTimeout(t);
  }, [auto, loaded, n, it]);
  if (!n) return null;
  return (
    <section className="kr-show" aria-label={label}>
      <div className="kr-stage">
        {/* thumbnail sampai pemutar Drive selesai dimuat */}
        {!loaded && <DriveImg key={"t" + it.id} id={it.id} w={1280} />}
        <iframe key={it.id} src={drivePlayer(it.id)} title={it.title} allow="autoplay; fullscreen" allowFullScreen onLoad={() => setLoaded(true)} />
        {n > 1 && <>
          <button type="button" className="kr-arrow l" onClick={() => pick(i - 1)} aria-label="Sebelumnya"><Icon name="left" size={18} /></button>
          <button type="button" className="kr-arrow r" onClick={() => pick(i + 1)} aria-label="Berikutnya"><Icon name="right" size={18} /></button>
        </>}
      </div>
      <div className="kr-cap">
        <div><span className="kr-badge">{label}</span><b>{it.title}</b>{it.by && <span>{it.by}</span>}</div>
        <div className="kr-ctrl">
          <span className="kr-count">{i + 1} / {n}</span>
          {n > 1 && <button type="button" onClick={() => setAuto(!auto)} aria-pressed={!auto}>{auto ? "❚❚ Berhenti di video ini" : "▶ Putar berurutan"}</button>}
        </div>
      </div>
      <div className="kr-thumbs">
        {items.map((v, k) => (
          <button key={v.id} type="button" className={"kr-thumb" + (k === i ? " on" : "")} onClick={() => pick(k)} aria-pressed={k === i}>
            <DriveImg id={v.id} w={400} lazy />
            <span>{v.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------- beranda ---------------- */
// sorotan kegiatan: video Dokumentasi Kegiatan (kegiatan terbaru dulu), lalu video karya mahasiswa Kampanye Etika
const HIGHLIGHTS = [
  ...[...DOCUMENTATION].sort((a, b) => b.date.localeCompare(a.date)).flatMap((d) => d.videos.map((v) => ({
    id: v.id, dur: v.dur, title: d.title, by: "Dokumentasi · " + new Date(d.date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
  }))),
  ...CAMPAIGN_VIDEOS,
];
function Beranda({ year, picker }) {
  const highlights = HIGHLIGHTS;
  return (
    <>
      <PageHead title={<>Pembinaan Karakter TPB <span className="title-prog">{year}</span></>}
        sub="Program pembinaan karakter mahasiswa Tahap Persiapan Bersama (TPB) ITB">{picker}</PageHead>
      <Slideshow items={highlights} label="Sorotan kegiatan" />
      <div className="kr-row">
        <span className="kr-muted">Video berputar otomatis dan berlanjut ke video berikutnya · klik gambar untuk memilih.</span>
        <Link className="btn btn-primary" to={`${KARAKTER_BASE}/dokumentasi`}><Icon name="folder" size={16} />Lihat semua Dokumentasi Kegiatan</Link>
      </div>
      <section className="card">
        <h2 className="card-title">Tentang program</h2>
        <p className="kr-about">{KARAKTER_ABOUT}</p>
      </section>
      {/* kartu bukan tautan: hanya judul & "Buka program" yang bisa diklik (label ringkas tidak) */}
      <div className="kr-progs">
        {KARAKTER_PROGRAMS.map((p) => (
          <div key={p.key} className={"kr-prog " + p.tone}>
            <Link to={`${KARAKTER_BASE}/${p.key}`} className="kr-prog-head"><span className="kr-ic"><Icon name={p.icon} size={20} /></span><b>{p.title}</b></Link>
            <span className="kr-prog-desc">{p.desc}</span>
            <span className="kr-chips">{p.chips.map((c) => <span key={c}>{c}</span>)}</span>
            <Link to={`${KARAKTER_BASE}/${p.key}`} className="kr-go">Buka program<Icon name="right" size={15} /></Link>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- 1. Teman Tumbuh Bersama ---------------- */
function Ring({ value, label, hint, tone, note }) {
  return (
    <div className="card kr-ring-card">
      <div className={"kr-ring " + tone} style={{ "--p": Math.min(100, value) }}><span>{pct(value)}</span></div>
      <b>{label}</b><small>{hint}</small>{note && <small className="kr-bad">{note}</small>}
    </div>
  );
}

// Data dari Apps Script spreadsheet (KARAKTER_API_URL?data=ttb|mapping) bila tersedia; disimpan di browser
// sebagai cadangan bila spreadsheet tidak bisa dihubungi. Tanpa data live, halaman memakai data cadangan di karakter.js.
const liveKey = (key) => "ditsama-karakter-" + key;
function readLive(key) {
  try { return JSON.parse(localStorage.getItem(liveKey(key))) || null; } catch { return null; }
}
function useLiveData(key, enabled = true) {
  const live = enabled && Boolean(KARAKTER_API_URL);
  const [data, setData] = useState(() => (live ? readLive(key) : null));
  const [fresh, setFresh] = useState(false);
  const [nonce, setNonce] = useState(0); // reload(): baca ulang spreadsheet (mis. setelah menyimpan catatan)
  useEffect(() => {
    if (!live) return undefined;
    let off = false;
    fetch(KARAKTER_API_URL + (KARAKTER_API_URL.includes("?") ? "&" : "?") + "data=" + key, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (off || !j?.ok) return;
        setData(j); setFresh(true);
        try { localStorage.setItem(liveKey(key), JSON.stringify(j)); } catch { /* penyimpanan browser tidak tersedia */ }
      })
      .catch(() => {});
    return () => { off = true; };
  }, [key, live, nonce]);
  const reload = () => setNonce((n) => n + 1);
  return live && data ? { data, source: fresh ? "live" : "cache", reload } : { data: null, source: "static", reload };
}

function useTtb(year) {
  const { data, source } = useLiveData("ttb", year === TTB_LIVE_YEAR);
  const base = TTB[year];
  if (!base) return null;
  return data ? { ...base, ...data, source } : { ...base, source };
}

// Feedback mahasiswa (Google Form) berisi komentar, jadi diminta lewat POST dengan token login (Apps Script memeriksanya)
// dan hanya disimpan di sessionStorage selama tab terbuka; tidak ada salinan di kode.
const FEEDBACK_KEY = liveKey("feedback");
const FEEDBACK_ERRORS = {
  request: "Feedback belum bisa dimuat: Apps Script TTB belum diperbarui ke versi yang memuat feedback.",
  login: "Sesi login sudah berakhir. Masuk lagi untuk melihat feedback.",
  forbidden: "Akun Anda belum disetujui untuk melihat feedback.",
};
function useTtbFeedback(enabled) {
  const token = useAuthStore((s) => s.session?.token);
  const [state, setState] = useState(() => {
    try {
      const data = JSON.parse(sessionStorage.getItem(FEEDBACK_KEY));
      return data ? { data, source: "cache" } : { data: null };
    } catch { return { data: null }; }
  });
  useEffect(() => {
    if (!enabled || !KARAKTER_API_URL || !token) return undefined;
    let off = false;
    fetch(KARAKTER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "feedback", token }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (off) return;
        if (!j?.ok) {
          console.error("[feedback TTB]", j);
          setState((s) => ({ ...s, error: FEEDBACK_ERRORS[j?.code] || "Feedback tidak bisa dimuat dari spreadsheet. Coba muat ulang halaman." }));
          return;
        }
        setState({ data: j, source: "live" });
        try { sessionStorage.setItem(FEEDBACK_KEY, JSON.stringify(j)); } catch { /* penyimpanan browser tidak tersedia */ }
      })
      .catch((err) => {
        console.error("[feedback TTB]", err);
        if (!off) setState((s) => ({ ...s, error: "Feedback tidak bisa dimuat dari spreadsheet. Periksa koneksi internet Anda." }));
      });
    return () => { off = true; };
  }, [enabled, token]);
  return state;
}

// keterangan sumber data di bawah judul halaman
function SourceChip({ source, updatedAt, asOf, sheet }) {
  const text = source === "static" ? `Data sheet ${sheet} per ${fmtDate(asOf, { day: "numeric", month: "short", year: "numeric" })}`
    : `${source === "live" ? "Diperbarui otomatis dari spreadsheet" : "Data tersimpan terakhir"} · ${new Date(updatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`;
  return <span className="kr-chip">{text}</span>;
}

const fmtDate = (iso, opts) => (iso ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("id-ID", opts) : "");
const signed = (v, unit) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + unit;

function Ttb({ year, picker }) {
  const d = useTtb(year);
  const head = <PageHead title={<>Teman Tumbuh Bersama TPB ITB <span className="title-prog">{year}</span></>}
    sub="Mentor ke mentee, dosen pembina ke pementor · sekitar 1 semester">{picker}</PageHead>;
  if (!d) return <>{head}<section className="card"><EmptyState icon="users" title={`Belum ada data TTB ${year}`}>Data diambil dari sheet Ringkasan program TTB.</EmptyState></section></>;
  const toDate = d.targetToDate || d.targetMeetings;
  const target = d.meetingsTarget || d.groups * toDate; // target pertemuan s.d. pekan ini
  const held = d.meetingsHeld ?? Math.round((target * d.realization) / 100);
  const short = d.meetingsShort ?? Math.max(0, target - held);
  const semester = d.groups * d.targetMeetings;
  const avgHeld = held / d.groups; // rata-rata pertemuan terlaksana per kelompok
  const timeline = d.timeline || [];
  const week = timeline.find((w) => w.week === d.week);
  const maxCum = Math.max(d.targetMeetings, ...timeline.map((w) => w.cumTarget));
  const sameMonth = week && week.start.slice(0, 7) === week.end.slice(0, 7);
  const range = week && `${fmtDate(week.start, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" })}–${fmtDate(week.end, { day: "numeric", month: "short", year: "numeric" })}`;
  return (
    <>
      {head}
      <div className="kr-status">
        {d.week && <span className="kr-chip"><i className="kr-live" />Pekan ke-{d.week}{range && " · " + range}{week?.activity && " · " + week.activity}</span>}
        <SourceChip source={d.source} updatedAt={d.updatedAt} asOf={d.asOf} sheet="Ringkasan" />
      </div>
      <div className="kpi-row">
        <Kpi icon="users" label="Total mahasiswa TPB (sasaran)" value={fmtNum(d.students)} hint="jumlah mahasiswa seluruh kelompok" />
        <Kpi icon="layers" label="Kelompok pembinaan" value={fmtNum(d.groups)} hint={`target ${d.targetMeetings} pertemuan per kelompok dalam 1 semester`} />
        <Kpi icon="userCheck" label="Pementor aktif" value={fmtNum(d.mentors)} hint="pementor unik" />
        <Kpi icon="grad" label="Dosen pembina" value={fmtNum(d.lecturers)} hint="dosen pembina unik" />
      </div>
      <div className="grid kr-ttb-top">
        <section className="card">
          <div className="card-head"><div><h2 className="card-title">Pertemuan terlaksana vs target s.d. pekan ini</h2>
            <div className="card-sub">Target = {toDate} pertemuan × {fmtNum(d.groups)} kelompok{d.week ? ` (pekan ke-${d.week}, tab Timeline)` : ""}</div></div></div>
          <div className="kr-big"><b>{fmtNum(held)}</b><span>dari {fmtNum(target)} pertemuan</span></div>
          <div className="kr-bar"><i style={{ width: Math.min(100, (held / target) * 100) + "%" }} /></div>
          <div className="kr-bar-legend"><span>Realisasi {pct(d.realization)}</span><span>Target 100%</span></div>
          <div className="kr-trio">
            <div><small>Target pertemuan</small><b>{fmtNum(target)}</b></div>
            <div><small>Sudah terlaksana</small><b>{fmtNum(held)}</b></div>
            <div className="bad"><small>Kekurangan</small><b>{fmtNum(short)}</b></div>
          </div>
          <div className="kr-semester">
            Terhadap target satu semester ({d.targetMeetings} × {fmtNum(d.groups)} = {fmtNum(semester)} pertemuan): <b>{pct((held / semester) * 100)}</b>
            <div className="kr-bar thin"><i style={{ width: Math.min(100, (held / semester) * 100) + "%" }} /></div>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><div><h2 className="card-title">Indikator vs target</h2><div className="card-sub">Kolom TARGET dan Selisih (Nilai − Target) di sheet Ringkasan</div></div></div>
          {d.targets?.length ? (
            <ul className="kr-vs">
              {d.targets.map((t) => (
                <li key={t.key}>
                  <span className="t">{t.label}</span>
                  <b>{t.unit === "%" ? pct(t.value) : fmtNum(t.value)}</b>
                  <span className="m">Target {t.unit === "%" ? pct(t.target) : fmtNum(t.target)}
                    <span className={"kr-gap" + (t.gap >= 0 ? " ok" : "")}>{signed(t.gap, t.unit)}</span></span>
                  <div className="kr-bar thin"><i style={{ width: Math.min(100, t.target ? (t.value / t.target) * 100 : 0) + "%" }} /></div>
                </li>
              ))}
            </ul>
          ) : <p className="kr-muted">Belum ada indikator dengan kolom TARGET.</p>}
          <p className="kr-muted kr-small">Indikator lain yang diberi TARGET di sheet otomatis muncul di sini.</p>
        </section>
      </div>
      <section className="card">
        <div className="card-head"><div><h2 className="card-title">Alur pembinaan</h2><div className="card-sub">Dosen pembina membina pementor, pementor mendampingi kelompok mentee</div></div></div>
        <ol className="kr-flow">
          <li><b>{fmtNum(d.lecturers)}</b><span>Dosen pembina</span><small>±{Math.round(d.mentors / d.lecturers)} pementor per dosen</small></li>
          <li><b>{fmtNum(d.mentors)}</b><span>Pementor</span></li>
          <li><b>{fmtNum(d.groups)}</b><span>Kelompok</span><small>target {d.targetMeetings} pertemuan dalam 1 semester</small></li>
          <li><b>{fmtNum(d.students)}</b><span>Mahasiswa TPB</span><small>±{Math.round(d.students / d.groups)} mahasiswa per kelompok</small></li>
        </ol>
      </section>
      <div className="kr-rings">
        <Ring value={d.realization} tone="blue" label="Realisasi kegiatan" hint={`${fmtNum(held)} dari ${fmtNum(target)} pertemuan`}
          note={`target 100% · ${signed(d.realization - 100, "%")}`} />
        <Ring value={d.reportCompleteness} tone="violet" label="Kelengkapan laporan" hint="kelompok yang sudah lapor (lengkap / sebagian)" />
        <Ring value={d.studentAttendance} tone="orange" label="Kehadiran mahasiswa" hint="total hadir ÷ (mahasiswa × pertemuan)" />
        <Ring value={d.mentorAttendance} tone="green" label="Kehadiran pementor" hint="pertemuan dengan pementor hadir" />
      </div>
      <section className="card">
        <div className="card-head">
          <div><h2 className="card-title">Timeline per pekan</h2>
            <div className="card-sub">{timeline.length ? `${timeline.length} pekan, ${fmtDate(timeline[0].start, { day: "numeric", month: "short" })} – ${fmtDate(timeline[timeline.length - 1].end, { day: "numeric", month: "short", year: "numeric" })} · tinggi batang = target pertemuan kumulatif` : "Dari tab Timeline"}</div></div>
          <span className="kr-pill warn">Kelompok selesai target: {fmtNum(d.groupsDone)} dari {fmtNum(d.groups)}</span>
        </div>
        {timeline.length > 0 && <>
          <div className="kr-weeks" style={{ "--n": timeline.length }}>
            {timeline.map((w, i) => {
              const uts = i > 0 && w.cumTarget === timeline[i - 1].cumTarget; // pekan tanpa pertemuan
              const cls = w.week === d.week ? " now" : d.week && w.week < d.week ? " done" : "";
              return (
                <div key={w.week} className={"kr-wk" + cls + (uts ? " uts" : "")}
                  title={`Pekan ${w.week} · ${fmtDate(w.start, { day: "numeric", month: "short" })}–${fmtDate(w.end, { day: "numeric", month: "short" })} · ${w.activity} · target kumulatif ${w.cumTarget}`}>
                  <span className="col" style={{ height: (w.cumTarget / maxCum) * 100 + "%" }}><em>{uts ? "UTS" : w.cumTarget}</em></span>
                  <b>P{w.week}</b>
                </div>
              );
            })}
          </div>
          <div className="kr-legend"><span><i className="done" />pekan lewat</span><span><i className="now" />pekan ini</span><span><i className="uts" />tanpa pertemuan (UTS)</span><span>Arahkan kursor ke batang untuk tanggal &amp; kegiatan</span></div>
        </>}
        <div className="kr-meet" aria-label={`Rata-rata ${avgHeld.toFixed(1)} pertemuan terlaksana, target ${toDate}`}>
          {Array.from({ length: d.targetMeetings }, (_, i) => {
            const fill = Math.max(0, Math.min(1, avgHeld - i));
            return <span key={i} style={{ "--f": fill * 100 + "%" }} className={(fill >= 1 ? "full" : "") + (i + 1 === toDate ? " tgt" : "")}>{i + 1}</span>;
          })}
        </div>
        <div className="kr-legend"><span><i className="held" />rata-rata terlaksana: {avgHeld.toLocaleString("id-ID", { maximumFractionDigits: 1 })} pertemuan per kelompok</span>
          <span><i className="tgt" />target s.d. pekan ini: pertemuan ke-{toDate}</span></div>
      </section>
      {year === TTB_LIVE_YEAR && <TtbFeedback />}
    </>
  );
}

// skor 1–5: warna sama dengan umpan balik pengajar
const fbTone = (v) => (v >= 4.5 ? "ok" : v >= 4 ? "" : v >= 3 ? "warn" : "crit");
const fbScore = (v) => (v === null ? "–" : v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const share = (xs) => (xs.length ? (xs.filter((v) => v >= 4).length / xs.length) * 100 : null);
// kode kelompok ditulis bebas ("IS - P - 050", "IS-L-027"); teks yang bukan kode ditampilkan apa adanya
const groupCode = (s) => (/^[a-z]{2}(\s*-\s*[a-z])?\s*-\s*\d+$/i.test(s) ? s.replace(/\s+/g, "").toUpperCase() : s);

function feedbackStats(d) {
  const scored = d.responses.filter((r) => r.scores.some((v) => v !== null));
  const all = scored.flatMap((r) => r.scores.filter((v) => v !== null));
  return {
    scored: scored.length,
    average: mean(all),
    positive: share(all),
    questions: d.questions.map((q, i) => {
      const xs = scored.map((r) => r.scores[i]).filter((v) => v !== null);
      return { q, average: mean(xs), positive: share(xs), count: xs.length };
    }),
    toMentor: d.responses.filter((r) => r.toMentor),
    toTeam: d.responses.filter((r) => r.toTeam),
  };
}

// sentimen dan kata kunci komentar dari backend (AI Groq); backend menyimpan hasilnya, jadi teks yang sama tidak dianalisis
// ulang. Dikirim per 10 komentar sekaligus (paralel) agar setiap permintaan ke backend tetap singkat.
const SENTIMENT_LABELS = { positive: "Positif", neutral: "Netral", negative: "Negatif" };
function useSentiments(texts) {
  const [result, setResult] = useState({ sentiments: {}, keywords: {} });
  const key = texts.join("\u0000");
  useEffect(() => {
    if (!texts.length) return undefined;
    let off = false;
    const batches = [];
    for (let i = 0; i < texts.length; i += 10) batches.push(texts.slice(i, i + 10));
    Promise.allSettled(batches.map((batch) => api("/persiapan/feedback-sentiments", { method: "POST", body: { texts: batch } })))
      .then((outs) => {
        if (off) return;
        const sentiments = {}, keywords = {};
        outs.forEach((out, b) => {
          if (out.status !== "fulfilled") return console.error("[sentimen feedback]", out.reason);
          batches[b].forEach((t, i) => { sentiments[t] = out.value.data.sentiments[i]; keywords[t] = out.value.data.keywords[i]; });
        });
        setResult({ sentiments, keywords });
      });
    return () => { off = true; };
  }, [key]);
  return result;
}

const sentimentCounts = (texts, byText) => ["positive", "neutral", "negative"]
  .map((s) => [s, texts.filter((t) => byText[t] === s).length])
  .filter(([, n]) => n)
  .map(([s, n]) => `${fmtNum(n)} ${SENTIMENT_LABELS[s].toLowerCase()}`)
  .join(" · ");

function FeedbackQuotes({ items, text, caption, empty, sentiments }) {
  if (!items.length) return <p className="kr-muted">{empty}</p>;
  return (
    <div className="kr-fb-quotes">
      {items.map((r, i) => {
        const s = sentiments[text(r)];
        return (
          <figure className="quote" key={i}><blockquote>{text(r)}</blockquote>
            <figcaption>{s && <span className={"kr-sent " + s}>{SENTIMENT_LABELS[s]}</span>}
              {[caption?.(r), r.at && fmtDate(r.at, { day: "numeric", month: "short", year: "numeric" })].filter(Boolean).join(" · ")}</figcaption></figure>
        );
      })}
    </div>
  );
}

// Umpan balik mahasiswa dari Google Form feedback TTB: skor 1–5 per pertanyaan + komentar untuk mentor dan Tim Teknis
// kata kunci dari AI per komentar (yang dipuji / dikeluhkan); satu kata kunci dihitung sekali per komentar
function keywordCounts(lists) {
  const counts = new Map();
  for (const list of lists) {
    for (const k of new Set(list.map((x) => x.toLowerCase().trim()).filter(Boolean))) counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 30);
}

// kata terbesar di tengah: urutan besar-kecil disusun bergantian kiri-kanan
function WordCloud({ title, lists, tone, empty }) {
  const words = keywordCounts(lists);
  const max = words[0]?.[1] || 1;
  const arranged = words.reduce((out, w, i) => (i % 2 ? [...out, w] : [w, ...out]), []);
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">{title}</h2>
        <div className="card-sub">Diambil AI dari {fmtNum(lists.filter((l) => l.length).length)} komentar · makin besar = makin banyak komentar yang menyebutnya · 30 teratas</div></div></div>
      {words.length ? (
        <ul className={"kr-cloud " + tone}>
          {arranged.map(([w, n]) => (
            <li key={w} style={{ fontSize: 12 + Math.round(Math.sqrt(n / max) * 22), opacity: 0.55 + (0.45 * n) / max }}
              title={`${w}: ${n} komentar`}><span className="sr-only">{`${n} komentar: `}</span>{w}</li>
          ))}
        </ul>
      ) : <p className="kr-muted">{empty}</p>}
    </section>
  );
}

function TtbFeedback() {
  const { data, source, error } = useTtbFeedback(true);
  const s = useMemo(() => (data ? feedbackStats(data) : null), [data]);
  const mentorTexts = s ? s.toMentor.map((r) => r.toMentor) : [];
  const teamTexts = s ? s.toTeam.map((r) => r.toTeam) : [];
  const { sentiments, keywords } = useSentiments([...mentorTexts, ...teamTexts]);
  const analysed = [...mentorTexts, ...teamTexts].map((t) => keywords[t]).filter(Boolean);
  return (
    <>
      <div className="sec-head">
        <h2><Icon name="message" size={18} />Umpan balik mahasiswa</h2>
        <p>Google Form feedback TTB{data ? ` · ${data.sheet}` : ""} · skala 1–5 · sentimen dan kata kunci komentar dianalisis AI (Groq)</p>
      </div>
      {data && <div className="kr-status"><SourceChip source={source} updatedAt={data.updatedAt} /></div>}
      {!data && (error
        ? <ErrorNote error={error} />
        : <section className="card"><EmptyState icon="message" title="Memuat feedback…">Jawaban Google Form dibaca dari spreadsheet.</EmptyState></section>)}
      {s && <>
        <div className="kpi-row">
          <Kpi icon="clipboard" label="Jawaban" value={fmtNum(data.responses.length)} hint={`${fmtNum(s.scored)} dengan skor`} />
          <Kpi icon="star" label="Rata-rata skor" value={fbScore(s.average)} hint="dari 5, semua pertanyaan" />
          <Kpi icon="checkCircle" label="Skor positif" value={s.positive === null ? "–" : pct(s.positive)} hint="skor 4 atau 5" />
          <Kpi icon="message" label="Komentar" value={fmtNum(s.toMentor.length + s.toTeam.length)}
            hint={`${fmtNum(s.toMentor.length)} untuk mentor · ${fmtNum(s.toTeam.length)} untuk Tim Teknis`} />
        </div>
        <section className="card">
          <div className="card-head"><div><h2 className="card-title">Skor per pertanyaan</h2>
            <div className="card-sub">Rata-rata skor 1–5 · persentase menjawab 4 atau 5</div></div></div>
          <ul className="kr-bars kr-fb-q">
            {s.questions.map((x) => (
              <li key={x.q}>
                <span>{x.q}</span>
                <Bar value={((x.average ?? 0) / 5) * 100} tone={fbTone(x.average)} />
                <b>{fbScore(x.average)}<small>{x.positive === null ? "" : `${pct(x.positive)} positif`}</small></b>
              </li>
            ))}
          </ul>
        </section>
        <div className="grid g-2">
          <WordCloud title="Kata kunci positif" tone="ok" empty="Belum ada pujian di komentar, atau komentar belum dianalisis."
            lists={analysed.map((k) => k.positive)} />
          <WordCloud title="Kata kunci negatif" tone="crit" empty="Belum ada keluhan di komentar, atau komentar belum dianalisis."
            lists={analysed.map((k) => k.negative)} />
        </div>
        <div className="grid g-2">
          <section className="card">
            <div className="card-head"><div><h2 className="card-title">Untuk kakak mentor</h2>
              <div className="card-sub">{fmtNum(s.toMentor.length)} komentar{sentimentCounts(mentorTexts, sentiments) && ` · ${sentimentCounts(mentorTexts, sentiments)}`} · kode kelompok dari jawaban mahasiswa</div></div></div>
            <FeedbackQuotes items={s.toMentor} text={(r) => r.toMentor} caption={(r) => r.group && `Kelompok ${groupCode(r.group)}`}
              empty="Belum ada komentar untuk mentor." sentiments={sentiments} />
          </section>
          <section className="card">
            <div className="card-head"><div><h2 className="card-title">Untuk Ditsama ITB / Tim Teknis TTB</h2>
              <div className="card-sub">{fmtNum(s.toTeam.length)} komentar{sentimentCounts(teamTexts, sentiments) && ` · ${sentimentCounts(teamTexts, sentiments)}`}</div></div></div>
            <FeedbackQuotes items={s.toTeam} text={(r) => r.toTeam} empty="Belum ada komentar untuk Tim Teknis." sentiments={sentiments} />
          </section>
        </div>
      </>}
    </>
  );
}

/* ---------------- 2. Kampanye Etika Mahasiswa ---------------- */
// Mapping Banner: baris {year, campus, area, location, theme, done, note} → kampus → area → lokasi.
// Sel lokasi × tema: true = sudah terpasang, false = belum, tidak ada = tidak direncanakan di lokasi itu.
const campusLabel = (name) => (/ganesha/i.test(name) ? "Kampus Ganesha" : /jatinangor|jtn/i.test(name) ? "Kampus Jatinangor" : name);
function groupMapping(items, year) {
  const themes = [...BANNER_THEMES];
  const themeOf = (t) => {
    const i = themes.findIndex((x) => x.toLowerCase() === t.toLowerCase());
    if (i >= 0) return themes[i];
    themes.push(t); // tema baru di sheet ikut tampil sebagai kolom
    return t;
  };
  const campuses = [];
  for (const it of items) {
    if (String(it.year) !== String(year)) continue;
    let c = campuses.find((x) => x.name === it.campus);
    if (!c) campuses.push(c = { name: it.campus, key: it.campus, label: campusLabel(it.campus), areas: [] });
    let a = c.areas.find((x) => x.name === it.area);
    if (!a) c.areas.push(a = { name: it.area, rooms: [] });
    let r = a.rooms.find((x) => x.name === it.location);
    if (!r) a.rooms.push(r = { name: it.location, area: it.area, key: noteKey(it), note: "", noteAt: "", noteBy: "", st: {} });
    r.st[themeOf(it.theme)] = Boolean(it.done);
    if (it.note) r.note = it.note;
    if (it.noteAt) { r.noteAt = it.noteAt; r.noteBy = it.noteBy || ""; }
  }
  for (const c of campuses) {
    c.rooms = c.areas.flatMap((a) => a.rooms);
    for (const r of c.rooms) {
      r.planned = Object.keys(r.st).length;
      r.done = Object.values(r.st).filter(Boolean).length;
    }
    c.planned = c.rooms.reduce((n, r) => n + r.planned, 0);
    c.done = c.rooms.reduce((n, r) => n + r.done, 0);
    c.complete = c.rooms.filter((r) => r.planned && r.done === r.planned);
    c.empty = c.rooms.filter((r) => r.planned && !r.done);
  }
  // Jatinangor dulu (urutan menu sebelumnya), lalu kampus lain sesuai urutan sheet
  campuses.sort((x, y) => (/jatinangor/i.test(y.name) ? 1 : 0) - (/jatinangor/i.test(x.name) ? 1 : 0));
  return { themes, campuses };
}
const FALLBACK_ITEMS = mappingFallbackItems();
// kunci satu lokasi (sama dengan baris di tab Tim Humas): tahun, kampus, gedung / area, lokasi
const noteKey = (it) => JSON.stringify([String(it.year), it.campus, it.area, it.location]);
// saved = perubahan yang baru disimpan (atau isi terbaru sheet saat bentrok), dipakai sampai spreadsheet terbaca ulang:
// { note, noteAt, noteBy, st: { "tema huruf kecil": sudah/belum } }
const NOTHING_SAVED = {};
function useMapping(year, saved = NOTHING_SAVED) {
  const { data, source, reload } = useLiveData("mapping");
  const items = data?.items || FALLBACK_ITEMS;
  const merged = useMemo(() => (Object.keys(saved).length
    ? items.map((it) => {
      const s = saved[noteKey(it)];
      if (!s) return it;
      const { st, ...note } = s;
      return { ...it, ...note, done: st[it.theme.toLowerCase()] ?? it.done };
    }) : items), [items, saved]);
  const grouped = useMemo(() => groupMapping(merged, year), [merged, year]);
  return { ...grouped, source, reload, updatedAt: data?.updatedAt, asOf: MAPPING_FALLBACK.asOf };
}

// simpan centang & catatan lokasi ke file Tim Humas lewat Apps Script (POST teks biasa: tanpa preflight CORS)
async function saveMappingChanges(token, changes) {
  const res = await fetch(KARAKTER_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "mapping-update", token, changes }),
  });
  return res.json();
}
const SAVE_FAIL = {
  login: "Sesi Anda sudah berakhir. Masuk lagi, lalu simpan ulang perubahan.",
  forbidden: "Akun Anda tidak punya izin mengubah Mapping Banner.",
};
const fmtStamp = (iso) => new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Kampanye({ year, picker }) {
  const map = useMapping(CAMPAIGN_YEAR);
  const [book, setBook] = useState(false);
  const [poster, setPoster] = useState(null); // indeks poster yang dibuka besar
  const head = <PageHead title={<>Kampanye Etika Mahasiswa <span className="title-prog">{year}</span></>}
    sub="Video karya mahasiswa, poster & banner, buku panduan, dan sebaran banner di kampus">{picker}</PageHead>;
  if (year !== CAMPAIGN_YEAR) return <>{head}<section className="card"><EmptyState icon="star" title={`Belum ada data Kampanye Etika Mahasiswa ${year}`} /></section></>;
  return (
    <>
      {head}
      <Slideshow items={CAMPAIGN_VIDEOS} label="Video karya mahasiswa" />
      <div className="kr-row"><span className="kr-muted">{CAMPAIGN_VIDEOS.length} video karya mahasiswa · diputar langsung dari Google Drive</span></div>
      <section className="card">
        <div className="card-head"><div><h2 className="card-title">Katalog poster & banner</h2><div className="card-sub">Klik gambar untuk memperbesar dan membalik poster ⇄ banner · link Drive di bawah tiap tema</div></div></div>
        <div className="kr-posters">
          {CAMPAIGN_POSTERS.map((p, i) => (
            <PosterCard key={p.id} poster={p} onOpen={() => setPoster(i)} />
          ))}
        </div>
      </section>
      <div className="grid g-2">
        <section className="card">
          <div className="card-head"><div><h2 className="card-title">{CAMPAIGN_BOOK.title}</h2><div className="card-sub">Buku panduan · Direktorat Persiapan Bersama</div></div></div>
          <div className="kr-ebook">
            <button type="button" className="kr-cover" onClick={() => setBook(true)} aria-label={"Buka " + CAMPAIGN_BOOK.title}>
              <img src={import.meta.env.BASE_URL + CAMPAIGN_BOOK.cover} alt={"Sampul " + CAMPAIGN_BOOK.title} />
            </button>
            <div>
              <p className="kr-about">{CAMPAIGN_BOOK.desc}</p>
              <button type="button" className="btn btn-primary" onClick={() => setBook(true)}><Icon name="book" size={16} />Buka buku</button>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><div><h2 className="card-title">Mapping banner di kampus</h2><div className="card-sub">Pantau banner yang sudah dan belum terpasang</div></div></div>
          <div className="kpi-row kr-two">
            {map.campuses.map((c) => (
              <Kpi key={c.key} label={"Banner terpasang · " + c.label.replace(/^Kampus /, "")} value={`${fmtNum(c.done)} / ${fmtNum(c.planned)}`}
                hint={`${pct(c.planned ? (c.done / c.planned) * 100 : 0)} · ${c.empty.length} dari ${c.rooms.length} lokasi belum ada banner`} />
            ))}
          </div>
          <Link className="btn" to={`${KARAKTER_BASE}/mapping`}><Icon name="pin" size={16} />Buka dashboard mapping</Link>
        </section>
      </div>
      {book && <BookViewer book={CAMPAIGN_BOOK} onClose={() => setBook(false)} />}
      {poster !== null && <PosterViewer posters={CAMPAIGN_POSTERS} at={poster} onPick={setPoster} onClose={() => setPoster(null)} />}
    </>
  );
}

// Kartu poster: klik gambar untuk membuka besar (lalu bisa dibalik ke banner); link folder Drive tetap di bawah.
function PosterCard({ poster, onOpen }) {
  return (
    <div className="kr-poster">
      <button type="button" className="kr-poster-open" onClick={onOpen} aria-label={"Perbesar poster " + poster.theme}>
        <img src={import.meta.env.BASE_URL + poster.img} alt={"Poster " + poster.theme} loading="lazy" />
        <span className="kr-flip-tag"><Icon name="expand" size={12} />Perbesar</span>
      </button>
      <span className="kr-poster-body">
        <b>{poster.theme}</b>
        <a className="kr-go" href={driveFolder(poster.id)} target="_blank" rel="noreferrer">Lihat poster & banner<Icon name="external" size={14} /></a>
      </span>
    </div>
  );
}

// Poster besar: klik gambar (atau panah kiri/kanan) untuk membalik poster ⇄ banner; tombol bawah pindah tema.
function PosterViewer({ posters, at, onPick, onClose }) {
  const [back, setBack] = useState(false);
  const close = useRef(null);
  const p = posters[at];
  const n = posters.length;
  const base = import.meta.env.BASE_URL;
  useEffect(() => { close.current?.focus(); }, []);
  useEffect(() => setBack(false), [at]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") setBack((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="kr-modal" role="dialog" aria-modal="true" aria-label={p.theme} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kr-modal-box kr-pv-box">
        <div className="kr-modal-head">
          <b>{p.theme} · {back ? "Banner" : "Poster"}</b>
          <button ref={close} type="button" className="kr-close" onClick={onClose} aria-label="Tutup"><Icon name="x" size={18} /></button>
        </div>
        <button type="button" className={"kr-pv" + (back ? " back" : "")} onClick={() => setBack(!back)} aria-label={back ? "Balik ke poster" : "Balik ke banner"}>
          <span className="kr-flip-in">
            <span className="kr-flip-face"><img src={base + p.img} alt={"Poster " + p.theme} /></span>
            <span className="kr-flip-face kr-flip-back"><img src={base + p.banner} alt={"Banner " + p.theme} /></span>
          </span>
        </button>
        <div className="kr-book-nav">
          <button type="button" className="btn btn-sm" onClick={() => onPick((at - 1 + n) % n)}><Icon name="left" size={15} />Tema sebelumnya</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setBack(!back)}>{back ? "Lihat poster" : "Lihat banner"}</button>
          <a className="btn btn-sm" href={driveFolder(p.id)} target="_blank" rel="noreferrer">Buka di Drive<Icon name="external" size={14} /></a>
          <button type="button" className="btn btn-sm" onClick={() => onPick((at + 1) % n)}>Tema berikutnya<Icon name="right" size={15} /></button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Buku dua halaman: sampul depan bisa dibalik seperti membuka buku, menampilkan sampul (kiri) dan sinopsis (kanan).
function BookViewer({ book, onClose }) {
  const [open, setOpen] = useState(false);
  const close = useRef(null);
  const base = import.meta.env.BASE_URL;
  useEffect(() => {
    close.current?.focus();
    // buka sampul sesaat setelah tampil, seperti membuka buku
    const t = setTimeout(() => setOpen(true), 350);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setOpen(true);
      if (e.key === "ArrowLeft") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  // portal ke <body> agar latar gelap menutupi menu samping juga
  return createPortal(
    <div className="kr-modal" role="dialog" aria-modal="true" aria-label={book.title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kr-modal-box">
        <div className="kr-modal-head">
          <b>{book.title}</b>
          <button ref={close} type="button" className="kr-close" onClick={onClose} aria-label="Tutup"><Icon name="x" size={18} /></button>
        </div>
        <div className={"kr-book" + (open ? " open" : "")}>
          <div className="kr-page right"><img src={base + book.back} alt={"Sinopsis " + book.title} /></div>
          <button type="button" className="kr-leaf" onClick={() => setOpen(!open)} aria-label={open ? "Tutup sampul" : "Buka sampul"}>
            <span className="kr-face front"><img src={base + book.cover} alt={"Sampul " + book.title} /></span>
            <span className="kr-face back"><img src={base + book.cover} alt="" /></span>
          </button>
        </div>
        <div className="kr-book-nav">
          <button type="button" className="btn btn-sm" onClick={() => setOpen(false)} disabled={!open}><Icon name="left" size={15} />Sampul</button>
          <span className="kr-muted">{open ? "Halaman 1–2 dari 2" : "Sampul"} · klik buku untuk membalik</span>
          <button type="button" className="btn btn-sm" onClick={() => setOpen(true)} disabled={open}>Buka<Icon name="right" size={15} /></button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Mapping Banner ---------------- */
function Mapping({ year, picker }) {
  const [saved, setSaved] = useState({});
  const map = useMapping(year, saved);
  const [campus, setCampus] = useState(null);
  const c = map.campuses.find((x) => x.key === campus) || map.campuses[0];
  const [only, setOnly] = useState(null); // filter tabel ke satu gedung dari peta: { label, keys }
  useEffect(() => { setOnly(null); }, [c?.key, year]);
  const showInTable = (filter) => {
    setOnly(filter);
    document.getElementById("kr-matrix")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const edits = useMappingEdits(map, setSaved);
  // hanya jenis banner yang dipakai di kampus & tahun ini (mis. 2025 hanya 4 jenis)
  const themes = c ? map.themes.filter((t) => c.rooms.some((r) => t in r.st)) : [];
  const tone = (share) => (share < 0.35 ? "crit" : share < 0.6 ? "warn" : "ok");
  const byTheme = c ? themes.map((t) => {
    const planned = c.rooms.filter((r) => t in r.st);
    return { t, planned: planned.length, done: planned.filter((r) => r.st[t]).length };
  }).filter((x) => x.planned).sort((x, y) => y.done / y.planned - x.done / x.planned) : [];
  const priority = c ? [...c.rooms].filter((r) => r.planned > r.done)
    .sort((x, y) => x.done / x.planned - y.done / y.planned || y.planned - x.planned).slice(0, 10) : [];
  return (
    <>
      <PageHead title={<>Mapping Banner <span className="title-prog">{year}</span></>} sub="Sebaran banner Kampanye Etika Mahasiswa per lokasi kampus">{picker}</PageHead>
      <div className="kr-status">
        <SourceChip source={map.source} updatedAt={map.updatedAt} asOf={map.asOf} sheet="Tim Humas" />
      </div>
      {c && <Segmented label="Kampus" value={c.key} onChange={setCampus} options={map.campuses.map((x) => [x.key, x.label])} />}
      {!c ? (
        <section className="card"><EmptyState icon="pin" title={`Belum ada data Mapping Banner ${year}`}>Data diambil dari tab "Potensial Pemasangan Banner … {year}" di file Tim Humas (Master Data Lokasi Kampanye).</EmptyState></section>
      ) : (
        <>
          <div className="kpi-row">
            <Kpi icon="pin" label="Lokasi dipantau" value={fmtNum(c.rooms.length)} hint={`${c.areas.length} gedung / area`} />
            <Kpi icon="checkCircle" label="Banner terpasang" value={`${fmtNum(c.done)} / ${fmtNum(c.planned)}`} hint={`${pct(c.planned ? (c.done / c.planned) * 100 : 0)} dari banner yang direncanakan`} />
            <Kpi icon="star" label="Lokasi sudah lengkap" value={fmtNum(c.complete.length)} hint="semua banner yang direncanakan sudah terpasang" />
            <Kpi icon="alert" label="Lokasi belum ada banner" tone="t-neg" value={fmtNum(c.empty.length)} hint={`dari ${fmtNum(c.rooms.length)} lokasi`} />
          </div>
          <CampusMap key={c.key} campus={c} themes={themes} onShow={showInTable} />
          <div className="grid g-2">
            <section className="card">
              <div className="card-head"><div><h2 className="card-title">Keterpasangan per tema</h2><div className="card-sub">Banner terpasang dari lokasi yang direncanakan untuk tema itu</div></div></div>
              <ul className="kr-bars">{byTheme.map(({ t, planned, done }) => (
                <li key={t}><span>{t}</span><Bar value={(done / planned) * 100} tone={tone(done / planned)} /><b>{done}/{planned} · {Math.round((done / planned) * 100)}%</b></li>
              ))}</ul>
            </section>
            <section className="card">
              <div className="card-head"><div><h2 className="card-title">Prioritas pemasangan</h2><div className="card-sub">Lokasi dengan banner terpasang paling sedikit</div></div></div>
              {priority.length ? (
                <div className="tbl-scroll"><table className="tbl compact">
                  <thead><tr><th>Lokasi</th><th>Gedung / area</th><th className="num">Terpasang</th></tr></thead>
                  <tbody>{priority.map((r) => (
                    <tr key={r.area + r.name}><td className="cell-strong">{r.name}</td><td className="kr-muted">{r.area}</td>
                      <td className={"num " + (r.done ? "" : "kr-bad")}>{r.done}/{r.planned}</td></tr>
                  ))}</tbody>
                </table></div>
              ) : <p className="kr-muted">Semua banner yang direncanakan sudah terpasang.</p>}
            </section>
          </div>
          <MappingMatrix campus={c} themes={themes} edits={edits} only={only} onClearOnly={() => setOnly(null)} />
          {edits.dirty.length > 0 && (
            <div className="kr-savebar" role="region" aria-label="Perubahan belum disimpan">
              <div className="kr-savebar-txt">
                <b>{edits.count} perubahan belum disimpan</b>
                <small>di {edits.dirty.length} lokasi · tanggal tercatat otomatis saat disimpan</small>
              </div>
              <button type="button" className="btn" onClick={edits.cancel} disabled={edits.busy}>Batalkan</button>
              <button type="button" className="btn btn-primary" onClick={edits.save} disabled={edits.busy}>{edits.busy && <Spinner />}Simpan perubahan</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// Peta kampus: satu titik per gedung dari CAMPUS_MAPS (karakter.js). Warna = banner terpasang di gedung itu
// (merah belum ada, oranye sebagian, hijau lengkap); lokasi yang tidak cocok dengan gedung mana pun didaftar di samping.
const mapName = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const MAP_ZOOMS = [1, 1.5, 2, 3];
const pinTone = (b) => (!b.done ? "crit" : b.done < b.planned ? "warn" : "ok");

function CampusMap({ campus: c, themes, onShow }) {
  const conf = CAMPUS_MAPS.find((m) => m.campus.test(c.name));
  const [zoom, setZoom] = useState(0);
  const [open, setOpen] = useState(null); // nomor gedung yang rinciannya dibuka
  const scroller = useRef(null);
  const { buildings, unplaced } = useMemo(() => {
    if (!conf) return { buildings: [], unplaced: [] };
    const used = new Set();
    const list = conf.buildings.map((b) => {
      const names = new Set(b.match.map(mapName));
      const rooms = c.rooms.filter((r) => r.planned && !used.has(r.key) && (names.has(mapName(r.name)) || names.has(mapName(r.area))));
      rooms.forEach((r) => used.add(r.key));
      return { ...b, rooms, planned: rooms.reduce((n, r) => n + r.planned, 0), done: rooms.reduce((n, r) => n + r.done, 0) };
    }).filter((b) => b.rooms.length);
    return { buildings: list, unplaced: c.rooms.filter((r) => r.planned && !used.has(r.key)) };
  }, [conf, c]);
  // gambar lebih tinggi dari kotak peta: mulai dari tengah sebaran titik, bukan dari tepi atas foto
  const centerOnPins = (img) => {
    const box = scroller.current;
    if (!box || !buildings.length) return;
    const y = buildings.reduce((n, b) => n + b.y, 0) / buildings.length;
    box.scrollTop = (y / 100) * img.clientHeight - box.clientHeight / 2;
  };
  if (!conf) return null;
  const sel = buildings.find((b) => b.no === open);
  const need = buildings.filter((b) => b.done < b.planned).sort((x, y) => x.done / x.planned - y.done / y.planned);
  return (
    <section className="card">
      <div className="card-head">
        <div><h2 className="card-title">Peta kampus</h2>
          <div className="card-sub">Titik = gedung dengan banner yang direncanakan · angka = terpasang / direncanakan · klik titik untuk rinciannya</div></div>
        <div className="kr-map-zoom">
          <button type="button" className="btn btn-sm" onClick={() => setZoom(zoom - 1)} disabled={zoom === 0} aria-label="Perkecil peta">−</button>
          <button type="button" className="btn btn-sm" onClick={() => setZoom(zoom + 1)} disabled={zoom === MAP_ZOOMS.length - 1} aria-label="Perbesar peta">+</button>
        </div>
      </div>
      <div className="kr-map-legend">
        <span><i className="crit" />belum ada banner</span><span><i className="warn" />sebagian terpasang</span><span><i className="ok" />semua terpasang</span>
      </div>
      <div className="kr-map-wrap">
        <div className="kr-map-scroll" ref={scroller}>
          <div className="kr-map" style={{ width: MAP_ZOOMS[zoom] * 100 + "%" }}>
            <img src={import.meta.env.BASE_URL + conf.image} width={conf.width} height={conf.height} alt={`Foto udara ${c.label}`} onLoad={(e) => centerOnPins(e.currentTarget)} />
            {buildings.map((b) => (
              <button type="button" key={b.no} className={"kr-pin " + pinTone(b) + (open === b.no ? " on" : "")}
                style={{ left: b.x + "%", top: b.y + "%" }} onClick={() => setOpen(open === b.no ? null : b.no)} aria-pressed={open === b.no}
                aria-label={`${b.name}: ${b.done} dari ${b.planned} banner terpasang`} title={b.name}>{b.done}/{b.planned}</button>
            ))}
          </div>
        </div>
        <aside className="kr-map-side" aria-live="polite">
          {sel ? (
            <div className="kr-map-detail">
              <h3>{sel.name}</h3>
              <small>No. {sel.no} di peta · {sel.done} dari {sel.planned} banner terpasang</small>
              <ul>{sel.rooms.map((r) => {
                const missing = themes.filter((t) => r.st[t] === false).map((t) => t.replace(/^Etika /, ""));
                return (
                  <li key={r.key}><b>{r.name}</b><span className={"kr-map-n " + pinTone(r)}>{r.done}/{r.planned}</span>
                    <small>{missing.length ? `Belum: ${missing.join(", ")}` : "Semua banner terpasang"}</small></li>
                );
              })}</ul>
              <div className="kr-row">
                <button type="button" className="btn btn-sm" onClick={() => onShow({ label: sel.name, keys: new Set(sel.rooms.map((r) => r.key)) })}>
                  <Icon name="search" size={14} />Tampilkan di tabel</button>
                <button type="button" className="btn btn-sm" onClick={() => setOpen(null)}>Tutup</button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="kr-map-h">Perlu banner ({need.length} gedung)</h3>
              {need.length ? <ul className="kr-map-need">{need.map((b) => (
                <li key={b.no}><button type="button" className="link-btn" onClick={() => setOpen(b.no)}>{b.name}</button>
                  <span className={"kr-map-n " + pinTone(b)}>{b.done}/{b.planned}</span></li>
              ))}</ul> : <p className="kr-muted">Semua gedung di peta sudah lengkap.</p>}
            </>
          )}
          {unplaced.length > 0 && (
            <details className="kr-map-off">
              <summary>Tidak ada di peta ({unplaced.length} lokasi)</summary>
              <ul>{unplaced.map((r) => (
                <li key={r.key}><span>{r.name}<small>{r.area}</small></span><span className={"kr-map-n " + pinTone(r)}>{r.done}/{r.planned}</span></li>
              ))}</ul>
            </details>
          )}
          <p className="kr-muted kr-small">Foto udara: peta resmi ITB, KK Inderaja &amp; SIG FITB (Desember 2016); gedung baru belum terlihat.</p>
        </aside>
      </div>
    </section>
  );
}

// Perubahan draf satu lokasi: { note: { previous, value }, st: { tema: { previous, done } } }. previous = isi saat mulai diubah.
const noteEdited = (d) => Boolean(d.note) && d.note.value.trim() !== d.note.previous.trim();
const bannerEdits = (d) => Object.entries(d.st).filter(([, s]) => s.done !== s.previous);
const editCount = (d) => (noteEdited(d) ? 1 : 0) + bannerEdits(d).length;

// Centang dan catatan per lokasi: diubah di tabel, disimpan sekaligus lewat bilah Simpan. Hanya akun Kelola laporan,
// dan hanya saat data terbaru dari spreadsheet sudah termuat (bukan data cadangan).
function useMappingEdits(map, setSaved) {
  const session = useAuthStore((s) => s.session);
  const canEdit = canManageReports(session) && map.source === "live";
  const [drafts, setDrafts] = useState({});
  const [conflicts, setConflicts] = useState({});
  const [busy, setBusy] = useState(false);
  const dirty = Object.entries(drafts).filter(([, d]) => editCount(d) > 0);
  const count = dirty.reduce((n, [, d]) => n + editCount(d), 0);

  // spreadsheet terbaca ulang: perubahan yang baru disimpan sudah ada di data, tidak perlu ditimpa lagi
  useEffect(() => setSaved({}), [map.updatedAt]);

  const editNote = (r, value) => setDrafts((all) => {
    const d = all[r.key] || { st: {} };
    return { ...all, [r.key]: { ...d, note: { previous: d.note?.previous ?? r.note, value } } };
  });
  const editBanner = (r, theme, done) => setDrafts((all) => {
    const d = all[r.key] || { st: {} };
    return { ...all, [r.key]: { ...d, st: { ...d.st, [theme]: { previous: d.st[theme]?.previous ?? r.st[theme], done } } } };
  });

  const save = async () => {
    setBusy(true);
    const changes = dirty.map(([key, d]) => {
      const [year, campus, area, location] = JSON.parse(key);
      const change = { key, year, campus, area, location };
      if (noteEdited(d)) { change.previous = d.note.previous; change.note = d.note.value.trim(); }
      const banners = bannerEdits(d).map(([theme, s]) => ({ theme, previous: s.previous, done: s.done }));
      if (banners.length) change.banners = banners;
      return change;
    });
    let out = null;
    try { out = await saveMappingChanges(session.token, changes); } catch (err) { console.error("[mapping] simpan perubahan gagal:", err); }
    setBusy(false);
    if (!out?.ok) {
      if (out) console.error("[mapping] Apps Script menolak:", out.code, out.error);
      toast(SAVE_FAIL[out?.code] || "Perubahan belum tersimpan. Coba lagi beberapa saat lagi.", "err");
      return;
    }
    const ok = out.results.filter((x) => x.ok);
    const clash = out.results.filter((x) => x.code === "conflict");
    const lost = out.results.filter((x) => !x.ok && x.code !== "conflict");
    setSaved((all) => {
      const next = { ...all };
      [...ok, ...clash].forEach((x) => {
        const st = Object.fromEntries(Object.entries(x.st).map(([t, done]) => [t.toLowerCase(), done]));
        next[x.key] = { note: x.note, noteAt: x.noteAt || "", noteBy: x.noteBy || "", st: { ...all[x.key]?.st, ...st } };
      });
      return next;
    });
    setDrafts((all) => {
      const next = { ...all };
      ok.forEach((x) => delete next[x.key]);
      // isi sheet terbaru jadi pembanding; perubahan pengguna tetap ada untuk diperiksa lalu disimpan lagi
      clash.forEach((x) => {
        const d = next[x.key];
        if (!d) return;
        next[x.key] = {
          note: noteEdited(d) ? { ...d.note, previous: x.note } : undefined,
          st: Object.fromEntries(Object.entries(d.st).map(([t, s]) => [t, t in x.st ? { ...s, previous: x.st[t] } : s])),
        };
      });
      return next;
    });
    setConflicts(Object.fromEntries(clash.map((x) => [x.key, true])));
    if (ok.length) toast(`Perubahan di ${ok.length} lokasi tersimpan.`);
    if (clash.length) toast(`${clash.length} lokasi sudah diubah orang lain di spreadsheet. Periksa isinya, lalu simpan lagi.`, "err");
    if (lost.length) {
      console.error("[mapping] lokasi tidak ditemukan di sheet:", lost);
      toast(`${lost.length} lokasi tidak ditemukan lagi di spreadsheet Tim Humas, jadi perubahannya tidak disimpan.`, "err");
    }
    map.reload();
  };

  const cancel = async () => {
    const yes = await confirmAction({ title: "Batalkan perubahan?", body: `${count} perubahan yang belum disimpan akan dihapus.`, confirmText: "Batalkan perubahan", danger: true });
    if (yes) { setDrafts({}); setConflicts({}); }
  };

  // perubahan belum disimpan: tanya dulu sebelum pindah halaman atau menutup tab
  const blocker = useBlocker(dirty.length > 0 && !busy);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    confirmAction({ title: "Tinggalkan halaman?", body: "Perubahan yang belum disimpan akan hilang.", confirmText: "Tinggalkan", danger: true })
      .then((leave) => (leave ? blocker.proceed() : blocker.reset()));
  }, [blocker.state]);
  useEffect(() => {
    if (!dirty.length) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty.length > 0]);

  return {
    canEdit, conflicts, dirty, count, busy, editNote, editBanner, save, cancel,
    noteOf: (r) => drafts[r.key]?.note?.value ?? r.note,
    doneOf: (r, t) => drafts[r.key]?.st[t]?.done ?? r.st[t],
    rowDirty: (r) => Boolean(drafts[r.key] && editCount(drafts[r.key])),
    editedThemes: (r) => (drafts[r.key] ? bannerEdits(drafts[r.key]).map(([t]) => t) : []),
  };
}

function MappingMatrix({ campus: c, themes, edits, only, onClearOnly }) {
  const [q, setQ] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);
  const changedOnly = onlyChanged && edits.dirty.length > 0;
  const term = q.trim().toLowerCase();
  const show = (a, r) => (!term || r.name.toLowerCase().includes(term) || a.name.toLowerCase().includes(term))
    && (!changedOnly || edits.rowDirty(r)) && (!only || only.keys.has(r.key));
  const areas = c.areas.map((a) => ({ ...a, shown: a.rooms.filter((r) => show(a, r)) })).filter((a) => a.shown.length);
  return (
    <section className="card" id="kr-matrix">
      <div className="card-head"><div>
        <h2 className="card-title">Peta keterpasangan per lokasi{edits.canEdit && <span className="kr-badge">Bisa diubah</span>}</h2>
        <div className="card-sub">{edits.canEdit
          ? "Centang = sudah terpasang · – = tidak direncanakan · klik kolom Catatan untuk menulis · tanggal tercatat otomatis saat disimpan"
          : "Hijau = sudah terpasang · kotak kosong = belum · – = tidak direncanakan · dikelompokkan per gedung / area"}</div>
      </div></div>
      <div className="kr-tools">
        <SearchInput value={q} onChange={setQ} placeholder="Cari lokasi / gedung" className="compact" delay={150} />
        {only && (
          <span className="kr-chip">Hanya {only.label}
            <button type="button" className="kr-chip-x" onClick={onClearOnly} aria-label={`Tampilkan semua gedung, bukan hanya ${only.label}`}><Icon name="x" size={13} /></button>
          </span>
        )}
        {edits.dirty.length > 0 && (
          <button type="button" className="btn btn-sm" aria-pressed={changedOnly} onClick={() => setOnlyChanged(!changedOnly)}>
            {changedOnly ? "Tampilkan semua lokasi" : "Tampilkan yang berubah"}
          </button>
        )}
      </div>
      {areas.length ? (
        <div className="tbl-scroll"><table className="tbl compact kr-matrix">
          <thead><tr><th>Lokasi</th>{themes.map((t) => <th key={t} className="c">{t.replace(/^Etika /, "")}</th>)}<th className="num">Terpasang</th>
            <th className="kr-note-col">Catatan</th><th className="kr-stamp-col">Terakhir diperbarui</th></tr></thead>
          <tbody>{areas.map((a) => [
            <tr key={a.name} className="kr-group"><td colSpan={themes.length + 4}>{a.name}</td></tr>,
            ...a.shown.map((r) => <MappingRow key={r.key} r={r} themes={themes} edits={edits} />),
          ])}</tbody>
        </table></div>
      ) : <p className="kr-muted kr-empty">{only ? `Tidak ada lokasi ${only.label} yang cocok dengan pencarian.` : "Tidak ada lokasi yang cocok dengan pencarian."}</p>}
    </section>
  );
}

function MappingRow({ r, themes, edits }) {
  const dirty = edits.rowDirty(r);
  const done = Object.keys(r.st).filter((t) => edits.doneOf(r, t)).length; // ikut berubah saat dicentang, sebelum disimpan
  const sheetNow = [`catatan: ${r.note || "(kosong)"}`, ...edits.editedThemes(r).map((t) => `${t}: ${r.st[t] ? "sudah" : "belum"}`)].join(" · ");
  return (
    <tr className={dirty ? "kr-dirty" : undefined}>
      <td className="kr-room">{r.name}</td>
      {themes.map((t) => (
        <td key={t} className="c">{!(t in r.st)
          ? <span className="kr-na" title={`${t}: tidak direncanakan`}>–</span>
          : edits.canEdit
            ? <label className="kr-check" title={`${t}: ${edits.doneOf(r, t) ? "sudah" : "belum"}`}>
              <input type="checkbox" checked={edits.doneOf(r, t)} disabled={edits.busy} aria-label={`${t}, ${r.name}`}
                onChange={(e) => edits.editBanner(r, t, e.target.checked)} /></label>
            : <span className={"kr-dot" + (r.st[t] ? " on" : "")} title={`${t}: ${r.st[t] ? "sudah" : "belum"}`} />}</td>
      ))}
      <td className={"num cell-strong " + (done ? "" : "kr-bad")}>{done}/{r.planned}</td>
      <td className="kr-note-cell">{edits.canEdit
        ? <textarea className="kr-note-input" rows={1} maxLength={500} value={edits.noteOf(r)} placeholder="Tambah catatan…" disabled={edits.busy}
          aria-label={`Catatan ${r.name}`} onChange={(e) => edits.editNote(r, e.target.value)} />
        : r.note ? <span className="kr-note">{r.note}</span> : <span className="kr-na">–</span>}</td>
      <td className="kr-stamp">{edits.conflicts[r.key] && dirty
        ? <span className="kr-unsaved" title={`Isi di spreadsheet sekarang: ${sheetNow}`}>Diubah orang lain · periksa</span>
        : dirty ? <span className="kr-unsaved">Belum disimpan</span>
          : r.noteAt ? <><b>{fmtStamp(r.noteAt)}</b>{r.noteBy && <small>{r.noteBy}</small>}</> : <span className="kr-na">–</span>}</td>
    </tr>
  );
}

/* ---------------- 3. Diskusi Interaktif & Dokumentasi ---------------- */
function Diskusi() {
  const rows = DISCUSSIONS;
  return (
    <>
      <PageHead title="Diskusi Interaktif" sub="Sesi diskusi bersama mahasiswa TPB beserta ringkasannya" />
      <section className="card">
        {!rows.length ? (
          <EmptyState icon="message" title="Belum ada data Diskusi Interaktif">Sesi, narasumber, jumlah peserta, dan ringkasan diambil dari sheet Diskusi.</EmptyState>
        ) : rows.map((d) => (
          <article key={d.title + d.date} className="kr-session"><b>{d.title}</b><span className="kr-muted">{d.date} · {d.speaker}</span><p>{d.summary}</p></article>
        ))}
      </section>
    </>
  );
}

const DOC_SHOWN = 12; // foto/video per kegiatan sebelum "Tampilkan semua"
const docMedia = (d) => [...d.videos.map((v) => ({ ...v, video: true })), ...d.photos.map((id) => ({ id }))];

function Dokumentasi({ year, picker }) {
  const [program, setProgram] = useState("all");
  const [open, setOpen] = useState({}); // kegiatan yang galerinya dibuka penuh
  const [view, setView] = useState(null); // { doc, at } untuk tampilan besar
  const ofYear = DOCUMENTATION.filter((d) => d.date.startsWith(year)).sort((a, b) => b.date.localeCompare(a.date));
  const rows = ofYear.filter((d) => program === "all" || d.program === program);
  const count = (key) => rows.reduce((n, d) => n + d[key].length, 0);
  const programs = [["all", "Semua"], ...KARAKTER_PROGRAMS.map((p) => [p.key, p.short.replace(/ \(.*\)$/, "")])];
  return (
    <>
      <PageHead title={<>Dokumentasi Kegiatan <span className="title-prog">{year}</span></>} sub="Foto dan video seluruh kegiatan Pembinaan Karakter TPB">{picker}</PageHead>
      <div className="kr-row">
        <Segmented label="Program" value={program} onChange={setProgram} options={programs} />
        <a className="btn" href={driveFolder(DOCUMENTATION_FOLDER)} target="_blank" rel="noreferrer"><Icon name="folder" size={16} />Buka folder Google Drive</a>
      </div>
      {!rows.length ? (
        <section className="card"><EmptyState icon="folder" title={`Belum ada dokumentasi ${year}`}>Foto dan video diambil dari folder DOKUMENTASI di Google Drive.</EmptyState></section>
      ) : <>
        <div className="kpi-row kr-three">
          <Kpi icon="calendar" label="Kegiatan" value={rows.length} hint={rows.map((d) => d.title).join(" · ")} />
          <Kpi icon="eye" label="Foto" value={fmtNum(count("photos"))} />
          <Kpi icon="star" label="Video" value={fmtNum(count("videos"))} />
        </div>
        {rows.map((d) => {
          const media = docMedia(d);
          const shown = open[d.id] ? media : media.slice(0, DOC_SHOWN);
          const prog = KARAKTER_PROGRAMS.find((p) => p.key === d.program);
          return (
            <section key={d.id} className="card">
              <div className="card-head">
                <div><h2 className="card-title">{d.title}</h2>
                  <div className="card-sub">{fmtDate(d.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    {prog && " · " + prog.short} · {d.photos.length} foto{d.videos.length ? ` · ${d.videos.length} video` : ""}</div></div>
                <a className="btn btn-sm" href={driveFolder(d.id)} target="_blank" rel="noreferrer"><Icon name="external" size={14} />Folder Drive</a>
              </div>
              <div className="kr-gallery">
                {shown.map((m, i) => (
                  <button key={m.id} type="button" className={"kr-tile" + (m.video ? " video" : "")} onClick={() => setView({ doc: d, at: i })}
                    aria-label={(m.video ? "Putar video " : "Lihat foto ") + (i + 1) + " " + d.title}>
                    <DriveImg id={m.id} w={480} lazy />
                    {m.video && <span className="kr-tile-play"><Icon name="right" size={18} /><small>{m.dur} dtk</small></span>}
                  </button>
                ))}
              </div>
              {media.length > DOC_SHOWN && (
                <button type="button" className="btn btn-sm kr-more" onClick={() => setOpen({ ...open, [d.id]: !open[d.id] })}>
                  {open[d.id] ? "Tampilkan lebih sedikit" : `Tampilkan semua (${media.length})`}
                </button>
              )}
            </section>
          );
        })}
      </>}
      {view && <MediaViewer doc={view.doc} at={view.at} onStep={(k) => setView((v) => ({ ...v, at: v.at + k }))} onClose={() => setView(null)} />}
    </>
  );
}

// Foto / video dokumentasi ukuran besar: panah kiri/kanan untuk berpindah, Esc untuk menutup.
function MediaViewer({ doc, at: raw, onStep, onClose }) {
  const media = docMedia(doc);
  const n = media.length;
  const at = ((raw % n) + n) % n;
  const m = media[at];
  const close = useRef(null);
  useEffect(() => { close.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onStep(1);
      if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep, onClose]);
  return createPortal(
    <div className="kr-modal" role="dialog" aria-modal="true" aria-label={doc.title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kr-modal-box kr-media-box">
        <div className="kr-modal-head">
          <b>{doc.title} · {at + 1} / {n}</b>
          <button ref={close} type="button" className="kr-close" onClick={onClose} aria-label="Tutup"><Icon name="x" size={18} /></button>
        </div>
        <div className="kr-media">
          {m.video
            ? <iframe key={m.id} src={drivePlayer(m.id)} title={doc.title} allow="autoplay; fullscreen" allowFullScreen />
            : <img key={m.id} src={driveThumb(m.id, 1600)} alt={`${doc.title} (${at + 1})`} referrerPolicy="no-referrer" />}
          {n > 1 && <>
            <button type="button" className="kr-arrow l" onClick={() => onStep(-1)} aria-label="Sebelumnya"><Icon name="left" size={18} /></button>
            <button type="button" className="kr-arrow r" onClick={() => onStep(1)} aria-label="Berikutnya"><Icon name="right" size={18} /></button>
          </>}
        </div>
        <div className="kr-book-nav">
          <span className="kr-muted">{fmtDate(doc.date, { day: "numeric", month: "long", year: "numeric" })} · {m.video ? "video" : "foto"}</span>
          <a className="btn btn-sm" href={driveFile(m.id)} target="_blank" rel="noreferrer">Buka di Drive<Icon name="external" size={14} /></a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
