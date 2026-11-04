// Tabel transaksi Keuangan (PKS & pengajuan) + form tambah/ubah.
import { useEffect, useState } from "react";
import { PKS_TYPES } from "../config.js";
import { api, errorText } from "../lib/api.js";
import {
  canEditFinance, finMitra, finPeriod, finPeriodDates, finPeriodForDate, finPeriodHas, finPeriodName, finPeriodOption, finPeriodYear, finPeriods, finProgramLabel, finRecipients, finSourceLabel, finSources, finTypeLabel, finYears, recipientText, setFinCatalog, fmtDate, fmtDateTime, fmtRelative, fmtRupiah, fromDateInput, isPks, toDateInput,
} from "../lib/format.js";
import { useAuthStore } from "../stores/auth.js";
import { invalidate, useApi } from "../stores/data.js";
import { confirmAction, toast } from "./feedback.jsx";
import { Icon } from "./Icon.jsx";
import { ExportButton, ImportButton, importSummary } from "./ImportExport.jsx";
import { EmptyState, ErrorNote, Pagination, SearchInput, Segmented, Sheet, Spinner, TableSkeleton, usePending } from "./ui.jsx";

const SORTS = [
  ["date:desc", "Tanggal (terbaru)"], ["date:asc", "Tanggal (terlama)"],
  ["createdAt:desc", "Terbaru diinput"], ["createdAt:asc", "Terlama diinput"],
  ["balance:desc", "Saldo tertinggi"], ["balance:asc", "Saldo terendah"],
];

export const refreshFinance = () => invalidate("/financial", "/dashboard/financial");

/** Mitra, program & periode Keuangan dari server. ready = false: backend belum mendukung, memakai daftar bawaan dan filter tahun.
 *  settled = jawaban server sudah ada, jadi data boleh dimuat dengan filter yang benar. */
export function useFinCatalog() {
  const { data, error, reload } = useApi("/financial/catalog");
  const partners = data?.data?.partners;
  if (partners) setFinCatalog(partners);
  return { ready: !!partners, settled: !!partners || !!error, reload };
}

// tahun untuk nama program: tahun mulai periodenya; backend lama memakai tahun tanggalnya
const yearOf = (r) => { const p = finPeriod(r.periodId); return p ? finPeriodYear(p) : new Date(r.date).getUTCFullYear(); };

const PeriodTag = ({ r }) => { const p = finPeriod(r.periodId); return p ? <span title={p.code || undefined}>{finPeriodOption(p)}</span> : null; };

function TypeChip({ r }) {
  return <span className={"ftype " + (isPks(r) ? "pks" : "sub")}>{finTypeLabel(r.type)}</span>;
}
const amountOf = (r) => (isPks(r) ? r.pksValue : r.submissionValue) || 0;
const detailOf = (r) => (isPks(r) ? r.information : r.description) || "";
const subOf = (r) => (isPks(r)
  ? [r.pksType && `Jenis ${r.pksType}`, r.taxValue && `Pajak ${fmtRupiah(r.taxValue)}`].filter(Boolean)
  : [r.submissionType, r.invoiceNumber && `Invoice ${r.invoiceNumber}`].filter(Boolean)).join(" · ");

