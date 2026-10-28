import { useMemo } from "react";
import { ChartCanvas } from "../../components/ChartCanvas.jsx";
import { FinanceTable } from "../../components/Finance.jsx";
import { RequireAccess } from "../../components/Access.jsx";
import { Icon } from "../../components/Icon.jsx";
import { Bar, ErrorNote, Kpi, PageHead, PageSkeleton, Pending, SelectField } from "../../components/ui.jsx";
import { byLabel, FIN_PROGRAMS_AZ, finProgramLabel, fmtRupiah, fmtRupiahShort, moneyScale, MONTHS, progColor } from "../../lib/format.js";
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

  const filters = {
    programs: [ui.program || "all"],
    ...(ui.year ? { year: Number(ui.year) } : {}),
    ...(ui.month ? { month: Number(ui.month) } : {}),
    ...(ui.submissionType ? { submissionType: ui.submissionType } : {}),
  };
  const { data, error, loading, reload } = useApi("/dashboard/financial", filters);
  const d = data?.data;
  const fo = d?.filterOptions;
  const months = (fo?.months || []).filter((m) => !ui.year || String(m.year) === ui.year);
  const setFilter = (v) => update({ ...v, page: 1 });
  const active = !!(ui.program !== "all" || ui.year || ui.month || ui.submissionType);

  return (
    <div className="page">
      <PageHead title="Keuangan" sub="PKS, pengajuan dana, dan saldo per program" />

      <section className="card filter-bar">
        <SelectField label="Program" value={ui.program} onChange={(v) => setFilter({ program: v })}
          options={[["all", "Semua program"], ...FIN_PROGRAMS_AZ.map((p) => [p.api, p.label])]} />
        <SelectField label="Tahun" value={ui.year} onChange={(v) => setFilter({ year: v, month: "" })}
          options={[["", "Semua tahun"], ...(fo?.years || []).map((y) => [String(y), String(y)])]} />
        <SelectField label="Bulan" value={ui.month} onChange={(v) => setFilter({ month: v })}
          options={[["", "Semua bulan"], ...[...new Set(months.map((m) => m.month))].sort((a, b) => a - b).map((m) => [String(m), MONTHS[m - 1]])]} />
        <SelectField label="Jenis pengajuan" value={ui.submissionType} onChange={(v) => setFilter({ submissionType: v })}
          options={[["", "Semua jenis"], ...(fo?.submissionTypes || []).map((t) => [t, t])]} />
        {active && <button type="button" className="btn btn-sm filter-reset" onClick={() => setFilter({ program: "all", year: "", month: "", submissionType: "" })}>Reset filter</button>}
      </section>

      <ErrorNote error={error} onRetry={() => reload()} />

      {!d ? <PageSkeleton kpis={5} /> : (
        <Pending busy={loading}>
          <div className="kpi-row five">
            <Kpi label="Total nilai PKS" value={fmtRupiahShort(d.kpi.totalPks)} hint={fmtRupiah(d.kpi.totalPks)} icon="wallet" />
            <Kpi label="Total DPKS" value={fmtRupiahShort(d.kpi.totalDpks)} hint={fmtRupiah(d.kpi.totalDpks)} />
            <Kpi label="Total pengajuan" value={fmtRupiahShort(d.kpi.totalSubmission)} hint={fmtRupiah(d.kpi.totalSubmission)} />
            <Kpi label="Saldo saat ini" value={fmtRupiahShort(d.kpi.currentBalance)} hint={fmtRupiah(d.kpi.currentBalance)} tone={d.kpi.currentBalance < 0 ? "t-neg" : ""} />
            <div className="kpi">
              <div className="kpi-lab">Serapan anggaran</div>
              <div className="kpi-val">{d.kpi.absorptionPercentage}%</div>
              <Bar value={d.kpi.absorptionPercentage} tone={d.kpi.absorptionPercentage > 95 ? "crit" : ""} />
            </div>
          </div>
          <FinCharts d={d} />
          <Summary rows={d.summary} />
        </Pending>
      )}

      <FinanceTable filters={filters} ui={ui} update={update} />
    </div>
  );
}

