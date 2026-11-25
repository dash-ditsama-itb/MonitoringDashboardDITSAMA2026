import { useMemo } from "react";
import { ChartCanvas } from "../../components/ChartCanvas.jsx";
import { FinanceTable, useFinCatalog } from "../../components/Finance.jsx";
import { RequireAccess } from "../../components/Access.jsx";
import { Icon } from "../../components/Icon.jsx";
import { Bar, ErrorNote, Kpi, PageHead, PageSkeleton, Pending, SelectField, YearChecks } from "../../components/ui.jsx";
import { finAllPeriods, finGroupOf, finGroups, finMitra, finPeriod, finPeriodDates, finPeriodName, finPeriodOption, finPeriodYear, finPeriodYears, finRecipients, setFinDataYears, fmtPct, fmtRupiah, recipientText, fmtRupiahShort, moneyScale, MONTHS, progColor } from "../../lib/format.js";
import { FIN_FUNDING } from "../../config.js";
import { useApi } from "../../stores/data.js";
import { useUiStore } from "../../stores/ui.js";

// sumber dana per periode: kategori yang dipilih di PKS Awal; bila kosong, menurut mitranya (FIN_FUNDING di config.js)
const FUNDINGS = [["gov", "Pemerintah"], ["private", "Non-pemerintah"], ["none", "Belum ditentukan"]];
const fundingOf = (api, period) => period?.funding || FIN_FUNDING[api] || "none";
// filter sumber dana tanpa periode yang cocok: id yang tidak dimiliki periode mana pun, jadi hasilnya kosong
const NO_PERIOD = "00000000-0000-0000-0000-000000000000";

const monthName = (ym) => { const [y, m] = ym.split("-"); return MONTHS[Number(m) - 1].slice(0, 3) + " " + y; };

export default function Financial() {
  return <RequireAccess area="finance" page="Keuangan"><FinancialPage /></RequireAccess>;
}

