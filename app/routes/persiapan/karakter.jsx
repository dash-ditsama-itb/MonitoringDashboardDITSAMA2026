// Pembinaan Karakter TPB (dashboard Pendidikan Persiapan): beranda, 3 program, Mapping Banner, Dokumentasi.
// /pendidikan-persiapan/karakter[/ttb|kampanye|mapping|diskusi|dokumentasi]
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { Icon } from "../../components/Icon.jsx";
import { Bar, EmptyState, Kpi, PageHead, Segmented } from "../../components/ui.jsx";
import {
  BANNER_THEMES, CAMPAIGN_EBOOK, CAMPAIGN_YEAR, CAMPAIGN_POSTERS, CAMPAIGN_VIDEO_TOTAL, CAMPAIGN_VIDEOS, DISCUSSIONS, DOCUMENTATION,
  KARAKTER_ABOUT, KARAKTER_BASE, KARAKTER_PROGRAMS, KARAKTER_YEARS, MAPPING_CAMPUSES, TTB, TTB_STAGES,
  driveFolder, drivePreview, driveThumb,
} from "../../lib/karakter.js";
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
  diskusi: { title: "Diskusi Interaktif", page: Diskusi, year: "2025" },
  dokumentasi: { title: "Dokumentasi Kegiatan", page: Dokumentasi },
};
const pct = (v) => Number(v).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%";

