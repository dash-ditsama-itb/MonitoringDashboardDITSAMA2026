// Komunikasi dengan backend monitoring-dashboard-ditsama-be (REST + JWT).
import { API_URL } from "../config.js";
import { useAuthStore } from "../stores/auth.js";

export class ApiError extends Error {
  constructor(message, status, raw) {
    super(message);
    this.status = status;
    this.raw = raw;
  }
}

// Pesan untuk pengguna (bukan developer): pesan backend (Inggris) -> Bahasa Indonesia.
// Rincian teknis (status, isi balasan) hanya ditulis ke console.error.
const SUGT_DOWN = "Data SUGT belum bisa dimuat saat ini. Coba lagi sebentar lagi.";
const MESSAGES = {
  "Invalid email or password.": "Email atau password salah.",
  "User is not yet verified.": "Email belum diverifikasi. Masukkan kode yang dikirim ke email Anda.",
  "User not verified.": "Email belum diverifikasi.",
  "User with the provided email already exists.": "Email ini sudah terdaftar. Silakan masuk.",
  "User not found.": "Email tidak terdaftar.",
  "User already verified.": "Email sudah terverifikasi. Silakan masuk.",
  "OTP not found. Please request again.": "Kode tidak ditemukan. Minta kode baru.",
  "Code has expired. Please request again.": "Kode sudah kedaluwarsa. Minta kode baru.",
  "Invalid code passed. Check your inbox.": "Kode salah. Periksa lagi email Anda.",
  "New password cannot be the same with the old password.": "Password baru tidak boleh sama dengan password lama.",
  "Please restart the process.": "Sesi masuk dengan Akun ITB berakhir. Silakan ulangi masuk dengan Akun ITB.",
  "Invalid access password.": "Password Akses salah.",
  "Access password verification required.": "Masukkan Password Akses untuk melanjutkan.",
  "Forbidden.": "Anda tidak punya akses untuk tindakan ini.",
  "Activity not found.": "Kegiatan tidak ditemukan (mungkin sudah dihapus).",
  "Financial not found.": "Data keuangan tidak ditemukan (mungkin sudah dihapus).",
  "Initial PKS for this program already exists.": "PKS Awal untuk program ini sudah ada. Gunakan Penambahan PKS.",
  "Submission fields cannot be applied to a PKS record.": "Kolom pengajuan tidak bisa dipakai untuk data PKS.",
  "PKS fields cannot be applied to a submission record.": "Kolom PKS tidak bisa dipakai untuk data pengajuan.",
  "Failed to upload SK.": "Gagal mengunggah SK. Coba lagi.",
  "Invalid Excel file format.": "Format file tidak dikenali. Gunakan .xlsx atau .csv.",
  "Excel workbook contains no sheets.": "File tidak berisi sheet apa pun.",
  "Uploaded sheet contains no data.": "Tidak ada data yang bisa diimpor dari file ini. Pastikan kolomnya sama dengan file hasil Ekspor.",
  "A file field containing the spreadsheet is required.": "Pilih file spreadsheet dulu.",
  "Report not found.": "Laporan tidak ditemukan (mungkin sudah dihapus). Muat ulang halaman.",
  "Report order must include every report exactly once.": "Daftar laporan berubah di tempat lain. Muat ulang halaman lalu coba lagi.",
  "Lecturer not found.": "Dosen tidak ditemukan untuk filter ini.",
  "Something went wrong": "Terjadi kesalahan di server. Coba lagi sebentar lagi.",
  "SUGT dashboard is not configured.": SUGT_DOWN,
  "Failed to reach SUGT dashboard.": SUGT_DOWN,
  "SUGT dashboard rejected the credentials.": SUGT_DOWN,
  "Unsupported SUGT summary version.": SUGT_DOWN,
  "Invalid response received from SUGT dashboard.": SUGT_DOWN,
};

// pesan umum bila balasan server tidak dikenali
const GENERIC = "Terjadi kesalahan. Coba lagi sebentar lagi.";
function byStatus(status) {
  if (status === 404) return "Data tidak ditemukan (mungkin sudah dihapus). Muat ulang halaman.";
  if (status === 403) return MESSAGES["Forbidden."];
  if (status === 400 || status === 422) return "Permintaan tidak dapat diproses. Periksa kembali isian Anda.";
  if (status >= 502 && status <= 504) return "Sumber data sedang tidak dapat dihubungi. Coba lagi sebentar lagi.";
  if (status >= 500) return MESSAGES["Something went wrong"];
  return GENERIC;
}

