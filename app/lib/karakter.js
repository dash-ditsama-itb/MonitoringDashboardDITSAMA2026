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
export const TTB = {
  2026: {
    targetMeetings: 14,
    students: 5539,
    mentors: 521,
    lecturers: 54,
    groups: 523,
    realization: 15.2, // pertemuan terlaksana ÷ (kelompok × target)
    reportCompleteness: 71.1, // kelompok yang sudah lapor (lengkap / sebagian) ÷ total kelompok
    studentAttendance: 51.7,
    mentorAttendance: 100,
    groupsDone: 0, // kelompok dengan pertemuan terlaksana ≥ target
  },
};
export const TTB_STAGES = [
  ["Pembinaan pementor", "oleh dosen pembina"],
  ["Pembentukan kelompok", "mentor & mentee"],
  ["Pertemuan mentoring", "target 14 pertemuan"],
  ["Laporan kelompok", "pemantauan"],
  ["Evaluasi akhir", "akhir semester"],
];

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

// Mapping banner per lokasi: urutan tema = urutan karakter "1"/"0" (1 = sudah terpasang)
export const BANNER_THEMES = ["5S", "Etika Sopan Santun", "Etika Bersosmed", "Etika Berpenampilan", "Etika Menghubungi Dosen", "Etika Seksualitas Sehat", "Etika Adab Pergaulan"];
export const MAPPING_JATINANGOR = [
  { building: "GEDUNG A (KULIAH)", rooms: [
    ["Gedung A Lantai 1", "1011110"],
    ["Gedung A Lantai 2", "0001110"],
  ] },
  { building: "GEDUNG D (KULIAH)", rooms: [
    ["Gedung D Lantai 1", "1001010"],
    ["Gedung D Lantai 2", "1011110"],
  ] },
  { building: "GEDUNG E (KULIAH)", rooms: [
    ["Gedung E Lantai 1", "1001110"],
    ["Gedung E Lantai 2", "1011100"],
  ] },
  { building: "GEDUNG C (LFD + Studio NVD DKV)", rooms: [
    ["Gedung C Lantai 1 LFD", "1011110"],
  ] },
  { building: "GEDUNG UTAMA", rooms: [
    ["Lantai 1", "1001010"],
    ["Lantai 3 Ruang Perkuliahan + Auditorium", "1001010"],
  ] },
  { building: "GKU 1 (KULIAH)", rooms: [
    ["Selasar GKU 1 Lantai 1", "1001110"],
    ["TGCL (GKU 1 Lantai 2)", "0000000"],
    ["Selasar GKU 1 Lantai 2", "1001010"],
    ["GKU 1 Lantai 3", "1101010"],
    ["GKU 1 Lantai 4", "1001011"],
  ] },
  { building: "GKU 2 (KULIAH)", rooms: [
    ["Kantin GKU 2 Lantai 1", "0000000"],
    ["GKU 2 Lantai 2", "0111100"],
    ["GKU 2 Lantai 3 (Auditorium)", "1101010"],
  ] },
  { building: "GKU 3 (KULIAH)", rooms: [
    ["Longue GKU 3 Lantai 1", "1011110"],
    ["Longue GKU 3 Lantai 2", "1101110"],
    ["Longue GKU 3 Lantai 3", "1101110"],
  ] },
  { building: "Gedung Serba Guna (GSG) FSRD", rooms: [
    ["Area Selasar GSG FSRD + Lapangan Multifungsi", "1001000"],
  ] },
  { building: "Asrama ITB Jatinangor", rooms: [
    ["Kantin Asrama TB1 + Co- Working Space Luar", "0111000"],
    ["Kantin Asrama TB2 + Co- Working Space Luar-Dalam", "1101010"],
    ["Kantin Asrama TB3 + Co- Working Space Luar-Dalam", "1111010"],
    ["Co- Working Space Luar TB4", "1111010"],
    ["Co- Working Space Dalam TB5", "0000000"],
  ] },
  { building: "Mushola Al-Wasath", rooms: [
    ["Lorong Al-Wasath depan Kantin dan Sekre MIJ", "1001110"],
  ] },
  { building: "KOICA", rooms: [
    ["Co-Working Space KOICA depan Perpustakaan Digital", "1001100"],
    ["Kantin KOICA", "1001010"],
  ] },
  { building: "Labtek IA (SITH dan LFD dan LKD)", rooms: [
    ["Area LFD", "1001110"],
    ["Area LKD", "1011010"],
    ["Co-Working Space SITH", "1101010"],
    ["Lantai Lab Gamtek", "0100000"],
  ] },
  { building: "Labtek IB (FTSL)", rooms: [
    ["Co-Working Space FTSL (IL & SA)", "1001010"],
  ] },
  { building: "Labtek IIA dan IIB (FTI-J: TB & PG)", rooms: [
    ["Area Selasar Bersama FTI Lantai I", "1101000"],
  ] },
  { building: "Gedung B (SBM) (Kurang Ramai)", rooms: [
    ["Gedung B Lantai 1", "1011110"],
    ["Gedung B Lantai 2", "0011110"],
    ["Gedung FTI Atas", "1001110"],
    ["Gedung FTI Bawah", "0001010"],
  ] },
];
export const MAPPING_CAMPUSES = [
  { key: "jatinangor", label: "Kampus Jatinangor", data: MAPPING_JATINANGOR },
  { key: "ganesha", label: "Kampus Ganesha", data: [] },
];

// 3. Diskusi Interaktif (tanpa tahun) & Dokumentasi Kegiatan: menunggu tab Diskusi dan Dokumentasi di spreadsheet
export const DISCUSSIONS = [];
export const DOCUMENTATION = [];
