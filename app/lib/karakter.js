// Data Pembinaan Karakter TPB (Pendidikan Persiapan).
// Sementara diisi dari data yang dikirim tim program; nanti diganti data spreadsheet lewat Apps Script
// (tab Ringkasan, Kelompok, Pertemuan, Timeline, Video, Poster_Banner, Mapping Banner, Diskusi, Dokumentasi).

export const KARAKTER_BASE = "/pendidikan-persiapan/karakter";
export const KARAKTER_YEARS = ["2025", "2026"];

// Google Drive: thumbnail & pemutar untuk file, tautan untuk folder
export const driveThumb = (id, w = 640) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
// pemutar video Google Drive yang langsung berputar (Drive menolak file video diputar langsung dari situs lain)
export const drivePlayer = (id) => `https://drive.google.com/file/d/${id}/preview?autoplay=1`;
export const driveFile = (id) => `https://drive.google.com/file/d/${id}/view`;
export const driveFolder = (id) => `https://drive.google.com/drive/folders/${id}`;

export const KARAKTER_ABOUT =
  "Pembinaan Karakter TPB adalah rangkaian program Direktorat Persiapan Bersama untuk menumbuhkan karakter, etika, " +
  "dan kesiapan mahasiswa Tahap Persiapan Bersama ITB. Program berjalan melalui pendampingan sebaya oleh pementor " +
  "yang dibina dosen, kampanye etika mahasiswa di kampus Ganesha dan Jatinangor, serta diskusi interaktif.";

// menu program (beranda + menu samping)
export const KARAKTER_PROGRAMS = [
  { key: "ttb", no: "1", icon: "users", tone: "blue", title: "Teman Tumbuh Bersama TPB ITB (TTB)", short: "Teman Tumbuh (TTB)",
    desc: "Pendampingan mentee oleh pementor, dengan pementor dibina oleh dosen pembina, selama sekitar satu semester.",
    chips: ["523 kelompok", "521 pementor", "54 dosen pembina"] },
  { key: "kampanye", no: "2", icon: "star", tone: "orange", title: "Kampanye Etika Mahasiswa", short: "Kampanye Etika",
    desc: "Poster, 9 video karya mahasiswa, Buku Panduan Tumbuh di ITB, dan banner etika di kampus Ganesha dan Jatinangor.",
    chips: ["Poster & banner", "9 video", "Buku panduan", "Mapping banner"] },
  { key: "diskusi", no: "3", icon: "message", tone: "green", title: "Diskusi Interaktif", short: "Diskusi Interaktif",
    desc: "Diskusi bersama mahasiswa TPB tentang etika dan kehidupan kampus, lengkap dengan ringkasan setiap sesi.",
    chips: ["Ringkasan sesi"] },
];

// 1. Teman Tumbuh Bersama — sheet "Ringkasan" (angka dihitung otomatis dari tab Kelompok & Pertemuan)
// URL web app Apps Script di spreadsheet TTB (apps-script/dashboard-karakter.gs): ?data=ttb dan ?data=mapping.
// Selama kosong / tidak bisa dihubungi, halaman memakai data terakhir yang tersimpan di browser, lalu data cadangan
// (TTB dan MAPPING_FALLBACK) di file ini.
export const KARAKTER_API_URL = "";
export const TTB_LIVE_YEAR = "2026";
// angka cadangan = isi sheet Ringkasan & Timeline per 25 Okt 2026 (bentuknya sama dengan JSON Apps Script)
export const TTB = {
  2026: {
    asOf: "2026-10-25",
    targetMeetings: 14, // target pertemuan per kelompok (satu semester)
    targetToDate: 5, // target pertemuan kumulatif s.d. pekan ini (tab Timeline)
    week: 6,
    students: 5539,
    mentors: 521,
    lecturers: 54,
    groups: 523,
    realization: 42.45, // pertemuan terlaksana ÷ target pertemuan s.d. pekan ini
    reportCompleteness: 71.1, // kelompok yang sudah lapor (lengkap / sebagian) ÷ total kelompok
    studentAttendance: 51.7,
    mentorAttendance: 100,
    groupsDone: 27, // kelompok dengan pertemuan terlaksana ≥ target
    meetingsTarget: 2615,
    meetingsHeld: 1110,
    meetingsShort: 1505,
    // indikator yang punya kolom TARGET di Ringkasan
    targets: [
      { key: "realization", label: "Realisasi kegiatan", value: 42.45, target: 100, gap: -57.55, unit: "%" },
      { key: "groupsDone", label: "Kelompok yang menyelesaikan target pertemuan", value: 27, target: 523, gap: -496, unit: "" },
    ],
    timeline: [
      { week: 1, start: "2026-09-14", end: "2026-09-20", activity: "Pembukaan TTB TPB 2026 + Pertemuan Daring", cumTarget: 1 },
      { week: 2, start: "2026-09-21", end: "2026-09-27", activity: "Pertemuan Luring", cumTarget: 2 },
      { week: 3, start: "2026-09-28", end: "2026-10-04", activity: "Pertemuan Luring", cumTarget: 3 },
      { week: 4, start: "2026-10-05", end: "2026-10-11", activity: "Pertemuan Daring", cumTarget: 4 },
      { week: 5, start: "2026-10-12", end: "2026-10-18", activity: "UTS (tidak ada pertemuan)", cumTarget: 4 },
      { week: 6, start: "2026-10-19", end: "2026-10-25", activity: "Dapat dilakukan secara luring/hybrid", cumTarget: 5 },
      { week: 7, start: "2026-10-26", end: "2026-11-01", activity: "Pertemuan Daring", cumTarget: 6 },
      { week: 8, start: "2026-11-02", end: "2026-11-08", activity: "Pertemuan Luring", cumTarget: 7 },
      { week: 9, start: "2026-11-09", end: "2026-11-15", activity: "Pertemuan Luring", cumTarget: 8 },
      { week: 10, start: "2026-11-16", end: "2026-11-22", activity: "Pertemuan Daring", cumTarget: 9 },
      { week: 11, start: "2026-11-23", end: "2026-11-29", activity: "Pertemuan Daring", cumTarget: 10 },
      { week: 12, start: "2026-11-30", end: "2026-12-06", activity: "Pertemuan Daring", cumTarget: 11 },
      { week: 13, start: "2026-12-07", end: "2026-12-13", activity: "Pertemuan Luring", cumTarget: 12 },
      { week: 14, start: "2026-12-14", end: "2026-12-20", activity: "Pertemuan Daring", cumTarget: 13 },
    ],
  },
};

