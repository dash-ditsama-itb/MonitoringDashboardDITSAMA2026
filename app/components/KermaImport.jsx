// Impor Rekap Pengajuan Kerma (satu sheet = satu kerja sama) ke Keuangan.
// Urutan konfirmasi dari backend (409): data kosong/ambigu -> nilai tidak wajar -> data tersimpan diganti.
import { useEffect, useRef, useState } from "react";
import { PKS_TYPES } from "../config.js";
import { errorText, upload } from "../lib/api.js";
import { finSourceLabel, finSources, fmtDate, fmtRupiah } from "../lib/format.js";
import { toast } from "./feedback.jsx";
import { Icon } from "./Icon.jsx";
import { SuspiciousDialog } from "./ImportExport.jsx";
import { Spinner } from "./ui.jsx";

const ACCEPT = ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const SUBMISSION_TYPES = ["Barang", "Jasa", "Pegawai", "Barang & Jasa", "Pengembalian", "Lainnya"];
const n = (v) => (v || 0).toLocaleString("id-ID");

// masalah yang ditemukan backend pada satu nilai
function problemText(x) {
  const v = x.value ? `"${x.value}"` : "";
  return {
    partner: `Nama sheet ${v} bukan mitra yang dikenal`,
    code: "Kode kerja sama tidak ada di judul sheet",
    pksValue: "Nilai PKS tidak ada",
    pksType: x.reason === "ratio" ? `DPKS ${x.value} dari nilai PKS setelah pajak, bukan 10% atau 20%` : "DPKS tidak ada",
    date: x.reason === "invalid" ? `Tanggal ${v} tidak terbaca` : "Tanggal pengajuan kosong",
    submissionType: "Jenis pengajuan kosong",
    submissionValue: "Nilai pengajuan kosong",
    program: x.reason === "combination" ? `Beberapa program sekaligus: ${v}` : x.reason === "unknown" ? `Program ${v} tidak dikenal` : "Program kosong",
  }[x.field];
}

// yang disimpan bila dibiarkan apa adanya
function fallbackText(x) {
  return {
    partner: "sheet ini dilewati, tidak diimpor",
    code: "kerja sama tanpa kode",
    pksValue: "tanpa PKS (saldo bisa minus)",
    pksType: x.reason === "ratio" ? `tetap DPKS di file (${fmtRupiah(x.fallback)})` : "DP (DPKS 0%)",
    date: `tanggal baris sebelumnya (${fmtDate(x.fallback)})`,
    submissionType: "Lainnya",
    submissionValue: "baris ini dilewati",
    program: "Bersama (dibagi semua program)",
  }[x.field];
}

function FillInput({ item, value, onChange }) {
  const set = (e) => onChange(e.target.value);
  const label = `Isian ${problemText(item)}`;
  if (item.field === "date") return <input type="date" value={value} onChange={set} aria-label={label} />;
  if (item.field === "pksType") {
    return (
      <select value={value} onChange={set} aria-label={label}>
        <option value="">Biarkan apa adanya</option>
        {PKS_TYPES.map(([v, t, pct]) => <option key={v} value={v}>{t} ({pct}%)</option>)}
      </select>
    );
  }
  if (item.field === "program") {
    return (
      <select value={value} onChange={set} aria-label={label}>
        <option value="">Biarkan apa adanya</option>
        {(item.options || []).map((p) => <option key={p} value={p}>{p}</option>)}
        <option value="Bersama">Bersama</option>
      </select>
    );
  }
  if (item.field === "partner") {
    return (
      <select value={value} onChange={set} aria-label={label}>
        <option value="">Biarkan apa adanya</option>
        {finSources().map((api) => <option key={api} value={api}>{finSourceLabel(api)}</option>)}
      </select>
    );
  }
  if (item.field === "submissionType") {
    return (
      <>
        <input list="kerma-jenis" value={value} onChange={set} placeholder="mis. Jasa" aria-label={label} />
        <datalist id="kerma-jenis">{SUBMISSION_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
      </>
    );
  }
  if (item.field === "code") return <input value={value} onChange={set} placeholder="mis. PD-7-11-2026" maxLength={100} aria-label={label} />;
  return <input inputMode="numeric" value={value} onChange={set} placeholder="mis. 1.500.000" aria-label={label} />;
}

function useModal(open) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return ref;
}

