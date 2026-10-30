// Tombol Impor (unggah .xlsx/.csv) dan Ekspor (unduh .xlsx) untuk tabel data.
import { useEffect, useRef, useState } from "react";
import { download, errorText, upload } from "../lib/api.js";
import { finSourceLabel, finTypeLabel, fmtDate, fmtRupiah, programByApi } from "../lib/format.js";
import { toast } from "./feedback.jsx";
import { Icon } from "./Icon.jsx";
import { Spinner } from "./ui.jsx";

const ACCEPT = ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

export function ExportButton({ path, query, filename, label = "Ekspor" }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await download(path, query, filename); toast("File Excel diunduh."); }
    catch (e) { toast(errorText(e), "err"); }
    finally { setBusy(false); }
  };
  return (
    <button type="button" className="btn" onClick={run} disabled={busy} title="Unduh data sesuai filter & pencarian saat ini">
      {busy ? <Spinner /> : <Icon name="download" size={16} />}<span className="btn-txt">{label}</span>
    </button>
  );
}

/**
 * Ringkasan hasil impor dari backend: baru (importedCount), diperbarui (updatedCount),
 * tidak berubah/duplikat (duplicateCount), dilewati (skippedCount, alasannya dari `skipReason`),
 * dilewati karena cocok dengan lebih dari satu data (ambiguousCount).
 */
export function importSummary(d, noun, skipReason) {
  const n = (v) => (v || 0).toLocaleString("id-ID");
  const parts = [];
  if (d.importedCount) parts.push(`${n(d.importedCount)} ${noun} baru`);
  if (d.updatedCount) parts.push(`${n(d.updatedCount)} diperbarui`);
  if (d.duplicateCount) parts.push(`${n(d.duplicateCount)} sudah ada (tidak berubah)`);
  if (d.skippedCount) parts.push(`${n(d.skippedCount)} dilewati (${skipReason})`);
  if (d.ambiguousCount) parts.push(`${n(d.ambiguousCount)} dilewati (cocok dengan lebih dari satu data tersimpan)`);
  return parts.length ? parts.join(", ") + "." : `Tidak ada ${noun} yang diimpor.`;
}

/**
 * onDone(data) dipanggil setelah impor berhasil; describe(data) -> teks toast.
 * Bila ada baris tanpa ID yang sama dengan data tersimpan (409), pengguna memilih: perbarui atau tambahkan baru.
 */
