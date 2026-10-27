// Daftar nama SDM bersama semua program (GET /human-resources/members):
// pemilih nama di form kegiatan + tabel kelola di halaman SDM.
import { useEffect, useMemo, useState } from "react";
import { SDM_POSITIONS } from "../config.js";
import { api, errorText } from "../lib/api.js";
import { byLabel, canEditHumanResources, fmtNum, splitPeople } from "../lib/format.js";
import { useAuthStore } from "../stores/auth.js";
import { invalidate, useApi } from "../stores/data.js";
import { confirmAction, toast } from "./feedback.jsx";
import { Icon } from "./Icon.jsx";
import { CheckGridSkeleton, EmptyState, ErrorNote, SearchInput, Sheet, Spinner, TableSkeleton, usePending } from "./ui.jsx";

const ALL = "Semua";
const LAINNYA = "__LAINNYA__";

// sama dengan pencocokan di backend: huruf besar/kecil, spasi, dan tanda baca diabaikan
export const sdmKey = (v) => String(v || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export const refreshMembers = () => invalidate("/human-resources", "/activities", "/dashboard");

export const useMembers = () => useApi("/human-resources/members");

// peran bawaan + peran yang sudah punya nama; "dosen" dan "Dosen" dianggap satu peran
export function positionsOf(members) {
  const out = new Map();
  [...SDM_POSITIONS, ...(members || []).map((m) => m.position)].forEach((p) => {
    if (p && !out.has(sdmKey(p))) out.set(sdmKey(p), p);
  });
  return [...out.values()];
}

// tambah beberapa nama sekaligus (pisahkan dengan Enter atau koma); nama yang sudah ada dipakai ulang
async function addNames(position, text, existing) {
  const out = [];
  for (const name of splitPeople(text)) {
    const found = [...existing, ...out].find((m) => sdmKey(m.name) === sdmKey(name));
    if (found) { if (!out.includes(found)) out.push(found); continue; }
    const res = await api("/human-resources/member", { method: "POST", body: { position, name } });
    out.push({ ...res.data, activityCount: 0, isNew: true });
  }
  return out;
}

/** Pilih nama SDM untuk satu peran di kegiatan. `value` = id nama terpilih, `known` = nama yang sudah tertaut. */
export function MemberPicker({ position, value, known, onChange }) {
  const { data, error, loading, reload } = useMembers();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [added, setAdded] = useState([]);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const byId = new Map();
    [...(data?.data || []).filter((m) => sdmKey(m.position) === sdmKey(position)), ...added, ...(known || [])]
      .forEach((m) => { if (!byId.has(m.id) && (!m.position || sdmKey(m.position) === sdmKey(position))) byId.set(m.id, m); });
    return [...byId.values()].sort(byLabel((m) => m.name));
  }, [data, added, known, position]);

  const sel = new Set(value);
  const shown = q ? list.filter((m) => sdmKey(m.name).includes(sdmKey(q))) : list;
  const allShownOn = shown.length > 0 && shown.every((m) => sel.has(m.id));
  const toggle = (id) => onChange(sel.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  const toggleShown = () => onChange(allShownOn
    ? value.filter((id) => !shown.some((m) => m.id === id))
    : [...new Set([...value, ...shown.map((m) => m.id)])]);

  async function add() {
    if (!splitPeople(draft).length) return;
    setBusy(true);
    try {
      const out = await addNames(position, draft, list);
      setAdded((cur) => [...cur, ...out.filter((m) => m.isNew).map((m) => ({ ...m, position }))]);
      onChange([...new Set([...value, ...out.map((m) => m.id)])]);
      setDraft("");
      if (out.some((m) => m.isNew)) invalidate("/human-resources");
    } catch (e) {
      toast(errorText(e), "err");
    } finally { setBusy(false); }
  }

  if (!position) return <p className="hint">Ketik nama peran dulu, lalu pilih atau tambahkan namanya.</p>;

  return (
    <div className="member-pick">
      <div className="member-tools" onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}>
        <SearchInput value={q} onChange={setQ} placeholder={`Cari nama ${position}`} delay={0} />
        {shown.length > 0 && <button type="button" className="link-btn" onClick={toggleShown}>{allShownOn ? "Kosongkan" : "Pilih semua"}</button>}
      </div>
      {error ? <ErrorNote error={error} onRetry={() => reload()} />
        : !data && loading ? <CheckGridSkeleton />
        : shown.length === 0 ? (
          <p className="hint">{q ? `Tidak ada nama ${position} yang cocok dengan "${q}".` : `Belum ada nama untuk peran ${position}. Tambahkan di bawah.`}</p>
        ) : (
          <div className="check-grid member-list">
            {shown.map((m) => (
              <label key={m.id} className={"check" + (sel.has(m.id) ? " on" : "")}>
                <input type="checkbox" checked={sel.has(m.id)} onChange={() => toggle(m.id)} />
                <span>{m.name}</span>
              </label>
            ))}
          </div>
        )}
      <div className="member-add">
        <textarea rows={1} placeholder={"Nama baru (beberapa nama: pisahkan dengan Enter atau koma)"} value={draft}
          aria-label={`Tambah nama ${position}`} onChange={(e) => setDraft(e.target.value)} />
        <button type="button" className="btn btn-sm" onClick={add} disabled={busy || !draft.trim()}>
          {busy ? <Spinner size={14} /> : <Icon name="plus" size={15} />}Tambah &amp; pilih
        </button>
      </div>
    </div>
  );
}

