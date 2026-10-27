import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { RequireAccess } from "../../components/Access.jsx";
import { confirmAction, toast } from "../../components/feedback.jsx";
import { Icon } from "../../components/Icon.jsx";
import {
  allGroups, buildTree, extractEmbedUrl, findGroup, flattenReports, isPowerBiUrl, joinSection, REPORTS_PATH, reportPath,
  sectionKey, sectionTrail, splitSection, useReports,
} from "../../components/Reports.jsx";
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
const saveOrder = (ids) => api(REPORTS_PATH + "/order", { method: "PUT", body: { reportIds: ids } });

// ubah beberapa laporan satu per satu; kembalikan jumlah yang gagal (bisa dicoba lagi)
async function patchReports(changes) {
  let failed = 0;
  for (const { id, body } of changes) {
    try { await api(`${REPORTS_PATH}/${id}`, { method: "PATCH", body }); } catch { failed++; }
  }
  refresh();
  return failed;
}

// nama bagian tidak boleh memuat "/" karena dipakai sebagai pemisah jalur
const nameProblem = (name, label) => (!name ? `Isi nama ${label}.` : name.includes("/") ? `Nama ${label} tidak boleh memuat garis miring (/).` : null);

/** Judul berawalan sama ("AKADEMIK TPB - IP TPB", "AKADEMIK TPB - Nilai TPB") di satu bagian: usulan jadikan subbagian. */
function prefixSuggestions(reports) {
  const groups = new Map();
  for (const r of reports) {
    const m = /^(.{2,80}?)\s+[-–—]\s+(.+)$/.exec(r.title);
    if (!m) continue;
    const prefix = m[1].trim();
    const key = sectionKey(r.section) + "\u0001" + prefix.toLowerCase();
    if (!groups.has(key)) groups.set(key, { key, section: r.section, prefix, items: [] });
    groups.get(key).items.push({ report: r, rest: m[2].trim() });
  }
  return [...groups.values()].filter((g) => g.items.length >= 2);
}

function ManagePage() {
  const { reports, error, reload } = useReports();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(null);         // { report, groupKey } | null
  const [groupForm, setGroupForm] = useState(null); // { group } | null
  const [busy, setBusy] = useState(null);         // id laporan / key bagian yang sedang diproses

  // ?tambah=1 (dari tombol "Tambah laporan" di halaman kosong) langsung membuka formulir
  useEffect(() => {
    if (params.get("tambah")) { setForm({ report: null }); setParams({}, { replace: true }); }
  }, [params]);

  const tree = buildTree(reports);

  // tukar posisi dua isi yang bersebelahan dalam satu bagian (laporan atau subbagian), lalu simpan urutannya
  async function moveItem(parentKey, index, delta, busyKey) {
    const fresh = buildTree(reports);
    const parent = parentKey ? findGroup(fresh, parentKey) : fresh;
    const items = parent.items;
    [items[index], items[index + delta]] = [items[index + delta], items[index]];
    setBusy(busyKey);
    try { await saveOrder(flattenReports(fresh).map((r) => r.id)); refresh(); }
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

  async function applySuggestion(s) {
    setBusy(s.key);
    const failed = await patchReports(s.items.map(({ report, rest }) => ({
      id: report.id, body: { section: joinSection([...splitSection(s.section), s.prefix]), title: rest },
    })));
    setBusy(null);
    if (failed) toast(`${failed} laporan belum dipindahkan. Coba lagi.`, "err");
    else toast(`"${s.prefix}" sekarang menjadi subbagian dengan ${s.items.length} laporan.`);
  }

  const ctx = { busy, moveItem, remove, editReport: (r) => setForm({ report: r }), addReport: (g) => setForm({ report: null, groupKey: g.key }), editGroup: (g) => setGroupForm({ group: g }) };

  return (
    <div className="page">
      <PageHead title="Kelola laporan" sub="Laporan Power BI yang tampil di menu Pendidikan Persiapan, dikelompokkan per bagian">
        <button type="button" className="btn btn-primary" onClick={() => setForm({ report: null })}><Icon name="plus" size={16} />Tambah laporan</button>
      </PageHead>
      <ErrorNote error={error} onRetry={() => reload()} />
      {reports && prefixSuggestions(reports).map((s) => (
        <div key={s.key} className="note rep-suggest">
          <Icon name="layers" size={16} />
          <span><b>{s.items.length} laporan di {sectionTrail(s.section)}</b> berawalan “{s.prefix} -”. Jadikan “{s.prefix}” subbagian supaya judulnya pendek dan rapi di menu.</span>
          <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => applySuggestion(s)}>
            {busy === s.key ? <Spinner size={14} /> : <Icon name="layers" size={15} />}Jadikan subbagian
          </button>
        </div>
      ))}
      {!reports ? (!error && <SkeletonCard lines={4} />) : (
        <section className="card">
          {!reports.length ? (
            <EmptyState icon="layers" title="Belum ada laporan"
              action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({ report: null })}><Icon name="plus" size={15} />Tambah laporan</button>}>
              Tempel link atau kode embed dari Power BI (File → Embed report).
            </EmptyState>
          ) : (
            <>
              <Tree items={tree.items} parentKey="" ctx={ctx} />
              <p className="hint"><Icon name="info" size={14} />Urutan di sini sama dengan urutan di menu. Pindahkan laporan ke bagian lain lewat tombol Ubah.</p>
            </>
          )}
        </section>
      )}
      <ReportForm open={!!form} report={form?.report || null} presetKey={form?.groupKey} tree={tree} onClose={() => setForm(null)} />
      <GroupForm group={groupForm?.group || null} tree={tree} reports={reports || []} onClose={() => setGroupForm(null)} />
    </div>
  );
}