// 2. Kampanye Etika Mahasiswa — video karya mahasiswa (judul dari nama file di Drive)
// dur = durasi video (detik), untuk pindah otomatis ke video berikutnya
export const CAMPAIGN_VIDEOS = [
  { id: "1mAldPuq-S_9I5cQrpp4ytvtBfSjsvrBg", dur: 71, title: "Ketahanan Sosial dan Budaya dalam Perspektif Perta…", by: "Video karya mahasiswa TPB" },
  { id: "1yMPHJfuaDA2i3fsQ6AvcbHkDpnb8lrUo", dur: 89, title: "Kejujuran Akademik", by: "Karya Syakira Adjania Salim" },
  { id: "1fEGpjp5PLFA8o9mPf9Rgon1GeoR3K0ZX", dur: 183, title: "Keaktifan dan Tanggung Jawab", by: "Karya Muhammad Fatih" },
  { id: "12_TqthEf1UoMCoNaj4DMfodf5RHSYIxS", dur: 170, title: "Etika Penggunaan AI dan Teknologi Digital", by: "Karya Na…" },
  { id: "1P0LKRXsixdWVjiilVug3cO1E-k3PhPp_", dur: 70, title: "Etika Organisasi dan Kepemimpinan", by: "Karya Muhammad H…" },
  { id: "1S2-0yLKIVwObQGVEyM6wQiWF_daPS73j", dur: 73, title: "Etika Menjaga Fasilitas Kampus", by: "Karya Muhammad Hilm…" },
  { id: "13QtYPOmnZLxG4mRdnCmKBVWe7ihmpAP8", dur: 88, title: "Etika Komunikasi dan Interaksi", by: "Karya Nathifa Share…" },
  { id: "1J12J9c9xbEmwLTt4w93WgahGycE5htFn", dur: 177, title: "Disiplin", by: "Karya Ghania Syakira Yuhandini, Ayesha Fa…" },
  { id: "11yJpU3SKPrJ82YbYcufKZ2CmTHTJSSMP", dur: 44, title: "Budaya 5S", by: "Karya Made Dea Vio Lantini" },
];
// tahun data kampanye (video, poster, e-book, mapping banner)
export const CAMPAIGN_YEAR = "2026";