function FinancialPage() {
  const ui = useUiStore((s) => s.fin);
  const patch = useUiStore((s) => s.patch);
  const update = (v) => patch("fin", v);

  const { ready: catalogReady, settled } = useFinCatalog();
  // filter utama = periode menurut tahun mulainya (2025, 2026, ...): periode yang mulai di tahun itu dihitung utuh, walau
  // berlanjut ke tahun berikutnya. Backend lama: tahun tanggal transaksi.
  const thisYear = new Date().getFullYear();
  const periodYearOptions = catalogReady ? finPeriodYears() : [];
  const pickedYears = (ui.periodYears || []).filter((y) => periodYearOptions.includes(y));
  const years = !catalogReady ? ui.years
    : pickedYears.length ? pickedYears
    : [periodYearOptions.includes(thisYear) ? thisYear : periodYearOptions[0] ?? thisYear];
  const year = years.length === 1 ? years[0] : undefined;
  setFinDataYears(years);
  const funding = catalogReady ? ui.funding || "" : "";
  const fits = (p) => years.includes(finPeriodYear(p)) && (!funding || fundingOf(p.api, p) === funding);
  // filter Program = kelompok program (mis. INSPIRASI SCD = YPK + Toraja), hanya yang punya periode di tahun dan sumber dana terpilih
  const inYears = (apis) => !catalogReady || finAllPeriods(apis).some(fits);
  const groupOptions = finGroups(year).filter((g) => inYears(g.apis));
  const picked = ui.program && ui.program !== "all" ? finGroupOf(ui.program.split(",")[0], year) : null;
  const group = picked && groupOptions.some((g) => g.key === picked.key) ? picked : null;
  const selectedPeriods = catalogReady ? finAllPeriods(group?.apis).filter(fits) : [];
  const selectedIds = selectedPeriods.map((p) => p.id);
  const filters = {
    programs: group ? group.apis : ["all"],
    ...(funding ? { periodIds: selectedIds.length ? selectedIds : [NO_PERIOD] } : { year: year ?? years }),
    ...(catalogReady && /^\d{4}-\d{2}$/.test(ui.month) ? { month: Number(ui.month.slice(5)), calendarYear: Number(ui.month.slice(0, 4)) } : {}),
    ...(!catalogReady && year && ui.month ? { month: Number(ui.month) } : {}),
    ...(ui.submissionType ? { submissionType: ui.submissionType } : {}),
  };
  const { data, error, loading, reload } = useApi("/dashboard/financial", filters, { enabled: settled });
  const d = data?.data;
  const fo = d?.filterOptions;
  const months = (fo?.months || []).filter((m) => (catalogReady ? selectedIds.includes(m.periodId) : years.includes(m.year)));
  const yearOptions = catalogReady ? periodYearOptions : [...new Set([thisYear, ...(fo?.years || []), ...years])].sort((a, b) => b - a);
  const setFilter = (v) => update({ ...v, page: 1 });
  // backend lama: filter bulan hanya untuk satu tahun (saldo = akhir bulan itu)
  const setYears = (list) => setFilter(catalogReady ? { periodYears: list } : { years: list, ...(list.length > 1 ? { month: "" } : {}) });
  const monthKey = (m) => `${m.year}-${String(m.month).padStart(2, "0")}`;
  const monthLabel = (key) => `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`;
  const monthKeys = [...new Set(months.map(monthKey))].sort();
  const month = catalogReady ? (monthKeys.includes(ui.month) ? ui.month : "") : year ? ui.month : "";
  const period = catalogReady
    ? (month ? monthLabel(month) : `periode ${[...years].sort().join(" & ")}`)
    : (month ? `${MONTHS[Number(month) - 1]} ${year}` : years.join(" & "));
  const active = !!(group || funding || month || ui.submissionType || (catalogReady ? pickedYears.length : years.length !== 1 || year !== thisYear));
  const picker = <YearChecks years={years} options={yearOptions.length ? yearOptions : years} onChange={setYears} />;

  return (
    <div className="page">
      <PageHead title="Keuangan" sub="PKS, pengajuan dana, dan saldo per program" />

      <section className="card filter-bar">
        <div className="field"><span className="field-lab">{catalogReady ? "Periode" : "Tahun"}</span>
          {picker}
        </div>
        {catalogReady && (
          <SelectField label="Sumber dana" value={funding} onChange={(v) => setFilter({ funding: v })}
            options={[["", "Semua"], ...FUNDINGS.slice(0, 2).map(([k, label]) => [k, label])]} />
        )}
        <SelectField label="Program" value={group ? group.key : "all"} onChange={(v) => setFilter({ program: v })}
          options={[["all", "Semua program"], ...groupOptions.map((g) => [g.key, g.label])]} />
        <SelectField label="Bulan" value={month} onChange={(v) => setFilter({ month: v })} disabled={!catalogReady && !year}
          options={[["", "Semua bulan"], ...(catalogReady
            ? monthKeys.map((k) => [k, monthLabel(k)])
            : [...new Set(months.map((m) => m.month))].map((m) => [String(m), MONTHS[m - 1]]))]} />
        <SelectField label="Jenis pengajuan" value={ui.submissionType} onChange={(v) => setFilter({ submissionType: v })}
          options={[["", "Semua jenis"], ...(fo?.submissionTypes || []).map((t) => [t, t])]} />
        {active && <button type="button" className="btn btn-sm filter-reset" onClick={() => setFilter({ program: "all", years: [thisYear], periodYears: null, funding: "", month: "", submissionType: "" })}>Reset filter</button>}
      </section>

      <ErrorNote error={error} onRetry={() => reload()} />

      {!d ? <PageSkeleton kpis={5} /> : (
        <Pending busy={loading}>
          <div className="kpi-row five">
            {/* PKS & saldo mengikuti filter: utuh per periode, atau s.d. akhir bulan terpilih */}
            <Kpi label={month ? `Nilai PKS s.d. ${period}` : `Nilai PKS ${period}`} value={fmtRupiahShort(d.kpi.totalPks)} hint={fmtRupiah(d.kpi.totalPks)} icon="wallet" />
            <Kpi label="Total DPKS" value={fmtRupiahShort(d.kpi.totalDpks)} hint={fmtRupiah(d.kpi.totalDpks)} />
            <Kpi label={period ? `Pengajuan ${period}` : "Total pengajuan"} value={fmtRupiahShort(d.kpi.totalSubmission)} hint={fmtRupiah(d.kpi.totalSubmission)} />
            <Kpi label={month ? `Saldo akhir ${period}` : `Saldo ${period}`} value={fmtRupiahShort(d.kpi.currentBalance)} hint={fmtRupiah(d.kpi.currentBalance)} tone={d.kpi.currentBalance < 0 ? "t-neg" : ""} />
            <div className="kpi">
              <div className="kpi-lab">{month ? `Serapan s.d. ${period}` : "Serapan anggaran"}</div>
              <div className="kpi-val">{fmtPct(d.kpi.absorptionPercentage)}</div>
              <Bar value={d.kpi.absorptionPercentage} tone={d.kpi.absorptionPercentage > 95 ? "crit" : ""} />
            </div>
          </div>
          {catalogReady && !funding && <FundingSplit rows={d.summary} />}
          <FinCharts d={d} period={month ? period : ""} year={year} catalogReady={catalogReady} />
          <Summary rows={d.summary} period={month ? period : ""} year={year} split={catalogReady} />
        </Pending>
      )}

      <FinanceTable filters={filters} ui={ui} update={update} labelYear={year} picker={picker} />
    </div>
  );
}

