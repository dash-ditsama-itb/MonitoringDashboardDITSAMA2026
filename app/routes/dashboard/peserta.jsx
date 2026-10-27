import { useEffect, useMemo, useRef, useState } from "react";
import { ChartCanvas } from "../../components/ChartCanvas.jsx";
import { RequireAccess } from "../../components/Access.jsx";
import { Icon } from "../../components/Icon.jsx";
import {
  Bar, EmptyState, ErrorNote, Kpi, PageHead, PageSkeleton, Pagination, Pending, RefreshButton, SearchInput, Segmented, SelectField, Sheet, Spinner,
  TableSkeleton, usePending,
} from "../../components/ui.jsx";
import { RekapPeserta } from "../../components/RekapPeserta.jsx";
import { PROGRAMS, REKAP_PESERTA } from "../../config.js";
import { fmtNum, fmtScore, programLabel, withoutAll } from "../../lib/format.js";
import { useApi } from "../../stores/data.js";
import { useUiStore } from "../../stores/ui.js";

const ALL = "Semua";
const NAVY = "#204074", BLUE = "#3a6db0", ORANGE = "#E08A2E";
const FILTERS = [
  ["program", "programs", "Program"], ["periode", "periodes", "Periode"], ["aktivitas", "aktivitas", "Kegiatan"],
  ["provinsi", "provinsis", "Provinsi"], ["fakultas", "fakultas", "Fakultas / jurusan"], ["skema", "skemas", "Skema"],
  ["tipe", "tipes", "Tipe"], ["kelompok", "kelompoks", "Kelompok"],
];
const SORTS = [["ujian", "Nilai ujian terpilih"], ["rata", "Rata-rata semua ujian"], ["naik", "Kenaikan tertinggi"]];
const LOW = { C: 1, D: 1, E: 1 };
// Program dipilih lewat tab di atas, bukan dropdown
const FILTER_BAR = FILTERS.filter(([k]) => k !== "program");
// urutan tab; program tanpa sheet peserta (WIT, MAUNG, SUGT) di akhir; sheet lain menyusul sesuai abjad
const TAB_ORDER = [/siap/i, /riset/i, /opsi/i, /^osn$/i, /bti/i, /eduquest/i, /sang cendekia|\bp?scd\b/i, /^wit$/i, /^maung$/i, /^sugt$/i];
const DEFAULT_TAB = "SIAP ITB";
const tabRank = (p) => { const i = TAB_ORDER.findIndex((re) => re.test(p)); return i < 0 ? TAB_ORDER.length : i; };
const sortTabs = (list) => [...list].sort((a, b) => tabRank(a) - tabRank(b) || a.localeCompare(b, "id"));

function IdxChip({ ix }) {
  return ix ? <span className={"idx-chip" + (LOW[ix] ? " low" : "")}>{ix}</span> : null;
}

// sheet BTI tidak punya Skema/Tipe: isinya bidang pelatihan & peran (Murid/Pemandu)
const BTI_LABELS = { skema: "Bidang pelatihan", tipe: "Peran" };
// sheet EduQuest: Skema diisi Kategori karya (Ide Riset STEM, Karya Seni/Desain, …)
const EDQ_LABELS = { skema: "Kategori" };
const filterLabel = (k, label, program) =>
  (/^bti$/i.test(String(program).trim()) ? BTI_LABELS[k] : /eduquest/i.test(String(program)) ? EDQ_LABELS[k] : null) || label;