function FinCharts({ d }) {
  const charts = useMemo(() => {
    const months = d.monthlyRealization.map((m) => m.month);
    const azFin = byLabel(finProgramLabel);
    const progs = [...new Set(d.monthlyRealization.flatMap((m) => m.programs.filter((p) => p.realization).map((p) => p.program)))].sort(azFin);
    // sumbu Y: angka saja (format Indonesia), satuan di judul sumbu dalam kurung; tooltip nominal rupiah lengkap
    const axis = (sc, extra) => ({ beginAtZero: true, ...extra, title: { display: true, text: `(${sc.unit})`, color: "#5d6879", font: { size: 11 } },
      ticks: { callback: (v) => Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) } });
    const tip = (sc) => ({ callbacks: { label: (c) => `${c.dataset.label}: ${fmtRupiah((c.parsed.y ?? c.parsed.x) * sc.div)}` } });
    const val = (v, sc) => (v == null ? null : (Number(v) || 0) / sc.div);
    // realisasi ditumpuk: satuan dari total tertinggi per bulan
    const rScale = moneyScale(Math.max(0, ...d.monthlyRealization.map((m) => m.programs.reduce((s, x) => s + (Number(x.realization) || 0), 0))));
    const realisasi = {
      type: "bar",
      data: {
        labels: months.length ? months.map(monthName) : ["(belum ada pengajuan)"],
        datasets: progs.map((p) => ({
          label: finProgramLabel(p), backgroundColor: progColor(p), borderRadius: 3, maxBarThickness: 34, stack: "s",
          data: d.monthlyRealization.map((m) => val(m.programs.find((x) => x.program === p)?.realization ?? 0, rScale)),
        })),
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", align: "end" }, tooltip: tip(rScale) },
        scales: { x: { stacked: true, grid: { display: false } }, y: axis(rScale, { stacked: true }) } },
    };
    const bProgs = [...new Set(d.monthlyBalance.flatMap((m) => m.programs.filter((p) => p.balance).map((p) => p.program)))].sort(azFin);
    const sScale = moneyScale(Math.max(0, ...d.monthlyBalance.flatMap((m) => m.programs.map((x) => Math.abs(Number(x.balance) || 0)))));
    const saldo = {
      type: "line",
      data: {
        labels: d.monthlyBalance.length ? d.monthlyBalance.map((m) => monthName(m.month)) : ["(belum ada data)"],
        datasets: bProgs.map((p) => ({
          label: finProgramLabel(p), borderColor: progColor(p), backgroundColor: progColor(p), tension: 0.3, spanGaps: true, pointRadius: 3,
          data: d.monthlyBalance.map((m) => { const v = m.programs.find((x) => x.program === p); return v ? val(v.balance, sScale) : null; }),
        })),
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", align: "end" }, tooltip: tip(sScale) },
        scales: { x: { grid: { display: false } }, y: axis(sScale, { beginAtZero: false }) } },
    };
    const cmp = d.programComparison.filter((p) => p.pksValue || p.realization).sort(byLabel((p) => finProgramLabel(p.program)));
    const cScale = moneyScale(Math.max(0, ...cmp.flatMap((p) => [Number(p.pksValue) || 0, Number(p.realization) || 0])));
    const banding = {
      type: "bar",
      data: {
        labels: cmp.length ? cmp.map((p) => finProgramLabel(p.program)) : ["(belum ada data)"],
        datasets: [
          { label: "Nilai PKS", data: cmp.map((p) => val(p.pksValue ?? 0, cScale)), backgroundColor: "#BCD3EE", borderRadius: 4, maxBarThickness: 40 },
          { label: "Realisasi", data: cmp.map((p) => val(p.realization ?? 0, cScale)), backgroundColor: "#3a6db0", borderRadius: 4, maxBarThickness: 40 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", align: "end" }, tooltip: tip(cScale) },
        scales: { x: { grid: { display: false } }, y: axis(cScale) } },
    };
    return { realisasi, saldo, banding, units: { realisasi: rScale.unit, saldo: sScale.unit, banding: cScale.unit } };
  }, [d]);

  return (
    <>
      <div className="grid g-2">
        <section className="card"><div className="card-head"><div><h2 className="card-title">Realisasi bulanan</h2><div className="card-sub">Pengajuan per bulan, ditumpuk per program · nilai dalam {charts.units.realisasi}</div></div></div>
          <ChartCanvas config={charts.realisasi} height={260} /></section>
        <section className="card"><div className="card-head"><div><h2 className="card-title">Saldo per bulan</h2><div className="card-sub">Saldo akhir bulan tiap program · nilai dalam {charts.units.saldo}</div></div></div>
          <ChartCanvas config={charts.saldo} height={260} /></section>
      </div>
      <section className="card"><div className="card-head"><div><h2 className="card-title">Nilai PKS vs realisasi</h2><div className="card-sub">Per program · nilai dalam {charts.units.banding}</div></div></div>
        <ChartCanvas config={charts.banding} height={240} /></section>
    </>
  );
}

// kartu sempit: nominal diringkas (Rp 1,07 miliar)
const Money = ({ v }) => <><span className="sm-hide">{fmtRupiah(v)}</span><span className="sm-only">{fmtRupiahShort(v)}</span></>;

function Summary({ rows }) {
  const used = rows.filter((r) => r.totalPks || r.totalSubmission).sort(byLabel((r) => finProgramLabel(r.program)));
  const idle = rows.length - used.length;
  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Ringkasan per program</h2>
        <div className="card-sub">{idle > 0 ? `${idle} program belum punya transaksi dan tidak ditampilkan` : "Semua program"}</div></div></div>
      {!used.length ? <div className="empty-inline">Belum ada transaksi untuk filter ini.</div> : (
        <div className="tbl-scroll"><table className="tbl compact">
          <thead><tr><th>Program</th><th className="num">Nilai PKS</th><th className="num sm-hide">DPKS</th><th className="num sm-hide">Pengajuan</th><th className="num">Saldo</th><th className="c-abs">Serapan</th></tr></thead>
          <tbody>{used.map((r) => (
            <tr key={r.program}>
              <td className="cell-strong"><span className="port-dot" style={{ background: progColor(r.program) }} />{finProgramLabel(r.program)}</td>
              <td className="num"><Money v={r.totalPks} /></td><td className="num sm-hide">{fmtRupiah(r.totalDpks)}</td>
              <td className="num sm-hide">{fmtRupiah(r.totalSubmission)}</td><td className={"num cell-strong" + (r.balance < 0 ? " neg" : "")}><Money v={r.balance} /></td>
              <td className="c-abs"><span className="att-cell"><Bar value={r.absorptionPercentage} />{r.absorptionPercentage}%</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <p className="hint"><Icon name="info" size={14} />Serapan = pengajuan ÷ (nilai PKS − DPKS).</p>
    </section>
  );
}