function OrderButtons({ index, count, label, onMove, disabled }) {
  return (
    <div className="rep-order">
      <button type="button" className="icon-btn" disabled={index === 0 || disabled} onClick={() => onMove(-1)}
        aria-label={`Naikkan ${label}`} title="Naikkan"><Icon name="up" size={16} /></button>
      <button type="button" className="icon-btn" disabled={index === count - 1 || disabled} onClick={() => onMove(1)}
        aria-label={`Turunkan ${label}`} title="Turunkan"><Icon name="down" size={16} /></button>
    </div>
  );
}

function Tree({ items, parentKey, ctx }) {
  return (
    <ul className="rep-tree">
      {items.map((it, i) => (it.report ? (
        <li key={it.report.id} className={"rep-row" + (ctx.busy === it.report.id ? " busy" : "")}>
          <OrderButtons index={i} count={items.length} label={it.report.title} disabled={!!ctx.busy}
            onMove={(d) => ctx.moveItem(parentKey, i, d, it.report.id)} />
          <div className="rep-txt">
            <Link className="row-link" to={reportPath(it.report.id)}>{it.report.title}</Link>
            <div className="row-meta"><span className="trunc">{it.report.url}</span></div>
          </div>
          <div className="row-actions">
            <button type="button" className="icon-btn" title="Ubah" aria-label={`Ubah ${it.report.title}`} disabled={!!ctx.busy} onClick={() => ctx.editReport(it.report)}><Icon name="pencil" size={16} /></button>
            <button type="button" className="icon-btn danger" title="Hapus" aria-label={`Hapus ${it.report.title}`} disabled={!!ctx.busy} onClick={() => ctx.remove(it.report)}><Icon name="trash" size={16} /></button>
          </div>
        </li>
      ) : (
        <li key={it.group.key} className={"rep-group depth-" + Math.min(it.group.depth, 2)}>
          <div className={"rep-group-head" + (ctx.busy === it.group.key ? " busy" : "")}>
            <OrderButtons index={i} count={items.length} label={`bagian ${it.group.name}`} disabled={!!ctx.busy}
              onMove={(d) => ctx.moveItem(parentKey, i, d, it.group.key)} />
            <Icon name="folder" size={17} className="rep-group-ic" />
            <div className="rep-txt">
              <b className="rep-group-name">{it.group.name}</b>
              <div className="row-meta"><span>{flattenReports(it.group).length} laporan</span>{allGroups(it.group).length > 0 && <span>{allGroups(it.group).length} subbagian</span>}</div>
            </div>
            <div className="row-actions">
              <button type="button" className="icon-btn" title="Tambah laporan di bagian ini" aria-label={`Tambah laporan di ${it.group.name}`} disabled={!!ctx.busy} onClick={() => ctx.addReport(it.group)}><Icon name="plus" size={16} /></button>
              <button type="button" className="icon-btn" title="Ubah nama atau pindahkan bagian" aria-label={`Ubah bagian ${it.group.name}`} disabled={!!ctx.busy} onClick={() => ctx.editGroup(it.group)}><Icon name="pencil" size={16} /></button>
            </div>
          </div>
          <Tree items={it.group.items} parentKey={it.group.key} ctx={ctx} />
        </li>
      )))}
    </ul>
  );
}