/** Teks error yang aman ditampilkan ke pengguna; error tak terduga dicatat di console. */
export function errorText(e, fallback = GENERIC) {
  if (e instanceof ApiError) return e.message;
  console.error(e);
  return fallback;
}

const FIELD_LABELS = {
  email: "Email", password: "Password", name: "Nama", role: "Jabatan", programs: "Program", code: "Kode",
  newPassword: "Password baru", program: "Program", date: "Tanggal", pksValue: "Nilai PKS",
  submissionValue: "Nilai pengajuan", achievementValue: "Nilai capaian", feedback: "Umpan balik",
  participants: "Peserta", humanResources: "SDM", issues: "Isu", sk: "File SK", pic: "PIC", location: "Lokasi",
  section: "Bagian", title: "Judul laporan", url: "Link Power BI",
};

function readableMessage(body, status, retryAfter) {
  if (status === 429) {
    const min = Math.ceil((Number(retryAfter) || 900) / 60);
    return `Terlalu banyak percobaan. Coba lagi dalam ${min} menit.`;
  }
  const msg = body?.message;
  if (msg && typeof msg === "object" && Array.isArray(msg.errors)) {
    const first = msg.errors[0] || {};
    const field = FIELD_LABELS[first.path?.[0]];
    const custom = {
      "Programs are required for PIC role.": "Pilih minimal satu program untuk PIC.",
      "Only Power BI links (https://app.powerbi.com) are allowed.": "Link harus berupa link Power BI (https://app.powerbi.com/...).",
    }[first.message];
    if (custom) return custom;
    if (first.path?.[0] === "email") return "Format email tidak valid.";
    return field ? `${field} tidak valid. Periksa kembali isiannya.` : "Isian tidak valid. Periksa kembali formulir.";
  }
  if (typeof msg === "string") {
    if (MESSAGES[msg]) return MESSAGES[msg];
    if (msg.startsWith("SUGT dashboard")) return SUGT_DOWN;
    if (/ not found: /.test(msg)) return "Sebagian data tidak ditemukan (mungkin sudah dihapus). Muat ulang halaman.";
  }
  return byStatus(status);
}

function buildUrl(path, query) {
  const url = new URL(API_URL + path, window.location.origin);
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
  });
  return url;
}

async function send(path, { method = "GET", query, body, form, token, signal } = {}) {
  if (!API_URL) {
    console.error("VITE_API_URL belum diatur: isi di .env (lokal) atau Variables repo (GitHub Pages).");
    throw new ApiError("Dashboard belum terhubung ke server. Hubungi admin.", 0);
  }
  const auth = token === undefined ? useAuthStore.getState().session?.token : token;
  const headers = {};
  if (auth) headers.Authorization = "Bearer " + auth;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  try {
    return await fetch(buildUrl(path, query), { method, headers, body: payload, signal });
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    console.error(`[api] ${method} ${path} gagal terhubung:`, e);
    throw new ApiError("Tidak bisa menghubungi server. Periksa koneksi internet Anda.", 0);
  }
}

async function failure(res) {
  let body = null;
  try { body = await res.json(); } catch { /* bukan JSON */ }
  const err = new ApiError(readableMessage(body, res.status, res.headers.get("Retry-After")), res.status, body);
  console.error(`[api] ${res.status} ${res.url}`, body);
  const auth = useAuthStore.getState();
  // token kedaluwarsa / tidak sah -> keluar; Password Akses belum diverifikasi -> minta lagi
  if (res.status === 401 && auth.session) auth.logout("Sesi Anda berakhir. Silakan masuk lagi.");
  if (res.status === 403 && body?.message === "Access password verification required.") auth.lockAccess();
  return err;
}

/** Panggil endpoint JSON. Mengembalikan isi body (`{ status, data, ... }`) atau melempar ApiError. */
export async function api(path, opts) {
  const res = await send(path, opts);
  if (!res.ok) throw await failure(res);
  try { return await res.json(); }
  catch (e) {
    console.error(`[api] balasan ${res.url} bukan JSON:`, e);
    throw new ApiError(GENERIC, res.status);
  }
}

/** Unduh file (ekspor Excel) dengan filter yang sama seperti tabel. */
export async function download(path, query, fallbackName) {
  const res = await send(path, { query });
  if (!res.ok) throw await failure(res);
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const name = /filename="?([^";]+)"?/.exec(cd)?.[1] || fallbackName;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Unggah file (multipart). `field` = nama kolom file yang diminta backend. */
export function upload(path, file, field = "file") {
  const form = new FormData();
  form.append(field, file);
  return api(path, { method: "POST", form });
}