// folder Drive per tema, masing-masing berisi poster dan banner-nya; img/banner = halaman depan file POSTER/BANNER di folder itu
export const CAMPAIGN_POSTERS = [
  { id: "1Nx8kHG6Ss6V8YsDbkrbMKcdtgEho6lvB", title: "Sopan Santun", img: "assets/poster/sopan-santun.jpg", banner: "assets/banner/sopan-santun.jpg", theme: "Etika Sopan Santun" },
  { id: "1OIchNvPq64bB8s127kSYHp5zigjdv4AO", title: "Bersosmed", img: "assets/poster/bersosmed.jpg", banner: "assets/banner/bersosmed.jpg", theme: "Etika Bersosmed" },
  { id: "1z8p2qoAG2hKtrNXpbZkU_GXtfargFJ2e", title: "Berpenampilan", img: "assets/poster/berpenampilan.jpg", banner: "assets/banner/berpenampilan.jpg", theme: "Etika Berpenampilan" },
  { id: "1uP_lQWfyIPpiyfZ2FZ69yLvd1_cAFTop", title: "Menghubungi Dosen", img: "assets/poster/menghubungi-dosen.jpg", banner: "assets/banner/menghubungi-dosen.jpg", theme: "Etika Menghubungi Dosen" },
  { id: "1s2bQB1TGVuyg38bcQZcPtPvQUOwgQwAc", title: "Seksualitas", img: "assets/poster/seksualitas.jpg", banner: "assets/banner/seksualitas.jpg", theme: "Etika Seksualitas Sehat" },
  { id: "1mK8totSkPGgK7N_VyjRrW9w_Tg5IGf_Z", title: "5S", img: "assets/poster/5s.jpg", banner: "assets/banner/5s.jpg", theme: "5S" },
];
// buku: sampul depan + sampul belakang (sinopsis), dibuka seperti buku dua halaman
export const CAMPAIGN_BOOK = {
  title: "Buku Panduan Tumbuh di ITB",
  cover: "assets/panduan-tumbuh-cover.jpg",
  back: "assets/panduan-tumbuh-sinopsis.jpg",
  desc: "Panduan untuk tumbuh, bukan sekadar bertahan, selama menjalani Tahap Persiapan Bersama di ITB.",
};

