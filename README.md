# Dashboard DITSAMA 2026 — React Router (framework mode)

Website dashboard DITSAMA dengan dua dashboard: **Pra-Universitas** (monitoring program) dan
**Pendidikan Persiapan** (laporan Power BI). Dibangun dengan **React Router v8 (framework mode, SPA)**
dan **Zustand** untuk state bersama. Data diambil dari backend
**monitoring-dashboard-ditsama-be** (Hono + PostgreSQL), dengan login email & password atau Akun ITB.
Akun baru bisa masuk setelah Administrator memberi peran di Pengaturan Akun. Satu login berlaku untuk kedua dashboard.

## Struktur file
```
app/
├── root.jsx                 # dokumen HTML + ErrorBoundary global
├── routes.js                # daftar route
├── config.js                # daftar dashboard, program, jabatan, fase (alamat backend dari .env)
├── routes/
│   ├── home.jsx             # /  — beranda: pilih Pra-Universitas atau Pendidikan Persiapan
│   ├── persiapan/           # /pendidikan-persiapan — laporan Power BI
│   │   ├── layout.jsx       # menu laporan per bagian
│   │   ├── index.jsx        # buka laporan pertama (atau keadaan kosong)
│   │   ├── report.jsx       # /pendidikan-persiapan/laporan/:reportId
│   │   ├── manage.jsx       # /pendidikan-persiapan/kelola — Kelola laporan (Admin & Kasubdit)
│   │   └── karakter.jsx     # /pendidikan-persiapan/karakter[/ttb|kampanye|mapping|diskusi|dokumentasi]
│   └── dashboard/           # /dashboard — Pra-Universitas
│       ├── layout.jsx       # menu & panel Filter Pra-Universitas
│       ├── portfolio.jsx    # /dashboard           — Portofolio Program
│       ├── financial.jsx    # /dashboard/financial — Keuangan
│       ├── peserta.jsx      # /dashboard/peserta
│       ├── dosen.jsx        # /dashboard/dosen
│       ├── input.jsx        # /dashboard/input     — Data Kegiatan
│       ├── program.jsx      # /dashboard/program/:programKey
│       └── sugt.jsx         # /dashboard/sugt      — ringkasan SUGT (dari aplikasi SUGT lewat backend)
├── stores/                  # zustand: auth (sesi), data (cache data backend), ui (filter/tabel)
├── lib/                     # api.js (fetch + pesan error), format.js (label, tanggal, akses)
├── components/              # AppShell (gerbang login, menu, pengalih dashboard, profil), tabel, form, Chart.js, dll.
└── styles/                  # dashboard.css, home.css
public/assets/dpb-logo-transparent.png
```

## Menjalankan di komputer
Butuh Node.js 22.22+ dan backend yang sudah berjalan (lihat README backend).
1. Buat file `.env` di folder ini:
   ```
   VITE_API_URL=http://localhost:3000/api
   ```
2. Pastikan `CORS_ORIGINS` di `.env` backend berisi `http://localhost:5173`.
3. Jalankan:
   ```bash
   npm install
   npm run dev
   ```
Buka `http://localhost:5173/MonitoringDashboardDITSAMA2026/`.

## Fitur data
- **Data Kegiatan**: cari (nama, PIC, lokasi), urutkan, halaman, filter program, tambah/ubah lewat
  panel samping, tandai selesai, hapus satu atau banyak sekaligus, impor & ekspor Excel.
- **Keuangan**: filter program/tahun/bulan/jenis pengajuan, tabel transaksi PKS & pengajuan dengan
  pencarian, urutan, halaman, ubah, hapus massal, impor & ekspor Excel.
- File impor memakai format yang sama dengan file hasil **Ekspor**. Baris yang kolom `ID`-nya sudah ada
  memperbarui data tersebut (alur: Ekspor → ubah di Excel → Impor); baris tanpa ID dicocokkan otomatis
  atau ditambahkan sebagai data baru. Hasil impor menyebut jumlah data baru, diperbarui, tidak berubah,
  dan dilewati.
- Impor Kegiatan membaca tab yang punya kolom `Nama Kegiatan` (mis. `DataMasuk`); baris dengan program
  yang tidak dikenal (mis. SUGT) dilewati.
- Hak akses mengikuti jabatan (sama dengan backend):
  - Admin & Kasubdit: semua menu, boleh mengubah semua data.
  - PIC: semua menu kecuali Keuangan; hanya boleh mengubah kegiatan program miliknya.
  - Finance: hanya Keuangan.
  - Pimpinan: semua menu, hanya melihat (tanpa tambah, ubah, hapus, atau impor; ekspor tetap bisa).
  Menu yang tidak bisa dibuka tetap tampil tetapi nonaktif.
- Impor Keuangan membaca semua tab sheet yang punya kolom `Nilai PKS` atau `Nilai Pengajuan`;
  program diambil dari kolom Program atau nama tab (mis. `SIAP_2026`).