// data kosong/ambigu: isi sendiri, atau biarkan apa adanya (backend memakai nilai pengganti)
function MissingDialog({ items, onDone }) {
  const ref = useModal(!!items);
  const [values, setValues] = useState({});
  useEffect(() => { setValues({}); }, [items]);
  const list = items || [];
  const sheets = [...new Set(list.map((x) => x.sheet))];
  const filled = Object.values(values).filter((v) => String(v).trim()).length;
  // kunci yang dibiarkan dikirim null: backend memakai nilai penggantinya
  const finish = (useValues) => onDone(Object.fromEntries(list.map((x) => {
    const v = useValues ? String(values[x.key] ?? "").trim() : "";
    return [x.key, v || null];
  })));
  return (
    <dialog ref={ref} className="confirm xwide" onCancel={(e) => { e.preventDefault(); onDone(null); }}>
      {items && (
        <div className="confirm-box">
          <div className="confirm-ic"><Icon name="alert" size={20} /></div>
          <h3>{n(list.length)} data belum lengkap atau ambigu</h3>
          <p>Isi nilainya di sini, atau biarkan apa adanya: impor memakai nilai pengganti yang tertulis di tiap baris. File Excel tidak diubah dan belum ada yang diimpor.</p>
          <div className="fill-list">
            {sheets.map((sheet) => (
              <section key={sheet}>
                <h4 className="fill-sheet">{sheet}</h4>
                <ul>
                  {list.filter((x) => x.sheet === sheet).map((x) => (
                    <li key={x.key}>
                      <div className="fill-what">
                        <b>{problemText(x)}</b>
                        <small>Baris {x.row}{x.name && x.name !== sheet && ` · ${x.name}`}{x.amount ? ` · ${fmtRupiah(x.amount)}` : ""}</small>
                        <small className={x.field === "partner" ? "fill-skip" : ""}>Dibiarkan: {fallbackText(x)}</small>
                      </div>
                      <FillInput item={x} value={values[x.key] ?? ""} onChange={(v) => setValues((s) => ({ ...s, [x.key]: v }))} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="confirm-actions">
            <button type="button" className="btn" onClick={() => onDone(null)}>Batal</button>
            <button type="button" className="btn" onClick={() => finish(false)}>Biarkan semua apa adanya</button>
            <button type="button" className="btn btn-primary" onClick={() => finish(true)} disabled={!filled}>
              Simpan isian saya{filled ? ` (${n(filled)})` : ""}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

// kerja sama yang sudah punya transaksi: semuanya diganti isi sheet-nya
function ReplaceDialog({ rows, onChoose }) {
  const ref = useModal(!!rows);
  const list = rows || [];
  return (
    <dialog ref={ref} className="confirm wide" onCancel={(e) => { e.preventDefault(); onChoose(false); }}
      onClick={(e) => { if (e.target === e.currentTarget) onChoose(false); }}>
      {rows && (
        <div className="confirm-box">
          <div className="confirm-ic danger"><Icon name="alert" size={20} /></div>
          <h3>Ganti transaksi {n(list.length)} kerja sama?</h3>
          <p>Kerja sama berikut sudah punya transaksi di dashboard. Semua transaksinya dihapus dan diganti isi sheet-nya, termasuk yang diinput manual.</p>
          <ul className="dup-list">
            {list.map((x) => (
              <li key={x.sheet}>
                <b>{x.code || `Periode ${x.periodNumber} (tanpa kode)`} · {finSourceLabel(x.partner)}</b>
                <small>Sheet {x.sheet} · {n(x.existingCount)} transaksi tersimpan diganti {n(x.newCount)} transaksi dari file</small>
              </li>
            ))}
          </ul>
          <div className="confirm-actions">
            <button type="button" className="btn btn-primary" autoFocus onClick={() => onChoose(false)}>Batal</button>
            <button type="button" className="btn btn-danger" onClick={() => onChoose(true)}>Ganti transaksi</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

function warningText(w) {
  if (w.type === "balance") return `${w.sheet} baris ${w.row}: Saldo di file ${fmtRupiah(w.actual)}, hasil hitung dashboard ${fmtRupiah(w.expected)}`;
  if (w.type === "shared") return `${w.sheet} baris ${w.row}: "${w.value}" disimpan sebagai Bersama`;
  return `Sheet ${w.sheet} dilewati: mitra tidak dikenal`;
}

function ResultDialog({ result, onClose }) {
  const ref = useModal(!!result);
  const contracts = result?.contracts || [];
  const warnings = result?.warnings || [];
  return (
    <dialog ref={ref} className="confirm wide" onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {result && (
        <div className="confirm-box">
          <div className="confirm-ic"><Icon name="checkCircle" size={20} /></div>
          <h3>Impor Rekap Kerma selesai</h3>
          <p>
            {n(result.importedCount)} transaksi dari {n(contracts.length)} kerja sama diimpor
            {result.replacedCount ? `, menggantikan ${n(result.replacedCount)} transaksi lama` : ""}.
          </p>
          <ul className="dup-list">
            {contracts.map((c) => (
              <li key={c.sheet}>
                <b>{c.code || "Tanpa kode"} · {finSourceLabel(c.partner)}{c.isNew && <span className="tag-soft">baru</span>}</b>
                <small>Sheet {c.sheet} · PKS {c.pksValue ? fmtRupiah(c.pksValue) : "–"} · {n(c.submissionCount)} pengajuan · saldo {fmtRupiah(c.balance)}</small>
              </li>
            ))}
          </ul>
          {warnings.length > 0 && (
            <>
              <p><b>Perlu dicek ({n(warnings.length)})</b></p>
              <ul className="dup-list">
                {warnings.map((w, i) => <li key={i}><small>{warningText(w)}</small></li>)}
              </ul>
            </>
          )}
          <div className="confirm-actions">
            <button type="button" className="btn btn-primary" autoFocus onClick={onClose}>Tutup</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function KermaImportButton({ onDone }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(null);   // { kind: "missing" | "suspicious" | "replace", file, opts, rows }
  const [result, setResult] = useState(null);
  // opts: { fills, confirmSuspicious, confirmReplace } dibawa terus sampai impor selesai
  const send = async (file, opts = { fills: {} }) => {
    setBusy(true);
    try {
      const out = await upload("/financial/import/kerma", file, "file", {
        fills: JSON.stringify(opts.fills),
        ...(opts.confirmSuspicious ? { confirmSuspicious: "true" } : {}),
        ...(opts.confirmReplace ? { confirmReplace: "true" } : {}),
      });
      setResult(out.data);
      onDone?.(out.data);
    } catch (e) {
      const d = e.status === 409 ? e.raw?.data : null;
      if (d?.missing) setStep({ kind: "missing", file, opts, rows: d.missing });
      else if (d?.suspicious) setStep({ kind: "suspicious", file, opts, rows: d.suspicious });
      else if (d?.replacements) setStep({ kind: "replace", file, opts, rows: d.replacements });
      else toast(errorText(e), "err");
    } finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  const next = (patch) => {
    const { file, opts } = step;
    setStep(null);
    if (patch) send(file, { ...opts, ...patch });
  };
  const rowsOf = (kind) => (step?.kind === kind ? step.rows : null);
  return (
    <>
      <button type="button" className="btn" onClick={() => ref.current?.click()} disabled={busy} aria-label="Impor Rekap Kerma"
        title="Unggah file Rekap Pengajuan Kerma (.xlsx, format 2025 atau 2026). Satu sheet = satu kerja sama: kode dari judul sheet, mitra dari nama sheet. Transaksi kerja sama yang sudah ada diganti isi sheet-nya setelah dikonfirmasi">
        {busy ? <Spinner /> : <Icon name="sheet" size={16} />}<span className="btn-txt">{busy ? "Mengimpor…" : "Impor Rekap Kerma"}</span>
      </button>
      <input ref={ref} type="file" accept={ACCEPT} hidden onChange={(e) => e.target.files[0] && send(e.target.files[0])} />
      <MissingDialog items={rowsOf("missing")}
        onDone={(fills) => next(fills && { fills: { ...step.opts.fills, ...fills } })} />
      <SuspiciousDialog rows={rowsOf("suspicious")} onChoose={(go) => next(go && { confirmSuspicious: true })} />
      <ReplaceDialog rows={rowsOf("replace")} onChoose={(go) => next(go && { confirmReplace: true })} />
      <ResultDialog result={result} onClose={() => setResult(null)} />
    </>
  );
}