// tema banner Kampanye Etika (urutan kolom di Mapping Banner); Jenis_Materi di sheet dicocokkan tanpa beda huruf besar/kecil
export const BANNER_THEMES = ["5S", "Etika Sopan Santun", "Etika Bersosmed", "Etika Berpenampilan", "Etika Menghubungi Dosen", "Etika Seksualitas Sehat", "Etika Adab Pergaulan"];
// Mapping Banner cadangan = isi tab "Lokasi Kampanye" spreadsheet TTB per 24 Okt 2026, dipakai selama
// KARAKTER_API_URL kosong / tidak bisa dihubungi. Format ringkas per area:
// [tahun, kampus, area, [[lokasi, status per tema BANNER_THEMES (S = sudah, B = belum, - = tidak direncanakan), catatan?]]]
export const MAPPING_FALLBACK = {
  asOf: "2026-10-24",
  areas: [
    ["2026", "ITB Kampus Ganesha", "AREA KUMPUL-KUMPUL (BELAJAR DSB.)", [["Teras FTMD", "BB-SBBS"], ["Ruang Belajar Bersama (Bagian Utara ITB Ganesha)", "BB-BBBB", "belum ada sama sekali"], ["CWS Labtek V FTI", "BB-BBBB"], ["Area Belajar 24 Jam CC Timur", "BB-BBBB"]]],
    ["2026", "ITB Kampus Ganesha", "Area Labtek Biru (Labtek X dan XI)", [["Area Sekre Himpunan", "BB-BBBB"], ["Area Kantin Labtek Biru", "BB-BBBB"], ["Kantin-Kantin", "B--BB--"], ["Kantin Labtek V", "BB-BBBB"], ["Kantin Dalaraos", "BB-BBBB"], ["Kantin Perpustakaan Pusat", "B--BB--"], ["Kantin CC Barat", "BB-BBBB"], ["Kantin CC Timur", "B--BB--"], ["Kantin GKU Barat", "BB-BSBS"], ["Kantin GKU Timiur", "BB-BBBB"]]],
    ["2026", "ITB Kampus Ganesha", "Gedung-Gedung Kuliah", [["Oktagon", "BB-BBBB"], ["TVST", "BB-SBSS"], ["Labtek I", "BB-BBBB", "area samping mesin kopi"], ["Labtek V", "BB-BBBB"], ["Labtek VI", "BB-BBBB"], ["Labtek VII", "B--BB--"], ["Labtek VIII", "BB-BBBB"]]],
    ["2026", "ITB Kampus Ganesha", "Gedung-Gedung Seminar/Acara", [["CRCS", "BB-BBBB", "area menuju KKP dan depan multipurpose hall kosong"]]],
    ["2026", "ITB Kampus Ganesha", "Gedung Lainnya", [["PAU", "BB-BBBB"], ["CAS", "BB-BBBB", "area antara tangga dan lift"], ["CADL", "BB-BBBB"]]],
    ["2026", "DEMK-Jatinangor", "GEDUNG A (KULIAH)", [["Gedung A Lantai 1", "SBSSSSB"], ["Gedung A Lantai 2", "BBBSSSB"]]],
    ["2026", "DEMK-Jatinangor", "GEDUNG D (KULIAH)", [["Gedung D Lantai 1", "SBBSBSB"], ["Gedung D Lantai 2", "SBSSSSB"]]],
    ["2026", "DEMK-Jatinangor", "GEDUNG E (KULIAH)", [["Gedung E Lantai 1", "SBBSSSB"], ["Gedung E Lantai 2", "SBSSSBB"]]],
    ["2026", "DEMK-Jatinangor", "GEDUNG C (LFD + Studio NVD DKV)", [["Gedung C Lantai 1 LFD", "SBSSSSB"]]],
    ["2026", "DEMK-Jatinangor", "GEDUNG UTAMA", [["Lantai 1", "SBBSBSB"], ["Lantai 3 Ruang Perkuliahan + Auditorium", "SBBSBSB"]]],
    ["2026", "DEMK-Jatinangor", "GKU 1 (KULIAH)", [["Selasar GKU 1 Lantai 1", "SBBSSSB"], ["TGCL (GKU 1 Lantai 2)", "BBBBBBB"], ["Selasar GKU 1 Lantai 2", "SBBSBSB"], ["GKU 1 Lantai 3", "SSBSBSB"], ["GKU 1 Lantai 4", "SBBSBSS"]]],
    ["2026", "DEMK-Jatinangor", "GKU 2 (KULIAH)", [["Kantin GKU 2 Lantai 1", "BBBBBBB"], ["GKU 2 Lantai 2", "BSSSSBB"], ["GKU 2 Lantai 3 (Auditorium)", "SSBSBSB"]]],
    ["2026", "DEMK-Jatinangor", "GKU 3 (KULIAH)", [["Longue GKU 3 Lantai 1", "SBSSSSB"], ["Longue GKU 3 Lantai 2", "SSBSSSB"], ["Longue GKU 3 Lantai 3", "SSBSSSB"]]],
    ["2026", "DEMK-Jatinangor", "Gedung Serba Guna (GSG) FSRD", [["Area Selasar GSG FSRD + Lapangan Multifungsi", "SBBSBBB"]]],
    ["2026", "DEMK-Jatinangor", "Asrama ITB Jatinangor", [["Kantin Asrama TB1 + Co- Working Space Luar", "BSSSBBB"], ["Kantin Asrama TB2 + Co- Working Space Luar-Dalam", "SSBSBSB"], ["Kantin Asrama TB3 + Co- Working Space Luar-Dalam", "SSSSBSB"], ["Co- Working Space Luar TB4", "SSSSBSB"], ["Co- Working Space Dalam TB5", "BBBBBBB"]]],
    ["2026", "DEMK-Jatinangor", "Mushola Al-Wasath", [["Lorong Al-Wasath depan Kantin dan Sekre MIJ", "SBBSSSB"]]],
    ["2026", "DEMK-Jatinangor", "KOICA", [["Co-Working Space KOICA depan Perpustakaan Digital", "SBBSSBB"], ["Kantin KOICA", "SBBSBSB"]]],
    ["2026", "DEMK-Jatinangor", "Labtek IA (SITH dan LFD dan LKD)", [["Area LFD::", "SBBSSSB"], ["Area LKD", "SBSSBSB"], ["Co-Working Space SITH", "SSBSBSB"], ["Lantai Lab Gamtek", "BSBBBBB"]]],
    ["2026", "DEMK-Jatinangor", "Labtek IB (FTSL)", [["Co-Working Space FTSL (IL & SA)", "SBBSBSB"]]],
    ["2026", "DEMK-Jatinangor", "Labtek IIA dan IIB (FTI-J: TB & PG)", [["Area Selasar Bersama FTI Lantai I", "SSBSBBB"]]],
    ["2026", "DEMK-Jatinangor", "Gedung B (SBM) (Kurang Ramai)", [["Gedung B Lantai 1", "SBSSSSB"], ["Gedung B Lantai 2", "BBSSSSB"], ["Gedung FTI Atas", "SBBSSSB"], ["Gedung FTI Bawah", "BBBSBSB"]]],
  ],
};
// diubah ke bentuk baris yang sama dengan JSON Apps Script (?data=mapping)
export const mappingFallbackItems = () => MAPPING_FALLBACK.areas.flatMap(([year, campus, area, rooms]) =>
  rooms.flatMap(([location, st, note = ""]) => [...st].flatMap((s, i) =>
    s === "-" ? [] : [{ year, campus, area, location, theme: BANNER_THEMES[i], done: s === "S", note }])));

// 3. Diskusi Interaktif (tanpa tahun) & Dokumentasi Kegiatan: menunggu tab Diskusi dan Dokumentasi di spreadsheet
export const DISCUSSIONS = [];
export const DOCUMENTATION = [];
