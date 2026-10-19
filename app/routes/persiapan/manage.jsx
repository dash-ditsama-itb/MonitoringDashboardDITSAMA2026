import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { RequireAccess } from "../../components/Access.jsx";
import { confirmAction, toast } from "../../components/feedback.jsx";
import { Icon } from "../../components/Icon.jsx";
import { extractEmbedUrl, isPowerBiUrl, REPORTS_PATH, reportPath, useReports } from "../../components/Reports.jsx";
import { EmptyState, ErrorNote, PageHead, Sheet, SkeletonCard, Spinner } from "../../components/ui.jsx";
import { api, errorText } from "../../lib/api.js";
import { invalidate } from "../../stores/data.js";

export default function ManageReports() {
  return (
    <RequireAccess area="reports" page="Kelola laporan" back={["/pendidikan-persiapan", "laporan"]}>
      <ManagePage />
    </RequireAccess>
  );
}

const refresh = () => invalidate(REPORTS_PATH);

function ManagePage() {
  const { reports, error, reload } = useReports();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(null);   // { report } | { report: null }
  const [busy, setBusy] = useState(null);   // id laporan yang sedang diproses

  // ?tambah=1 (dari tombol "Tambah laporan" di halaman kosong) langsung membuka formulir
  useEffect(() => {
    if (params.get("tambah")) { setForm({ report: null }); setParams({}, { replace: true }); }
  }, [params]);

  async function move(index, delta) {
    const ids = reports.map((r) => r.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    setBusy(ids[index + delta]);
    try { await api(REPORTS_PATH + "/order", { method: "PUT", body: { reportIds: ids } }); refresh(); }
    catch (e) { toast(errorText(e), "err"); }
    finally { setBusy(null); }
  }

  async function remove(r) {
    const ok = await confirmAction({
      title: `Hapus laporan "${r.title}"?`, danger: true, confirmText: "Hapus laporan",
      body: "Laporan hilang dari menu Pendidikan Persiapan. Laporan aslinya di Power BI tidak terhapus.",
    });
    if (!ok) return;
    setBusy(r.id);
    try { await api(`${REPORTS_PATH}/${r.id}`, { method: "DELETE" }); toast("Laporan dihapus."); refresh(); }
    catch (e) { toast(errorText(e), "err"); }
    finally { setBusy(null); }
  }

  return (
    <div className="page">
      <PageHead title="Kelola laporan" sub="Laporan Power BI yang tampil di menu Pendidikan Persiapan">
        <button type="button" className="btn btn-primary" onClick={() => setForm({ report: null })}><Icon name="plus" size={16} />Tambah laporan</button>
      </PageHead>
      <ErrorNote error={error} onRetry={() => reload()} />
      {!reports ? (!error && <SkeletonCard lines={4} />) : (
        <section className="card">
          {!reports.length ? (
            <EmptyState icon="layers" title="Belum ada laporan"
              action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({ report: null })}><Icon name="plus" size={15} />Tambah laporan</button>}>
              Tempel link atau kode embed dari Power BI (File → Embed report).
            </EmptyState>
          ) : (
            <>
              <ol className="rep-list">
                {reports.map((r, i) => (
                  <li key={r.id} className={busy === r.id ? "busy" : ""}>
                    <div className="rep-order">
                      <button type="button" className="icon-btn" disabled={i === 0 || !!busy} onClick={() => move(i, -1)}
                        aria-label={`Naikkan ${r.title}`} title="Naikkan"><Icon name="up" size={16} /></button>
                      <button type="button" className="icon-btn" disabled={i === reports.length - 1 || !!busy} onClick={() => move(i, 1)}
                        aria-label={`Turunkan ${r.title}`} title="Turunkan"><Icon name="down" size={16} /></button>
                    </div>
                    <div className="rep-txt">
                      <Link className="row-link" to={reportPath(r.id)}>{r.title}</Link>
                      <div className="row-meta"><span className="ptag">{r.section}</span><span className="trunc">{r.url}</span></div>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="icon-btn" title="Ubah" aria-label={`Ubah ${r.title}`} disabled={!!busy} onClick={() => setForm({ report: r })}><Icon name="pencil" size={16} /></button>
                      <button type="button" className="icon-btn danger" title="Hapus" aria-label={`Hapus ${r.title}`} disabled={!!busy} onClick={() => remove(r)}><Icon name="trash" size={16} /></button>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="hint"><Icon name="info" size={14} />Di menu, laporan dikelompokkan per bagian mengikuti urutan di atas.</p>
            </>
          )}
        </section>
      )}
      <ReportForm open={!!form} report={form?.report || null} sections={[...new Set((reports || []).map((r) => r.section))]}
        onClose={() => setForm(null)} />
    </div>
  );
}

function ReportForm({ open, report, sections, onClose }) {
  const [f, setF] = useState({ section: "", title: "", url: "" });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) { setF({ section: report?.section || "", title: report?.title || "", url: report?.url || "" }); setErr(null); }
  }, [open, report]);

  const field = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const link = extractEmbedUrl(f.url);
  const linkOk = !f.url.trim() || isPowerBiUrl(link);

  async function save() {
    const body = { section: f.section.trim(), title: f.title.trim(), url: link };
    if (!body.section || !body.title || !body.url) return setErr("Isi bagian, judul, dan link laporan.");
    if (!isPowerBiUrl(body.url)) return setErr("Link harus berupa link Power BI (https://app.powerbi.com/...).");
    setBusy(true); setErr(null);
    try {
      if (report) await api(`${REPORTS_PATH}/${report.id}`, { method: "PATCH", body });
      else await api(REPORTS_PATH, { method: "POST", body });
      toast(report ? "Laporan diperbarui." : "Laporan ditambahkan.");
      refresh();
      onClose();
    } catch (e) { setErr(errorText(e)); }
    finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onClose={onClose} title={report ? "Ubah laporan" : "Tambah laporan"} footer={(
      <>
        <span className="grow" />
        <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />}Simpan</button>
      </>
    )}>
      {open && (
        <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label className="field"><span className="field-lab">Bagian</span>
            <input type="text" list="report-sections" placeholder="mis. Proses TPB" maxLength={255} required {...field("section")} />
            <datalist id="report-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
          <label className="field"><span className="field-lab">Judul laporan</span>
            <input type="text" placeholder="mis. Nilai TPB 2016–2025" maxLength={255} required {...field("title")} />
          </label>
          <label className="field"><span className="field-lab">Link atau kode embed Power BI</span>
            <textarea rows={4} placeholder={'https://app.powerbi.com/view?r=…  atau  <iframe … src="https://app.powerbi.com/…"></iframe>'}
              required spellCheck={false} {...field("url")} />
          </label>
          {f.url.trim() && (linkOk
            ? link !== f.url.trim() && <p className="hint"><Icon name="checkCircle" size={14} />Link diambil dari kode embed: <span className="trunc">{link}</span></p>
            : <p className="hint err"><Icon name="alert" size={14} />Bukan link Power BI. Salin dari Power BI: File → Embed report → Publish to web.</p>)}
          {err && <div className="note err" role="alert"><Icon name="alert" size={16} /><span>{err}</span></div>}
        </form>
      )}
    </Sheet>
  );
}