/** Tabel kelola nama SDM: tambah, ubah nama, gabungkan nama ganda, hapus. */
export function HumanResourcesTable() {
  const session = useAuthStore((s) => s.session);
  const canEdit = canEditHumanResources(session);
  const { data, error, loading, reload } = useMembers();
  const busy = usePending(loading && !!data);
  const members = data?.data || [];
  const positions = positionsOf(members);
  const [position, setPosition] = useState(ALL);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [merging, setMerging] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const rows = members.filter((m) => (position === ALL || sdmKey(m.position) === sdmKey(position))
    && (!q || sdmKey(m.name).includes(sdmKey(q))));

  const run = async (id, fn, okText) => {
    setBusyId(id);
    try { await fn(); toast(okText); refreshMembers(); return true; }
    catch (e) { toast(errorText(e), "err"); return false; }
    finally { setBusyId(null); }
  };

  async function rename() {
    const name = editing.name.trim();
    const m = members.find((x) => x.id === editing.id);
    if (!name || name === m.name) return setEditing(null);
    if (await run(m.id, () => api("/human-resources/member/" + m.id, { method: "PATCH", body: { name } }), `Nama diubah menjadi "${name}".`)) setEditing(null);
  }

  async function remove(m) {
    const ok = await confirmAction({ title: "Hapus nama ini?", danger: true, confirmText: "Hapus", body: `"${m.name}" akan dihapus dari daftar ${m.position}.` });
    if (ok) run(m.id, () => api("/human-resources/member/" + m.id, { method: "DELETE" }), "Nama dihapus.");
  }

  return (
    <section className="card tbl-card">
      <div className="tbl-head">
        <div>
          <h2 className="card-title">Daftar nama SDM</h2>
          <div className="card-sub">{data ? `${fmtNum(members.length)} nama · ${new Set(members.map((m) => sdmKey(m.position))).size} peran` : "Memuat…"}</div>
        </div>
        {canEdit && (
          <div className="tbl-actions">
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={16} /><span className="btn-txt">Tambah nama</span></button>
          </div>
        )}
      </div>

      <div className="tbl-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama SDM" delay={150} />
        <select className="tb-select" value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Filter peran">
          <option value={ALL}>Semua peran</option>
          {positions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <ErrorNote error={error} onRetry={() => reload()} />

      {!data && loading ? <TableSkeleton check={canEdit} /> : rows.length === 0 && !error ? (
        <EmptyState icon={q ? "search" : "users"} title={q ? `Tidak ada nama yang cocok dengan "${q}"` : "Belum ada nama SDM"}>
          {q ? "Coba kata kunci lain." : "Nama yang ditambahkan di sini atau di form kegiatan akan muncul di daftar ini."}
        </EmptyState>
      ) : (
        <div className={"tbl-body" + busy} aria-busy={loading}>
          <div className="tbl-scroll">
            <table className="tbl sdm-tbl">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Peran</th>
                  <th className="num">Dipakai di</th>
                  {canEdit && <th className="c-act"><span className="sr-only">Aksi</span></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className={busyId === m.id ? "busy" : ""}>
                    <td>
                      {editing?.id === m.id ? (
                        <input type="text" aria-label={"Nama baru untuk " + m.name} value={editing.name} autoFocus
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") setEditing(null); }} />
                      ) : m.name}
                    </td>
                    <td>{m.position}</td>
                    <td className="num">{m.activityCount ? `${fmtNum(m.activityCount)} kegiatan` : <span className="muted">Belum dipakai</span>}</td>
                    {canEdit && (
                      <td className="c-act">
                        {editing?.id === m.id ? (
                          <div className="row-actions">
                            <button type="button" className="icon-btn" title="Simpan" aria-label="Simpan nama" onClick={rename}><Icon name="check" size={16} /></button>
                            <button type="button" className="icon-btn" title="Batal" aria-label="Batal ubah nama" onClick={() => setEditing(null)}><Icon name="x" size={16} /></button>
                          </div>
                        ) : (
                          <div className="row-actions">
                            <button type="button" className="icon-btn" title="Ubah nama" aria-label={"Ubah nama " + m.name} onClick={() => setEditing({ id: m.id, name: m.name })}><Icon name="pencil" size={16} /></button>
                            <button type="button" className="icon-btn" title="Gabungkan ke nama lain" aria-label={"Gabungkan " + m.name} onClick={() => setMerging(m)}><Icon name="layers" size={16} /></button>
                            <button type="button" className="icon-btn danger" disabled={m.activityCount > 0}
                              title={m.activityCount > 0 ? `Masih dipakai di ${m.activityCount} kegiatan. Gabungkan ke nama lain untuk menghapusnya.` : "Hapus"}
                              aria-label={"Hapus " + m.name} onClick={() => remove(m)}><Icon name="trash" size={16} /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddMembersSheet open={adding} onClose={() => setAdding(false)} members={members} positions={positions}
        defaultPosition={position === ALL ? positions[0] : position} />
      <MergeSheet member={merging} members={members} onClose={() => setMerging(null)} />
    </section>
  );
}

function AddMembersSheet({ open, onClose, members, positions, defaultPosition }) {
  const [posSel, setPosSel] = useState(defaultPosition);
  const [posCustom, setPosCustom] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const position = posSel === LAINNYA ? posCustom.trim() : posSel;
  const count = splitPeople(text).length;

  useEffect(() => {
    if (open) { setPosSel(defaultPosition); setPosCustom(""); setText(""); setErr(""); }
  }, [open]);

  async function save() {
    if (!position) return setErr("Ketik nama peran.");
    if (!count) return setErr("Isi minimal satu nama.");
    setBusy(true); setErr("");
    try {
      const out = await addNames(position, text, members.filter((m) => sdmKey(m.position) === sdmKey(position)));
      const fresh = out.filter((m) => m.isNew).length;
      toast(fresh === out.length ? `${fresh} nama ditambahkan ke ${position}.` : `${fresh} nama ditambahkan; ${out.length - fresh} sudah ada di ${position}.`);
      refreshMembers();
      onClose();
    } catch (e) {
      setErr(errorText(e));
    } finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Tambah nama SDM" sub="Nama yang sama (beda huruf besar/kecil, spasi, atau tanda baca) tidak akan dibuat dua kali."
      footer={(
        <>
          {err && <div className="foot-err" role="alert"><Icon name="alert" size={16} />{err}</div>}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />}Simpan{count > 1 ? ` ${count} nama` : ""}</button>
        </>
      )}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="form-grid">
          <label className="field"><span className="field-lab">Peran</span>
            <select value={posSel} onChange={(e) => setPosSel(e.target.value)}>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              <option value={LAINNYA}>Lainnya…</option>
            </select>
          </label>
          {posSel === LAINNYA && (
            <label className="field"><span className="field-lab">Nama peran</span>
              <input placeholder="mis. Pamong" value={posCustom} onChange={(e) => setPosCustom(e.target.value)} />
            </label>
          )}
        </div>
        <label className="field">
          <span className="field-lab">Nama <span className="muted">({count} nama · pisahkan dengan Enter atau koma)</span></span>
          <textarea rows={6} placeholder={"PT Freeport Indonesia\nPT Wardah"} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
      </form>
    </Sheet>
  );
}

function MergeSheet({ member, members, onClose }) {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const options = member ? members.filter((m) => m.id !== member.id && sdmKey(m.position) === sdmKey(member.position)) : [];
  const targetMember = options.find((m) => m.id === target);

  useEffect(() => { setTarget(""); setErr(""); }, [member]);

  async function save() {
    if (!targetMember) return setErr("Pilih nama tujuan.");
    setBusy(true); setErr("");
    try {
      await api(`/human-resources/member/${member.id}/merge`, { method: "POST", body: { targetMemberId: targetMember.id } });
      toast(`"${member.name}" digabung ke "${targetMember.name}".`);
      refreshMembers();
      onClose();
    } catch (e) {
      setErr(errorText(e));
    } finally { setBusy(false); }
  }

  return (
    <Sheet open={!!member} onClose={onClose} title="Gabungkan nama" sub={member ? `${member.position}: ${member.name}` : ""}
      footer={(
        <>
          {err && <div className="foot-err" role="alert"><Icon name="alert" size={16} />{err}</div>}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !targetMember}>{busy && <Spinner />}Gabungkan</button>
        </>
      )}>
      {member && (
        <div className="form">
          <p className="hint">
            Pakai ini untuk nama ganda atau salah ketik. "{member.name}" akan dihapus, dan
            {member.activityCount ? ` ${member.activityCount} kegiatan yang memakainya` : " kegiatan yang memakainya"} akan beralih ke nama tujuan.
          </p>
          <label className="field"><span className="field-lab">Gabungkan ke</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">– Pilih nama {member.position} –</option>
              {options.map((m) => <option key={m.id} value={m.id}>{m.name}{m.activityCount ? ` (${m.activityCount} kegiatan)` : ""}</option>)}
            </select>
          </label>
        </div>
      )}
    </Sheet>
  );
}
