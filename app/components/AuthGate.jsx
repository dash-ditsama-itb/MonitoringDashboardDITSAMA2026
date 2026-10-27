import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { API_URL } from "../config.js";
import { api, errorText } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";
import { GateInfo } from "./GateInfo.jsx";
import { Icon } from "./Icon.jsx";
import { Spinner } from "./ui.jsx";

const COPY = {
  login: ["Masuk", "Gunakan email dan password akun Anda."],
  signup: ["Buat akun", "Setelah email terverifikasi, Administrator memberi akses ke akun Anda."],
  verify: ["Verifikasi email", "Masukkan 6 digit kode yang kami kirim ke email Anda."],
  forgot: ["Lupa password", "Masukkan email akun Anda. Kami kirim kode untuk membuat password baru."],
  reset: ["Buat password baru", "Masukkan kode dari email dan password baru Anda."],
};

const hasMicrosoftToken = () => typeof window !== "undefined" && /[#&]microsoft_token=/.test(window.location.hash);

/** ?next= di halaman masuk = halaman dashboard yang tadi dibuka; hanya jalur di situs ini ("/..."), bukan "/" (= pilih dashboard). */
export function nextPath(search) {
  const next = new URLSearchParams(search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") && next !== "/" ? next : null;
}

// Akun ITB selalu kembali ke /dashboard#microsoft_token=…; tujuan sebenarnya disimpan saat tombol Akun ITB ditekan
// ("/" = pilih dashboard) dan dipakai Gate sebagai ?next=
const SSO_RETURN = "ditsama-sso-return";
const rememberSsoReturn = (path) => { try { sessionStorage.setItem(SSO_RETURN, path); } catch { /* penyimpanan diblokir */ } };
const forgetSsoReturn = () => { try { sessionStorage.removeItem(SSO_RETURN); } catch { /* penyimpanan diblokir */ } };

/** Alamat halaman masuk untuk Gate: ?next= = halaman ini (atau tujuan Akun ITB); fragmen URL ikut dibawa untuk diproses di sana. */
export function loginTarget(location) {
  let next = location.pathname + location.search;
  if (/[#&]microsoft_(token|error)=/.test(location.hash)) {
    try { next = sessionStorage.getItem(SSO_RETURN) || next; } catch { /* penyimpanan diblokir */ }
  }
  return { pathname: "/", search: next === "/" ? "" : "?next=" + encodeURIComponent(next), hash: location.hash };
}

export function Brand() {
  const [failed, setFailed] = useState(false);
  return failed
    ? <div className="gate-logo-text"><b>Direktorat Persiapan Bersama</b><span>Institut Teknologi Bandung</span></div>
    : <img className="gate-logo" src={import.meta.env.BASE_URL + "assets/dpb-logo-transparent.png"} alt="Direktorat Persiapan Bersama ITB" onError={() => setFailed(true)} />;
}

/** Tata letak halaman masuk: panel biru (tab Profil/Layanan/Struktur Organisasi) + isi (formulir atau pilih dashboard). */
export function GateShell({ children }) {
  const [tab, setTab] = useState("profil");
  return (
    <div className="gate">
      <aside className="gate-side">
        <img className="gate-badge" src={import.meta.env.BASE_URL + "assets/itb-logo.png"} alt="Logo ITB" width="52" height="52" />
        <GateInfo id="gate-info-side" tab={tab} setTab={setTab} className="on-side" />
        <div>
          <h1>Dashboard DITSAMA 2026</h1>
          <p>Direktorat Persiapan Bersama · Institut Teknologi Bandung</p>
        </div>
      </aside>
      <main className="gate-main">
        {children}
        <GateInfo id="gate-info-below" tab={tab} setTab={setTab} className="below-form" />
      </main>
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input id={id} type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} required />
      <button type="button" className="pw-eye" onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
        <Icon name={show ? "eyeOff" : "eye"} size={17} />
      </button>
    </div>
  );
}

// Akun ITB = login Microsoft (SSO) milik ITB; pengguna cukup melihat "Akun ITB"
function ItbLogo() {
  return <img src={import.meta.env.BASE_URL + "assets/itb-logo.png"} alt="" width="18" height="18" aria-hidden="true" />;
}

// ok = hijau, info = biru (mis. menunggu persetujuan), selain itu merah
function Msg({ msg }) {
  if (!msg) return null;
  const tone = msg.ok ? "ok" : msg.info ? "" : "err";
  return (
    <div className={"note " + tone} role={tone === "err" ? "alert" : "status"}>
      <Icon name={msg.ok ? "checkCircle" : msg.info ? "info" : "alert"} size={16} /><span>{msg.text}</span>
    </div>
  );
}

// akun belum diberi peran oleh Administrator -> tampil sebagai info, bukan error
const isPending = (err) => err?.raw?.message === "User access is awaiting approval."

/** Gerbang Masuk / Daftar / Verifikasi / Lupa password di halaman masuk "/" (satu akun untuk kedua dashboard). */
export function AuthGate() {
  const login = useAuthStore((s) => s.login);
  const location = useLocation();
  const notice = useAuthStore((s) => s.notice);
  const [mode, setMode] = useState(() => (hasMicrosoftToken() ? "sso" : "login"));
  const [f, setF] = useState({ name: "", email: "", password: "", code: "" });
  const [msg, setMsg] = useState(notice ? { info: true, text: notice } : null);
  const [busy, setBusy] = useState(false);

  const field = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const go = (m, message = null) => { setMode(m); setMsg(message); setF((x) => ({ ...x, code: "", password: m === "login" ? x.password : "" })); };
  const email = f.email.trim();

  const run = async (fn) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { return e; } finally { setBusy(false); }
  };
  const post = (path, body) => api(path, { method: "POST", body, token: null });

  // kembali dari Microsoft: backend menaruh token sementara di fragmen URL (#microsoft_token / #microsoft_error)
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("microsoft_token");
    if (!token && !hash.has("microsoft_error")) return;
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    if (!token) return go("login", { ok: false, text: "Masuk dengan Akun ITB gagal atau dibatalkan. Silakan coba lagi." });
    run(async () => {
      const out = await post("/auth/microsoft/login", { token });
      // tujuan setelah masuk sudah ada di ?next= (dari Gate)
      forgetSsoReturn();
      login(out.data.user, out.data.accessToken);
    }).then((err) => err && go("login", { ok: false, info: isPending(err), text: errorText(err) }));
  }, []);

  async function submit(e) {
    e.preventDefault();
    const err = await run(async () => {
      if (mode === "login") {
        const out = await post("/auth/login", { email, password: f.password });
        login(out.data.user, out.data.accessToken);
      } else if (mode === "signup") {
        await post("/auth/register", { name: f.name.trim(), email, password: f.password });
        go("verify", { ok: true, text: `Kode verifikasi terkirim ke ${email}. Cek juga folder spam.` });
      } else if (mode === "verify") {
        const out = await post("/auth/otp/email/verify", { email, code: f.code.trim() });
        go("login", out.message === "User email verified, awaiting approval."
          ? { info: true, text: "Email terverifikasi. Akun Anda menunggu persetujuan Administrator; kami kirim email saat akses aktif." }
          : { ok: true, text: "Email terverifikasi. Silakan masuk." });
      } else if (mode === "forgot") {
        await post("/auth/otp/password-reset", { email });
        go("reset", { ok: true, text: `Kode terkirim ke ${email}.` });
      } else if (mode === "reset") {
        await post("/auth/otp/password-reset/verify", { email, code: f.code.trim(), newPassword: f.password });
        go("login", { ok: true, text: "Password berhasil diganti. Silakan masuk dengan password baru." });
      }
    });
    if (!err) return;
    if (mode === "login" && err.raw?.message === "User is not yet verified.") {
      return go("verify", { ok: false, text: "Email Anda belum diverifikasi. Masukkan kode dari email, atau kirim ulang kode." });
    }
    setMsg({ ok: false, info: isPending(err), text: errorText(err) });
  }

  async function resend() {
    if (!email) return setMsg({ ok: false, text: "Isi email dulu." });
    const err = await run(async () => {
      await post(mode === "verify" ? "/auth/otp/email" : "/auth/otp/password-reset", { email });
      setMsg({ ok: true, text: `Kode baru terkirim ke ${email}.` });
    });
    if (err) setMsg({ ok: false, text: errorText(err) });
  }

  if (mode === "sso") {
    return (
      <GateShell>
        <div className="gate-form" role="status">
          <Brand />
          <p className="gate-busy"><Spinner />Memproses masuk dengan Akun ITB…</p>
        </div>
      </GateShell>
    );
  }

  const [title, sub] = COPY[mode];
  const isEntry = mode === "login" || mode === "signup";
  const button = { login: "Masuk", signup: "Daftar", verify: "Verifikasi", forgot: "Kirim kode", reset: "Simpan password baru" }[mode];

  return (
    <GateShell>
      <form className="gate-form" onSubmit={submit}>
        <Brand />
        {isEntry && (
          <div className="seg wide" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "on" : ""} onClick={() => go("login")}>Masuk</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => go("signup")}>Daftar</button>
          </div>
        )}
        <div>
          <h2 className="gate-title">{title}</h2>
          <p className="gate-sub">{sub}</p>
        </div>

        {mode === "signup" && (
          <label className="field"><span className="field-lab">Nama lengkap</span>
            <input type="text" autoComplete="name" placeholder="mis. Budi Santoso" required {...field("name")} />
          </label>
        )}

        <label className="field"><span className="field-lab">Email</span>
          <input type="email" autoComplete="email" placeholder="nama@itb.ac.id" required readOnly={mode === "verify" || mode === "reset"} {...field("email")} />
        </label>

        {(mode === "verify" || mode === "reset") && (
          <label className="field"><span className="field-lab">Kode verifikasi</span>
            <input className="otp" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} required {...field("code")} />
          </label>
        )}

        {(mode === "login" || mode === "signup" || mode === "reset") && (
          <div className="field">
            {/* Lupa password menempel di kolom password (masuk dengan email), terpisah dari tombol Akun ITB */}
            <div className="field-head">
              <label className="field-lab" htmlFor="gate-password">{mode === "reset" ? "Password baru" : "Password"}</label>
              {mode === "login" && <button type="button" className="link-btn" onClick={() => go("forgot")}>Lupa password?</button>}
            </div>
            <PasswordInput id="gate-password" value={f.password} onChange={field("password").onChange}
              autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "reset" ? "password baru" : "password"} />
          </div>
        )}

        <Msg msg={msg} />

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy && <Spinner />}{button}
        </button>

        {isEntry && (
          <>
            <div className="gate-or"><span>atau</span></div>
            <a className="btn btn-block" href={`${API_URL}/auth/microsoft`} onClick={() => rememberSsoReturn(nextPath(location.search) || "/")}>
              <ItbLogo />{mode === "signup" ? "Daftar" : "Masuk"} dengan Akun ITB
            </a>
          </>
        )}

        {!isEntry && (
          <div className="gate-links">
            {(mode === "verify" || mode === "reset") && <button type="button" className="link-btn" disabled={busy} onClick={resend}>Kirim ulang kode</button>}
            <button type="button" className="link-btn" onClick={() => go("login")}><Icon name="left" size={15} />Kembali ke Masuk</button>
          </div>
        )}
      </form>
    </GateShell>
  );
}