// nilai per sumber dana -> per kelompok program, urut A–Z; rincian mitra disimpan untuk tooltip & ringkasan
function byGroup(items, apiOf, valuesOf, year) {
  const out = new Map();
  for (const it of items) {
    const g = finGroupOf(apiOf(it), year);
    if (!g) continue;
    const cur = out.get(g.key) || { group: g, parts: [] };
    cur.parts.push({ api: apiOf(it), values: valuesOf(it) });
    out.set(g.key, cur);
  }
  return finGroups(year).filter((g) => out.has(g.key)).map((g) => out.get(g.key));
}
const sumOf = (parts, k) => parts.reduce((s, p) => s + (Number(p.values[k]) || 0), 0);
const groupColor = (g) => progColor(g.apis[0]);

function FinCharts({ d, period, year, catalogReady }) {
  const years = useUiStore((s) => s.fin.years);
  const charts = useMemo(() => {
    const months = d.monthlyRealization.map((m) => m.month);
    // sumbu Y: angka saja (format Indonesia), satuan di judul sumbu dalam kurung; tooltip nominal rupiah lengkap
    const axis = (sc, extra) => ({ beginAtZero: true, ...extra, title: { display: true, text: `(${sc.unit})`, color: "#5d6879", font: { size: 11 } },
      ticks: { callback: (v) => Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) } });
    // tooltip: nominal kelompok + rincian per mitra bila kelompoknya punya mitra (mis. INSPIRASI SCD: YPK, Toraja)
    const tip = (sc, detail) => ({ callbacks: {
      label: (c) => `${c.dataset.label}: ${fmtRupiah((c.parsed.y ?? c.parsed.x) * sc.div)}`,
      afterLabel: (c) => (detail ? detail(c) : []),
    } });
    const val = (v, sc) => (v == null ? null : (Number(v) || 0) / sc.div);
    const mitraLines = (parts, k) => (parts.some((p) => finMitra(p.api))
      ? parts.filter((p) => p.values[k]).map((p) => `   · mitra ${finMitra(p.api) || "–"}: ${fmtRupiah(p.values[k])}`) : []);

    // realisasi ditumpuk per kelompok program: satuan dari total tertinggi per bulan
    const rApis = [...new Set(d.monthlyRealization.flatMap((m) => m.programs.filter((p) => p.realization).map((p) => p.program)))];
    const rGroups = byGroup(rApis, (a) => a, (a) => Object.fromEntries(d.monthlyRealization.map((m, i) => [i, m.programs.find((x) => x.program === a)?.realization ?? 0])), year);
    const rScale = moneyScale(Math.max(0, ...d.monthlyRealization.map((m) => m.programs.reduce((s, x) => s + (Number(x.realization) || 0), 0))));
    const realisasi = {
      type: "bar",
      data: {
        labels: months.length ? months.map(monthName) : ["(belum ada pengajuan)"],
        datasets: rGroups.map(({ group: g, parts }) => ({
          label: g.label, backgroundColor: groupColor(g), borderRadius: 3, maxBarThickness: 34, stack: "s",
          data: d.monthlyRealization.map((_, i) => val(sumOf(parts, i), rScale)),
        })),
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", align: "end" },
        tooltip: tip(rScale, (c) => mitraLines(rGroups[c.datasetIndex].parts, c.dataIndex)) },
        scales: { x: { stacked: true, grid: { display: false } }, y: axis(rScale, { stacked: true }) } },
    };

    // saldo akhir bulan per kelompok = jumlah saldo sumber dananya (bulan tanpa data: kosong)
    const bApis = [...new Set(d.monthlyBalance.flatMap((m) => m.programs.filter((p) => p.balance).map((p) => p.program)))];
    const bOf = (a, m) => m.programs.find((x) => x.program === a)?.balance;
    const bGroups = byGroup(bApis, (a) => a, (a) => Object.fromEntries(d.monthlyBalance.map((m, i) => [i, bOf(a, m)])), year);
    const sScale = moneyScale(Math.max(0, ...d.monthlyBalance.flatMap((m) => m.programs.map((x) => Math.abs(Number(x.balance) || 0)))));
    const saldo = {
      type: "line",
      data: {
        labels: d.monthlyBalance.length ? d.monthlyBalance.map((m) => monthName(m.month)) : ["(belum ada data)"],
        datasets: bGroups.map(({ group: g, parts }) => ({
          label: g.label, borderColor: groupColor(g), backgroundColor: groupColor(g), tension: 0.3, spanGaps: true, pointRadius: 3,
          data: d.monthlyBalance.map((_, i) => (parts.some((p) => p.values[i] != null) ? val(sumOf(parts, i), sScale) : null)),
        })),
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", align: "end" },
        tooltip: tip(sScale, (c) => mitraLines(bGroups[c.datasetIndex].parts, c.dataIndex)) },
        scales: { x: { grid: { display: false } }, y: axis(sScale, { beginAtZero: false }) } },
    };

    const cGroups = byGroup(d.programComparison.filter((p) => p.pksValue || p.realization), (p) => p.program,
      (p) => ({ pks: p.pksValue ?? 0, real: p.realization ?? 0 }), year);
    const cScale = moneyScale(Math.max(0, ...cGroups.flatMap(({ parts }) => [sumOf(parts, "pks"), sumOf(parts, "real")])));
    const banding = {
      type: "bar",
      data: {
        labels: cGroups.length ? cGroups.map(({ group: g }) => g.label) : ["(belum ada data)"],
        datasets: [
          { label: "Nilai PKS", data: cGroups.map(({ parts }) => val(sumOf(parts, "pks"), cScale)), backgroundColor: "#BCD3EE", borderRadius: 4, maxBarThickness: 40 },
          { label: "Realisasi", data: cGroups.map(({ parts }) => val(sumOf(parts, "real"), cScale)), backgroundColor: "#3a6db0", borderRadius: 4, maxBarThickness: 40 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", align: "end" },
        tooltip: tip(cScale, (c) => mitraLines(cGroups[c.dataIndex].parts, c.datasetIndex ? "real" : "pks")) },
        scales: { x: { grid: { display: false } }, y: axis(cScale) } },
    };
    return { realisasi, saldo, banding, units: { realisasi: rScale.unit, saldo: sScale.unit, banding: cScale.unit } };
  }, [d, year, years.join(), catalogReady]);

  return (
    <>
      <div className="grid g-2">
        <section className="card"><div className="card-head"><div><h2 className="card-title">Realisasi bulanan</h2><div className="card-sub">Pengajuan per bulan, ditumpuk per program · nilai dalam {charts.units.realisasi}</div></div></div>
          <ChartCanvas config={charts.realisasi} height={260} /></section>
        <section className="card"><div className="card-head"><div><h2 className="card-title">Saldo per bulan</h2><div className="card-sub">Saldo akhir bulan tiap program · nilai dalam {charts.units.saldo}</div></div></div>
          <ChartCanvas config={charts.saldo} height={260} /></section>
      </div>
      <section className="card"><div className="card-head"><div><h2 className="card-title">Nilai PKS vs realisasi</h2><div className="card-sub">Per program{period && ` · realisasi s.d. akhir ${period}`} · nilai dalam {charts.units.banding}</div></div></div>
        <ChartCanvas config={charts.banding} height={240} /></section>
    </>
  );
}

