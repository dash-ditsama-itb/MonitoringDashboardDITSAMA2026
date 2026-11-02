import { useMemo } from "react";
import { ChartCanvas } from "../../components/ChartCanvas.jsx";
import { FinanceTable, useFinCatalog } from "../../components/Finance.jsx";
import { RequireAccess } from "../../components/Access.jsx";
import { Icon } from "../../components/Icon.jsx";
import { Bar, ErrorNote, Kpi, PageHead, PageSkeleton, Pending, SelectField, YearChecks } from "../../components/ui.jsx";
import { finGroupOf, finGroups, finMitra, finRecipients, setFinDataYears, fmtPct, fmtRupiah, recipientText, fmtRupiahShort, moneyScale, MONTHS, progColor } from "../../lib/format.js";
import { useApi } from "../../stores/data.js";
import { useUiStore } from "../../stores/ui.js";

const monthName = (ym) => { const [y, m] = ym.split("-"); return MONTHS[Number(m) - 1].slice(0, 3) + " " + y; };

export default function Financial() {
  return <RequireAccess area="finance" page="Keuangan"><FinancialPage /></RequireAccess>;
}

function FinancialPage() {
  const ui = useUiStore((s) => s.fin);
  const patch = useUiStore((s) => s.patch);
  const update = (v) => patch("fin", v);

  const { ready: catalogReady } = useFinCatalog();
  // nama program mengikuti tahun (mis. Freeport 2025 = INSPIRASI SCD & Bridging, 2026 = INSPIRASI EduQuest & SIAP ITB)
  // tahun dicentang (bawaan: tahun ini); dua tahun atau lebih = dijumlah, nama program gabungan tahun-tahun itu
  const years = ui.years;
  const year = years.length === 1 ? years[0] : undefined;
  setFinDataYears(years);
  // filter Program = kelompok program (mis. INSPIRASI SCD = YPK + Toraja); tetap ikut kelompoknya walau tahun berganti
  const group = ui.program && ui.program !== "all" ? finGroupOf(ui.program.split(",")[0], year) : null;
  const filters = {
    programs: group ? group.apis : ["all"],
    year: year ?? years,
    ...(year && ui.month ? { month: Number(ui.month) } : {}),
    ...(ui.submissionType ? { submissionType: ui.submissionType } : {}),
  };
  const { data, error, loading, reload } = useApi("/dashboard/financial", filters);
  const d = data?.data;
  const fo = d?.filterOptions;
  const months = (fo?.months || []).filter((m) => years.includes(m.year));
  const thisYear = new Date().getFullYear();
  const yearOptions = [...new Set([thisYear, ...(fo?.years || []), ...years])].sort((a, b) => b - a);
  const setFilter = (v) => update({ ...v, page: 1 });
  // filter bulan hanya untuk satu tahun (saldo = akhir bulan itu)
  const setYears = (list) => setFilter({ years: list, ...(list.length > 1 ? { month: "" } : {}) });
  const month = year ? ui.month : "";
  // periode bisa berlanjut ke tahun berikutnya: bulan itu ditulis dengan tahun kalendernya (April 2026 di periode 2025)
  const calendarYear = (m) => Math.max(year ?? 0, ...months.filter((x) => x.month === m).map((x) => x.calendarYear ?? x.year));
  const period = month ? `${MONTHS[Number(month) - 1]} ${calendarYear(Number(month))}` : years.join(" & ");
  const active = !!(group || month || ui.submissionType || years.length !== 1 || year !== thisYear);

  return (
    <div className="page">
      <PageHead title="Keuangan" sub="PKS, pengajuan dana, dan saldo per program" />

      <section className="card filter-bar">
        <SelectField label="Program" value={group ? group.key : "all"} onChange={(v) => setFilter({ program: v })}
          options={[["all", "Semua program"], ...finGroups(year).map((g) => [g.key, g.label])]} />
        <div className="field"><span className="field-lab">Tahun</span>
          <YearChecks years={years} options={yearOptions} onChange={setYears} />
        </div>
        <SelectField label="Bulan" value={month} onChange={(v) => setFilter({ month: v })} disabled={!year}
          options={[["", "Semua bulan"], ...[...new Set(months.map((m) => m.month))].map((m) => [String(m), MONTHS[m - 1] + (year && calendarYear(m) !== year ? ` ${calendarYear(m)}` : "")])]} />
        <SelectField label="Jenis pengajuan" value={ui.submissionType} onChange={(v) => setFilter({ submissionType: v })}
          options={[["", "Semua jenis"], ...(fo?.submissionTypes || []).map((t) => [t, t])]} />
        {active && <button type="button" className="btn btn-sm filter-reset" onClick={() => setFilter({ program: "all", years: [thisYear], month: "", submissionType: "" })}>Reset filter</button>}
      </section>

      <ErrorNote error={error} onRetry={() => reload()} />

      {!d ? <PageSkeleton kpis={5} /> : (
        <Pending busy={loading}>
          <div className="kpi-row five">
            {/* PKS & saldo mengikuti periode filter: tahun, atau 1 Jan s.d. akhir bulan terpilih */}
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
          <FinCharts d={d} period={month ? period : ""} year={year} catalogReady={catalogReady} />
          <Summary rows={d.summary} period={month ? period : ""} year={year} />
        </Pending>
      )}

      <FinanceTable filters={filters} ui={ui} update={update} years={years} yearOptions={yearOptions} onYears={setYears} />
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

// serapan satu desimal; absorbed = pengajuan s.d. akhir periode dari server (fallback: pengajuan periode)
const absorption = (pks, dpks, sub) => (pks - dpks > 0 ? Math.round((sub / (pks - dpks)) * 1000) / 10 : 0);
const absorbedOf = (v) => v.absorbed ?? v.totalSubmission;

// ringkasan per kelompok program; kelompok bermitra menampilkan mitranya, dan rincian per mitra bila lebih dari satu
function Summary({ rows, period, year }) {
  const used = byGroup(rows.filter((r) => r.totalPks || r.totalSubmission), (r) => r.program, (r) => r, year);
  const idle = finGroups(year).filter((g) => rows.some((r) => g.apis.includes(r.program))).length - used.length;
  const line = (key, label, v, sub) => (
    <tr key={key} className={sub ? "fin-sub" : ""}>
      <td className={sub ? "" : "cell-strong"}>{label}</td>
      <td className="num"><Money v={v.totalPks} /></td><td className="num sm-hide">{fmtRupiah(v.totalDpks)}</td>
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
          <thead><tr><th>Program</th><th className="num">Nilai PKS</th><th className="num sm-hide">DPKS</th><th className="num sm-hide">{period ? `Pengajuan ${period}` : "Pengajuan"}</th><th className="num">{period ? "Saldo akhir bulan" : "Saldo"}</th><th className="c-abs">{period ? "Serapan s.d. bulan" : "Serapan"}</th></tr></thead>
          <tbody>{used.map(({ group: g, parts }) => {
            const t = Object.fromEntries(["totalPks", "totalDpks", "totalSubmission", "balance"].map((k) => [k, sumOf(parts, k)]));
            t.absorptionPercentage = absorption(t.totalPks, t.totalDpks, parts.reduce((s, p) => s + (Number(absorbedOf(p.values)) || 0), 0));
            const mitras = parts.map((p) => finMitra(p.api)).filter(Boolean);
            const name = (
              <><span className="port-dot" style={{ background: groupColor(g) }} />{g.label}
                {mitras.length > 0 && <span className="fin-mitra">Mitra: {mitras.join(", ")}</span>}</>
            );
            // pengajuan mitra yang membiayai beberapa program (TN, Freeport) dirinci per program penerima
            const split = (p) => (finRecipients(p.api, year).length > 1 ? [...(p.values.recipients || [])]
              .sort((a, b) => (a.program ? finRecipients(p.api, year).indexOf(a.program) : 99) - (b.program ? finRecipients(p.api, year).indexOf(b.program) : 99))
              .map((x) => (
                <tr key={p.api + (x.program || "bersama")} className="fin-sub fin-rec">
                  <td>{recipientText(p.api, x.program, year)}</td><td colSpan={5}>Pengajuan {fmtRupiah(x.submission)}</td>
                </tr>
              )) : []);
            return [
              line(g.key, name, t),
              ...(parts.length > 1 ? parts.flatMap((p) => [line(p.api, `Mitra ${finMitra(p.api) || "–"}`, p.values, true), ...split(p)]) : split(parts[0])),
            ];
          })}</tbody>
        </table></div>
      )}
      <p className="hint"><Icon name="info" size={14} />Serapan = pengajuan ÷ (nilai PKS − DPKS). Filter tahun/bulan: PKS, saldo, dan serapan dihitung dari 1 Januari sampai akhir periode; saldo memakai semua jenis pengajuan. Nama program menggantikan nama sumber dana; mitra = pemberi dana (mis. YPK, TN, Freeport).</p>
    </section>
  );
}
