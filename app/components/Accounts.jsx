// Pengaturan Akun (akses Administrator): pengguna (beri/cabut akses, undang, hapus) dan peran beserta grant-nya.
// Akun & peran Super Admin hanya bisa diubah oleh Super Admin.
import { useEffect, useState } from "react";
import { GRANTS } from "../config.js";
import { api, errorText, refreshUser } from "../lib/api.js";
import { fmtDate, fmtNum, grantLabel, programLabel, PROGRAMS_AZ } from "../lib/format.js";
import { useAuthStore } from "../stores/auth.js";
import { invalidate, useApi } from "../stores/data.js";
import { confirmAction, toast } from "./feedback.jsx";
import { Icon } from "./Icon.jsx";
import { EmptyState, ErrorNote, SearchInput, Segmented, Sheet, Spinner, TableSkeleton, usePending } from "./ui.jsx";

const ALL = "Semua";
const STATUS = {
  pending: ["Menunggu persetujuan", "warn"],
  active: ["Aktif", "ok"],
  invited: ["Diundang", ""],
  unverified: ["Belum verifikasi email", "idle"],
};
const NO_ROLE = "";

const refreshAccounts = () => { invalidate("/users", "/roles"); refreshUser(); };

const grantsText = (role) => (role.isSuperAdmin ? "Semua akses"
  : role.grants.map((g) => (g === "pic" ? `PIC ${(role.programs || []).map(programLabel).join(", ")}` : grantLabel(g))).join(" · "));

export function AccountSettings() {
  const [tab, setTab] = useState("users");
  return (
    <>
      <Segmented label="Bagian Pengaturan Akun" value={tab} onChange={setTab} options={[["users", "Pengguna"], ["roles", "Peran"]]} />
      {tab === "users" ? <UsersTable /> : <RolesTable />}
    </>
  );
}