// kartu sempit: nominal diringkas (Rp 1,07 miliar)
const Money = ({ v }) => <><span className="sm-hide">{fmtRupiah(v)}</span><span className="sm-only">{fmtRupiahShort(v)}</span></>;

// serapan satu desimal; absorbed = pengajuan s.d. akhir filter dari server (fallback: pengajuan filter)
// dana bersih = nilai PKS − DPKS; pajak hanya mengurangi dasar DPKS
const netOf = (v) => (Number(v.totalPks) || 0) - (Number(v.totalDpks) || 0);
const absorption = (net, sub) => (net > 0 ? Math.round((sub / net) * 1000) / 10 : 0);
const absorbedOf = (v) => v.absorbed ?? v.totalSubmission;
const sumValues = (list) => {
  const v = Object.fromEntries(["totalPks", "totalTax", "totalDpks", "totalSubmission", "balance", "absorbed"].map((k) => [k, list.reduce((s, x) => s + (Number(k === "absorbed" ? absorbedOf(x) : x[k]) || 0), 0)]));
  v.absorptionPercentage = absorption(netOf(v), v.absorbed);
  return v;
};
// bagian satu baris ringkasan (satu mitra) yang periodenya berkategori `kind`; satu mitra bisa terbagi bila kategorinya beda per periode
function onlyFunding(row, kind) {
  const periods = row.periods || [];
  if (!periods.length) return fundingOf(row.program) === kind ? { ...row, periods } : null;
  const list = periods.filter((x) => fundingOf(row.program, finPeriod(x.periodId)) === kind);
  if (!list.length) return null;
  if (list.length === periods.length) return { ...row, periods };
  const recipients = new Map();
  list.forEach((x) => (x.recipients || []).forEach((r) => recipients.set(r.program, (recipients.get(r.program) || 0) + r.submission)));
  return { program: row.program, ...sumValues(list), periods: list, recipients: [...recipients].map(([program, submission]) => ({ program, submission })) };
}
const fundingRows = (rows) => FUNDINGS.map(([kind, label]) => ({ kind, label, rows: rows.map((r) => onlyFunding(r, kind)).filter(Boolean) }))
  .filter((s) => s.rows.length);