const NEW_TOP = "__new__";
// pilihan bagian untuk <select>: jalur lengkap ("Layanan › Akademik TPB") supaya terbaca saat terbuka maupun tertutup
const groupOptions = (groups) => groups.map((g) => [g.key, g.parts.join(" › ")]);

function ReportForm({ open, report, presetKey, tree, onClose }) {
  const groups = allGroups(tree);
  const [f, setF] = useState({ groupKey: NEW_TOP, newName: "", addSub: false, title: "", url: "" });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const key = report ? sectionKey(report.section) : presetKey || groups[0]?.key || NEW_TOP;
    setF({ groupKey: findGroup(tree, key) ? key : NEW_TOP, newName: "", addSub: false, title: report?.title || "", url: report?.url || "" });
    setErr(null);
  }, [open, report, presetKey]);

  const set = (patch) => setF((cur) => ({ ...cur, ...patch }));
  const group = f.groupKey === NEW_TOP ? null : findGroup(tree, f.groupKey);
  const newName = f.newName.trim().replace(/\s+/g, " ");
  const creating = !group || f.addSub;
  const parts = group ? [...group.parts, ...(f.addSub && newName ? [newName] : [])] : newName ? [newName] : [];
  const link = extractEmbedUrl(f.url);
  const linkOk = !f.url.trim() || isPowerBiUrl(link);

  async function save() {
    const problem = (creating && nameProblem(newName, group ? "subbagian" : "bagian"))
      || (!f.title.trim() && "Isi judul laporan.") || (!link && "Tempel link atau kode embed Power BI.")
      || (!isPowerBiUrl(link) && "Link harus berupa link Power BI (https://app.powerbi.com/...).");
    if (problem) return setErr(problem);
    const body = { section: joinSection(parts), title: f.title.trim(), url: link };
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
        {err && <div className="foot-err" role="alert"><Icon name="alert" size={16} />{err}</div>}
        <span className="grow" />
        <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />}Simpan</button>
      </>
    )}>
      {open && (
        <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="field">
            <label className="field-lab" htmlFor="rep-group">Bagian</label>
            <select id="rep-group" value={f.groupKey} onChange={(e) => set({ groupKey: e.target.value, addSub: false, newName: "" })}>
              {groupOptions(groups).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              <option value={NEW_TOP}>＋ Bagian baru…</option>
            </select>
            {group && !f.addSub && (
              <button type="button" className="link-btn" onClick={() => set({ addSub: true })}><Icon name="plus" size={14} />Buat subbagian di dalam {group.name}</button>
            )}
          </div>
          {creating && (
            <label className="field"><span className="field-lab">{group ? `Nama subbagian baru di dalam ${group.name}` : "Nama bagian baru"}</span>
              <div className="field-row">
                <input type="text" placeholder={group ? "mis. Akademik TPB" : "mis. Layanan"} maxLength={120} autoFocus value={f.newName} onChange={(e) => set({ newName: e.target.value })} />
                {f.addSub && <button type="button" className="btn" onClick={() => set({ addSub: false, newName: "" })}>Batal</button>}
              </div>
            </label>
          )}
          <label className="field"><span className="field-lab">Judul laporan</span>
            <input type="text" placeholder="mis. Nilai TPB" maxLength={255} required value={f.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          {parts.length > 0 && f.title.trim() && (
            <p className="hint"><Icon name="info" size={14} />Tampil di menu: {[...parts, f.title.trim()].join(" › ")}</p>
          )}
          <label className="field"><span className="field-lab">Link atau kode embed Power BI</span>
            <textarea rows={4} placeholder={'https://app.powerbi.com/view?r=…  atau  <iframe … src="https://app.powerbi.com/…"></iframe>'}
              required spellCheck={false} value={f.url} onChange={(e) => set({ url: e.target.value })} />
          </label>
          {f.url.trim() && (linkOk
            ? link !== f.url.trim() && <p className="hint"><Icon name="checkCircle" size={14} />Link diambil dari kode embed: <span className="trunc">{link}</span></p>
            : <p className="hint err"><Icon name="alert" size={14} />Bukan link Power BI. Salin dari Power BI: File → Embed report → Publish to web.</p>)}
        </form>
      )}
    </Sheet>
  );
}

