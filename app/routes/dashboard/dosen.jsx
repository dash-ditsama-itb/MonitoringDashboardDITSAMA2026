import { useMemo, useState } from "react";
import { ChartCanvas } from "../../components/ChartCanvas.jsx";
import { RequireAccess } from "../../components/Access.jsx";
import { Icon } from "../../components/Icon.jsx";
import {
  Bar, EmptyState, ErrorNote, Kpi, PageHead, PageSkeleton, Pending, RefreshButton, SearchInput, Segmented, SelectField, Sheet, Spinner,
} from "../../components/ui.jsx";
import { fmtNum, withoutAll } from "../../lib/format.js";
import { useApi } from "../../stores/data.js";
import { useUiStore } from "../../stores/ui.js";

const ALL = "Semua";
const METODE_COL = { Luring: "#204074", Hibrida: "#9EC1E6", Daring: "#E08A2E" };
// format Riset (Dosen_RISET): "Mata kuliah" & "Kelas" = Kelas Peserta, tanpa metode
const FILTERS = [["program", "programs", "Program"], ["mapel", "mapels", "Mata kuliah / kelas peserta"], ["metode", "metodes", "Metode"],
  ["kelas", "kelas", "Kelas"], ["bahasa", "bahasas", "Bahasa"]];
const score = (v) => (v == null ? "–" : Number(v).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const tone = (v) => (v >= 4.5 ? "ok" : v >= 4 ? "" : v >= 3 ? "warn" : "crit");
// "Dr. Budi Santoso, S.Si., M.Si." -> "Budi Santoso"
const nice = (n) => String(n || "").split(",")[0].replace(/^((prof|dr|drs|dra|ir|eng|rer|nat)(\.\s*|\s+))+/i, "").trim();
// formulir per sesi tidak punya metode ("–")
const hasMethod = (methods) => methods.some((m) => m !== "–");

export default function Dosen() {
  return <RequireAccess area="activities" page="Umpan Balik"><DosenPage /></RequireAccess>;
}

function DosenPage() {
  const ui = useUiStore((s) => s.dsn);
  const patch = useUiStore((s) => s.patch);
  const filters = { ...withoutAll(Object.fromEntries(FILTERS.map(([k]) => [k, ui[k]]))), ...(ui.minResp !== "1" ? { minResp: ui.minResp } : {}) };
  const { data, error, loading, reload } = useApi("/dashboard/dosen", filters);
  const d = data?.data;
  const fo = d?.filterOptions;
  const select = (key) => patch("dsn", { sel: key });
  const active = FILTERS.some(([k]) => ui[k] !== ALL) || ui.minResp !== "1";
  // Dosen_OSN: mata kuliah = Bidang (Geografi, Fisika, …)
  const isOsn = /^osn$/i.test(ui.program);
  const q = ui.search.trim().toLowerCase();
  const lecturers = (d?.lecturers || []).filter((l) => !q || l.name.toLowerCase().includes(q));

  return (
    <div className="page">
      <PageHead title="Umpan Balik" sub="Umpan balik program dan hasil evaluasi narasumber/pengajar oleh peserta">
        <RefreshButton reload={reload} />
      </PageHead>

      <section className="card filter-bar">
        {FILTERS.map(([k, optKey, label]) => {
          const list = fo?.[optKey] || [];
          // filter tanpa pilihan untuk program ini (mis. OSN tanpa metode, kelas, bahasa) disembunyikan
          if (k !== "program" && list.length <= 1 && ui[k] === ALL) return null;
          return <SelectField key={k} label={k === "mapel" && isOsn ? "Bidang" : label} value={list.includes(ui[k]) ? ui[k] : ALL}
            options={[[ALL, "Semua " + (k === "mapel" && isOsn ? "bidang" : label.toLowerCase())], ...list]} onChange={(v) => patch("dsn", { [k]: v })} />;
        })}
        <SelectField label="Minimal penilaian" value={ui.minResp} options={[["1", "Semua"], ["5", "≥ 5"], ["10", "≥ 10"], ["30", "≥ 30"]]} onChange={(v) => patch("dsn", { minResp: v })} />
        {active && <button type="button" className="btn btn-sm filter-reset" onClick={() => patch("dsn", { ...Object.fromEntries(FILTERS.map(([k]) => [k, ALL])), minResp: "1" })}>Reset filter</button>}
      </section>

      <ErrorNote error={error} onRetry={() => reload()} />

      {!d ? (
        <>
          {loading && <div className="note"><Spinner />Memuat data evaluasi… pemuatan pertama bisa memakan waktu beberapa detik.</div>}
          <PageSkeleton kpis={6} />
        </>
      ) : (
        <Pending busy={loading}>
          <SectionHead icon="message" title="Umpan balik program" sub="Rata-rata semua aspek formulir umpan balik tiap program, termasuk narasumber/pengajar" />
          <ProgramFeedback d={d} program={ui.program} />

          <SectionHead icon="grad" title="Umpan balik narasumber/pengajar" sub="Hasil evaluasi narasumber/pengajar oleh peserta · klik nama untuk melihat portofolio" />
          <div className="kpi-row six">
            <Kpi label="Pengajar dinilai" value={fmtNum(d.kpi.totalLecturers)} icon="grad" />
            <Kpi label={isOsn ? "Bidang" : "Mata kuliah / kelas"} value={fmtNum(d.kpi.totalSubjects)} icon="book" />
            <Kpi label="Peserta mengisi" value={fmtNum(d.kpi.totalRespondents)} icon="users" />
            <Kpi label="Total penilaian" value={fmtNum(d.kpi.totalRatings)} icon="clipboard" />
            <Kpi label="Rata-rata (1–5)" value={score(d.kpi.averageScore)} icon="star" />
            <Kpi label="Tertinggi" value={score(d.kpi.highestScore)} hint={nice(d.kpi.highestScoreLecturer)} icon="trophy" />
          </div>
          <Charts d={d} onSelect={select} />
          <section className="card">
            <div className="card-head"><div><h2 className="card-title">{isOsn ? "Bidang" : "Mata kuliah / kelas peserta"}</h2><div className="card-sub">Klik kartu untuk memfilter per {isOsn ? "bidang" : "mata kuliah atau kelas peserta"}</div></div></div>
            {!d.subjects.length ? <div className="empty-inline">Belum ada data.</div> : (
              <div className="subj-cards">
                {d.subjects.map((s) => (
                  <button key={s.subject} type="button" className={"subj" + (ui.mapel === s.subject ? " on" : "")}
                    onClick={() => patch("dsn", { mapel: ui.mapel === s.subject ? ALL : s.subject })} aria-pressed={ui.mapel === s.subject}>
                    <span className="subj-top"><b>{s.subject}</b><span className="muted">{s.lecturerCount} pengajar</span></span>
                    <span className="subj-stats">
                      <span><b>{score(s.highestScore)}</b>tertinggi</span><span><b>{score(s.averageScore)}</b>rata-rata</span><span><b>{fmtNum(s.totalRatings)}</b>penilaian</span>
                    </span>
                    <ol>{s.topLecturers.map((l) => <li key={l.name}><span>{nice(l.name)}</span><b>{score(l.averageScore)}</b></li>)}</ol>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="card tbl-card">
            <div className="tbl-head"><div><h2 className="card-title">Peringkat pengajar</h2>
              <div className="card-sub">{d.lecturers.length} pengajar{ui.minResp !== "1" && ` dengan minimal ${ui.minResp} penilaian`} · klik baris untuk melihat portofolio</div></div></div>
            <div className="tbl-toolbar"><SearchInput value={ui.search} onChange={(v) => patch("dsn", { search: v })} placeholder="Cari nama pengajar" delay={150} /></div>
            {!lecturers.length ? <EmptyState icon="search" title="Tidak ada pengajar yang cocok" /> : (
              <div className="tbl-scroll"><table className="tbl dsn-tbl">
                <thead><tr><th className="c-rank">#</th><th>Pengajar</th><th className="c-meth">Metode</th><th className="num sm-hide">Penilaian</th><th className="c-dist">Sebaran 1–5</th><th className="num">Rata-rata</th><th className="sm-hide">Predikat</th></tr></thead>
                <tbody>{lecturers.map((l) => {
                  const mx = Math.max(...l.distribution, 1);
                  return (
                    <tr key={l.key} className={(ui.sel === l.key ? "sel " : "") + (l.rank <= 3 ? "top" : "")} onClick={() => select(l.key)}>
                      <td className="c-rank"><span className={"rank-no" + (l.rank <= 3 ? " top" : "")}>{l.rank}</span></td>
                      <td><button type="button" className="row-link" onClick={(e) => { e.stopPropagation(); select(l.key); }}>{l.name}</button>
                        <div className="row-meta"><span>{l.subjects.join(", ")}</span><span>{l.programs.join(", ")}</span><span className="sm-only">{fmtNum(l.totalRatings)} penilaian</span></div>
                        <span className={"pred sm-only " + l.predicate.grade}>{l.predicate.text}</span></td>
                      <td className="c-meth">{l.methods.join(", ")}</td>
                      <td className="num sm-hide">{fmtNum(l.totalRatings)}</td>
                      <td className="c-dist" title={l.distribution.map((c, i) => `${i + 1}: ${c}`).join(" · ")}>
                        <span className="dist">{l.distribution.map((c, i) => <i key={i} style={{ height: Math.round((c / mx) * 20) + 2 }} />)}</span></td>
                      <td className="num cell-strong">{score(l.averageScore)}</td>
                      <td className="sm-hide"><span className={"pred " + l.predicate.grade}>{l.predicate.text}</span></td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            )}
          </section>
        </Pending>
      )}
      <LecturerDetail lecturerKey={ui.sel} filters={filters} onClose={() => select("")} />
    </div>
  );
}

function Charts({ d, onSelect }) {
  const top = d.charts.rankings;
  const rank = useMemo(() => ({
    type: "bar",
    data: {
      labels: top.length ? top.map((l) => nice(l.name)) : ["(belum ada data)"],
      datasets: [{ label: "Rata-rata", data: top.map((l) => l.averageScore), backgroundColor: top.map((_, i) => (i < 3 ? "#204074" : "#3a6db0")), borderRadius: 4, maxBarThickness: 20 }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `Rata-rata ${c.parsed.x} · ${top[c.dataIndex].totalRatings} penilaian · ${top[c.dataIndex].subjects.join(", ")}` } } },
      scales: { x: { min: 1, max: 5, ticks: { stepSize: 1 } }, y: { grid: { display: false } } },
      onClick: (_e, el) => { if (el.length) onSelect(top[el[0].index].key); },
      onHover: (e, el) => { e.native.target.style.cursor = el.length ? "pointer" : "default"; },
    },
  }), [d]);
  const methods = [...new Set(d.charts.methodBySubject.flatMap((s) => s.methods.map((m) => m.method)))];
  const metode = useMemo(() => ({
    type: "bar",
    data: {
      labels: d.charts.methodBySubject.length ? d.charts.methodBySubject.map((s) => s.subject) : ["(belum ada data)"],
      datasets: methods.map((m) => ({ label: m, backgroundColor: METODE_COL[m] || "#3a6db0", borderRadius: 4, maxBarThickness: 36,
        data: d.charts.methodBySubject.map((s) => s.methods.find((x) => x.method === m)?.averageScore ?? null) })),
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", align: "end" } },
      scales: { x: { grid: { display: false } }, y: { min: 1, max: 5, ticks: { stepSize: 1 } } } },
  }), [d]);
  // tanpa metode (Riset, BTI, EduQuest, OSN): grafik metode kosong, diganti kartu per hari bila ada
  const showMethod = hasMethod(methods);
  const methodCard = showMethod && (
    <section className="card" key="metode"><div className="card-head"><div><h2 className="card-title">Rata-rata per metode</h2><div className="card-sub">Luring / Hibrida / Daring per mata kuliah</div></div></div>
      <ChartCanvas config={metode} height={300} /></section>
  );
  const dayCard = d.daySessions?.length > 0 && <DayCard key="hari" days={d.daySessions} onSelect={onSelect} />;
  const side = methodCard || dayCard;
  const rankCard = (
    <section className="card"><div className="card-head"><div><h2 className="card-title">15 pengajar dengan nilai tertinggi</h2><div className="card-sub">Rata-rata 1–5 · klik batang untuk membuka portofolio</div></div></div>
      <ChartCanvas config={rank} height={Math.max(240, top.length * 24 + 40)} /></section>
  );
  return (
    <>
      {side ? <div className="grid g-2">{rankCard}{side}</div> : rankCard}
      {methodCard && dayCard}
    </>
  );
}

// judul bagian halaman (Umpan balik program / Umpan balik narasumber/pengajar)
function SectionHead({ icon, title, sub }) {
  return (
    <div className="sec-head">
      <h2><Icon name={icon} size={18} />{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

// Feedback Program: rata-rata tiap program (skala 100) + rincian per aspek program terpilih
function ProgramFeedback({ d, program }) {
  const fb = d.programFeedback || [];
  if (!fb.length) return <section className="card"><EmptyState icon="message" title="Belum ada umpan balik program">Umpan balik program dihitung dari formulir evaluasi peserta.</EmptyState></section>;
  return (
    <div className="grid g-2">
      <ProgramFeedbackCard list={fb} program={program} />
      <ProgramAspectCard list={fb} program={program} />
    </div>
  );
}

const fb100 = (v) => (v == null ? "–" : Number(v).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

// semua aspek form per program, termasuk satu baris narasumber/pengajar (programFeedback dari backend)
function ProgramAspectCard({ list, program }) {
  const fixed = list.find((p) => p.program === program);
  const [pick, setPick] = useState(list[0].program);
  const cur = fixed || list.find((p) => p.program === pick) || list[0];
  const aspects = [...cur.aspects].sort((a, b) => b.averageScore - a.averageScore);
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Penilaian per aspek <span className="title-prog">{cur.program}</span></h2>
        <div className="card-sub">Semua komponen form, termasuk narasumber/pengajar · rata-rata 1–5 · klik aspek untuk rincian pertanyaan</div></div></div>
      {!fixed && list.length > 1 && <div className="asp-tabs"><Segmented label="Program" value={cur.program} onChange={setPick} options={list.map((p) => [p.program, p.program])} /></div>}
      <AspectList key={cur.program} aspects={aspects} />
      <div className="asp-total"><span>Umpan balik {cur.program} · rata-rata {aspects.length} aspek, skala 100</span><b>{fb100(cur.feedbackScore)}</b></div>
    </section>
  );
}

// rata-rata feedback tiap program (skala 100), untuk Umpan balik per program
function ProgramFeedbackCard({ list, program }) {
  const rows = [...list].filter((p) => p.feedbackScore != null).sort((a, b) => b.feedbackScore - a.feedbackScore);
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Rata-rata umpan balik program</h2>
        <div className="card-sub">Rata-rata semua aspek (bobot sama, termasuk narasumber/pengajar) ÷ 5 × 100 · semua penilaian program, tanpa filter</div></div></div>
      <ul className="asp">{rows.map((p) => (
        <li key={p.program} className={p.program === program ? "on" : ""}>
          <span className="asp-lab"><span>{p.program}</span><small>{p.aspects.length} aspek</small></span>
          <Bar value={p.feedbackScore} tone={tone(p.feedbackScore / 20)} />
          <b>{fb100(p.feedbackScore)}</b>
        </li>
      ))}</ul>
    </section>
  );
}

// formulir per hari (mis. Dosen_EduQuest): pengajar tiap hari + nilai materi hari itu
function DayCard({ days, onSelect }) {
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Penilaian per hari</h2>
        <div className="card-sub">Pengajar tiap hari + nilai materi hari itu · klik nama untuk portofolio</div></div></div>
      <div className="days">{days.map((d) => (
        <div className="day" key={d.label}>
          <h3>{d.label}{d.materiScore != null && <small>materi {score(d.materiScore)}</small>}</h3>
          <ul>{d.lecturers.map((l) => (
            <li key={l.key}><button type="button" className="row-link" onClick={() => onSelect(l.key)}>{nice(l.name)}</button><b>{score(l.averageScore)}</b></li>
          ))}</ul>
        </div>
      ))}</div>
    </section>
  );
}

function AspectList({ aspects }) {
  // satu kategori saja (mis. OSN): langsung tampilkan rincian pertanyaannya
  const [open, setOpen] = useState(() => new Set(aspects.length === 1 ? [aspects[0].category] : []));
  const toggle = (c) => setOpen((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });
  return (
    <ul className="asp">
      {aspects.map((a) => {
        const on = open.has(a.category);
        return (
          <li key={a.category}>
            <button type="button" className="asp-lab" aria-expanded={on} onClick={() => toggle(a.category)}>
              <span>{a.category}</span><small>{a.items.length > 1 && `${a.items.length} butir`}<Icon name={on ? "up" : "down"} size={14} /></small>
            </button>
            <Bar value={(a.averageScore / 5) * 100} tone={tone(a.averageScore)} />
            <b>{score(a.averageScore)}</b>
            {on && (
              <div className="asp-sub">{a.items.map((it) => (
                <div key={it.item}><span>{it.item}</span><Bar value={(it.averageScore / 5) * 100} tone={tone(it.averageScore)} /><b>{score(it.averageScore)}</b></div>
              ))}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LecturerDetail({ lecturerKey, filters, onClose }) {
  const { data, error, loading } = useApi("/dashboard/dosen/" + encodeURIComponent(lecturerKey || "-"), filters, { enabled: !!lecturerKey });
  const d = lecturerKey && data?.data?.key === lecturerKey ? data.data : null;
  return (
    <Sheet open={!!lecturerKey} onClose={onClose} wide title={d ? d.name : "Portofolio pengajar"}
      sub={d && <span className="detail-sub">{d.tags.map((t) => <span key={t} className="ptag">{t}</span>)}<span className={"pred " + d.predicate.grade}>{d.predicate.text}</span></span>}>
      {error && <ErrorNote error={error} />}
      {!d ? (loading && <div className="note"><Spinner />Memuat portofolio…</div>) : (
        <div className="detail">
          <div className="metric-row">
            <div className="metric"><span>Rata-rata</span><b>{score(d.kpi.averageScore)}</b><small>skala 1–5</small></div>
            <div className="metric"><span>Peringkat</span><b>#{d.kpi.rank}</b><small>dari {d.kpi.totalRankedLecturers} pengajar</small></div>
            <div className="metric"><span>Penilaian</span><b>{fmtNum(d.kpi.totalRatings)}</b></div>
            <div className="metric"><span>Memberi nilai 5</span><b>{d.kpi.fiveStarPercentage}%</b></div>
          </div>
          <div className="grid g-2 inner">
            <div>
              {d.aspects?.length > 0 && <><h3 className="detail-h">Per aspek</h3><AspectList aspects={d.aspects} /></>}
              <h3 className="detail-h">Sebaran nilai</h3>
              <ul className="dist-list">{d.scoreDistribution.map((s) => (
                <li key={s.score}><b>{s.score}</b><Bar value={s.percentage} /><span className="num">{s.count}</span></li>
              ))}</ul>
              {hasMethod(d.methods.map((m) => m.method)) && <>
                <h3 className="detail-h">Per metode</h3>
                <table className="mini-tbl"><thead><tr><th>Metode</th><th className="num">Penilaian</th><th className="num">Rata-rata</th></tr></thead>
                  <tbody>{d.methods.map((m) => <tr key={m.method}><td>{m.method}</td><td className="num">{m.ratingsCount}</td><td className="num cell-strong">{score(m.averageScore)}</td></tr>)}</tbody></table>
              </>}
              {d.sessions?.length > 0 && <>
                <h3 className="detail-h">Sesi kegiatan</h3>
                <ul className="sesi">{d.sessions.map((s) => (
                  <li key={s.date + s.class}><span>{s.date}{s.class !== "–" && " · " + s.class}
                    {s.coSpeakers?.length > 0 && <small className="muted"> · bersama {s.coSpeakers.map(nice).join(", ")}</small>}</span>
                    <span><b>{score(s.averageScore)}</b> · {fmtNum(s.ratingsCount)} {s.materiScore !== undefined ? "peserta" : "formulir"}
                      {s.materiScore != null && <small className="muted"> · materi hari itu {score(s.materiScore)}</small>}</span></li>
                ))}</ul>
              </>}
              {/* BTI (tanpa metode & tanggal sesi): rata-rata per kelas, mis. STEM 1 / STEM 2 / AI */}
              {!hasMethod(d.methods.map((m) => m.method)) && !d.sessions?.length && d.classes?.length > 0 && <>
                <h3 className="detail-h">Per kelas</h3>
                <ul className="sesi">{d.classes.map((c) => (
                  <li key={c.class}><span>{c.class}</span><span><b>{score(c.averageScore)}</b> · {fmtNum(c.ratingsCount)} peserta</span></li>
                ))}</ul>
              </>}
            </div>
            <div>
              <h3 className="detail-h">Komentar &amp; saran peserta</h3>
              {!d.comments.length ? <p className="muted small">Belum ada komentar atau saran untuk pengajar ini.</p>
                : d.comments.slice(0, 12).map((c, i) => (
                  <figure className="quote" key={i}><blockquote>{c.text}</blockquote>
                    <figcaption>{[c.program, c.class, c.method !== "–" && c.method, c.date].filter(Boolean).join(" · ")}</figcaption></figure>
                ))}
              {d.comments.length > 12 && <p className="muted small">+{d.comments.length - 12} komentar lain</p>}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