// angka utama dipecah: total, pemerintah, non-pemerintah (dan periode tanpa PKS Awal bila ada)
function FundingSplit({ rows }) {
  const cols = fundingRows(rows).map((s) => ({ ...s, v: sumValues(s.rows), periods: s.rows.reduce((n, r) => n + r.periods.length, 0) }));
  if (!cols.length) return null;
  const all = { v: sumValues(cols.map((c) => c.v)), periods: cols.reduce((n, c) => n + c.periods, 0) };
  const pks = (kind) => cols.find((c) => c.kind === kind)?.v.totalPks || 0;
  const base = pks("gov") + pks("private");
  const share = (kind) => (base > 0 ? Math.round((pks(kind) / base) * 1000) / 10 : 0);
  const measures = [
    ["Nilai PKS", (x) => fmtRupiah(x.v.totalPks)], ["DPKS", (x) => fmtRupiah(x.v.totalDpks)], ["Dana bersih", (x) => fmtRupiah(netOf(x.v))],
    ["Pengajuan", (x) => fmtRupiah(x.v.totalSubmission)], ["Saldo", (x) => fmtRupiah(x.v.balance)], ["Serapan", (x) => fmtPct(x.v.absorptionPercentage)],
    ["Jumlah periode", (x) => x.periods],
  ];
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Sumber dana</h2>
        <div className="card-sub">Menurut kategori di PKS Awal tiap periode. Bila belum dipilih: pemerintah = BTI (Kemendikdasmen), MAUNG, dan SUGT; mitra lain (termasuk Toraja) non-pemerintah</div></div></div>
      <div className="tbl-scroll"><table className="tbl compact">
        <thead><tr><th />{[["Total"], ...cols.map((c) => [c.types ? `${c.label} (${c.types})` : c.label])].map(([h]) => <th key={h} className="num">{h}</th>)}</tr></thead>
        <tbody>{measures.map(([label, fmt]) => (
          <tr key={label}><td>{label}</td><td className="num cell-strong">{fmt(all)}</td>{cols.map((c) => <td key={c.kind} className="num">{fmt(c)}</td>)}</tr>
        ))}</tbody>
      </table></div>
      {base > 0 && (
        <>
          <div className="fund-bar" role="img" aria-label={`Nilai PKS: pemerintah ${fmtPct(share("gov"))}, non-pemerintah ${fmtPct(share("private"))}`}>
            <span className="gov" style={{ width: `${share("gov")}%` }} /><span className="private" style={{ width: `${share("private")}%` }} />
          </div>
          <div className="fund-legend"><span><span className="fund-dot gov" />Pemerintah {fmtPct(share("gov"))} dari nilai PKS</span><span><span className="fund-dot private" />Non-pemerintah {fmtPct(share("private"))}</span></div>
        </>
      )}
    </section>
  );
}

