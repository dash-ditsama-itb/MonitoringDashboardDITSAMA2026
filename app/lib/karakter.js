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
export const KARAKTER_API_URL = "https://script.google.com/macros/s/AKfycbzeSV0Vv8NWKI_lLZOAScRzhl10aMzPOlGQHCctOu1XrgGhY0qR965drfbI1OjDiFSLWQ/exec";
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
// Mapping Banner cadangan = isi file Tim Humas "Master Data Lokasi Kampanye" per 25 Okt 2026 (tab Ganesha 2026,
// JTN 2026, JTN 2025), dipakai selama KARAKTER_API_URL kosong / tidak bisa dihubungi. Format ringkas per area:
// [tahun, kampus, area, [[lokasi, status per tema BANNER_THEMES (S = sudah, B = belum, - = tidak direncanakan), catatan?]]]
export const MAPPING_FALLBACK = {
  asOf: "2026-10-25",
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
    ["2025", "DEMK-Jatinangor", "GEDUNG A (KULIAH)", [["Gedung A Lantai 1", "---SBBB"], ["Gedung A Lantai 2", "---BSBB"]]],
    ["2025", "DEMK-Jatinangor", "GEDUNG D (KULIAH)", [["Gedung D Lantai 1", "---SBBB"], ["Gedung D Lantai 2", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "GEDUNG E (KULIAH)", [["Gedung E Lantai 1", "---BSBB"], ["Gedung E Lantai 2", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "GEDUNG C (LFD + Studio NVD DKV)", [["Gedung C Lantai 1 LFD", "---SBBB"]]],
    ["2025", "DEMK-Jatinangor", "GEDUNG UTAMA", [["Lantai 1", "---BBBB"], ["Lantai 3 Ruang Perkuliahan + Auditorium", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "GKU 1 (KULIAH)", [["Selasar GKU 1 Lantai 1", "---SSBB"], ["TGCL (GKU 1 Lantai 2)", "---BBBB"], ["Selasar GKU 1 Lantai 2", "---BBBB"], ["GKU 1 Lantai 3", "---BBBB"], ["GKU 1 Lantai 4", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "GKU 2 (KULIAH)", [["Kantin GKU 2 Lantai 1", "---BBBB"], ["GKU 2 Lantai 2", "---BBBB"], ["GKU 2 Lantai 3 (Auditorium)", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "GKU 3 (KULIAH)", [["Longue GKU 3 Lantai 1", "---BBBB"], ["Longue GKU 3 Lantai 2", "---BBBB"], ["Longue GKU 3 Lantai 3", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "Gedung Serba Guna (GSG) FSRD", [["Area Selasar GSG FSRD + Lapangan Multifungsi", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "Asrama ITB Jatinangor", [["Kantin Asrama TB1 + Co- Working Space Luar", "---BBBB"], ["Kantin Asrama TB2 + Co- Working Space Luar-Dalam", "---BBBB"], ["Kantin Asrama TB3 + Co- Working Space Luar-Dalam", "---BBBB"], ["Co- Working Space Luar TB4", "---BBBB"], ["Co- Working Space Dalam TB5", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "Mushola Al-Wasath", [["Lorong Al-Wasath depan Kantin dan Sekre MIJ", "---SBBB"]]],
    ["2025", "DEMK-Jatinangor", "KOICA", [["Co-Working Space KOICA depan Perpustakaan Digital", "---BBBB"], ["Kantin KOICA", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "Labtek IA (SITH dan LFD dan LKD)", [["Area LFD", "---BBBB"], ["Area LKD", "---BBBB"], ["Co-Working Space SITH", "---BBBB"], ["Lantai Lab Gamtek", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "Labtek IB (FTSL)", [["Co-Working Space FTSL (IL & SA)", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "Labtek IIA dan IIB (FTI-J: TB & PG)", [["Area Selasar Bersama FTI Lantai I", "---BBBB"]]],
    ["2025", "DEMK-Jatinangor", "Gedung B (SBM) (Kurang Ramai)", [["Gedung B Lantai 1", "---BBBB"]]],
  ],
};
// diubah ke bentuk baris yang sama dengan JSON Apps Script (?data=mapping)
export const mappingFallbackItems = () => MAPPING_FALLBACK.areas.flatMap(([year, campus, area, rooms]) =>
  rooms.flatMap(([location, st, note = ""]) => [...st].flatMap((s, i) =>
    s === "-" ? [] : [{ year, campus, area, location, theme: BANNER_THEMES[i], done: s === "S", note }])));

// 3. Diskusi Interaktif (tanpa tahun): menunggu tab Diskusi di spreadsheet
export const DISCUSSIONS = [];

// Dokumentasi Kegiatan: folder DOKUMENTASI di Google Drive, satu folder per kegiatan (id = folder yang dibagikan tim).
// program = filter di halaman (ttb / kampanye / diskusi); dur = durasi video (detik) untuk slideshow Sorotan kegiatan.
export const DOCUMENTATION_FOLDER = "1UtSQossL1YNyFP_Y-NCOwz2injO3yhJh";
export const DOCUMENTATION = [
  {
    id: "15pOPyUndgDcRACPAzzUa87owfe8lLh_X", title: "Pelatihan Pementor TTB TPB ITB bersama Paragon", date: "2026-09-21", program: "ttb",
    videos: [],
    photos: [
      "10GtxcC30-UTbTqB4e1tjfwQA1Nx4pXa9", "166rMQ30uL0zuaD74Yg1lOgBTSYpa4BTT", "1An4PvLlusXD1K9qqcy4InJzUXpZXlRtq",
      "1e3KG5N2co0Q3mq3hFi0HZhVak3vK_HLQ", "16hepvvTMK2AaiCJCewhP-WL_o4xFdUG4", "1KM1RFtTbXrEvz5QqCLy_ydZLa8wsGPDN",
      "1FPscaITFhhjzxGSCOgR20SaT3vU_Ju7E", "1jijUao7PDpgjWEBJi3deClm7CM4W7VSi", "1Uvg-IizeJRoaD0lAXvw5287-PypTV9Vy",
      "179-JATLomDJOkF-5ZLskzeBL-ZcYn0We", "10BNFoG-ka1EKwrZDb3Xixbbg1eKfhByZ", "1UZdcPKrL_gGkEEMzG8yAshtB_Z-IVjbC",
      "1ouNG_TD6wwH2-lByNu2bvy7v_TE1Mwyo", "1vTC4xJvhtjpND41Pdiyyc8_OLDT2328q", "1o3qD-anjNPGDuST-dZ3z-EizMtoJOjt7",
      "1Hh9vQvqp2KjHCQFHQ-ztfJz3LhRfHgQ5", "1VxVeabu07HkAFT0qe7DLonqyvqZVt9H8", "1CyqVdcU3uc1gyqMOaKUYnX1ydQXXnxvO",
      "1kITIy5vvjl-U3ZM85vqo0gZDCvziwUhH", "1vlHy2LTY_f-110FWbp9Y1uoypF0ajg2i", "1yhyhIXxFo-f5h84iui89gFUFzdzpX_yR",
      "1Si-aea3SvxhxAKD8Jkc-Wois-LRfKjS3", "18jVBIYauii7AIKqaIqW2LvQRRQmEZ2-J", "1WkvYKz77N1alDWZl9S8UDTzoj4gBXOv3",
      "1Vcq30j5Y0RFLOkFW3CQZ0NBIn9s4usm7", "1TfPz1Q-7-TtLJZupvfvFVfFmCa4CNWFW", "1bXZu7KI-P5wYIn41ETb7_QqdUa0UfAZK",
      "1kumKnoNHYpGckqbxSwf1_O58lwX4wKxk", "11ozhfbi3kglY5A7eQLMFq3xmMi8nzC28", "1lWWNrhvp8y8B960MVqLJSifWALObhPZM",
      "1m1yB4NRLKcJPOtQyHjOFr02Br3kXYAS-", "1L39XpQJVLgQ5GBzno_DsW792Gjay24Wv", "1S-3U5uVHA5PniZVJtg6YtIXzIDXaKSwV",
    ],
  },
  {
    id: "18Idm4KCu7meDUZBHy-uJozfh865JlNZ2", title: "Pembagian Buku Tumbuh di ITB", date: "2025-09-10", program: "kampanye",
    videos: [{ id: "1gq9TKGbHK0Gky5tQwOJICr7x0NPfVDJN", dur: 5 }],
    photos: [
      "1tLKZ5siP6KsFUv_hGtbn2UC6DUPRlbqK", "1RoqZf7DvddY1KjsvU3F_dK7Rd_xdy9xN", "1rfzoAAORIf-rJ0YFtRcpXtvvJ4ZeDK6W",
      "1nCjlGCT204VcJrkXLlqd9h7SpYyFtVlN", "1COJn9aWJ9h3Poea8X2dNRRdv1zv0sB7v", "1qTFPxlouDwUl2ibgJpq7sKxYy_Dqjque",
      "1ZqBgQM5lfT2c-lsFrTfkPWGbo2Y7sdUY", "1ERvY2S7yDt-CJlzJC4-j1yRJcmDPwVo-", "1a2Asrz8vUXHa9imL54g7zJ7nPqoltVtk",
      "1JyZ7it6h4hxz9rIGcwA1tUfPFA0GsHGa", "1as2QRgYaV-k7w82ogODHMc6QLRZaowTW", "1ZPhwjXAy8HFnkrMvPrm6b_VvU6BOvNOq",
      "1XrqgTDTGKhLy9TKq3DQeuXzTI6fKA91s", "1YzeA8KZMeUiF5jI6hqtKFjUKCOE5Thci", "1l-CNJ9Jwy1mKPTziMk-_47a1FNs1byb0",
      "1o-nYu5dLwjsUVZck_UvjT9G2ZRrS6N67",
    ],
  },
  {
    id: "1bDIEFnvVlVZQ3ZT6DTEXEJ_PnaLY54bA", title: "Pembekalan Mentoring", date: "2025-08-22", program: "ttb",
    videos: [{ id: "1qZbBjmqCKzD5lnTE0xKigr6o6xAg0qM8", dur: 19 }, { id: "1YhMDKC6sYetxRq50BZMnh5MdrZJTeRbd", dur: 4 }, { id: "1poSCq934HsPKxHnEeiHfk48ZbKMUaHv2", dur: 11 }, { id: "1mj3pzER6tfDELlKDKi4siD4UY839QpmY", dur: 32 }, { id: "1JFOQg8YziuRHfXFOKTaXGAQMsfTLoVgI", dur: 30 }, { id: "1sq9W_MPc-j3e9j3gasiI-4CThNh9WBxq", dur: 12 }],
    photos: [
      "1Fvx5H2BoOr_Veh0qBx6Ni7zoXBLvkJlr", "1uKpU9pk5KVztdC8xSG3hWfUjn9IcXlxj", "1uCwzPTGRBFd0oc1z0XpO3rQdS-wRs7FJ",
      "13B_C9iqRgh-S_IUkBbvZonhq86QGJgO5", "1X1vcdOaPzIZr3GPNAucTA2TRV-IBodP9", "1S8hBqx04URQ1uqtkaQMYB6trIV37D4Nm",
      "12YZ2lCtsJ0EY3Ng555F4PJOTeOVstFKC", "1aQJ-onIwHvsKphmpoID1LrsNVCmKdA7O", "1uFLC_oUu2326ZIl6DhPBbBOA2o7TykIx",
      "1qhR2zyNEgzLn8jYknzTl8-4UBRzvx-Kk", "1Zzg7QKfud_tAWzhFbJxouyzfs_AIHyNo", "1vGp-4lMHRGXRW5j5lI2Ln0ReWl2rZtxx",
      "1y17gHmq9rKENQFgrHffNHc0AdHO8V9EW", "1PBExrQ7vYnjeuRsNigIBun_43O4HIs3R", "1x5LkABUHhJBYBi5zLm_w-ru8gji5RFV6",
      "1r2GfexJXw0rhHsydc-fEFll-n9x1jsjr", "1ZO8qgmITbOcsRiut2t3sx3gga_CkrkOb", "1aiVbRfu3Gln6sGZ48f6tIFFN_YAai61V",
      "1jAeUJAhh8zKniBdLjBC0DTYuRpzB71ee", "1jTWWFwZ-AXNDFHK7OZWgZVvbf5sT7uC-", "1jr7EDj5Y1xWpBwOSu9vRJgNScFcSzIjQ",
      "1BKvJYXWYdyZeB8gIREAwQMmC30-orjFH", "1k0NxWur4paCDjZHTg1zie6CuYiBCjbMg", "1xEBhq82xUTxBginGrNPEaiLVohAQ3G9K",
      "1QfKeFfhZFfkVGvobwK_uCOhLU8267yL2", "1sygqW-g_The8Mr9Zm27TS7mysCi1Kcc6", "1_2l-6UlLDALCyyAG4ugaQAz4sYEaN7AW",
      "1iBxoJ9gEib-Z3m0xPyyFtIi2dd_8MO6T", "1RK5Mjznn-GzQTOPTtoruM0lkH51-ANL2", "1bI66h8r0Z58uO78X4oxYoTqQhnWro8QR",
      "1sM9c8J5eIlU-vw_G_9oKQSDPSKRIOyCm", "1CPbiXVQBtqo6JlkjzPwsfIyhcXwOwo8i", "1XV7YILXwbGlpTo2zz8agS-AAQRbuU-B5",
      "1NGjAoEVTad14YZKEcFd_un_1VxhU75S1", "11jcQqoV-p2_V6gf0oN0m2b0ZxTETv3vj", "1sqK7DSZMq16CfA5pRcAVou0DoUA4JLyF",
      "1kAFxcOCwZBsLjJcF31pB-Aan1jri12Qo", "161n8TbqTNMFkbgbOsUZ0Dxl-ArEI1Jpn", "1Gg5zrh4GkDWoIyMgjwLZ4ARXTIrKqk4Y",
      "1QC4lFuQNbpZb9d_EAraAVLVG7gCknTqL", "1ME0s1Vl0OOnIfssLMZuAQ-tuMJWioEBq", "1snmtcvidK-dHNtItCV49G3NeCUZ8gagD",
      "1wky9oe2uZb2JjGrPGnPYqJHhMyxpCtfE", "1WzV8-wGzWW3fJGG0-r0RDu0NOuQtvRlw", "1PhWbUUeaHqvxU6sj53SM-cpogaat61Ba",
      "1zBpvoprH4SSSrjxJH7r0CJzVeCfrnWGy", "1eieodXSptVt79umI1OJEPrwbzwxS-AgF", "15XRUbrlGKmKaysB9mrk8aSoAvqdE7Odd",
      "1nKXNxSFK502SSAtZTQDhWgKQqbx05T71", "1XYfmnYB3NIwnyQjffwIcVjB5_bcZfkxv", "1OvhgfLcMwddeIj3_9tTmO1HdR99l8qaR",
      "1isvWqnNbLvKrQVrRUMuXwUVMEx425wuA", "1YbVTdezazhUqiZt-rj5GOT4ywDt3y2Eg", "1zHnaX8tBXRqJLHvBXtldpMA0L0B96zSk",
      "1UzLt68ek-3iKcfqvMu8CYyWPGgHiX-uA", "1TvVP9J2aA87dS4p2wNYKTMLy67gBRk43", "1PGVjAV48m3_3AVVwc2fPdnsvjIWHh9Se",
      "1dtDE3VQslESYjoEcaoyMAxw1oxCf1a0G", "1yiS_XUkeV9lRiQn9PXpx4xn7CqxlC0OP", "1ndToDFYBcKkP3HFHXw814tgBWBEMj7c3",
      "1rmmH3Z4OwjSrlt4r0uMmvR-07GmT2Ys_", "1Fa84R7QhDMBeuA-k9Ik1B5Loiz587Lme", "1FpqYYSdSv1nD7Pc4GMjAYU5ObMuhG6Ho",
      "1KA_bgTO8O4bBi4m4hRFYZ7JDZ3H_XqaI", "17_B0KkCSIEu3Dr26YurIaagAUTXBm2G7", "1EI0ONoUH7tngvoI6AP5fEnrcLiQ03jRW",
      "1QRZ_-QRaOi9NOXkN3BninJ0kmZ8TaUD6", "1yedyUcI4L5NcJQGApkXc9-pZUTlSfqFN", "1J9c3DUiF_1RY1vvM1q_V_5z0bP9AyODu",
      "1hs_fFagt83AsijsKqJ0otDraCfa_hXqV", "1Udo_gqehqM9aDzsrgcaK6B5rVi_0yaX7", "1ehXlG4N_aWQZiyhiHpKyzAnbmC3y2sj4",
      "1aDUq33vxifX00mIFTwj3bc4vOxc1mddo", "1loC2np1i3ng_qHlMMTRKs_V_zwCR7L2i", "1Ni5s1WjL8qNI8uDaW-qZuFE-6a5xPyXV",
      "1857hike1lNXG-ThVgY8cWQERZX4GP5ho", "1XDYuKAzMMWFcxjnwjpFTfBX_yK70zNBg", "1KLlkyUZzBdOJ5FTouVY_8YxT_0cUbkAm",
      "1adGbBFl-HMK6KtNrTHCXMSeEu56C5APN", "1414kfu7IBDGPQAuC6z_Og_1q_t5gmH6X", "1ijd5LbpTPD_7y8ZyAhjV91iUBhq-RhDx",
      "1nbuCaIpZlbetalchimy_RforLiwwL7rV", "1WsqtPQRsMVRZCqv7XGyXxFIJMJmIknzC", "11UziKYsC5E2LUTtHfBpWMBdObGYhZdVx",
    ],
  },
];
