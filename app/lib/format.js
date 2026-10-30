// Helper murni (tanpa DOM): label, format angka/tanggal, dan hak akses.
import { FIN_PROGRAMS, GRANTS, ISSUE_LEVELS, PHASES, PROGRAMS, PROGRESS } from "../config.js";

// ---------------------------------------------------------------- angka ---
export const fmtNum = (n) => (n === null || n === undefined || n === "" ? "–" : Number(n).toLocaleString("id-ID"));
// nilai ujian: maksimal 2 angka di belakang koma (80.2962… -> 80,3; 49 -> 49)
export const fmtScore = (n) => (n === null || n === undefined || n === "" ? "–" : Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 }));
export const fmtRupiah =(n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
// ringkas untuk KPI: satuan ditulis lengkap agar tidak tertukar ("M"/"jt") — Rp 1,07 miliar · Rp 365,2 juta
export function fmtRupiahShort(n) {
  const v = Number(n) || 0, a = Math.abs(v);
  const f = (x, d) => x.toLocaleString("id-ID", { maximumFractionDigits: d });
  if (a >= 1e12) return "Rp " + f(v / 1e12, 2) + " triliun";
  if (a >= 1e9) return "Rp " + f(v / 1e9, 2) + " miliar";
  if (a >= 1e6) return "Rp " + f(v / 1e6, 1) + " juta";
  return fmtRupiah(v);
}
// satuan sumbu grafik rupiah dari nilai terbesar: miliar rupiah bila >= 1 miliar, selain itu juta rupiah
export const moneyScale = (max) => (Math.abs(max) >= 1e9 ? { div: 1e9, unit: "miliar rupiah" } : { div: 1e6, unit: "juta rupiah" });
// buang filter bernilai "Semua" (= default backend) agar kunci cache sama dengan permintaan tanpa filter
export const withoutAll = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "Semua"));
export const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// -------------------------------------------------------------- tanggal ---
const toDate = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d; };
export function fmtDate(v, opts) {
  const d = toDate(v);
  return d ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", ...opts }) : "–";
}
export const fmtDateLong = (v) => fmtDate(v, { weekday: "long", month: "long" });
// "28 Sep 2026, 22.55" (waktu lokal pengguna)
export function fmtDateTime(v) {
  const d = toDate(v);
  if (!d) return "–";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) + ", " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
// "baru saja", "3 jam lalu", "kemarin", "5 hari lalu"; lebih dari 2 minggu -> tanggal
export function fmtRelative(v) {
  const d = toDate(v);
  if (!d) return "–";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 0) return fmtDate(d);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return Math.floor(diff / 60) + " menit lalu";
  if (diff < 86400) return Math.floor(diff / 3600) + " jam lalu";
  const days = Math.floor(diff / 86400);
  if (days === 1) return "kemarin";
  if (days < 14) return days + " hari lalu";
  return fmtDate(d);
}
// ISO -> nilai <input type="date"> (tanggal lokal)
export function toDateInput(v) {
  const d = toDate(v);
  if (!d) return "";
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// nilai <input type="date"> -> ISO (tengah malam UTC, sama seperti data hasil impor)
export const fromDateInput = (s) => (s ? s + "T00:00:00.000Z" : null);
export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
// nilai filter Bulan dari backend ("May 2026", dayjs MMM YYYY) -> "Mei 2026"; nilainya tetap dikirim apa adanya
const MMM = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthKeyLabel = (v) => {
  const [m, y] = String(v).split(" ");
  const i = MMM.indexOf(m);
  return i < 0 ? v : MONTHS[i] + " " + y;
};

// ---------------------------------------------------------------- label ---
const lookup = (pairs) => { const m = Object.fromEntries(pairs); return (v) => m[v] ?? v ?? "–"; };
export const phaseLabel = lookup(PHASES);
export const progressLabel = lookup(PROGRESS);
export const levelLabel = lookup(ISSUE_LEVELS);
export const grantLabel = lookup(GRANTS);
export const roleName = (s) => s?.role?.name || "–";
export const statusLabel = lookup([["upcoming", "Akan Datang"], ["ongoing", "Berlangsung"], ["late", "Telat update"], ["done", "Selesai"]]);
export const finTypeLabel = lookup([["initial_pks", "PKS Awal"], ["addition_pks", "Penambahan PKS"], ["submission", "Pengajuan"]]);
export const isPks = (r) => r.type === "initial_pks" || r.type === "addition_pks";

// Urutan tampil program di mana pun: abjad A–Z. Urutan PROGRAMS / FIN_PROGRAMS di config tetap karena menentukan warna program.
export const byLabel = (get = (x) => x) => (a, b) => String(get(a)).localeCompare(String(get(b)), "id", { sensitivity: "base" });
export const sortLabels = (list) => [...(list || [])].sort(byLabel());
export const PROGRAMS_AZ = [...PROGRAMS].sort(byLabel((p) => p.label));
export const finProgramLabel = (api) => FIN_PROGRAMS.find((p) => p.api === api)?.label ?? api;
export const finMitra = (api) => FIN_PROGRAMS.find((p) => p.api === api)?.mitra || "";
// program + mitra, untuk memilih/menandai satu sumber dana (mis. "INSPIRASI SCD · mitra YPK")
export const finSourceLabel = (api) => (finMitra(api) ? `${finProgramLabel(api)} · mitra ${finMitra(api)}` : finProgramLabel(api));
export const FIN_PROGRAMS_AZ = [...FIN_PROGRAMS].sort(byLabel((p) => finSourceLabel(p.api)));
// kelompok program Keuangan (sumber dana berlabel sama digabung). key = api digabung koma, dipakai langsung sebagai filter programs
export const FIN_GROUPS_AZ = [...new Set(FIN_PROGRAMS.map((p) => p.label))].sort(byLabel((l) => l)).map((label) => {
  const apis = FIN_PROGRAMS.filter((p) => p.label === label).map((p) => p.api);
  return { key: apis.join(","), label, apis, mitras: apis.map(finMitra).filter(Boolean) };
});
export const finGroupOf = (api) => FIN_GROUPS_AZ.find((g) => g.apis.includes(api));
// program penerima pengajuan per sumber dana; null = "Bersama" (dipakai semua program mitra itu)
export const finRecipients = (api) => FIN_PROGRAMS.find((p) => p.api === api)?.programs || [];
const listLabel = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(", ") + " & " + xs[xs.length - 1] : xs.join(""));
export const recipientLabel = (fin, prog) => (prog ? programByApi(prog)?.label ?? prog : `Bersama (${listLabel(finRecipients(fin).map((p) => programByApi(p)?.label ?? p))})`);
// "untuk SIAP ITB" / "Bersama (SIAP ITB & INSPIRASI EduQuest)"
export const recipientText = (fin, prog) => (prog ? "untuk " : "") + recipientLabel(fin, prog);