## Pendidikan Persiapan
- Isi dashboard = laporan Power BI ("Publish to web") yang ditempel Admin/Kasubdit di **Kelola laporan**:
  bagian (mis. `Proses TPB`), judul, dan link atau seluruh kode `<iframe>` dari Power BI.
  Hanya link `https://app.powerbi.com` yang diterima. Urutan diatur dengan tombol panah.
- Link laporan disimpan di database backend (bukan di kode), jadi tidak ikut terbaca di file publik GitHub Pages.
- Batasan: link "Publish to web" bersifat publik. Siapa pun yang melihat laporan bisa menyalin
  link-nya (Power BI juga menyediakan tombol bagikan). Untuk data sensitif, gunakan Power BI Embedded.
- Semua jabatan bisa melihat laporan; menu Kelola laporan nonaktif untuk selain Admin & Kasubdit.
- Menu **Pembinaan Karakter TPB** (paling bawah): beranda dengan slideshow video, Teman Tumbuh Bersama TPB ITB,
  Kampanye Etika Mahasiswa + Mapping Banner, Diskusi Interaktif, dan Dokumentasi Kegiatan. Datanya sementara di
  `app/lib/karakter.js` (angka sheet Ringkasan TTB, link video/poster Google Drive, mapping banner Jatinangor);
  nanti diganti data spreadsheet lewat Apps Script. Video slideshow berputar otomatis lewat pemutar Google Drive
  dan berlanjut ke video berikutnya setelah durasinya habis (`dur` di `CAMPAIGN_VIDEOS`; Drive menolak file video
  diputar langsung lewat `<video>` dari situs lain). Thumbnail Drive
  dimuat tanpa Referer (Drive membalas 429 untuk permintaan dari situs lain). Buku panduan tampil sebagai sampul
  yang dibuka menjadi dua halaman (sampul + sinopsis, `public/assets/panduan-tumbuh-*.jpg`).

### Data TTB otomatis dari spreadsheet (Apps Script)
Halaman **Teman Tumbuh (TTB)** membaca tab `Ringkasan` dan `Timeline` spreadsheet TTB lewat
`apps-script/ttb-ringkasan.gs`. Pemasangan (sekali, oleh pemilik spreadsheet):
1. Buka spreadsheet TTB → **Ekstensi → Apps Script** → tombol **+ → Skrip** (file baru, mis. `Dashboard_TTB`),
   tempel isi `apps-script/ttb-ringkasan.gs`, simpan. **Jangan menghapus kode lain** yang sudah ada di proyek itu.
2. (Opsional) pilih fungsi `cobaLihatDataTtb` → **Jalankan** → izinkan akses → cek hasilnya di Log eksekusi.
3. **Terapkan → Deployment baru** → jenis **Aplikasi web**; Jalankan sebagai: **Saya**; Yang memiliki akses: **Siapa saja** → Terapkan.
4. Salin URL yang berakhiran `/exec`, isi ke `TTB_API_URL` di `app/lib/karakter.js`, lalu push.

Setelah itu cukup ubah data di tab Kelompok/Pertemuan/Timeline; dashboard ikut berubah (jeda paling lama ±1 menit
karena cache script). Bila script diubah, gunakan **Kelola deployment → Edit → Versi baru** agar URL tetap sama.
Baris Ringkasan dikenali dari teks labelnya, jadi boleh digeser; indikator bernomor yang kolom TARGET-nya diisi otomatis
tampil di kartu "Indikator vs target". Bila spreadsheet tidak bisa dihubungi, halaman memakai data terakhir yang
tersimpan di browser, lalu angka cadangan `TTB` di `karakter.js`.

## Publikasi di GitHub Pages
Workflow `.github/workflows/deploy.yml` otomatis build & deploy setiap push ke `main`.
1. Repo → **Settings → Pages** → Source: **GitHub Actions**.
2. Repo → **Settings → Secrets and variables → Actions → Variables** → buat `VITE_API_URL`
   berisi alamat backend produksi (termasuk `/api`).
3. Tambahkan alamat GitHub Pages ke `CORS_ORIGINS` di backend.
4. Push ke `main`; website tersedia di `https://<user>.github.io/MonitoringDashboardDITSAMA2026/`.

Jika nama repo berubah, sesuaikan `basename` di `react-router.config.js` **dan** `base`
di `vite.config.js`.

`npm run build` menghasilkan `build/client/` (termasuk `404.html` agar URL seperti
`/dashboard/financial` tetap bisa dibuka langsung di GitHub Pages).

## Catatan keamanan
- Password dan hak akses peran diperiksa di backend pada setiap permintaan; frontend hanya menyembunyikan menu dan tombol.
- Sesi login (token) disimpan di localStorage browser, jadi tetap masuk saat halaman dimuat ulang
  atau dibuka di tab baru, sampai token kedaluwarsa (`ACCESS_TOKEN_EXPIRE_IN_MINUTES` di backend,
  default 7 hari) atau pengguna menekan **Keluar**. Masuk/keluar di satu tab ikut berlaku di tab lain.
- Di komputer bersama, selalu tekan **Keluar** setelah selesai.
