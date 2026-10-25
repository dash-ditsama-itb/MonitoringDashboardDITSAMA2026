// Pembinaan Karakter TPB (dashboard Pendidikan Persiapan): beranda, 3 program, Mapping Banner, Dokumentasi.
// /pendidikan-persiapan/karakter[/ttb|kampanye|mapping|diskusi|dokumentasi]
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, useParams } from "react-router";
import { Icon } from "../../components/Icon.jsx";
import { Bar, EmptyState, Kpi, PageHead, Segmented } from "../../components/ui.jsx";
import {
  BANNER_THEMES, CAMPAIGN_BOOK, CAMPAIGN_YEAR, CAMPAIGN_POSTERS, CAMPAIGN_VIDEOS, DISCUSSIONS, DOCUMENTATION,
  KARAKTER_ABOUT, KARAKTER_BASE, KARAKTER_API_URL, KARAKTER_PROGRAMS, KARAKTER_YEARS, MAPPING_FALLBACK, TTB, TTB_LIVE_YEAR, mappingFallbackItems,
  driveFolder, driveThumb, drivePlayer,
} from "../../lib/karakter.js";
import { fmtNum } from "../../lib/format.js";
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
      <nav className="kr-crumb" aria-label="Lokasi halaman">
        <span>Pendidikan Persiapan</span>
        {section ? <Link to={KARAKTER_BASE}>Pembinaan Karakter TPB</Link> : <span>Pembinaan Karakter TPB</span>}
        {info.parent && <Link to={`${KARAKTER_BASE}/${info.parent}`}>{SECTIONS[info.parent].title}</Link>}
        {section && <span aria-current="page">{info.title}</span>}
      </nav>
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
function Beranda({ year, picker }) {
  // sementara slideshow memakai video kampanye; nanti foto/video dari tab Dokumentasi
  const highlights = DOCUMENTATION.length ? DOCUMENTATION : CAMPAIGN_VIDEOS;
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
      <div className="kr-progs">
        {KARAKTER_PROGRAMS.map((p) => (
          <Link key={p.key} to={`${KARAKTER_BASE}/${p.key}`} className={"kr-prog " + p.tone}>
            <span className="kr-prog-head"><span className="kr-ic"><Icon name={p.icon} size={20} /></span><b>{p.no}. {p.title}</b></span>
            <span className="kr-prog-desc">{p.desc}</span>
            <span className="kr-chips">{p.chips.map((c) => <span key={c}>{c}</span>)}</span>
            <span className="kr-go">Buka program<Icon name="right" size={15} /></span>
          </Link>
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
  useEffect(() => {
    if (!live) return undefined;
    let off = false;
    fetch(KARAKTER_API_URL + (KARAKTER_API_URL.includes("?") ? "&" : "?") + "data=" + key)
      .then((r) => r.json())
      .then((j) => {
        if (off || !j?.ok) return;
        setData(j); setFresh(true);
        try { localStorage.setItem(liveKey(key), JSON.stringify(j)); } catch { /* penyimpanan browser tidak tersedia */ }
      })
      .catch(() => {});
    return () => { off = true; };
  }, [key, live]);
  return live && data ? { data, source: fresh ? "live" : "cache" } : { data: null, source: "static" };
}

function useTtb(year) {
  const { data, source } = useLiveData("ttb", year === TTB_LIVE_YEAR);
  const base = TTB[year];
  if (!base) return null;
  return data ? { ...base, ...data, source } : { ...base, source };
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
        <Kpi icon="layers" label="Kelompok pembinaan" value={fmtNum(d.groups)} hint={`target ${d.targetMeetings} pertemuan per kelompok`} />
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
          <li><b>{fmtNum(d.mentors)}</b><span>Pementor</span><small>sebagian memegang 2 kelompok</small></li>
          <li><b>{fmtNum(d.groups)}</b><span>Kelompok</span><small>target {d.targetMeetings} pertemuan</small></li>
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
    if (!r) a.rooms.push(r = { name: it.location, area: it.area, note: "", st: {} });
    r.st[themeOf(it.theme)] = Boolean(it.done);
    if (it.note) r.note = it.note;
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
function useMapping(year) {
  const { data, source } = useLiveData("mapping");
  const items = data?.items || FALLBACK_ITEMS;
  const grouped = useMemo(() => groupMapping(items, year), [items, year]);
  return { ...grouped, source, updatedAt: data?.updatedAt, asOf: MAPPING_FALLBACK.asOf };
}

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
  const map = useMapping(year);
  const [campus, setCampus] = useState(null);
  const c = map.campuses.find((x) => x.key === campus) || map.campuses[0];
  const themes = map.themes;
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
        <SourceChip source={map.source} updatedAt={map.updatedAt} asOf={map.asOf} sheet="Lokasi Kampanye" />
      </div>
      {map.campuses.length > 1 && <Segmented label="Kampus" value={c.key} onChange={setCampus} options={map.campuses.map((x) => [x.key, x.label])} />}
      {!c ? (
        <section className="card"><EmptyState icon="pin" title={`Belum ada data Mapping Banner ${year}`}>Data diambil dari tab Lokasi Kampanye di spreadsheet TTB (menu Pembaruan Data → Perbarui data lokasi kampanye).</EmptyState></section>
      ) : (
        <>
          <div className="kpi-row">
            <Kpi icon="pin" label="Lokasi dipantau" value={fmtNum(c.rooms.length)} hint={`${c.areas.length} gedung / area`} />
            <Kpi icon="checkCircle" label="Banner terpasang" value={`${fmtNum(c.done)} / ${fmtNum(c.planned)}`} hint={`${pct(c.planned ? (c.done / c.planned) * 100 : 0)} dari banner yang direncanakan`} />
            <Kpi icon="star" label="Lokasi sudah lengkap" value={fmtNum(c.complete.length)} hint="semua banner yang direncanakan sudah terpasang" />
            <Kpi icon="alert" label="Lokasi belum ada banner" tone="t-neg" value={fmtNum(c.empty.length)} hint={`dari ${fmtNum(c.rooms.length)} lokasi`} />
          </div>
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
          <section className="card">
            <div className="card-head"><div><h2 className="card-title">Peta keterpasangan per lokasi</h2>
              <div className="card-sub">Hijau = sudah terpasang · kotak kosong = belum · – = tidak direncanakan · dikelompokkan per gedung / area</div></div></div>
            <div className="tbl-scroll"><table className="tbl compact kr-matrix">
              <thead><tr><th>Lokasi</th>{themes.map((t) => <th key={t} className="c">{t.replace(/^Etika /, "")}</th>)}<th className="num">Terpasang</th></tr></thead>
              <tbody>{c.areas.map((a) => [
                <tr key={a.name} className="kr-group"><td colSpan={themes.length + 2}>{a.name}</td></tr>,
                ...a.rooms.map((r) => (
                  <tr key={a.name + r.name}><td className="kr-room" title={r.note || undefined}>{r.name}{r.note && <small className="kr-note">{r.note}</small>}</td>
                    {themes.map((t) => (
                      <td key={t} className="c">{t in r.st
                        ? <span className={"kr-dot" + (r.st[t] ? " on" : "")} title={`${t}: ${r.st[t] ? "sudah" : "belum"}`} />
                        : <span className="kr-na" title={`${t}: tidak direncanakan`}>–</span>}</td>
                    ))}
                    <td className={"num cell-strong " + (r.done ? "" : "kr-bad")}>{r.done}/{r.planned}</td></tr>
                )),
              ])}</tbody>
            </table></div>
          </section>
        </>
      )}
    </>
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

function Dokumentasi({ year, picker }) {
  const rows = DOCUMENTATION.filter((d) => String(d.year) === year);
  return (
    <>
      <PageHead title={<>Dokumentasi Kegiatan <span className="title-prog">{year}</span></>} sub="Foto dan video seluruh kegiatan Pembinaan Karakter TPB">{picker}</PageHead>
      <section className="card">
        {!rows.length ? (
          <EmptyState icon="folder" title={`Belum ada dokumentasi ${year}`}>Foto dan video diambil dari sheet Dokumentasi (link Google Drive).</EmptyState>
        ) : (
          <div className="kr-gallery">{rows.map((d) => (
            <a key={d.id} href={driveFolder(d.id)} target="_blank" rel="noreferrer"><DriveImg id={d.id} w={480} lazy /><b>{d.title}</b></a>
          ))}</div>
        )}
      </section>
    </>
  );
}