// nilai presentasi selalu 2 angka di belakang koma, sama seperti tabel Excel (3 -> 3,00)
const fmt2 = (n) => (n == null ? "–" : Number(n).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

// judul + nama program yang sedang dilihat (mis. "Sebaran provinsi Eduquest")
const Scoped = ({ title, scope }) => <>{title} <span className="title-prog">{scope}</span></>;

// filter Program di sini memakai nama dari spreadsheet (mis. "SIAP ITB", "Eduquest");
// dicocokkan ke label/kode program dashboard atau ke nama baris rekap
const norm = (s) => String(s || "").toLowerCase().replace(/[\s_-]+/g, " ").trim();
function rekapProgramApi(name) {
  // sheet Peserta_PSCD menulis programnya "Inspirasi - Sang Cendekia" (= INSPIRASI SCD)
  if (/sang cendekia|\bp?scd\b/i.test(String(name))) return "inspirasi_scd";
  // sheet Peserta_Riset menulis programnya "Riset Kolaboratif" (= Riset)
  if (/riset/i.test(String(name))) return "riset";
  const n = norm(name);
  const p = PROGRAMS.find((x) => [x.label, x.key, x.api, x.label.replace(/^inspirasi\s+/i, "")].some((v) => norm(v) === n));
  return p?.api ?? REKAP_PESERTA.find((r) => norm(r.label) === n)?.programs[0];
}
// nama tab/program yang tampil = nama program di menu (sheet "Riset Kolaboratif" -> "Riset"); nilai filter tetap nama sheet
const sheetLabel = (name) => { const api = rekapProgramApi(name); return api ? programLabel(api) : name; };

// data profil (mis. Peserta_BTI) dipakai bila diisi hampir semua peserta yang sedang dilihat,
// supaya angka gabungan "semua program" tidak tampil seolah mewakili semua peserta
const covers = (d, n) => n > 0 && n >= 0.9 * d.kpi.totalParticipants;

function KpiRow({ d, scope }) {
  const graded = d.kpi.gradedCount > 0;
  const prof = d.profile;
  const roles = prof && covers(d, prof.answered.role) ? prof.roles.slice(0, 3) : [];
  const asm = d.assessment && covers(d, d.assessment.answered) ? d.assessment : null;
  const lab = (t) => <>{t}<span className="kpi-prog">{scope}</span></>;
  const items = [
    <Kpi key="tot" label={lab("Total peserta")} icon="users" value={fmtNum(d.kpi.totalParticipants)} />,
    ...roles.map((r) => <Kpi key={"role-" + r.name} label={lab(r.name)} icon="user" value={fmtNum(r.count)}
      hint={prof.fields.find((f) => f.roles.length === 1 && f.roles[0].name === r.name)?.name} />),
    <Kpi key="prov" label={lab("Provinsi")} value={fmtNum(d.kpi.totalProvinces)} icon="pin" />,
    prof && covers(d, prof.answered.regency) && <Kpi key="kab" label={lab("Kab./Kota")} value={fmtNum(prof.totalRegencies)} icon="pin" />,
    <Kpi key="sek" label={lab("Sekolah / instansi")} value={fmtNum(d.kpi.totalSchools)} icon="building" />,
    // sheet profil tanpa kolom nilai (mis. BTI) atau dengan nilai presentasi (EduQuest): kartu ujian tidak relevan
    d.kpi.totalExams > 0 && (graded || (!roles.length && !asm)) && <Kpi key="ujian" label={lab("Ujian bernilai")} icon="clipboard" hint={graded ? undefined : "belum ada ujian yang dinilai"}
      value={d.kpi.totalExamsWithData + (d.kpi.totalExams > d.kpi.totalExamsWithData ? " / " + d.kpi.totalExams : "")} />,
    // belum ada nilai: rata-rata & sudah dinilai disembunyikan
    graded && <Kpi key="avg" label={lab("Rata-rata · " + (d.kpi.selectedExamLabel || "–"))} icon="target"
      value={d.kpi.averageScore == null ? "–" : Number(d.kpi.averageScore).toLocaleString("id-ID", { maximumFractionDigits: 1 })} />,
    graded && <Kpi key="done" label={lab("Sudah dinilai")} value={fmtNum(d.kpi.gradedCount)} hint={`dari ${fmtNum(d.kpi.totalParticipants)} peserta`} icon="checkCircle" />,
    asm && <Kpi key="asm-avg" label={lab("Rata-rata nilai")} icon="target" value={fmt2(asm.averageScore)} hint={scaleText(asm.maxScore)} />,
    asm && <Kpi key="asm-done" label={lab("Sudah dinilai")} icon="checkCircle" value={fmtNum(asm.answered)} hint={`dari ${fmtNum(d.kpi.totalParticipants)} peserta`} />,
    asm && asm.groups.length > 0 && <Kpi key="asm-kel" label={lab("Kelompok")} icon="users" value={fmtNum(asm.groups.length)}
      hint={asm.categories.length ? asm.categories.length + " kategori" : undefined} />,
  ].filter(Boolean);
  return <div className={"kpi-row" + (items.length >= 6 ? " six" : items.length === 5 ? " five" : "")}>{items}</div>;
}

const ROLE_COLORS = { Murid: "#3a6db0", Pemandu: "#E08A2E" };
const roleColor = (name, i) => ROLE_COLORS[name] || ["#3a6db0", "#E08A2E", "#16A34A", "#8B5CF6"][i % 4];
// "Kecerdasan Artifisial & Penguatan Karakter" -> dua baris label
const twoLines = (s) => String(s).split(/ (?=(?:dan|&) )/);

/** Profil peserta dari kolom tambahan sheet (mis. Peserta_BTI): bidang × peran, jenis kelamin, ukuran kaos, kesehatan. */
function Profile({ d, scope }) {
  const p = d.profile;
  const charts = useMemo(() => {
    if (!p) return null;
    const roleNames = [...new Set(p.fields.flatMap((f) => f.roles.map((r) => r.name)))];
    const stackedY = { indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "top", align: "end" } },
      scales: { x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }, y: { stacked: true, grid: { display: false } } } };
    const fields = { type: "bar", options: stackedY,
      data: { labels: p.fields.map((f) => twoLines(f.name)),
        datasets: roleNames.map((r, i) => ({ label: r, backgroundColor: roleColor(r, i), borderRadius: 4, maxBarThickness: 34,
          data: p.fields.map((f) => f.roles.find((x) => x.name === r)?.count ?? 0) })) } };
    const rows = p.genderByRole.length > 1
      ? [...p.genderByRole, { role: "Total", female: p.genderByRole.reduce((s, g) => s + g.female, 0), male: p.genderByRole.reduce((s, g) => s + g.male, 0) }]
      : p.genderByRole;
    const gender = { type: "bar", options: stackedY,
      data: { labels: rows.map((g) => g.role),
        datasets: [{ label: "Perempuan", data: rows.map((g) => g.female), backgroundColor: "#1baf7a", borderRadius: 4, maxBarThickness: 30 },
          { label: "Laki-laki", data: rows.map((g) => g.male), backgroundColor: "#6250d6", borderRadius: 4, maxBarThickness: 30 }] } };
    const shirt = { type: "bar",
      data: { labels: p.shirtSizes.map((s) => s.size), datasets: [{ label: "Peserta", data: p.shirtSizes.map((s) => s.count), backgroundColor: "#3a6db0", borderRadius: 4, maxBarThickness: 48 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } };
    return { fields, gender, shirt };
  }, [p]);
  if (!p || !charts) return null;
  const card = (title, sub, body) => (
    <section className="card" key={title}><div className="card-head"><div><h2 className="card-title"><Scoped title={title} scope={scope} /></h2>
      <div className="card-sub">{sub}</div></div></div>{body}</section>
  );
  const cards = [
    covers(d, p.answered.field) && card("Peserta per bidang pelatihan", "Dipecah per peran", <ChartCanvas config={charts.fields} height={Math.max(150, p.fields.length * 70 + 50)} />),
    covers(d, p.answered.gender) && card(p.genderByRole.length > 1 ? "Jenis kelamin per peran" : "Jenis kelamin", "P = perempuan, L = laki-laki", <ChartCanvas config={charts.gender} height={Math.max(150, (p.genderByRole.length + 1) * 52 + 50)} />),
    covers(d, p.answered.shirtSize) && card("Ukuran kaos", "Untuk kebutuhan logistik", <ChartCanvas config={charts.shirt} height={220} />),
    // hanya jumlah, tanpa nama dan tanpa jenis penyakit
    covers(d, p.answered.health) && card("Catatan kesehatan", "Hanya jumlah, tanpa nama, untuk persiapan pendampingan",
      <div className="stat-row health-row">
        <div><span>Riwayat penyakit</span><b>{fmtNum(p.health.withIllness)}</b><small className="stat-hint">peserta</small></div>
        <div><span>Riwayat alergi</span><b>{fmtNum(p.health.withAllergy)}</b><small className="stat-hint">peserta</small></div>
      </div>),
  ].filter(Boolean);
  const pairs = [];
  for (let i = 0; i < cards.length; i += 2) pairs.push(cards.slice(i, i + 2));
  return pairs.map((r, i) => (r.length > 1 ? <div className="grid g-2" key={i}>{r}</div> : r[0]));
}