/** pageFilters: { programs, periodIds | year, month, submissionType } dari halaman Keuangan; picker = centang periode/tahun yang sama dengan filter halaman. */
export function FinanceTable({ filters: pageFilters, ui, update, labelYear, picker }) {
  // filter Program khusus tabel Transaksi: per sumber dana/mitra, di dalam filter Program halaman
  const { settled } = useFinCatalog();
  const sources = finSources(labelYear).filter((a) => pageFilters.programs[0] === "all" || pageFilters.programs.includes(a));
  const source = sources.includes(ui.source) ? ui.source : "";
  const filters = source ? { ...pageFilters, programs: [source] } : pageFilters;
  const session = useAuthStore((s) => s.session);
  const canEdit = canEditFinance(session);
  const [sortBy, sortOrder] = ui.sort.split(":");
  const query = { ...filters, page: ui.page, perPage: ui.perPage, search: ui.search, sortBy, sortOrder };
  const { data, error, loading, reload } = useApi("/financial", query, { enabled: settled });
  const busy = usePending(loading && !!data);
  const rows = data?.data?.records || [];
  const pagination = data?.data?.pagination;
  const [selected, setSelected] = useState(() => new Set());
  const [form, setForm] = useState(null);   // { kind, record }

  useEffect(() => { setSelected(new Set()); }, [ui.page, ui.perPage, ui.search, ui.sort, JSON.stringify(filters)]);
  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && ui.page > pagination.totalPages) update({ page: pagination.totalPages });
  }, [pagination?.totalPages]);

  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const showProgram = !(filters.programs.length === 1 && filters.programs[0] !== "all");

  async function remove(r) {
    const ok = await confirmAction({
      title: "Hapus transaksi ini?", danger: true, confirmText: "Hapus",
      body: `${finTypeLabel(r.type)} ${fmtRupiah(amountOf(r))} (${fmtDate(r.date)}) akan dihapus. Saldo program dihitung ulang otomatis.`,
    });
    if (!ok) return;
    try { await api("/financial/" + r.id, { method: "DELETE" }); toast("Transaksi dihapus."); refreshFinance(); }
    catch (e) { toast(errorText(e), "err"); }
  }
  async function bulkDelete() {
    const ids = [...selected];
    const ok = await confirmAction({
      title: `Hapus ${ids.length} transaksi?`, danger: true, confirmText: `Hapus ${ids.length} transaksi`,
      body: "Transaksi terpilih dihapus permanen dan saldo program dihitung ulang.",
    });
    if (!ok) return;
    try {
      await api("/financial", { method: "DELETE", body: { financialIds: ids } });
      toast(`${ids.length} transaksi dihapus.`); setSelected(new Set()); refreshFinance();
    } catch (e) { toast(errorText(e), "err"); }
  }

  const singleProgram = filters.programs.length === 1 && filters.programs[0] !== "all" ? filters.programs[0] : "";
  const exportPath = "/financial/export" + (singleProgram ? "/" + singleProgram : "");

  return (
    <section className="card tbl-card">
      <div className="tbl-head">
        <div>
          <h2 className="card-title">Transaksi</h2>
          <div className="card-sub">{pagination ? `${pagination.totalRecords.toLocaleString("id-ID")} transaksi PKS & pengajuan` : "Memuat…"}</div>
        </div>
        <div className="tbl-actions">
          {canEdit && (
            <ImportButton path={"/financial/import" + (singleProgram ? "/" + singleProgram : "")}
              hint="Unggah .xlsx/.csv. Semua tab sheet yang punya kolom Nilai PKS atau Nilai Pengajuan ikut diimpor; mitra dibaca dari kolom Program atau nama tab (mis. SIAP_2026), periode dari kolom Kode Kerja Sama, Mulai Periode, Periode, atau tahun di nama tab (kalau tidak ada, dari tanggalnya), pajak dari kolom Pajak, program penerima dari kolom Program Penerima. Baris yang ID-nya sudah ada akan memperbarui transaksi tersebut"
              describe={(d) => importSummary(d, "transaksi", "program tidak dikenal")} onDone={refreshFinance} />
          )}
          <ExportButton path={exportPath} filename="keuangan.xlsx"
            query={{ ...filters, search: ui.search, sortBy, sortOrder }} />
          {canEdit && (
            <>
              <button type="button" className="btn keep-txt" onClick={() => setForm({ kind: "pks", record: null })}><Icon name="plus" size={16} /><span className="btn-txt">PKS</span></button>
              <button type="button" className="btn btn-primary" onClick={() => setForm({ kind: "submission", record: null })}><Icon name="plus" size={16} /><span className="btn-txt">Pengajuan</span></button>
            </>
          )}
        </div>
      </div>

      <div className="tbl-toolbar">
        <SearchInput value={ui.search} onChange={(v) => update({ search: v, page: 1 })} placeholder="Cari uraian, keterangan, invoice, atau PIC" />
        {sources.length > 1 && (
          <select className="tb-select" value={source} onChange={(e) => update({ source: e.target.value, page: 1 })} aria-label="Program">
            <option value="">Semua program</option>
            {sources.map((a) => <option key={a} value={a}>{finSourceLabel(a, labelYear)}</option>)}
          </select>
        )}
        {picker}
        <select className="tb-select" value={ui.sort} onChange={(e) => update({ sort: e.target.value, page: 1 })} aria-label="Urutkan">
          {SORTS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="bulkbar" role="region" aria-label="Tindakan untuk data terpilih">
          <span><b>{selected.size}</b> transaksi dipilih</span>
          <button type="button" className="btn btn-sm" onClick={() => setSelected(new Set())}>Batal pilih</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={bulkDelete}><Icon name="trash" size={15} />Hapus</button>
        </div>
      )}

      <ErrorNote error={error} onRetry={() => reload()} />

      {!data && loading ? (
        <TableSkeleton rows={5} check={canEdit} />
      ) : rows.length === 0 && !error ? (
        ui.search
          ? <EmptyState icon="search" title={`Tidak ada transaksi yang cocok dengan "${ui.search}"`}
              action={<button type="button" className="btn btn-sm" onClick={() => update({ search: "", page: 1 })}>Hapus pencarian</button>} />
          : <EmptyState title="Belum ada transaksi untuk filter ini">
              {canEdit ? "Tambahkan PKS lebih dulu, lalu catat setiap pengajuan dana." : "Transaksi yang dicatat tim Keuangan akan tampil di sini."}
            </EmptyState>
      ) : (
        <div className={"tbl-body" + busy} aria-busy={loading}>
          <div className="tbl-scroll">
            <table className="tbl fin-tbl">
              <thead>
                <tr>
                  {canEdit && <th className="c-check"><input type="checkbox" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))} aria-label="Pilih semua di halaman ini" /></th>}
                  <th className="c-date">Tanggal</th>
                  <th className="c-type">Jenis</th>
                  <th className="c-name">Keterangan</th>
                  <th className="num c-amt">Nilai</th>
                  <th className="num c-dpks">DPKS</th>
                  <th className="num c-bal">Saldo</th>
                  <th className="c-pic">PIC</th>
                  <th className="c-created">Diinput</th>
                  {canEdit && <th className="c-act"><span className="sr-only">Aksi</span></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={selected.has(r.id) ? "sel" : ""}>
                    {canEdit && <td className="c-check"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label="Pilih transaksi" /></td>}
                    <td className="c-date">{fmtDate(r.date)}</td>
                    <td className="c-type"><TypeChip r={r} /></td>
                    <td className="c-name">
                      <div className="cell-strong">{detailOf(r) || <span className="muted">Tanpa keterangan</span>}</div>
                      <div className="row-meta">{showProgram && <span className="ptag">{finSourceLabel(r.program, yearOf(r))}</span>}<RecipientTag r={r} /><PeriodTag r={r} />{subOf(r) && <span>{subOf(r)}</span>}</div>
                    </td>
                    <td className={"num c-amt " + (isPks(r) ? "pos" : "neg")}>{isPks(r) ? "+" : "−"}{fmtRupiah(amountOf(r))}</td>
                    <td className="num c-dpks">{isPks(r) ? <>{fmtRupiah(r.dpks)}<span className="muted"> · {r.dpksPercentage ?? 0}%</span></> : <span className="muted">–</span>}</td>
                    <td className="num c-bal">{fmtRupiah(r.balance)}</td>
                    <td className="c-pic"><span className="trunc">{r.pic}</span></td>
                    <td className="c-created" title={fmtDateTime(r.createdAt)}>{fmtRelative(r.createdAt)}</td>
                    {canEdit && (
                      <td className="c-act">
                        <div className="row-actions">
                          <button type="button" className="icon-btn" title="Ubah" aria-label="Ubah transaksi" onClick={() => setForm({ kind: isPks(r) ? "pks" : "submission", record: r })}><Icon name="pencil" size={16} /></button>
                          <button type="button" className="icon-btn danger" title="Hapus" aria-label="Hapus transaksi" onClick={() => remove(r)}><Icon name="trash" size={16} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="rec-list">
            {rows.map((r) => (
              <li key={r.id} className={"rec" + (selected.has(r.id) ? " sel" : "")}>
                {canEdit && <input type="checkbox" className="rec-check" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label="Pilih transaksi" />}
                <button type="button" className="rec-main" disabled={!canEdit} onClick={() => setForm({ kind: isPks(r) ? "pks" : "submission", record: r })}>
                  <span className="rec-top"><span className="rec-name">{detailOf(r) || finTypeLabel(r.type)}</span>
                    <span className={"rec-amt " + (isPks(r) ? "pos" : "neg")}>{isPks(r) ? "+" : "−"}{fmtRupiah(amountOf(r))}</span></span>
                  <span className="rec-meta"><TypeChip r={r} /><span>{fmtDate(r.date)}</span>{showProgram && <span>{finSourceLabel(r.program, yearOf(r))}</span>}<RecipientTag r={r} /><PeriodTag r={r} /></span>
                  <span className="rec-meta"><span>Saldo {fmtRupiah(r.balance)}</span>{subOf(r) && <span>{subOf(r)}</span>}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Pagination pagination={pagination} perPage={ui.perPage} noun="transaksi"
        onPage={(p) => update({ page: p })} onPerPage={(n) => update({ perPage: n, page: 1 })} />

      <FinanceForm open={!!form} kind={form?.kind} record={form?.record} defaultProgram={singleProgram}
        onClose={() => setForm(null)} onDelete={form?.record ? () => { const r = form.record; setForm(null); remove(r); } : null} />
    </section>
  );
}

// --------------------------------------------------------------- form ---
function MoneyInput({ value, onChange, placeholder, label }) {
  const shown = value === "" ? "" : Number(value).toLocaleString("id-ID");
  return (
    <div className="money">
      <span>Rp</span>
      <input type="text" inputMode="numeric" aria-label={label} placeholder={placeholder} value={shown}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))} />
    </div>
  );
}

const today = () => toDateInput(new Date());

// program penerima pengajuan dari mitra yang membiayai lebih dari satu program (TN, Freeport)
function RecipientTag({ r }) {
  const programs = finPeriod(r.periodId)?.programs ?? finRecipients(r.program, yearOf(r));
  if (isPks(r) || programs.length < 2 || !("recipientProgram" in r)) return null;
  return <span className={"rtag" + (r.recipientProgram ? "" : " shared")}>{recipientText(r.program, r.recipientProgram, yearOf(r))}</span>;
}

function formFrom(kind, r, program, session) {
  if (!r) {
    return kind === "pks"
      ? { program, periodId: "", code: "", periodStart: "", periodEnd: "", tax: "", type: "initial_pks", pksType: "Pm", value: "", date: today(), text: "", pic: session?.name || "" }
      : { program, periodId: "", date: today(), invoiceNumber: "", submissionType: "", text: "", value: "", pic: session?.name || "", recipient: "" };
  }
  const p = finPeriod(r.periodId);
  return isPks(r)
    ? { program: r.program, periodId: r.periodId || "", code: p?.code || "", periodStart: p ? toDateInput(p.start) : "", periodEnd: p ? toDateInput(p.end) : "", tax: String(r.taxValue || ""), type: r.type, pksType: r.pksType || "Pm", value: String(r.pksValue ?? ""), date: toDateInput(r.date), text: r.information || "", pic: r.pic || "" }
    : { program: r.program, periodId: r.periodId || "", date: toDateInput(r.date), invoiceNumber: r.invoiceNumber || "", submissionType: r.submissionType || "", text: r.description || "", value: String(r.submissionValue ?? ""), pic: r.pic || "", recipient: r.recipientProgram || "" };
}

// isian nama mitra/program baru di dalam form pengajuan & PKS
function AddName({ label, placeholder, onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function add() {
    if (!name.trim()) return setErr(`Isi ${label} dulu.`);
    setErr(""); setBusy(true);
    try {
      const problem = await onAdd(name.trim());   // teks = nama ditolak, form tetap terbuka
      if (problem) { setErr(problem); setBusy(false); }
    } catch (e) { setErr(errorText(e)); setBusy(false); }
  }
  return (
    <div className="fin-add span-2">
      <div className="fin-add-row">
        <input type="text" autoFocus aria-label={label} placeholder={placeholder} value={name} onChange={(e) => { setName(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="btn btn-sm btn-primary" onClick={add} disabled={busy}>{busy && <Spinner />}Tambah</button>
        <button type="button" className="btn btn-sm" onClick={onCancel} disabled={busy}>Batal</button>
      </div>
      {err && <p className="field-err" role="alert">{err}</p>}
    </div>
  );
}

function FinanceForm({ open, kind, record, defaultProgram, onClose, onDelete }) {
  const session = useAuthStore((s) => s.session);
  const { ready, reload: reloadCatalog } = useFinCatalog();
  const [adding, setAdding] = useState(null);   // "mitra" | "program" | null
  const types = useApi("/dashboard/financial", {}, { enabled: open && kind === "submission" }).data?.data?.filterOptions?.submissionTypes || [];
  const program0 = defaultProgram || finSources()[0];
  const [f, setF] = useState(() => formFrom(kind, record, program0, session));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (open) { setF(formFrom(kind, record, program0, session)); setErr(""); setAdding(null); } }, [open, kind, record]);

  const isEdit = !!record, isPksForm = kind === "pks";
  const thisYear = new Date().getFullYear();
  const yearOfDate = (date) => Number(String(date || "").slice(0, 4));
  // PKS Awal membuat periode baru (atau melengkapi periode yang belum punya PKS Awal); yang lain memakai periode terpilih, bawaannya sesuai tanggal.
  // Backend lama belum punya periode: tahun selalu sama dengan tanggal transaksi.
  const isAwal = ready && isPksForm && f.type === "initial_pks";
  const periods = ready ? finPeriods(f.program) : [];
  const newest = [...periods].reverse();
  const orphans = isAwal && !isEdit ? newest.filter((p) => !p.hasInitialPks) : [];
  const period = periods.find((p) => p.id === f.periodId) ?? (isAwal || !ready ? null : finPeriodForDate(f.program, f.date || today()));
  const year = !ready ? yearOfDate(f.date) || thisYear : period ? finPeriodYear(period) : yearOfDate(f.periodStart) || thisYear;
  const recipients = period ? period.programs : finRecipients(f.program, year);
  const years = [...new Set([...finYears(), thisYear, year])].sort((a, b) => b - a);
  const programsFor = (program, periodId, date) => {
    if (!ready) return finRecipients(program, yearOfDate(date) || thisYear);
    const p = finPeriods(program).find((x) => x.id === periodId) ?? finPeriodForDate(program, date || today());
    return p ? p.programs : finRecipients(program, yearOfDate(date) || thisYear);
  };
  const keepRecipient = (cur, programs) => (programs.includes(cur.recipient) ? cur.recipient : "");
  const setDate = (date) => setF((cur) => {
    const chosen = finPeriods(cur.program).find((p) => p.id === cur.periodId);
    const periodId = chosen && date && finPeriodHas(chosen, date) ? cur.periodId : "";
    return { ...cur, date, periodId, recipient: keepRecipient(cur, programsFor(cur.program, periodId, date)) };
  });
  const setPeriod = (periodId) => setF((cur) => {
    const p = finPeriods(cur.program).find((x) => x.id === periodId);
    const details = isAwal ? { code: p?.code || "", periodStart: p ? toDateInput(p.start) : "", periodEnd: p ? toDateInput(p.end) : "" } : {};
    return { ...cur, ...details, periodId, recipient: keepRecipient(cur, programsFor(cur.program, periodId, cur.date)) };
  });
  const setMitra = (program) => {
    setF((cur) => ({ ...cur, program, periodId: "", recipient: keepRecipient(cur, programsFor(program, "", cur.date)) }));
    setAdding(null);
  };
  const setYear = (y) => {
    const next = `${y}${(f.date || today()).slice(4)}`;
    setDate(Number.isNaN(Date.parse(next)) ? `${y}-02-28` : next);   // 29 Feb di tahun bukan kabisat
  };
  const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

  async function addMitra(name) {
    if (finSources().some((a) => sameName(finMitra(a) || finProgramLabel(a), name))) return "Mitra ini sudah ada.";
    const out = await api("/financial/catalog/partners", { method: "POST", body: { name } });
    await reloadCatalog();
    setF((cur) => ({ ...cur, program: out.data.key, periodId: "", recipient: "" }));
    toast(`Mitra ${name} ditambahkan.`);
    setAdding("program");
  }
  async function addProgram(program) {
    if (recipients.some((p) => sameName(p, program))) return `Program ini sudah ada di ${programScope}.`;
    await api("/financial/catalog/programs", { method: "POST", body: { partner: f.program, year, program, ...(period ? { periodId: period.id } : {}) } });
    await reloadCatalog();
    setF((cur) => ({ ...cur, recipient: program }));
    toast(`Program ${program} ditambahkan.`);
    setAdding(null);
  }

  const field = (k) => ({ value: f[k] ?? "", onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  // Penambahan PKS mengikuti jenis PKS Awal periodenya; pajak dipotong sebelum DPKS
  const inheritedType = ready && isPksForm && !isAwal && period?.hasInitialPks ? period.pksType : null;
  const pksType = inheritedType || f.pksType;
  const persen = PKS_TYPES.find(([v]) => v === pksType)?.[2] ?? 0;
  const value = Number(f.value) || 0;
  const tax = ready && isPksForm ? Number(f.tax) || 0 : 0;
  const afterTax = value - tax;
  const dpks = Math.round(afterTax * persen / 100);
  const programScope = period ? `${finPeriodName(period)} mitra ini` : `mitra ini untuk tahun ${year}`;

  async function save() {
    if (!value) return setErr(isPksForm ? "Isi nilai PKS." : "Isi nilai pengajuan.");
    if (tax > value) return setErr("Pajak tidak boleh melebihi nilai PKS.");
    if (isAwal) {
      if (!f.periodStart || !f.periodEnd) return setErr("Isi tanggal mulai dan selesai periode.");
      if (f.periodEnd < f.periodStart) return setErr("Tanggal selesai tidak boleh sebelum tanggal mulai periode.");
    } else {
      if (!f.date) return setErr("Isi tanggal.");
      if (ready && !period) return setErr("Mitra ini belum punya periode. Input PKS Awal dulu.");
    }
    setErr(""); setBusy(true);
    const date = fromDateInput(isAwal ? f.periodStart : f.date);
    try {
      if (!isEdit) {
        const periodBody = !ready ? {} : isAwal
          ? { ...(f.periodId ? { periodId: f.periodId } : {}), ...(f.code.trim() ? { periodCode: f.code.trim() } : {}), periodStart: fromDateInput(f.periodStart), periodEnd: fromDateInput(f.periodEnd) }
          : { periodId: period.id };
        const body = isPksForm
          ? { program: f.program, type: f.type, pksType, pksValue: value, date, ...periodBody, ...(tax ? { taxValue: tax } : {}), ...(f.text.trim() ? { information: f.text.trim() } : {}) }
          : { program: f.program, date, ...periodBody, submissionValue: value,
              ...(f.invoiceNumber.trim() ? { invoiceNumber: f.invoiceNumber.trim() } : {}),
              ...(f.submissionType.trim() ? { submissionType: f.submissionType.trim() } : {}),
              ...(f.text.trim() ? { description: f.text.trim() } : {}),
              ...(recipients.length > 1 ? { recipientProgram: f.recipient || null } : {}) };
        if (f.pic.trim()) body.pic = f.pic.trim();
        const out = await api(isPksForm ? "/financial/pks" : "/financial/submission", { method: "POST", body });
        toast(`${isPksForm ? "PKS" : "Pengajuan"} tersimpan. Saldo ${finSourceLabel(f.program, year)} kini ${fmtRupiah(out.data?.balance)}.`);
      } else {
        const r = record, body = {};
        const set = (k, v, old) => { if ((v ?? "") !== (old ?? "")) body[k] = v; };
        set("program", f.program, r.program);
        set("pic", f.pic.trim(), r.pic);
        if (isAwal) {
          const p = finPeriod(r.periodId);
          if (f.code.trim() !== (p?.code || "")) body.periodCode = f.code.trim() || null;
          if (f.periodStart !== (p ? toDateInput(p.start) : "")) body.periodStart = fromDateInput(f.periodStart);
          if (f.periodEnd !== (p ? toDateInput(p.end) : "")) body.periodEnd = fromDateInput(f.periodEnd);
        } else {
          if (f.date !== toDateInput(r.date)) body.date = date;
          if (ready && period.id !== r.periodId) body.periodId = period.id;
        }
        if (isPksForm) {
          set("pksType", pksType, r.pksType);
          if (value !== r.pksValue) body.pksValue = value;
          if (ready && tax !== (r.taxValue || 0)) body.taxValue = tax || null;
          set("information", f.text.trim(), r.information);
        } else {
          if (value !== r.submissionValue) body.submissionValue = value;
          set("invoiceNumber", f.invoiceNumber.trim(), r.invoiceNumber);
          set("submissionType", f.submissionType.trim(), r.submissionType);
          set("description", f.text.trim(), r.description);
          if (recipients.length > 1 && (f.recipient || null) !== (r.recipientProgram ?? null)) body.recipientProgram = f.recipient || null;
        }
        // backend tidak menerima string kosong -> lewati kolom teks yang dikosongkan
        Object.keys(body).forEach((k) => { if (body[k] === "") delete body[k]; });
        if (Object.keys(body).length) await api("/financial/" + r.id, { method: "PATCH", body });
        toast("Perubahan transaksi disimpan.");
      }
      refreshFinance();
      onClose();
    } catch (e) { setErr(errorText(e)); }
    finally { setBusy(false); }
  }

  const mitraField = (
    <>
      <div className="field span-2"><label className="field-lab" htmlFor="fin-mitra">Mitra / sumber dana</label>
        <select id="fin-mitra" value={f.program} onChange={(e) => setMitra(e.target.value)}>
          {finSources(year).map((a) => <option key={a} value={a}>{finSourceLabel(a, year)}</option>)}
        </select>
        {ready && adding !== "mitra" && <button type="button" className="fin-more" onClick={() => setAdding("mitra")}><Icon name="plus" size={13} />Tambah mitra lain</button>}
      </div>
      {adding === "mitra" && <AddName label="nama mitra" placeholder="Nama mitra baru" onAdd={addMitra} onCancel={() => setAdding(null)} />}
    </>
  );
  const programField = (
    <>
      <div className="field span-2"><label className="field-lab" htmlFor="fin-prog">{isPksForm ? (period ? `Program yang didanai ${finPeriodName(period)}` : `Program yang didanai tahun ${year}`) : "Program penerima"}</label>
        {!isPksForm && recipients.length > 1 ? (
          <select id="fin-prog" {...field("recipient")}>
            <option value="">{`Bersama (${recipients.join(" & ")})`}</option>
            {recipients.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        ) : <select id="fin-prog" disabled value=""><option value="">{recipients.join(", ") || "Belum ada program"}</option></select>}
        {ready && adding !== "program" && <button type="button" className="fin-more" onClick={() => setAdding("program")}><Icon name="plus" size={13} />Tambah program lain</button>}
      </div>
      {adding === "program" && <AddName label="nama program" placeholder="Nama program baru, mis. Bridging" onAdd={addProgram} onCancel={() => setAdding(null)} />}
    </>
  );
  const dateField = (
    <label className={"field" + (ready ? " span-2" : "")}><span className="field-lab">{isPksForm ? "Tanggal PKS" : "Tanggal pengajuan"}</span>
      <input type="date" required value={f.date ?? ""} onChange={(e) => setDate(e.target.value)} />
    </label>
  );
  const periodField = (
    <>
      <label className="field span-2"><span className="field-lab">Periode</span>
        <select value={period?.id ?? ""} disabled={!periods.length} onChange={(e) => setPeriod(e.target.value)}>
          {period ? null : <option value="">Belum ada periode</option>}
          {newest.map((p) => <option key={p.id} value={p.id}>{finPeriodOption(p)}{p.code ? ` · ${p.code}` : ""}</option>)}
        </select>
      </label>
      {!periods.length
        ? <p className="hint err span-2 fin-note">Mitra ini belum punya periode. Input PKS Awal dulu.</p>
        : period && f.date && !finPeriodHas(period, f.date)
          ? <p className="hint err span-2 fin-note">Tanggal ini di luar masa periode ({finPeriodDates(period)}).</p>
          : !isPksForm && <p className="hint span-2 fin-note">Terpilih otomatis dari tanggal, tetapi masih bisa diganti.</p>}
    </>
  );
  const moneyField = (
    <label className="field"><span className="field-lab">{isPksForm ? (isAwal || !ready ? "Nilai PKS" : "Nilai tambahan") : "Nilai pengajuan"}</span>
      <MoneyInput label={isPksForm ? "Nilai PKS" : "Nilai pengajuan"} value={f.value} onChange={(v) => setF({ ...f, value: v })} placeholder={isPksForm ? "100.000.000" : "2.000.000"} />
    </label>
  );
  const pksFields = (
    <>
      {moneyField}
      {ready && (
        <label className="field"><span className="field-lab">Pajak sebelum DPKS</span>
          <MoneyInput label="Pajak sebelum DPKS" value={f.tax} onChange={(v) => setF({ ...f, tax: v })} placeholder="kosong = tidak ada" />
        </label>
      )}
      {inheritedType ? <p className="hint span-2 fin-note">Jenis PKS mengikuti PKS Awal periode ini.</p> : (
        <label className={"field" + (ready ? " span-2" : "")}><span className="field-lab">Jenis PKS</span>
          <select {...field("pksType")}>{PKS_TYPES.map(([v, t, p]) => <option key={v} value={v}>{t} (DPKS {p}%)</option>)}</select>
        </label>
      )}
      <div className="calc span-2">
        {tax > 0 && <><span>Setelah pajak</span><b>{fmtRupiah(afterTax)}</b></>}
        <span>DPKS {persen}%</span><b>{fmtRupiah(dpks)}</b>
        <span>{isAwal || !ready ? "Dana bersih" : "Tambahan bersih"}</span><b>{fmtRupiah(afterTax - dpks)}</b>
      </div>
      <label className="field span-2"><span className="field-lab">Keterangan</span>
        <input type="text" placeholder="opsional, mis. PKS Awal SIAP ITB" {...field("text")} />
      </label>
    </>
  );
  const submissionFields = (
    <>
      {moneyField}
      <label className="field"><span className="field-lab">No. invoice</span>
        <input type="text" placeholder="opsional, mis. INV-001" {...field("invoiceNumber")} />
      </label>
      <label className="field"><span className="field-lab">Jenis pengajuan</span>
        <input type="text" list="fin-types" placeholder="mis. Konsumsi (kosong = Lainnya)" {...field("submissionType")} />
        <datalist id="fin-types">{types.map((t) => <option key={t} value={t} />)}</datalist>
      </label>
      <label className="field span-2"><span className="field-lab">Uraian</span>
        <input type="text" placeholder="mis. Snack peserta hari 1" {...field("text")} />
      </label>
      {ready && period && <div className="calc span-2"><span>Saldo periode ini</span><b>{fmtRupiah(period.balance)}</b></div>}
    </>
  );

  const title = (isEdit ? "Ubah " : "Tambah ") + (isPksForm ? (isEdit ? finTypeLabel(record.type) : "PKS") : "pengajuan");
  return (
    <Sheet open={open} onClose={onClose} title={title}
      sub={isPksForm ? "Nilai PKS menambah dana program; pajak dan DPKS dipotong sesuai isian." : "Setiap pengajuan mengurangi saldo periode program."}
      footer={(
        <>
          {err && <div className="foot-err" role="alert"><Icon name="alert" size={16} />{err}</div>}
          {isEdit && onDelete && <button type="button" className="btn btn-danger-ghost" onClick={onDelete} disabled={busy}><Icon name="trash" size={16} />Hapus</button>}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />}Simpan</button>
        </>
      )}>
      {open && (
        <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {isPksForm && !isEdit && (
            <div className="form-sec">
              <span className="field-lab">Jenis</span>
              <Segmented label="Jenis PKS" value={f.type} onChange={(v) => setF({ ...f, type: v, periodId: "" })}
                options={[["initial_pks", "PKS Awal"], ["addition_pks", "Penambahan PKS"]]} />
              <p className="hint">{ready
                ? "PKS Awal membuat periode baru. Tambahan dana di periode yang sama dicatat sebagai Penambahan PKS."
                : "PKS Awal hanya sekali per program dalam satu tahun. Tambahan dana di tahun yang sama dicatat sebagai Penambahan PKS."}</p>
            </div>
          )}
          <div className="form-grid">
            {!ready ? (
              <>
                <label className="field"><span className="field-lab">Tahun</span>
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
                {dateField}{mitraField}{programField}{isPksForm ? pksFields : submissionFields}
              </>
            ) : isAwal ? (
              <>
                {mitraField}
                {orphans.length > 0 && (
                  <label className="field span-2"><span className="field-lab">Periode</span>
                    <select value={f.periodId} onChange={(e) => setPeriod(e.target.value)}>
                      <option value="">Buat periode baru</option>
                      {orphans.map((p) => <option key={p.id} value={p.id}>{finPeriodOption(p)} (belum punya PKS Awal)</option>)}
                    </select>
                  </label>
                )}
                <label className="field span-2"><span className="field-lab">Kode kerja sama</span>
                  <input type="text" placeholder="mis. PD-7-11-2026" maxLength={100} {...field("code")} />
                </label>
                <label className="field"><span className="field-lab">Mulai</span>
                  <input type="date" required {...field("periodStart")} />
                </label>
                <label className="field"><span className="field-lab">Selesai</span>
                  <input type="date" required {...field("periodEnd")} />
                </label>
                {pksFields}{programField}
              </>
            ) : isPksForm ? (
              <>{mitraField}{periodField}{dateField}{pksFields}{programField}</>
            ) : (
              <>{mitraField}{dateField}{periodField}{programField}{submissionFields}</>
            )}
            <label className="field span-2"><span className="field-lab">PIC</span>
              <input type="text" placeholder="kosongkan untuk memakai email akun Anda" {...field("pic")} />
            </label>
          </div>
          {isEdit && <p className="hint">Diinput {fmtDateTime(record.createdAt)}. Saldo dihitung ulang otomatis setelah disimpan.</p>}
          <button type="submit" hidden />
        </form>
      )}
    </Sheet>
  );
}