export const programByApi = (api) => PROGRAMS.find((p) => p.api === api);
export const programByKey = (key) => PROGRAMS.find((p) => p.key === key);
export const programLabel = (api) => programByApi(api)?.label ?? api;

// palet warna per program (indeks stabil sesuai urutan PROGRAMS / FIN_PROGRAMS)
export const PROG_COLORS = ["#3a6db0", "#16A34A", "#E08A2E", "#8B5CF6", "#DC2626", "#0EA5E9", "#DB2777", "#65A30D", "#9333EA", "#0D9488", "#B45309"];
export function progColor(api) {
  if (api === "freeport") return PROG_COLORS[10];
  let i = PROGRAMS.findIndex((p) => p.api === api);
  if (i < 0) i = FIN_PROGRAMS.findIndex((p) => p.api === api);
  return PROG_COLORS[(i < 0 ? 0 : i) % PROG_COLORS.length];
}

// selisih hari tanggal kegiatan terhadap hari ini: 0 = hari ini, 1 = besok, -1 = kemarin.
// Tanggal kegiatan disimpan sebagai tengah malam UTC tanggal tersebut; hari ini = tanggal lokal (WIB).
export function daysFromToday(date) {
  const day = (iso) => Date.parse(iso + "T00:00:00Z");
  return Math.round((day(new Date(date).toISOString().slice(0, 10)) - day(toDateInput(new Date()))) / 864e5);
}

// status dari tanggal (sama dengan backend): Akan Datang setelah hari ini · Berlangsung hari H ·
// Telat update setelah hari H sampai ditandai selesai · Selesai hanya lewat tombol Tandai selesai.
// Dihitung ulang dari tanggal agar tetap sesuai aturan ini walau status dari server masih aturan lama.
export function activityStatus(a) {
  if (a.isDone || a.status === "done") return "done";
  if (!a.date) return a.status || (a.mode === "upcoming" ? "upcoming" : "ongoing");
  const d = daysFromToday(a.date);
  return d > 0 ? "upcoming" : d < 0 ? "late" : "ongoing";
}

// badge oranye di menu: kegiatan Telat update sampai 14 hari setelah tanggalnya (H+1 sampai H+14)
export const LATE_BADGE_DAYS = 14;