function UsersTable() {
  const session = useAuthStore((s) => s.session);
  const isSuperAdmin = session.permissions.isSuperAdmin;
  const { data, error, loading, reload } = useApi("/users");
  const roles = useApi("/roles").data?.data || [];
  const busy = usePending(loading && !!data);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL);
  const [form, setForm] = useState(null);   // { user } | { user: null }
  const [busyId, setBusyId] = useState(null);

  const users = data?.data || [];
  const pendingCount = users.filter((u) => u.status === "pending").length;
  const rows = users
    .filter((u) => (status === ALL || u.status === status)
      && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));

  async function remove(u) {
    const pending = u.status === "pending";
    const ok = await confirmAction({
      title: pending ? "Tolak pendaftaran ini?" : "Hapus pengguna ini?", danger: true, confirmText: pending ? "Tolak" : "Hapus",
      body: `Akun ${u.name} (${u.email}) akan dihapus. Ia bisa mendaftar lagi, tetapi harus menunggu persetujuan.`,
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await api("/user/" + u.id, { method: "DELETE" });
      toast(pending ? "Pendaftaran ditolak." : "Pengguna dihapus.");
      refreshAccounts();
    } catch (e) {
      toast(errorText(e), "err");
    } finally { setBusyId(null); }
  }

  return (
    <section className="card tbl-card">
      <div className="tbl-head">
        <div>
          <h2 className="card-title">Pengguna</h2>
          <div className="card-sub">{data ? `${fmtNum(users.length)} akun` + (pendingCount ? ` · ${pendingCount} menunggu persetujuan` : "") : "Memuat…"}</div>
        </div>
        <div className="tbl-actions">
          <button type="button" className="btn btn-primary" onClick={() => setForm({ user: null })}><Icon name="plus" size={16} /><span className="btn-txt">Tambah pengguna</span></button>
        </div>
      </div>

      <div className="tbl-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama atau email" delay={150} />
        <select className="tb-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
          <option value={ALL}>Semua status</option>
          {Object.entries(STATUS).map(([v, [t]]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </div>

      <ErrorNote error={error} onRetry={() => reload()} />

      {!data && loading ? <TableSkeleton rows={5} /> : rows.length === 0 && !error ? (
        <EmptyState icon={q ? "search" : "users"} title={q ? `Tidak ada akun yang cocok dengan "${q}"` : "Tidak ada akun"}>
          {q ? "Coba kata kunci lain." : "Akun yang mendaftar atau Anda tambahkan akan muncul di sini."}
        </EmptyState>
      ) : (
        <div className={"tbl-body" + busy} aria-busy={loading}>
          <div className="tbl-scroll">
            <table className="tbl acc-tbl">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th className="sm-hide">Masuk dengan</th>
                  <th className="sm-hide">Terdaftar</th>
                  <th className="c-act"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const locked = u.role?.isSuperAdmin && !isSuperAdmin;
                  const self = u.id === session.id;
                  const [label, tone] = STATUS[u.status];
                  return (
                    <tr key={u.id} className={busyId === u.id ? "busy" : ""}>
                      <td><b>{u.name}</b>{self && <span className="muted"> (Anda)</span>}<div className="row-meta"><span className="trunc">{u.email}</span></div></td>
                      <td>{u.role ? u.role.name : <span className="muted">Tanpa akses</span>}</td>
                      <td><span className={"pill " + tone}>{label}</span></td>
                      <td className="sm-hide">{[u.hasMicrosoft && "Akun ITB", u.hasPassword && "Email"].filter(Boolean).join(" · ") || <span className="muted">–</span>}</td>
                      <td className="sm-hide">{fmtDate(u.createdAt)}</td>
                      <td className="c-act">
                        {locked ? <span className="lock" title="Hanya Super Admin yang bisa mengubah akun ini"><Icon name="lock" size={14} /></span> : (
                          <div className="row-actions">
                            {u.status === "pending"
                              ? <button type="button" className="btn btn-sm btn-primary" onClick={() => setForm({ user: u, approve: true })}>Beri akses</button>
                              : <button type="button" className="icon-btn" title="Ubah" aria-label={"Ubah " + u.name} onClick={() => setForm({ user: u })}><Icon name="pencil" size={16} /></button>}
                            {!self && (
                              <button type="button" className="icon-btn danger" title={u.status === "pending" ? "Tolak" : "Hapus"}
                                aria-label={(u.status === "pending" ? "Tolak " : "Hapus ") + u.name} onClick={() => remove(u)}><Icon name="trash" size={16} /></button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UserSheet form={form} roles={roles} session={session} onClose={() => setForm(null)} />
    </section>
  );
}

function UserSheet({ form, roles, session, onClose }) {
  const user = form?.user;
  const [f, setF] = useState({ name: "", email: "", roleId: NO_ROLE });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isSuperAdmin = session.permissions.isSuperAdmin;
  const self = user?.id === session.id;
  const emailEditable = !user || user.status === "invited";
  const options = roles.filter((r) => !r.isSuperAdmin || isSuperAdmin || r.id === user?.role?.id);

  useEffect(() => {
    if (form) { setF({ name: user?.name || "", email: user?.email || "", roleId: user?.role?.id || NO_ROLE }); setErr(""); }
  }, [form]);

  const field = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });

  async function save() {
    if (!f.name.trim()) return setErr("Nama wajib diisi.");
    if (!f.email.trim()) return setErr("Email wajib diisi.");
    if (!user && !f.roleId) return setErr("Pilih peran untuk pengguna baru.");
    setBusy(true); setErr("");
    try {
      if (!user) {
        await api("/user", { method: "POST", body: { name: f.name.trim(), email: f.email.trim(), roleId: f.roleId } });
        toast(`${f.name.trim()} ditambahkan. Ia bisa langsung masuk dengan Akun ITB atau daftar dengan email ini.`);
      } else {
        const body = {};
        if (f.name.trim() !== user.name) body.name = f.name.trim();
        if (emailEditable && f.email.trim().toLowerCase() !== user.email.toLowerCase()) body.email = f.email.trim();
        if (!self && f.roleId !== (user.role?.id || NO_ROLE)) body.roleId = f.roleId || null;
        if (Object.keys(body).length) await api("/user/" + user.id, { method: "PATCH", body });
        toast(user.status === "pending" && body.roleId ? `Akses diberikan ke ${user.name}. Email pemberitahuan dikirim.`
          : body.roleId === null ? `Akses ${user.name} dicabut.` : "Perubahan pengguna disimpan.");
      }
      refreshAccounts();
      onClose();
    } catch (e) {
      setErr(errorText(e));
    } finally { setBusy(false); }
  }

  const title = !user ? "Tambah pengguna" : form?.approve ? "Beri akses" : "Ubah pengguna";
  return (
    <Sheet open={!!form} onClose={onClose} title={title} sub={user ? user.email : "Daftarkan email yang boleh masuk beserta perannya."}
      footer={(
        <>
          {err && <div className="foot-err" role="alert"><Icon name="alert" size={16} />{err}</div>}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />}{form?.approve ? "Beri akses" : "Simpan"}</button>
        </>
      )}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span className="field-lab">Nama</span>
          <input type="text" placeholder="mis. Budi Santoso" {...field("name")} />
        </label>
        <label className="field"><span className="field-lab">Email</span>
          <input type="email" placeholder="nama@itb.ac.id" readOnly={!emailEditable} {...field("email")} />
          {!emailEditable && <span className="hint">Email tidak bisa diubah setelah pengguna mendaftar.</span>}
        </label>
        <label className="field"><span className="field-lab">Peran</span>
          <select disabled={self} {...field("roleId")}>
            {user && <option value={NO_ROLE}>Tanpa akses (tidak bisa masuk)</option>}
            {!user && <option value={NO_ROLE}>– Pilih peran –</option>}
            {options.map((r) => <option key={r.id} value={r.id}>{r.name === grantsText(r) ? r.name : `${r.name} · ${grantsText(r)}`}</option>)}
          </select>
          {self && <span className="hint">Anda tidak bisa mengubah peran sendiri.</span>}
        </label>
        {!user && <p className="hint"><Icon name="info" size={14} />Pengguna ini tidak perlu menunggu persetujuan: ia bisa masuk dengan Akun ITB, atau daftar dengan email ini untuk membuat password.</p>}
      </form>
    </Sheet>
  );
}

function RolesTable() {
  const session = useAuthStore((s) => s.session);
  const { data, error, loading, reload } = useApi("/roles");
  const busy = usePending(loading && !!data);
  const [form, setForm] = useState(null);   // { role } | { role: null }
  const [busyId, setBusyId] = useState(null);
  const roles = data?.data || [];

  async function remove(r) {
    const ok = await confirmAction({ title: "Hapus peran ini?", danger: true, confirmText: "Hapus", body: `Peran "${r.name}" akan dihapus.` });
    if (!ok) return;
    setBusyId(r.id);
    try {
      await api("/role/" + r.id, { method: "DELETE" });
      toast("Peran dihapus.");
      refreshAccounts();
    } catch (e) {
      toast(errorText(e), "err");
    } finally { setBusyId(null); }
  }

  return (
    <section className="card tbl-card">
      <div className="tbl-head">
        <div>
          <h2 className="card-title">Peran</h2>
          <div className="card-sub">Hak akses pengguna mengikuti peran. Satu peran boleh punya beberapa akses; haknya digabung.</div>
        </div>
        <div className="tbl-actions">
          <button type="button" className="btn btn-primary" onClick={() => setForm({ role: null })}><Icon name="plus" size={16} /><span className="btn-txt">Tambah peran</span></button>
        </div>
      </div>

      <ErrorNote error={error} onRetry={() => reload()} />

      {!data && loading ? <TableSkeleton rows={4} /> : (
        <div className={"tbl-body" + busy} aria-busy={loading}>
          <div className="tbl-scroll">
            <table className="tbl acc-tbl">
              <thead>
                <tr>
                  <th>Peran</th>
                  <th>Akses</th>
                  <th className="num">Pengguna</th>
                  <th className="c-act"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id} className={busyId === r.id ? "busy" : ""}>
                    <td><b>{r.name}</b>{r.id === session.role.id && <span className="muted"> (peran Anda)</span>}</td>
                    <td className="wrap">{grantsText(r)}</td>
                    <td className="num">{fmtNum(r.userCount)}</td>
                    <td className="c-act">
                      {r.isSuperAdmin ? <span className="lock" title="Peran Super Admin tetap dan tidak bisa diubah"><Icon name="lock" size={14} /></span> : (
                        <div className="row-actions">
                          <button type="button" className="icon-btn" title="Ubah" aria-label={"Ubah " + r.name} onClick={() => setForm({ role: r })}><Icon name="pencil" size={16} /></button>
                          <button type="button" className="icon-btn danger" disabled={r.userCount > 0}
                            title={r.userCount > 0 ? `Masih dipakai ${r.userCount} pengguna. Pindahkan penggunanya ke peran lain dulu.` : "Hapus"}
                            aria-label={"Hapus " + r.name} onClick={() => remove(r)}><Icon name="trash" size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RoleSheet form={form} onClose={() => setForm(null)} />
    </section>
  );
}

function RoleSheet({ form, onClose }) {
  const role = form?.role;
  const [f, setF] = useState({ name: "", grants: [], programs: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (form) { setF({ name: role?.name || "", grants: role?.grants || [], programs: role?.programs || [] }); setErr(""); }
  }, [form]);

  const toggle = (k, v) => setF((cur) => ({ ...cur, [k]: cur[k].includes(v) ? cur[k].filter((x) => x !== v) : [...cur[k], v] }));
  const isPic = f.grants.includes("pic");

  async function save() {
    if (!f.name.trim()) return setErr("Nama peran wajib diisi.");
    if (!f.grants.length) return setErr("Pilih minimal satu akses.");
    if (isPic && !f.programs.length) return setErr("Pilih minimal satu program untuk akses PIC.");
    setBusy(true); setErr("");
    try {
      const body = { name: f.name.trim(), grants: f.grants, programs: isPic ? f.programs : null };
      if (role) await api("/role/" + role.id, { method: "PATCH", body });
      else await api("/role", { method: "POST", body });
      toast(role ? "Perubahan peran disimpan." : `Peran "${body.name}" ditambahkan.`);
      refreshAccounts();
      onClose();
    } catch (e) {
      setErr(errorText(e));
    } finally { setBusy(false); }
  }

  return (
    <Sheet open={!!form} onClose={onClose} title={role ? "Ubah peran" : "Tambah peran"} sub="Pengguna dengan peran ini mendapat gabungan semua akses yang dipilih."
      footer={(
        <>
          {err && <div className="foot-err" role="alert"><Icon name="alert" size={16} />{err}</div>}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />}Simpan</button>
        </>
      )}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span className="field-lab">Nama peran</span>
          <input type="text" placeholder="mis. Pimpinan, Anggota, PIC OPSI" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <fieldset className="checks">
          <legend className="field-lab">Akses</legend>
          {GRANTS.map(([v, t, desc]) => (
            <label key={v} className={"check done-check" + (f.grants.includes(v) ? " on" : "")}>
              <input type="checkbox" checked={f.grants.includes(v)} onChange={() => toggle("grants", v)} />
              <span><b>{t}</b><small>{desc}</small></span>
            </label>
          ))}
        </fieldset>
        {isPic && (
          <fieldset className="checks">
            <legend className="field-lab">Program untuk akses PIC</legend>
            <div className="check-grid">
              {PROGRAMS_AZ.map((p) => (
                <label key={p.api} className={"check" + (f.programs.includes(p.api) ? " on" : "")}>
                  <input type="checkbox" checked={f.programs.includes(p.api)} onChange={() => toggle("programs", p.api)} />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </form>
    </Sheet>
  );
}