export default function Karakter() {
  const { section = "" } = useParams();
  const info = SECTIONS[section];
  const defaultYear = info?.year || "2026";
  const [year, setYear] = useState(defaultYear);
  // pindah halaman: kembali ke tahun default halaman itu
  useEffect(() => setYear(defaultYear), [section, defaultYear]);
  if (!info) return <Navigate to={KARAKTER_BASE} replace />;
  const Page = info.page;
  const picker = <Segmented label="Tahun" value={year} onChange={setYear} options={KARAKTER_YEARS.map((y) => [y, "Tahun " + y])} />;
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

function Slideshow({ items, label }) {
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const n = items.length;
  // berganti otomatis sampai pengguna memutar video
  useEffect(() => {
    if (playing || n < 2) return undefined;
    const t = setInterval(() => setAt((v) => (v + 1) % n), 6000);
    return () => clearInterval(t);
  }, [playing, n]);
  if (!n) return null;
  const it = items[at % n];
  const pick = (k) => { setAt((k + n) % n); setPlaying(false); };
  return (
    <section className="kr-show" aria-label={label}>
      <div className="kr-stage">
        {playing ? (
          <iframe src={drivePreview(it.id)} title={it.title} allow="autoplay; fullscreen" allowFullScreen referrerPolicy="no-referrer" />
        ) : (
          <>
            <DriveImg key={it.id} id={it.id} w={1280} />
            <button type="button" className="kr-play" onClick={() => setPlaying(true)} aria-label={"Putar video " + it.title}>
              <span aria-hidden="true" />
            </button>
            <div className="kr-cap"><b>{it.title}</b>{it.by && <span>{it.by}</span>}</div>
          </>
        )}
        <span className="kr-badge">{label}</span>
        <span className="kr-count">{(at % n) + 1} / {n}</span>
        {n > 1 && <>
          <button type="button" className="kr-arrow l" onClick={() => pick(at - 1)} aria-label="Sebelumnya"><Icon name="left" size={18} /></button>
          <button type="button" className="kr-arrow r" onClick={() => pick(at + 1)} aria-label="Berikutnya"><Icon name="right" size={18} /></button>
        </>}
      </div>
      <div className="kr-thumbs">
        {items.map((v, k) => (
          <button key={v.id} type="button" className={"kr-thumb" + (k === at % n ? " on" : "")} onClick={() => pick(k)} aria-pressed={k === at % n}>
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
        <span className="kr-muted">Klik gambar di atas untuk memutar, atau biarkan berganti otomatis.</span>
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
function Ring({ value, label, hint, tone }) {
  return (
    <div className="card kr-ring-card">
      <div className={"kr-ring " + tone} style={{ "--p": Math.min(100, value) }}><span>{pct(value)}</span></div>
      <b>{label}</b><small>{hint}</small>
    </div>
  );
}

function Ttb({ year, picker }) {
  const session = useAuthStore((s) => s.session);
  const d = TTB[year];
  const head = <PageHead title={<>Teman Tumbuh Bersama TPB ITB <span className="title-prog">{year}</span></>}
    sub="Mentor ke mentee, dosen pembina ke pementor · sekitar 1 semester">{picker}</PageHead>;
  if (!d) return <>{head}<section className="card"><EmptyState icon="users" title={`Belum ada data TTB ${year}`}>Data diambil dari sheet Ringkasan program TTB.</EmptyState></section></>;
  const totalMeetings = d.groups * d.targetMeetings;
  const held = Math.round((totalMeetings * d.realization) / 100);
  const avgHeld = (d.targetMeetings * d.realization) / 100; // rata-rata pertemuan per kelompok
  const stage = d.groupsDone >= d.groups ? 3 : 2;
  const problems = d.checks.filter(([, n]) => n > 0).length;
  return (
    <>
      {head}
      <div className="kpi-row">
        <Kpi icon="users" label="Total mahasiswa TPB (sasaran)" value={fmtNum(d.students)} hint="jumlah mahasiswa seluruh kelompok" />
        <Kpi icon="layers" label="Kelompok pembinaan" value={fmtNum(d.groups)} hint={`target ${d.targetMeetings} pertemuan per kelompok`} />
        <Kpi icon="userCheck" label="Pementor aktif" value={fmtNum(d.mentors)} hint="pementor unik" />
        <Kpi icon="grad" label="Dosen pembina" value={fmtNum(d.lecturers)} hint="dosen pembina unik" />
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
        <Ring value={d.realization} tone="blue" label="Realisasi kegiatan" hint={`${fmtNum(held)} dari ${fmtNum(totalMeetings)} pertemuan`} />
        <Ring value={d.reportCompleteness} tone="violet" label="Kelengkapan laporan" hint="kelompok yang sudah lapor (lengkap / sebagian)" />
        <Ring value={d.studentAttendance} tone="orange" label="Kehadiran mahasiswa" hint="total hadir ÷ (mahasiswa × pertemuan)" />
        <Ring value={d.mentorAttendance} tone="green" label="Kehadiran pementor" hint="pertemuan dengan pementor hadir" />
      </div>
      <section className="card">
        <div className="card-head">
          <div><h2 className="card-title">Timeline program</h2>
            <div className="card-sub">Satu semester · rata-rata {avgHeld.toLocaleString("id-ID", { maximumFractionDigits: 1 })} dari {d.targetMeetings} pertemuan per kelompok sudah terlaksana</div></div>
          <span className="kr-pill warn">Kelompok selesai target: {fmtNum(d.groupsDone)} dari {fmtNum(d.groups)}</span>
        </div>
        <ol className="kr-stages" style={{ "--done": (stage / (TTB_STAGES.length - 1)) * 100 }}>
          {TTB_STAGES.map(([t, s], i) => (
            <li key={t} className={i < stage ? "done" : i === stage ? "now" : ""}><b>{t}</b><span>{i === 2 ? `berjalan (1–${d.targetMeetings})` : s}</span></li>
          ))}
        </ol>
        <div className="kr-meet" aria-label={`Rata-rata ${avgHeld.toFixed(1)} pertemuan terlaksana`}>
          {Array.from({ length: d.targetMeetings }, (_, i) => {
            const fill = Math.max(0, Math.min(1, avgHeld - i));
            return <span key={i} style={{ "--f": fill * 100 + "%" }} className={fill >= 1 ? "full" : ""}>{i + 1}</span>;
          })}
        </div>
        <p className="kr-muted kr-small">Hijau = rata-rata pertemuan yang sudah terlaksana per kelompok.</p>
      </section>
      {canManageReports(session) && (
        <section className="card">
          <div className="card-head"><div><h2 className="card-title">Pemeriksaan data</h2>
            <div className="card-sub">Untuk tim yang memperbarui spreadsheet · {problems ? `${problems} pemeriksaan perlu dicek` : "semua aman"}</div></div></div>
          <div className="tbl-scroll"><table className="tbl compact">
            <thead><tr><th>Pemeriksaan</th><th>Masalah</th><th>Tindakan</th></tr></thead>
            <tbody>{d.checks.map(([t, n, a]) => (
              <tr key={t}><td>{t}</td><td className={n ? "kr-bad" : "kr-ok"}>{n ? `${n} masalah` : "Aman"}</td><td className="kr-muted">{a}</td></tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
    </>
  );
}

/* ---------------- 2. Kampanye Etika Mahasiswa ---------------- */
const mappingStats = (buildings) => {
  const rooms = buildings.flatMap((b) => b.rooms.map(([name, bits]) => ({ building: b.building, name, bits, count: [...bits].filter((c) => c === "1").length })));
  const placed = rooms.reduce((s, r) => s + r.count, 0);
  return { rooms, placed, slots: rooms.length * BANNER_THEMES.length, empty: rooms.filter((r) => !r.count) };
};

function Kampanye({ year, picker }) {
  const jtn = useMemo(() => mappingStats(MAPPING_CAMPUSES[0].data), []);
  const head = <PageHead title={<>Kampanye Etika Mahasiswa <span className="title-prog">{year}</span></>}
    sub="Video karya mahasiswa, poster & banner, buku panduan, dan sebaran banner di kampus">{picker}</PageHead>;
  if (year !== CAMPAIGN_YEAR) return <>{head}<section className="card"><EmptyState icon="star" title={`Belum ada data Kampanye Etika Mahasiswa ${year}`} /></section></>;
  return (
    <>
      {head}
      <Slideshow items={CAMPAIGN_VIDEOS} label="Video karya mahasiswa" />
      <div className="kr-row"><span className="kr-muted">{CAMPAIGN_VIDEOS.length} dari {CAMPAIGN_VIDEO_TOTAL} video karya mahasiswa · diputar langsung dari Google Drive</span></div>
      <section className="card">
        <div className="card-head"><div><h2 className="card-title">Katalog poster & banner</h2><div className="card-sub">Setiap tema berisi poster dan banner-nya · klik untuk membuka</div></div></div>
        <div className="kr-posters">
          {CAMPAIGN_POSTERS.map((p, i) => (
            <a key={p.id} className={"kr-poster t" + (i % 6)} href={driveFolder(p.id)} target="_blank" rel="noreferrer">
              <span className="kr-poster-img">{p.title}</span>
              <span className="kr-poster-body"><b>{p.theme}</b><span className="kr-go">Lihat poster & banner<Icon name="external" size={14} /></span></span>
            </a>
          ))}
        </div>
      </section>
      <div className="grid g-2">
        <section className="card">
          <div className="card-head"><div><h2 className="card-title">{CAMPAIGN_EBOOK.title}</h2><div className="card-sub">E-book · Direktorat Persiapan Bersama</div></div></div>
          <div className="kr-ebook">
            <img src={import.meta.env.BASE_URL + CAMPAIGN_EBOOK.cover} alt={"Sampul " + CAMPAIGN_EBOOK.title} />
            <div>
              <p className="kr-about">{CAMPAIGN_EBOOK.desc}</p>
              {CAMPAIGN_EBOOK.url
                ? <a className="btn btn-primary" href={CAMPAIGN_EBOOK.url} target="_blank" rel="noreferrer"><Icon name="book" size={16} />Baca e-book</a>
                : <span className="kr-muted">Link e-book menyusul.</span>}
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><div><h2 className="card-title">Mapping banner di kampus</h2><div className="card-sub">Pantau banner yang sudah dan belum terpasang</div></div></div>
          <div className="kpi-row kr-two">
            <Kpi label="Banner terpasang · Jatinangor" value={`${jtn.placed} / ${jtn.slots}`} hint={`${pct((jtn.placed / jtn.slots) * 100)} dari ${jtn.rooms.length} lokasi × ${BANNER_THEMES.length} tema`} />
            <Kpi label="Lokasi belum ada banner" value={jtn.empty.length} tone="t-neg" hint="perlu dipasang" />
          </div>
          <Link className="btn" to={`${KARAKTER_BASE}/mapping`}><Icon name="pin" size={16} />Buka dashboard mapping</Link>
        </section>
      </div>
    </>
  );
}

/* ---------------- Mapping Banner ---------------- */
function Mapping({ year, picker }) {
  const [campus, setCampus] = useState(MAPPING_CAMPUSES[0].key);
  const c = MAPPING_CAMPUSES.find((x) => x.key === campus);
  const st = useMemo(() => mappingStats(c.data), [c]);
  const byTheme = BANNER_THEMES.map((t, i) => [t, st.rooms.filter((r) => r.bits[i] === "1").length]).sort((a, b) => b[1] - a[1]);
  const n = st.rooms.length;
  const tone = (share) => (share < 0.35 ? "crit" : share < 0.6 ? "warn" : "ok");
  return (
    <>
      <PageHead title={<>Mapping Banner <span className="title-prog">{year}</span></>} sub="Sebaran banner Kampanye Etika Mahasiswa per lokasi kampus">{picker}</PageHead>
      <Segmented label="Kampus" value={campus} onChange={setCampus} options={MAPPING_CAMPUSES.map((x) => [x.key, x.label])} />
      {year !== CAMPAIGN_YEAR || !n ? (
        <section className="card"><EmptyState icon="pin" title={`Belum ada data ${c.label} ${year}`}>Isi data lokasi banner kampus ini di sheet Mapping Banner.</EmptyState></section>
      ) : (
        <>
          <div className="kpi-row">
            <Kpi icon="pin" label="Lokasi dipantau" value={n} hint={`${c.data.length} gedung / area`} />
            <Kpi icon="checkCircle" label="Banner terpasang" value={`${st.placed} / ${st.slots}`} hint={`${pct((st.placed / st.slots) * 100)} dari ${n} lokasi × ${BANNER_THEMES.length} tema`} />
            <Kpi icon="star" label="Lokasi lengkap 7 tema" value={st.rooms.filter((r) => r.count === BANNER_THEMES.length).length} />
            <Kpi icon="alert" label="Lokasi belum ada banner" tone="t-neg" value={st.empty.length} hint={st.empty.map((r) => r.name).join(", ")} />
          </div>
          <div className="grid g-2">
            <section className="card">
              <div className="card-head"><div><h2 className="card-title">Keterpasangan per tema</h2><div className="card-sub">Jumlah lokasi yang sudah ada banner tema itu (dari {n})</div></div></div>
              <ul className="kr-bars">{byTheme.map(([t, k]) => (
                <li key={t}><span>{t}</span><Bar value={(k / n) * 100} tone={tone(k / n)} /><b>{k} · {Math.round((k / n) * 100)}%</b></li>
              ))}</ul>
            </section>
            <section className="card">
              <div className="card-head"><div><h2 className="card-title">Prioritas pemasangan</h2><div className="card-sub">Lokasi dengan banner paling sedikit</div></div></div>
              <div className="tbl-scroll"><table className="tbl compact">
                <thead><tr><th>Lokasi</th><th>Gedung</th><th className="num">Terpasang</th></tr></thead>
                <tbody>{[...st.rooms].sort((a, b) => a.count - b.count).slice(0, 8).map((r) => (
                  <tr key={r.building + r.name}><td className="cell-strong">{r.name}</td><td className="kr-muted">{r.building}</td>
                    <td className={"num " + (r.count ? "" : "kr-bad")}>{r.count}/{BANNER_THEMES.length}</td></tr>
                ))}</tbody>
              </table></div>
            </section>
          </div>
          <section className="card">
            <div className="card-head"><div><h2 className="card-title">Peta keterpasangan per lokasi</h2><div className="card-sub">Hijau = banner sudah terpasang · dikelompokkan per gedung</div></div></div>
            <div className="tbl-scroll"><table className="tbl compact kr-matrix">
              <thead><tr><th>Lokasi</th>{BANNER_THEMES.map((t) => <th key={t} className="c">{t.replace(/^Etika /, "")}</th>)}<th className="num">Jumlah</th></tr></thead>
              <tbody>{c.data.map((b) => [
                <tr key={b.building} className="kr-group"><td colSpan={BANNER_THEMES.length + 2}>{b.building}</td></tr>,
                ...b.rooms.map(([name, bits]) => {
                  const k = [...bits].filter((x) => x === "1").length;
                  return (
                    <tr key={b.building + name}><td className="kr-room">{name}</td>
                      {[...bits].map((x, i) => <td key={i} className="c"><span className={"kr-dot" + (x === "1" ? " on" : "")} title={`${BANNER_THEMES[i]}: ${x === "1" ? "sudah" : "belum"}`} /></td>)}
                      <td className={"num cell-strong " + (k ? "" : "kr-bad")}>{k}/{BANNER_THEMES.length}</td></tr>
                  );
                }),
              ])}</tbody>
            </table></div>
          </section>
        </>
      )}
    </>
  );
}

/* ---------------- 3. Diskusi Interaktif & Dokumentasi ---------------- */
function Diskusi({ year, picker }) {
  const rows = DISCUSSIONS.filter((d) => String(d.year) === year);
  return (
    <>
      <PageHead title={<>Diskusi Interaktif <span className="title-prog">{year}</span></>} sub="Sesi diskusi bersama mahasiswa TPB beserta ringkasannya">{picker}</PageHead>
      <section className="card">
        {!rows.length ? (
          <EmptyState icon="message" title={`Belum ada data Diskusi Interaktif ${year}`}>Sesi, narasumber, jumlah peserta, dan ringkasan diambil dari sheet Diskusi.</EmptyState>
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