/** Ganti nama bagian dan/atau pindahkan ke bagian lain; semua laporan di dalamnya ikut diperbarui. */
function GroupForm({ group, tree, reports, onClose }) {
  const [name, setName] = useState("");
  const [parentKey, setParentKey] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (group) { setName(group.name); setParentKey(group.parent?.key || ""); setErr(null); }
  }, [group]);
  if (!group) return <Sheet open={false} onClose={onClose} title="" />;

  // tujuan: bagian lain selain dirinya sendiri dan subbagiannya
  const targets = allGroups(tree).filter((g) => g.key !== group.key && !g.key.startsWith(group.key + "\u0000"));
  const parent = parentKey ? findGroup(tree, parentKey) : null;
  const clean = name.trim().replace(/\s+/g, " ");
  const newParts = [...(parent ? parent.parts : []), clean];
  const moved = (parent?.key || "") !== (group.parent?.key || "");

  async function save() {
    const problem = nameProblem(clean, "bagian");
    if (problem) return setErr(problem);
    const inside = flattenReports(group);
    const changes = inside.map((r) => ({ id: r.id, body: { section: joinSection([...newParts, ...splitSection(r.section).slice(group.parts.length)]) } }))
      .filter((c, i) => c.body.section !== inside[i].section);
    if (!changes.length) return onClose();
    setBusy(true); setErr(null);
    const failed = await patchReports(changes);
    // pindah ke bagian lain: letakkan isinya di akhir bagian tujuan
    if (!failed && moved) {
      const ids = flattenReports(tree).map((r) => r.id);
      const movedIds = new Set(inside.map((r) => r.id));
      const rest = ids.filter((id) => !movedIds.has(id));
      const byId = new Map(reports.map((r) => [r.id, r]));
      const lastInTarget = parent ? rest.findLastIndex((id) => { const k = sectionKey(byId.get(id).section); return k === parent.key || k.startsWith(parent.key + " "); }) : -1;
      const at = lastInTarget < 0 ? rest.length : lastInTarget + 1;
      try { await saveOrder([...rest.slice(0, at), ...inside.map((r) => r.id), ...rest.slice(at)]); refresh(); } catch { /* urutan bisa diatur ulang dengan panah */ }
    }
    setBusy(false);
    if (failed) return setErr(`${failed} dari ${changes.length} laporan belum diperbarui. Tekan Simpan untuk mencoba lagi.`);
    toast(moved ? `Bagian "${clean}" dipindahkan.` : `Nama bagian diubah menjadi "${clean}".`);
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="Ubah bagian" sub={`${flattenReports(group).length} laporan di dalamnya ikut diperbarui.`} footer={(
      <>
        {err && <div className="foot-err" role="alert"><Icon name="alert" size={16} />{err}</div>}
        <span className="grow" />
        <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />}Simpan</button>
      </>
    )}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span className="field-lab">Nama bagian</span>
          <input type="text" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field"><span className="field-lab">Letak</span>
          <select value={parentKey} onChange={(e) => setParentKey(e.target.value)}>
            <option value="">Paling atas (judul di menu)</option>
            {targets.map((g) => <option key={g.key} value={g.key}>Di dalam {g.parts.join(" › ")}</option>)}
          </select>
        </label>
        <p className="hint"><Icon name="info" size={14} />Bila di tujuan sudah ada bagian dengan nama yang sama, isinya digabung.</p>
      </form>
    </Sheet>
  );
}