// kriteria dinilai 1–5, sedangkan NILAI rata-rata di sheet bisa sudah dijadikan skala 100
const critMax = (a) => (a.criteria.every((k) => (k.averageScore ?? 0) <= 5) ? 5 : 100);
const scaleText = (max) => (max === 5 ? "skala 1–5" : "skala 100");

const CAT_COLORS = ["#3a6db0", "#E08A2E", "#16A34A", "#8B5CF6", "#0891B2", "#DB2777"];

/** Penilaian presentasi (mis. Peserta_Eduquest): nilai per kelompok, rata-rata per kriteria, peringkat kelompok. */
function Assessment({ d, scope }) {
  const a = d.assessment;
  const show = !!a && covers(d, a.answered);
  const c = useMemo(() => {
    if (!show) return null;
    const cats = a.categories.map((x) => x.name);
    const color = (name) => CAT_COLORS[Math.max(0, cats.indexOf(name)) % CAT_COLORS.length];
    const hbar = (max, labels, data, colors, tip) => ({
      type: "bar",
      data: { labels, datasets: [{ label: "Nilai", data, backgroundColor: colors, borderRadius: 4, maxBarThickness: 26 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: tip } } },
        scales: { x: { min: 0, max, ticks: { stepSize: max === 5 ? 1 : 20 } }, y: { grid: { display: false } } } },
    });
    const low = Math.min(...a.criteria.map((k) => k.averageScore ?? Infinity));
    return {
      color,
      groups: hbar(a.maxScore, a.groups.map((g) => g.group), a.groups.map((g) => g.averageScore), a.groups.map((g) => color(g.category)),
        (t) => { const g = a.groups[t.dataIndex]; return `${g.category || "–"} · nilai ${fmt2(g.averageScore)} · ${g.members} anggota`; }),
      criteria: hbar(critMax(a), a.criteria.map((k) => k.name), a.criteria.map((k) => k.averageScore),
        a.criteria.map((k) => (k.averageScore === low ? ORANGE : NAVY)), (t) => "Rata-rata " + fmt2(t.parsed.x)),
    };
  }, [a, show]);
  if (!show) return null;
  const head = (title, sub) => (
    <div className="card-head"><div><h2 className="card-title"><Scoped title={title} scope={scope} /></h2><div className="card-sub">{sub}</div></div></div>
  );
  return (
    <>
      <div className="grid g-2">
        {a.groups.length > 0 && <section className="card">
          {head("Nilai per kelompok", `NILAI rata-rata kelompok (${scaleText(a.maxScore)}), diurutkan dari tertinggi`)}
          {a.categories.length > 1 && <div className="asm-legend">{a.categories.map((k) => <span key={k.name}><i style={{ background: c.color(k.name) }} />{k.name}</span>)}</div>}
          <ChartCanvas config={c.groups} height={Math.max(160, a.groups.length * 34 + 40)} />
        </section>}
        {a.criteria.length > 0 && <section className="card">
          {head("Rata-rata per kriteria", `${scaleText(critMax(a))} · dari ${fmtNum(a.answered)} peserta yang dinilai · oranye = kriteria terendah`)}
          <ChartCanvas config={c.criteria} height={Math.max(160, a.criteria.length * 40 + 40)} />
        </section>}
      </div>
      {a.groups.length > 0 && <section className="card">
        {head("Peringkat kelompok", `Kriteria ${scaleText(critMax(a))} (rata-rata semua penilai), nilai rata-rata ${scaleText(a.maxScore)}; semua anggota kelompok mendapat nilai kelompoknya`)}
        <div className="tbl-scroll"><table className="tbl compact asm-tbl">
          <thead><tr><th className="c-rank">#</th><th>Kelompok</th><th className="num sm-hide">Anggota</th>
            {a.criteria.map((k) => <th key={k.name} className="num sm-hide">{k.name}</th>)}<th className="num">Nilai rata-rata</th></tr></thead>
          <tbody>{a.groups.map((g) => (
            <tr key={g.group} className={g.rank <= 3 ? "top" : ""}>
              <td className="c-rank"><span className={"rank-no" + (g.rank <= 3 ? " top" : "")}>{g.rank}</span></td>
              <td><div className="cell-strong">{g.group}</div><div className="row-meta">
                <span><i className="cat-dot" style={{ background: c.color(g.category) }} />{g.category || "–"}</span><span className="sm-only">{g.members} anggota</span></div></td>
              <td className="num sm-hide">{g.members}</td>
              {a.criteria.map((k) => <td key={k.name} className="num sm-hide">{fmt2(g.criteria.find((x) => x.name === k.name)?.averageScore)}</td>)}
              <td className="num cell-strong">{fmt2(g.averageScore)}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr><td /><td className="cell-strong">Rata-rata semua</td><td className="num sm-hide">{fmtNum(a.answered)}</td>
            {a.criteria.map((k) => <td key={k.name} className="num sm-hide">{fmt2(k.averageScore)}</td>)}<td className="num cell-strong">{fmt2(a.averageScore)}</td></tr></tfoot>
        </table></div>
      </section>}
    </>
  );
}

export default function Peserta() {
  return <RequireAccess area="activities" page="Peserta"><PesertaPage /></RequireAccess>;
}

function PesertaPage() {
  const ui = useUiStore((s) => s.pst);
  const patch = useUiStore((s) => s.patch);
  // tidak ada tampilan "semua program": tiap tab = satu sheet peserta, default tab pertama
  const program = ui.program === ALL ? DEFAULT_TAB : ui.program;
  const base = withoutAll({ ...Object.fromEntries(FILTERS.map(([k]) => [k, ui[k]])), program });
  const query = { ...base, ...(ui.ujian !== "__LAST__" ? { ujian: ui.ujian } : {}) };
  const dash = useApi("/dashboard/peserta", { ...query, ...(ui.rankingSortBy !== "ujian" ? { rankingSortBy: ui.rankingSortBy } : {}) });
  const d = dash.data?.data;
  const fo = d?.filterOptions;
  // daftar sheet disimpan agar tab tidak hilang saat data tab berikutnya dimuat
  const [savedSheets, setSavedSheets] = useState([]);
  const tabKey = (fo?.programs || []).join("|");
  useEffect(() => { if (tabKey) setSavedSheets(tabKey.split("|")); }, [tabKey]);
  const sheets = tabKey ? tabKey.split("|") : savedSheets;
  // semua program tetap jadi tab; yang belum punya sheet peserta ditandai "belum ada data"
  const emptyTabs = sheets.length ? PROGRAMS.filter((p) => !sheets.some((x) => rekapProgramApi(x) === p.api)).map((p) => p.label) : [];
  const tabs = sheets.length ? sortTabs([...sheets, ...emptyTabs]) : [];
  // backend menampilkan semua program bila sheet program tidak ada, jadi datanya tidak ditampilkan
  const noData = emptyTabs.includes(program);
  // program tersimpan yang sudah tidak ada sheetnya -> pindah ke tab pertama
  useEffect(() => { if (tabs.length && !tabs.includes(program)) openTab(tabs[0]); }, [tabs, program]);
  const setFilter = (k, v) => patch("pst", { [k]: v, page: 1 });
  const resetFilters = { ...Object.fromEntries(FILTER_BAR.map(([k]) => [k, ALL])), ujian: "__LAST__", page: 1 };
  const openTab = (p) => patch("pst", { ...resetFilters, program: p, search: "", schoolSearch: "", rankAll: false, sekAll: false });
  const active = FILTER_BAR.some(([k]) => ui[k] !== ALL) || ui.ujian !== "__LAST__";
  // pilihan ujian hanya untuk sheet yang punya nilai ujian (bukan BTI / EduQuest)
  const showUjian = (d?.kpi.totalExamsWithData ?? 0) > 0 || ui.ujian !== "__LAST__";
  // nama program milik data yang sedang tampil, ditulis di setiap judul kartu & grafik
  // (saat tab/filter berganti, data lama tampil pudar dengan nama programnya sendiri sampai data baru siap)
  const dataProgram = useRef(program);
  if (dash.fresh) dataProgram.current = program;
  const scope = sheetLabel(dataProgram.current);

  return (
    <div className="page">
      <PageHead title="Peserta" sub="Data peserta, nilai, dan sebaran sekolah per program">
        <RefreshButton reload={dash.reload} />
      </PageHead>

      {tabs.length > 0 && <div className="pst-tabs" role="tablist" aria-label="Program">
        {tabs.map((p) => {
          const empty = emptyTabs.includes(p);
          return (
            <button key={p} type="button" role="tab" aria-selected={p === program} className={(p === program ? "on" : "") + (empty ? " empty" : "")}
              onClick={() => p !== program && openTab(p)} title={empty ? `Belum ada data peserta ${sheetLabel(p)}` : undefined}>
              {sheetLabel(p)}{empty && <small>belum ada data</small>}
            </button>
          );
        })}
      </div>}

      <RekapPeserta highlight={rekapProgramApi(program)} highlightLabel={sheetLabel(program)} scope="semua program" />

      {noData ? (
        <section className="card">
          <EmptyState icon="users" title={`Belum ada data peserta ${sheetLabel(program)}`}>
            Data tampil otomatis setelah sheet peserta {sheetLabel(program)} ditambahkan ke spreadsheet peserta.
          </EmptyState>
        </section>
      ) : <>
      <section className="card filter-bar">
        {/* hanya filter yang ada isinya di sheet program ini */}
        {FILTER_BAR.map(([k, optKey, label]) => {
          const list = fo?.[optKey] || [];
          if (!list.length && ui[k] === ALL) return null;
          return <SelectField key={k} label={filterLabel(k, label, program)} value={list.includes(ui[k]) ? ui[k] : ALL}
            options={[[ALL, "Semua " + filterLabel(k, label, program).toLowerCase()], ...list]} onChange={(v) => setFilter(k, v)} />;
        })}
        {showUjian && <SelectField label="Ujian" value={ui.ujian} onChange={(v) => setFilter("ujian", v)}
          options={[["__LAST__", "Terbaru yang sudah dinilai"], ...[...(fo?.ujians || [])].reverse().map((u) => [u.key, u.label])]} />}
        {active && <button type="button" className="btn btn-sm filter-reset" onClick={() => patch("pst", resetFilters)}>Reset filter</button>}
      </section>

      <ErrorNote error={dash.error} onRetry={() => dash.reload()} />

      {!d ? (
        <>
          {dash.loading && <div className="note"><Spinner />Memuat data peserta… pemuatan pertama bisa memakan waktu beberapa detik.</div>}
          <PageSkeleton />
        </>
      ) : (
        <Pending busy={dash.loading}>
          <KpiRow d={d} scope={scope} />
          <Profile d={d} scope={scope} />
          <Assessment d={d} scope={scope} />
          <Charts d={d} scope={scope} />
          {/* belum ada nilai sama sekali untuk filter ini: peringkat disembunyikan */}
          {d.kpi.gradedCount > 0 && <Ranking d={d} scope={scope} sort={ui.rankingSortBy} onSort={(v) => patch("pst", { rankingSortBy: v })} showAll={ui.rankAll} onToggle={() => patch("pst", { rankAll: !ui.rankAll })} />}
          {d.schools.length > 0 && <Schools d={d} scope={scope} />}
        </Pending>
      )}
      <Participants query={query} exams={fo?.ujians || []} scope={scope} />
      </>}
    </div>
  );
}

function Charts({ d, scope }) {
  const c = useMemo(() => {
    const sel = d.kpi.selectedExamKey;
    const trend = {
      type: "bar",
      data: {
        labels: d.charts.scoreTrend.length ? d.charts.scoreTrend.map((x) => x.label) : ["(belum ada ujian)"],
        datasets: [{ label: "Rata-rata", data: d.charts.scoreTrend.map((x) => x.averageScore),
          backgroundColor: d.charts.scoreTrend.map((x) => (x.examKey === sel ? NAVY : "#9EC1E6")), borderRadius: 5, maxBarThickness: 60 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false },
        tooltip: { callbacks: { label: (x) => `Rata-rata ${fmtScore(x.parsed.y)} ·${d.charts.scoreTrend[x.dataIndex].gradedCount} peserta dinilai` } } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, suggestedMax: 100 } } },
    };
    const idx = {
      type: "bar",
      data: { labels: d.charts.indexDistribution.map((x) => x.index),
        datasets: [{ label: "Peserta", data: d.charts.indexDistribution.map((x) => x.count),
          backgroundColor: d.charts.indexDistribution.map((x) => (x.isLow ? ORANGE : BLUE)), borderRadius: 5, maxBarThickness: 60 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } },
    };
    const top = (list) => ({
      type: "bar",
      data: { labels: list.length ? list.map((x) => x.name) : ["(kosong)"], datasets: [{ label: "Peserta", data: list.map((x) => x.count), backgroundColor: BLUE, borderRadius: 4, maxBarThickness: 22 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } },
    });
    return { trend, idx, prov: top(d.charts.topProvinces), fak: top(d.charts.topFaculties) };
  }, [d]);
  const card = (title, sub, cfg, h) => (
    <section className="card" key={title}><div className="card-head"><div><h2 className="card-title"><Scoped title={title} scope={scope} /></h2><div className="card-sub">{sub}</div></div></div><ChartCanvas config={cfg} height={h} /></section>
  );
  // grafik tanpa data untuk filter ini tidak ditampilkan; sisanya tetap berpasangan dua kolom
  const rows = [
    [
      d.charts.scoreTrend.some((x) => x.averageScore != null) && card("Perkembangan nilai akhir", "Rata-rata nilai per tanggal ujian; batang gelap = ujian terpilih", c.trend, 240),
      d.charts.indexDistribution.some((x) => x.count > 0) && card("Distribusi indeks", "Jumlah peserta per indeks · ujian " + (d.kpi.selectedExamLabel || "–") + " (oranye = C ke bawah)", c.idx, 240),
    ],
    [
      d.charts.topProvinces.length > 0 && card("Sebaran provinsi", "10 provinsi terbanyak", c.prov, 300),
      // sheet tanpa kolom fakultas (mis. EduQuest, BTI) hanya berisi "(kosong)"
      d.charts.topFaculties.some((x) => x.name !== "(kosong)") && card("Fakultas / jurusan", "10 terbanyak", c.fak, 300),
    ],
  ].map((r) => r.filter(Boolean)).filter((r) => r.length);
  return rows.map((r, i) => (r.length > 1 ? <div className="grid g-2" key={i}>{r}</div> : r[0]));
}

function Ranking({ d, scope, sort, onSort, showAll, onToggle }) {
  const list = d.rankings;
  const shown = showAll ? list : list.slice(0, 10);
  const metric = { ujian: "Nilai " + (d.kpi.selectedExamLabel || ""), rata: "Rata-rata", naik: "Kenaikan" }[sort];
  return (
    <section className="card">
      <div className="card-head">
        <div><h2 className="card-title"><Scoped title="Peringkat peserta" scope={scope} /></h2><div className="card-sub">{list.length ? `${list.length} peserta punya nilai untuk urutan ini` + (sort === "naik" ? " (minimal 2 ujian)" : "") : "Belum ada peserta dengan nilai untuk urutan ini"}</div></div>
        <Segmented label="Urutkan peringkat" value={sort} onChange={onSort} options={SORTS} />
      </div>
      {!list.length ? <div className="empty-inline">Pilih ujian lain atau urutan lain.</div> : (
        <div className="tbl-scroll"><table className="tbl compact">
          <thead><tr><th className="c-rank">#</th><th>Peserta</th><th className="sm-hide">Program</th><th className="sm-hide">Fakultas</th><th>Indeks</th><th className="num">{metric}</th></tr></thead>
          <tbody>{shown.map((p, i) => (
            <tr key={i} className={p.rank <= 3 ? "top" : ""}>
              <td className="c-rank"><span className={"rank-no" + (p.rank <= 3 ? " top" : "")}>{p.rank}</span></td>
              <td><div className="cell-strong">{p.nama}</div><div className="row-meta"><span className="sm-only">{sheetLabel(p.program)}</span><span>{p.school}</span><span>{p.province}</span></div></td>
              <td className="sm-hide">{sheetLabel(p.program)}</td><td className="sm-hide">{p.faculty || "–"}</td><td><IdxChip ix={p.index} /></td>
              <td className="num cell-strong">{sort === "naik" && p.metricValue > 0 ? "+" : ""}{Number(p.metricValue).toLocaleString("id-ID", { maximumFractionDigits: 1 })}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {list.length > 10 && <button type="button" className="see-more" onClick={onToggle}>{showAll ? "Tampilkan 10 teratas" : `Lihat semua (${list.length})`}<Icon name={showAll ? "up" : "down"} size={15} /></button>}
    </section>
  );
}

function Schools({ d, scope }) {
  const { schoolSearch: q, sekAll } = useUiStore((s) => s.pst);
  const patch = useUiStore((s) => s.patch);
  const ql = q.trim().toLowerCase();
  const list = ql ? d.schools.filter((s) => s.school.toLowerCase().includes(ql) || (s.province || "").toLowerCase().includes(ql)) : d.schools;
  const shown = sekAll || ql ? list : list.slice(0, 10);
  // program dengan nilai presentasi (EduQuest): rata-rata nilai peserta sekolah itu, bukan nilai ujian
  const asm = d.assessment && covers(d, d.assessment.answered);
  const avg = (s) => (asm ? s.assessmentAverage : s.averageScore);
  const fmtAvg = (v) => (asm ? fmt2(v) : Number(v).toLocaleString("id-ID", { maximumFractionDigits: 1 }));
  const graded = (s) => (asm ? s.assessmentGraded : s.gradedCount);
  return (
    <section className="card">
      <div className="card-head">
        <div><h2 className="card-title"><Scoped title="Sebaran sekolah" scope={scope} /></h2><div className="card-sub">{d.schools.length} sekolah/instansi{ql && ` · ${list.length} cocok`}</div></div>
        <SearchInput className="compact" value={q} onChange={(v) => patch("pst", { schoolSearch: v })} placeholder="Cari sekolah atau provinsi" delay={0} />
      </div>
      {!list.length ? <div className="empty-inline">Tidak ada sekolah yang cocok.</div> : (
        <div className="tbl-scroll"><table className="tbl compact">
          <thead><tr><th className="c-rank">#</th><th>Sekolah / instansi</th><th className="num">Peserta</th><th className="c-share">Porsi</th>
            <th className="sm-hide" title="Berapa periode berbeda sekolah ini mengirim peserta">Frekuensi</th><th className="num sm-hide">Rata-rata nilai</th></tr></thead>
          <tbody>{shown.map((s) => (
            <tr key={s.school}>
              <td className="c-rank muted">{s.rank}</td>
              <td><div className="cell-strong">{s.school}</div><div className="row-meta"><span className="sm-only">{s.frequency}× ikut</span>{avg(s) != null && <span className="sm-only">rata-rata {fmtAvg(avg(s))}</span>}<span>{s.province || "–"}</span></div></td>
              <td className="num cell-strong">{fmtNum(s.participantCount)}</td>
              <td className="c-share"><span className="att-cell"><Bar value={s.percentage} />{Number(s.percentage).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span></td>
              <td className="sm-hide" title={s.periods.map((p) => `${p.key}: ${p.count} peserta`).join("\n")}>{s.frequency}× <span className="muted small">{s.periods.slice(0, 2).map((p) => p.key).join(", ")}{s.periods.length > 2 ? ", …" : ""}</span></td>
              <td className="num sm-hide">{avg(s) == null ? <span className="muted">–</span> : fmtAvg(avg(s))}{graded(s) > 0 && <span className="muted small"> · {graded(s)} dinilai</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {!ql && list.length > 10 && <button type="button" className="see-more" onClick={() => patch("pst", { sekAll: !sekAll })}>{sekAll ? "Tampilkan 10 teratas" : `Lihat semua (${list.length})`}<Icon name={sekAll ? "up" : "down"} size={15} /></button>}
    </section>
  );
}

function Participants({ query, exams, scope }) {
  const ui = useUiStore((s) => s.pst);
  const patch = useUiStore((s) => s.patch);
  const { data, error, loading, reload } = useApi("/peserta/participants", { ...query, search: ui.search, page: ui.page, perPage: ui.perPage });
  const rows = data?.data || [];
  const busy = usePending(loading && !!data);
  const [open, setOpen] = useState(null);
  const scoreChips = (p) => [
    ...exams.filter((u) => p.scores?.[u.key]?.value != null).map((u) => (
      <span key={u.key} className="score" title={u.label}><small>{u.label.replace(/ \d{4}$/, "")}</small><b>{fmtScore(p.scores[u.key].value)}</b><IdxChip ix={p.scores[u.key].index} /></span>
    )),
    // nilai presentasi (EduQuest): NILAI rata-rata kelompok
    p.nilai != null && <span key="asm" className="score" title="Nilai rata-rata presentasi kelompok"><small>Nilai rata-rata</small><b>{fmt2(p.nilai)}</b></span>,
  ].filter(Boolean);
  const hasExam = (p) => exams.some((u) => p.scores?.[u.key]?.value != null || p.scores?.[u.key]?.index);
  return (
    <section className="card tbl-card">
      <div className="tbl-head"><div><h2 className="card-title"><Scoped title="Daftar peserta" scope={scope} /></h2>
        <div className="card-sub">{data?.pagination ? fmtNum(data.pagination.totalRecords) + " peserta sesuai filter" : "Memuat…"}</div></div></div>
      <div className="tbl-toolbar">
        <SearchInput value={ui.search} onChange={(v) => patch("pst", { search: v, page: 1 })} placeholder="Cari nama, sekolah, atau kelompok" />
      </div>
      <ErrorNote error={error} onRetry={() => reload()} />
      {!data && loading ? <TableSkeleton /> : !rows.length ? (
        <EmptyState icon={ui.search ? "search" : "users"} title={ui.search ? `Tidak ada peserta yang cocok dengan "${ui.search}"` : "Belum ada peserta untuk filter ini"} />
      ) : (
        <div className={"tbl-body" + busy} aria-busy={loading}>
          <div className="tbl-scroll"><table className="tbl pst-tbl">
            <thead><tr><th>Peserta</th><th>Program</th><th className="c-fak">Fakultas / jurusan</th><th className="c-kel">Kelompok</th><th>Nilai</th></tr></thead>
            <tbody>{rows.map((p, i) => (
              <tr key={i} onClick={() => setOpen(p)}>
                <td><button type="button" className="row-link" onClick={(e) => { e.stopPropagation(); setOpen(p); }}>{p.nama}</button>
                  <div className="row-meta"><span>{p.sekolah || "–"}</span>{p.kabupaten && <span>{p.kabupaten}</span>}{p.provinsi && <span>{p.provinsi}</span>}</div></td>
                <td><div>{sheetLabel(p.program)}{p.periode && <span className="muted"> · P{p.periode}</span>}</div>
                  <div className="row-meta"><span className="trunc">{[p.peran, p.bidang].filter(Boolean).join(" · ") || p.aktivitas}</span></div></td>
                <td className="c-fak">{p.fakultas || <span className="muted">–</span>}</td>
                <td className="c-kel">{p.kelompok || <span className="muted">–</span>}{p.kategori && <div className="row-meta"><span>{p.kategori}</span></div>}</td>
                <td><div className="scores">{scoreChips(p).length ? scoreChips(p) : <span className="muted">Belum ada nilai</span>}</div></td>
              </tr>
            ))}</tbody>
          </table></div>
          <ul className="rec-list">{rows.map((p, i) => (
            <li key={i} className="rec"><button type="button" className="rec-main" onClick={() => setOpen(p)}>
              <span className="rec-top"><span className="rec-name">{p.nama}</span></span>
              <span className="rec-meta"><span>{p.sekolah || "–"}</span><span>{sheetLabel(p.program)}{p.periode && " · P" + p.periode}</span>{p.kelompok && <span>{p.kelompok}</span>}</span>
              <span className="scores">{scoreChips(p)}</span>
            </button></li>
          ))}</ul>
        </div>
      )}
      <Pagination pagination={data?.pagination} perPage={ui.perPage} noun="peserta"
        onPage={(n) => patch("pst", { page: n })} onPerPage={(n) => patch("pst", { perPage: n, page: 1 })} />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.nama} sub={open && sheetLabel(open.program) + (open.periode ? " · Periode " + open.periode : "")}>
        {open && (
          <>
            <dl className="facts">
              {[["Sekolah", open.sekolah], ["Provinsi", open.provinsi], ["Aktivitas", open.aktivitas], ["Fakultas / jurusan", open.fakultas],
                open.kategori ? ["Kategori", open.kategori] : ["Skema", open.skema], ["Tipe", open.tipe], ["Kelompok", open.kelompok], ["PIC", open.pic]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || "–"}</dd></div>)}
            </dl>
            {open.criteria?.length > 0 && <>
              <h3 className="detail-h">Nilai presentasi{open.kelompok && <span className="muted"> · {open.kelompok}</span>}</h3>
              <table className="mini-tbl"><thead><tr><th>Kriteria</th><th className="num">Rata-rata</th></tr></thead>
                <tbody>{open.criteria.map((k) => <tr key={k.name}><td>{k.name}</td><td className="num">{fmt2(k.value)}</td></tr>)}
                  <tr className="mini-total"><td>NILAI rata-rata</td><td className="num">{fmt2(open.nilai)}</td></tr></tbody></table>
            </>}
            {/* tabel ujian hanya bila peserta punya nilai ujian, atau tidak punya nilai sama sekali */}
            {(hasExam(open) || !open.criteria?.length) && <>
              <h3 className="detail-h">Nilai ujian</h3>
              {hasExam(open) ? (
                <table className="mini-tbl"><thead><tr><th>Ujian</th><th className="num">Nilai</th><th>Indeks</th></tr></thead>
                  <tbody>{exams.map((u) => { const s = open.scores?.[u.key]; return <tr key={u.key}><td>{u.label}</td><td className="num">{fmtScore(s?.value)}</td><td><IdxChip ix={s?.index} /></td></tr>; })}</tbody></table>
              ) : <div className="empty-inline">Belum ada nilai.</div>}
            </>}
          </>
        )}
      </Sheet>
    </section>
  );
}