export function ImportButton({ path, onDone, describe, hint }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState(null);
  const [odd, setOdd] = useState(null);   // nilai mencurigakan (Keuangan): ditanya sebelum disimpan
  // opts: { duplicateAction, confirmSuspicious } — dibawa terus sampai impor selesai
  const send = async (file, opts = {}) => {
    setBusy(true);
    try {
      const out = await upload(path, file, "file", {
        ...(opts.duplicateAction ? { duplicateAction: opts.duplicateAction } : {}),
        ...(opts.confirmSuspicious ? { confirmSuspicious: "true" } : {}),
      });
      toast(describe ? describe(out.data || {}) : "Impor selesai.");
      onDone?.(out.data);
    } catch (e) {
      if (e.status === 409 && e.raw?.data?.suspicious) setOdd({ file, opts, rows: e.raw.data.suspicious });
      else if (e.status === 409 && e.raw?.data?.duplicates) setDup({ file, opts, duplicates: e.raw.data.duplicates });
      else toast(errorText(e), "err");
    } finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  const choose = (action) => {
    const { file, opts } = dup;
    setDup(null);
    if (action) send(file, { ...opts, duplicateAction: action });
  };
  const confirmOdd = (go) => {
    const { file, opts } = odd;
    setOdd(null);
    if (go) send(file, { ...opts, confirmSuspicious: true });
  };
  return (
    <>
      <button type="button" className="btn" onClick={() => ref.current?.click()} disabled={busy} title={hint}>
        {busy ? <Spinner /> : <Icon name="upload" size={16} />}<span className="btn-txt">{busy ? "Mengimpor…" : "Impor"}</span>
      </button>
      <input ref={ref} type="file" accept={ACCEPT} hidden onChange={(e) => e.target.files[0] && send(e.target.files[0])} />
      <DuplicateDialog duplicates={dup?.duplicates} onChoose={choose} />
      <SuspiciousDialog rows={odd?.rows} onChoose={confirmOdd} />
    </>
  );
}

const LIMIT = 5;
const programName = (api) => programByApi(api)?.label ?? finSourceLabel(api);

// nilai PKS/pengajuan berdesimal atau di bawah Rp 1.000: biasanya titik ribuan terbaca koma desimal (Rp 523.920 -> 523,92)
function SuspiciousDialog({ rows, onChoose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (rows && !d.open) d.showModal();
    if (!rows && d.open) d.close();
  }, [rows]);
  const list = rows || [];
  const sheets = new Set(list.map((x) => x.sheet)).size;
  return (
    <dialog ref={ref} className="confirm wide" onCancel={(e) => { e.preventDefault(); onChoose(false); }}
      onClick={(e) => { if (e.target === e.currentTarget) onChoose(false); }}>
      {rows && (
        <div className="confirm-box">
          <div className="confirm-ic"><Icon name="alert" size={20} /></div>
          <h3>{list.length.toLocaleString("id-ID")} nilai terlihat tidak wajar</h3>
          <p>Nilai berikut berdesimal atau di bawah Rp 1.000. Biasanya titik ribuan terbaca sebagai koma desimal di Excel
            (mis. Rp 523.920 menjadi 523,92). Belum ada yang diimpor.</p>
          <ul className="dup-list">
            {list.slice(0, LIMIT).map((x) => (
              <li key={x.sheet + x.row}>
                <b>{x.name || finTypeLabel(x.type) || "–"}</b>
                <small>{sheets > 1 && `${x.sheet} · `}Baris {x.row} · {programName(x.program)} · di file {x.raw} → tersimpan {fmtRupiah(x.value)}</small>
              </li>
            ))}
          </ul>
          {list.length > LIMIT && <p className="muted small">dan {(list.length - LIMIT).toLocaleString("id-ID")} baris lainnya.</p>}
          <p>Perbaiki nilainya di Excel lalu impor ulang, atau lanjutkan bila nilai tersebut memang benar.</p>
          <div className="confirm-actions">
            <button type="button" className="btn btn-primary" autoFocus onClick={() => onChoose(false)}>Batal, perbaiki dulu</button>
            <button type="button" className="btn" onClick={() => onChoose(true)}>Lanjutkan impor</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

// pilihan untuk baris tanpa ID yang sama dengan data tersimpan atau baris lain di file
function DuplicateDialog({ duplicates, onChoose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (duplicates && !d.open) d.showModal();
    if (!duplicates && d.open) d.close();
  }, [duplicates]);
  const list = duplicates || [];
  const sheets = new Set(list.map((x) => x.sheet)).size;
  return (
    <dialog ref={ref} className="confirm wide" onCancel={(e) => { e.preventDefault(); onChoose(null); }}
      onClick={(e) => { if (e.target === e.currentTarget) onChoose(null); }}>
      {duplicates && (
        <div className="confirm-box">
          <div className="confirm-ic"><Icon name="info" size={20} /></div>
          <h3>Ditemukan {list.length.toLocaleString("id-ID")} data yang sama</h3>
          <p>Baris berikut tidak punya ID, tetapi isinya sama dengan data yang sudah tersimpan atau dengan baris lain di file. Belum ada yang diimpor.</p>
          <ul className="dup-list">
            {list.slice(0, LIMIT).map((x) => (
              <li key={x.sheet + x.row}>
                <b>{x.name || finTypeLabel(x.type) || "–"}</b>
                <small>
                  {sheets > 1 && `${x.sheet} · `}Baris {x.row} · {programName(x.program)}{x.date && ` · ${fmtDate(x.date)}`} · {x.matchCount
                    ? `sama dengan ${x.matchCount} data tersimpan`
                    : "sama dengan baris lain di file"}
                </small>
              </li>
            ))}
          </ul>
          {list.length > LIMIT && <p className="muted small">dan {(list.length - LIMIT).toLocaleString("id-ID")} baris lainnya.</p>}
          <p><b>Perbarui</b>: data tersimpan diubah sesuai isi file; baris yang cocok dengan lebih dari satu data dilewati. <b>Tambahkan</b>: semua baris tersebut disimpan sebagai data baru.</p>
          <div className="confirm-actions">
            <button type="button" className="btn" onClick={() => onChoose(null)}>Batal</button>
            <button type="button" className="btn" onClick={() => onChoose("insert")}>Tambahkan sebagai data baru</button>
            <button type="button" className="btn btn-primary" autoFocus onClick={() => onChoose("update")}>Perbarui data yang ada</button>
          </div>
        </div>
      )}
    </dialog>
  );
}