// isu terberat sebuah kegiatan: "high" | "medium" | "low" | ""
export function topIssueLevel(issues) {
  const rank = { high: 3, medium: 2, low: 1 };
  return (issues || []).reduce((best, i) => (rank[i.level] > (rank[best] || 0) ? i.level : best), "");
}
export function attendance(participants) {
  const reg = (participants || []).reduce((s, p) => s + (p.registered || 0), 0);
  const pres = (participants || []).reduce((s, p) => s + (p.present || 0), 0);
  return { reg, pres, pct: reg > 0 ? Math.round((pres / reg) * 100) : null };
}
// nama file SK dari storage: "1791259620257-SK_Dosen.pdf" -> "SK_Dosen.pdf"
export const skName = (name) => String(name || "").replace(/^\d{10,}-/, "");

// ---------------------------------------------------------------- akses ---
// hak akses dihitung backend dari grant peran (GET /auth/me -> permissions); di sini hanya dibaca
const perms = (s) => s?.permissions || {};
export const canSeeActivities = (s) => !!s?.permissions;
export const canSeeFinance = (s) => !!perms(s).readFinance;
export const canEditFinance = (s) => !!perms(s).writeFinance;
export const canManageReports = (s) => !!perms(s).manageReports;
export const canManageUsers = (s) => !!perms(s).manageUsers;
// daftar nama SDM & SK dipakai bersama semua program: PIC juga boleh mengubahnya
export const canEditHumanResources = (s) => !!perms(s).writeHumanResources;
// program kegiatan yang boleh diisi/diubah
export const editablePrograms = (s) => PROGRAMS_AZ.filter((p) => (perms(s).writePrograms || []).includes(p.api));
export const canEditActivity = (s, programApi) => editablePrograms(s).some((p) => p.api === programApi);

// ------------------------------------------------------------ nama orang ---
// Sama dengan pemisah nama SDM di backend (impor kegiatan) agar jumlah orang konsisten.
const GELAR_TANPA_TITIK = new Set(["st", "mt", "msm", "msc", "ms", "mm", "mba", "phd", "se", "sh", "mh", "skom", "mkom",
  "spd", "mpd", "ssi", "msi", "sag", "mag", "ssos", "msos", "sp", "spsi", "mpsi", "apt", "sked", "ak", "sip", "mip",
  "sikom", "mikom", "sds", "mds", "sars", "mars", "eng", "dea", "dipl", "bsc", "ba", "ma", "mphil", "med", "meng",
  "amd", "cfa", "cpa", "ca", "stp", "mtp", "ssn", "msn", "shum", "mhum", "sfarm", "mfarm", "drs", "dra", "ir", "dr", "prof"]);
// gelar depan: "Dr.Ir" bukan gelar belakang walau bertitik
const GELAR_DEPAN = new Set(["dr", "drs", "dra", "prof", "ir", "h", "hj", "apt"]);
const rapikanGelar = (t) => t.replace(/\s*\.\s*/g, ".").trim();
function isGelarAkademik(t, setelahGelar) {
  const s = rapikanGelar(t);
  if (!s || /\s/.test(s)) return false;
  if (GELAR_TANPA_TITIK.has(s.replace(/\./g, "").toLowerCase())) return true;
  if (/^[A-Z]{2,4}$/.test(s)) return setelahGelar;              // "MSE" hanya gelar bila menyusul gelar lain
  const seg = s.split(".").filter(Boolean);
  return seg.length > 1 && !GELAR_DEPAN.has(seg[0].toLowerCase()) && seg.every((x) => /^[A-Za-z]{1,3}$/.test(x));
}
// Pisah daftar orang: utamakan baris/;, lalu koma — TAPI gabungkan gelar (S.Si, M.T, Ph.D, dst)
export function splitPeople(text) {
  const out = [];
  let setelahGelar = false;
  String(text || "")
    .replace(/([a-z]{3,})([A-Z][a-z])/g, "$1\n$2")               // nama tempel tanpa pemisah: "BudiSari"
    .split(/[\n;]+/)
    .forEach((line) => {
      let cur = "";
      line.split(",").forEach((part) => {
        const t = part.trim();
        if (!t) return;
        if (isGelarAkademik(t, setelahGelar) && (cur || out.length)) {
          if (cur) cur += ", " + rapikanGelar(t);
          else out[out.length - 1] += ", " + rapikanGelar(t);
          setelahGelar = true;
        } else {
          if (cur) out.push(cur);
          cur = t;
          setelahGelar = false;
        }
      });
      if (cur) out.push(cur);
    });
  return out;
}
export const initials = (name) => String(name || "").replace(/^(prof|dr|drs|dra|ir)\.?\s+/gi, "").split(/[\s,]+/)
  .filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
