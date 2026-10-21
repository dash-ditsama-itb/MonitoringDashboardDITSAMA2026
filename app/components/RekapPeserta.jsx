// Kartu "Rekap kepesertaan": batang horizontal per program, dipisah Terlayani / Proses PKS.
// Data dari REKAP_PESERTA (config.js). `program` (kode backend) -> hanya batang program itu.
import { REKAP_PESERTA } from "../config.js";
import { fmtNum } from "../lib/format.js";

const SECTIONS = [
  { status: "Terlayani", title: "Terlayani", step: 500 },
  { status: "Proses PKS", title: "Rencana / proses PKS", step: 1000 },
];
const BAR_SPAN = 88; // % lebar area batang; sisanya untuk angka di ujung batang

const sum = (rows) => rows.reduce((a, r) => a + r.value, 0);

// scope: nama di judul (mis. "semua program" / "Eduquest"); hideEmpty: tanpa data rekap -> kartu tidak ditampilkan;
// highlight (kode backend): semua program tetap tampil, program itu berwarna dan sisanya abu-abu
export function RekapPeserta({ program, programLabel, scope, hideEmpty, highlight, highlightLabel }) {
  const rows = program ? REKAP_PESERTA.filter((r) => r.programs.includes(program)) : REKAP_PESERTA;
  if (hideEmpty && !rows.length) return null;
  const titleScope = scope ?? (program ? programLabel : null);
  const terlayani = sum(REKAP_PESERTA.filter((r) => r.status === "Terlayani"));
  const rencana = sum(REKAP_PESERTA.filter((r) => r.status !== "Terlayani"));
  const shared = rows.find((r) => r.programs.length > 1);
  const lit = highlight ? REKAP_PESERTA.find((r) => r.programs.includes(highlight)) : null;
  const sub = highlightLabel
    ? (lit ? `${highlightLabel} disorot` + (lit.programs.length > 1 ? ` (direkap bersama: ${lit.label})` : "") : `${highlightLabel} belum ada di rekap`)
      + ` · total ${fmtNum(terlayani + rencana)} peserta`
    : !program
    ? `${fmtNum(terlayani)} terlayani + ${fmtNum(rencana)} rencana = ${fmtNum(terlayani + rencana)} · agregat antarprogram belum tentu individu unik`
    : shared ? `${programLabel || scope || "Program ini"} direkap bersama: ${shared.label}` : "Jumlah peserta saat rekap";

  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Rekap kepesertaan{titleScope && <> <span className="title-prog">{titleScope}</span></>}</h2>
        <div className="card-sub">{sub}</div></div></div>
      {!rows.length ? <div className="empty-inline">Belum ada data rekap untuk program ini.</div> : (
        <>
          <div className="rp-legend">
            <span><i />terlayani</span>
            <span><i className="pks" />proses PKS (belum terlayani)</span>
          </div>
          {SECTIONS.map((sec) => {
            const all = REKAP_PESERTA.filter((r) => r.status === sec.status);
            const list = rows.filter((r) => r.status === sec.status).sort((a, b) => b.value - a.value);
            if (!list.length) return null;
            // skala dari semua program di bagian ini, agar panjang batang sama saat difilter
            const max = Math.ceil(Math.max(...all.map((r) => r.value)) / sec.step) * sec.step;
            const ticks = Array.from({ length: max / sec.step + 1 }, (_, i) => i * sec.step);
            const pos = (v) => (v / max) * BAR_SPAN + "%";
            return (
              <div className="rp-sec" key={sec.status}>
                <h3>{sec.title}{!program && <small>total {fmtNum(sum(all))}</small>}</h3>
                {list.map((r) => (
                  <div className={"rp-row" + (highlightLabel ? (r === lit ? " on" : " off") : "")} key={r.label} title={`${r.label}: ${fmtNum(r.value)} peserta · ${r.status}`}>
                    <div className="rp-name">{r.label}{sec.status !== "Terlayani" && <small>proses PKS</small>}</div>
                    <div className="rp-bars">
                      <div className="rp-grid" aria-hidden="true">{ticks.slice(1).map((t) => <i key={t} style={{ left: pos(t) }} />)}</div>
                      <div className={"rp-bar" + (sec.status !== "Terlayani" ? " pks" : "")}>
                        <span style={{ width: pos(r.value) }} /><b>{fmtNum(r.value)}</b>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rp-axis" aria-hidden="true"><span />
                  <div className="rp-ticks">{ticks.map((t) => <span key={t} style={{ left: pos(t) }}><em>{fmtNum(t)}</em></span>)}</div>
                </div>
              </div>
            );
          })}
          {!program && <p className="rp-note">Skala dibuat terpisah untuk Terlayani dan Proses PKS supaya program kecil tetap terlihat; angka di ujung batang adalah nilai sebenarnya.</p>}
        </>
      )}
    </section>
  );
}