// ringkasan per kelompok program; kelompok bermitra menampilkan mitranya, dan rincian per mitra bila lebih dari satu
function Summary({ rows, period, year, split }) {
  const usedOf = (list) => byGroup(list.filter((r) => r.totalPks || r.totalSubmission), (r) => r.program, (r) => r, year);
  const used = usedOf(rows);
  const idle = finGroups(year).filter((g) => rows.some((r) => g.apis.includes(r.program))).length - used.length;
  // backend lama belum punya pajak dan periode
  const showTax = rows.some((r) => "totalTax" in r);
  // dikelompokkan per sumber dana (jenis PKS Awal tiap periode), masing-masing dengan subtotal
  const sections = split && rows.some((r) => r.periods?.length)
    ? fundingRows(rows).map((s) => ({ ...s, used: usedOf(s.rows) })).filter((s) => s.used.length)
    : [{ kind: "all", used }];
  const line = (key, label, v, sub, cls = "") => (
    <tr key={key} className={[sub ? "fin-sub" : "", cls].join(" ").trim() || undefined}>
      <td className={sub ? "" : "cell-strong"}>{label}</td>
      <td className="num"><Money v={v.totalPks} /></td>
      {showTax && <td className="num sm-hide">{v.totalTax ? fmtRupiah(v.totalTax) : "–"}</td>}
      <td className="num sm-hide">{fmtRupiah(v.totalDpks)}</td>
      {showTax && <td className="num sm-hide">{fmtRupiah(netOf(v))}</td>}
      <td className="num sm-hide">{fmtRupiah(v.totalSubmission)}</td><td className={"num" + (sub ? "" : " cell-strong") + (v.balance < 0 ? " neg" : "")}><Money v={v.balance} /></td>
      <td className="c-abs"><span className="att-cell"><Bar value={v.absorptionPercentage} />{fmtPct(v.absorptionPercentage)}</span></td>
    </tr>
  );
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Ringkasan per program</h2>
        <div className="card-sub">{idle > 0 ? `${idle} program belum punya transaksi dan tidak ditampilkan` : "Semua program"}</div></div></div>
      {!used.length ? <div className="empty-inline">Belum ada transaksi untuk filter ini.</div> : (
        <div className="tbl-scroll"><table className="tbl compact">
          <thead><tr><th>{showTax ? "Program dan periode" : "Program"}</th><th className="num">Nilai PKS</th>{showTax && <th className="num sm-hide">Pajak</th>}<th className="num sm-hide">DPKS</th>{showTax && <th className="num sm-hide">Dana bersih</th>}<th className="num sm-hide">{period ? `Pengajuan ${period}` : "Pengajuan"}</th><th className="num">{period ? "Saldo akhir bulan" : "Saldo"}</th><th className="c-abs">{period ? "Serapan s.d. bulan" : "Serapan"}</th></tr></thead>
          <tbody>{sections.flatMap((s) => [
            ...(s.kind === "all" ? [] : [line(`h:${s.kind}`, s.types ? `${s.label} (${s.types})` : s.label, sumValues(s.rows), false, "fin-head")]),
            ...s.used.flatMap(({ group: g, parts }) => {
            const pre = `${s.kind}:`;
            const t = Object.fromEntries(["totalPks", "totalTax", "totalDpks", "totalSubmission", "balance"].map((k) => [k, sumOf(parts, k)]));
            t.absorptionPercentage = absorption(netOf(t), parts.reduce((s, p) => s + (Number(absorbedOf(p.values)) || 0), 0));
            const mitras = parts.map((p) => finMitra(p.api)).filter(Boolean);
            const periodsOf = (p) => (p.values.periods || []).map((x) => ({ ...x, period: finPeriod(x.periodId) })).filter((x) => x.period)
              .sort((a, b) => new Date(a.period.start) - new Date(b.period.start));
            const periodCount = parts.reduce((n, p) => n + periodsOf(p).length, 0);
            const only = parts.length === 1 && periodCount === 1 ? periodsOf(parts[0])[0].period : null;
            const name = (
              <><span className="port-dot" style={{ background: groupColor(g) }} />{g.label}
                {mitras.length > 0 && <span className="fin-mitra">Mitra: {mitras.join(", ")}</span>}
                {only ? <span className="fin-mitra">{finPeriodOption(only)}</span> : periodCount > 1 && <span className="fin-mitra">{periodCount} periode</span>}</>
            );
            // satu periode digabung dengan baris program/mitranya; beberapa periode dirinci
            const periodRows = (p) => { const list = periodsOf(p); return list.length > 1 ? list.map((x) => line(pre + p.api + x.periodId,
              <>{finPeriodName(x.period)}<span className="fin-mitra fin-plain">{finPeriodDates(x.period)}</span></>, x, true)) : []; };
            const mitraName = (p) => { const list = periodsOf(p); return (
              <>Mitra {finMitra(p.api) || "–"}{list.length === 1 && <span className="fin-mitra fin-plain">{finPeriodOption(list[0].period)}</span>}</>
            ); };
            // pengajuan mitra yang membiayai beberapa program (TN, Freeport) dirinci per program penerima
            const splitRows = (p) => (finRecipients(p.api, year).length > 1 ? [...(p.values.recipients || [])]
              .sort((a, b) => (a.program ? finRecipients(p.api, year).indexOf(a.program) : 99) - (b.program ? finRecipients(p.api, year).indexOf(b.program) : 99))
              .map((x) => (
                <tr key={pre + p.api + (x.program || "bersama")} className="fin-sub fin-rec">
                  <td>{recipientText(p.api, x.program, year)}</td><td colSpan={showTax ? 7 : 5}>Pengajuan {fmtRupiah(x.submission)}</td>
                </tr>
              )) : []);
            return [
              line(pre + g.key, name, t),
              ...(parts.length > 1
                ? parts.flatMap((p) => [line(pre + p.api, mitraName(p), p.values, true), ...periodRows(p), ...splitRows(p)])
                : [...periodRows(parts[0]), ...splitRows(parts[0])]),
            ];
          }),
          ]).concat(sections.length > 1 ? [line("total", "Total", sumValues(sections.flatMap((s) => s.rows)), false, "fin-total")] : [])}</tbody>
        </table></div>
      )}
      <p className="hint"><Icon name="info" size={14} />{showTax
        ? "Dana bersih = nilai PKS − DPKS; pajak hanya mengurangi dasar DPKS (DPKS = persen × (nilai PKS − pajak)). Serapan = pengajuan ÷ dana bersih. Filter Periode memilih periode menurut tahun mulainya; periode yang berlanjut ke tahun berikutnya tetap dihitung utuh. Dengan filter bulan, dihitung s.d. akhir bulan itu."
        : "Serapan = pengajuan ÷ (nilai PKS − DPKS). Filter tahun/bulan: PKS, saldo, dan serapan dihitung dari 1 Januari sampai akhir periode; saldo memakai semua jenis pengajuan."} Nama program menggantikan nama sumber dana; mitra = pemberi dana (mis. YPK, TN, Freeport).</p>
    </section>
  );
}
