// Keterangan indikator dashboard (dari "Keterangan KPI Dashboard DITSAMA 2026").
// Ditampilkan lewat tombol (i) di samping tiap indikator.
// title · arti · rumus · skor ([pilihan, nilai][]) · catatan

const STATUS_KEGIATAN = [
  ["Akan Datang", "tanggal kegiatan setelah hari ini"],
  ["Berlangsung", "hari H (tanggal kegiatan = hari ini)"],
  ["Telat update", "tanggal kegiatan sudah lewat tetapi belum ditandai selesai"],
  ["Selesai", "ditandai lewat tombol Tandai selesai (setelah data kegiatan diisi)"],
];

export const KPI = {
  // ---------------------------------------------------- performa kegiatan ---
  achievementValue: {
    title: "Nilai Capaian Peserta",
    arti: "Rata-rata nilai capaian atau hasil belajar peserta pada kegiatan.",
    rumus: "Rata-rata Nilai Capaian dari semua kegiatan yang mengisinya.",
    catatan: "Kegiatan dengan nilai kosong atau 0 tidak dihitung. Jika belum ada yang mengisi, hasilnya 0%.",
  },
  attendancePercentage: {
    title: "Performa Kehadiran Peserta",
    arti: "Seberapa banyak peserta terdaftar yang benar-benar hadir.",
    rumus: "Per kegiatan: total hadir ÷ total terdaftar (semua kategori peserta) × 100%. Lalu dirata-rata antar kegiatan.",
    catatan: "Kegiatan tanpa data peserta tidak dihitung. Setiap kegiatan berbobot sama; kehadiran yang berbobot jumlah peserta ada di % Kehadiran (tertimbang) pada Analisis peserta.",
  },
  activityProgress: {
    title: "Performa Keberjalanan Kegiatan",
    arti: "Apakah kegiatan berjalan sesuai rencana.",
    rumus: "Keberjalanan tiap kegiatan diubah ke skor, lalu dirata-rata.",
    skor: [["Sesuai Rencana", "100%"], ["Ada Kendala", "70%"], ["Tidak Sesuai Rencana", "40%"], ["Tidak Ada Penilaian / kosong", "tidak dihitung"]],
  },
  feedback: {
    title: "Umpan Balik Peserta",
    arti: "Kepuasan atau umpan balik peserta terhadap kegiatan.",
    rumus: "Rata-rata Umpan Balik dari kegiatan yang mengisinya. Pada filter Program = Semua: rata-rata umpan balik tiap program (termasuk SUGT), setiap program berbobot sama, mis. (90 + 85 + 60 + 90) ÷ 4 = 81%.",
    catatan: "Nilai kosong atau 0 tidak dihitung, termasuk program yang belum punya umpan balik.",
  },
  issueAlert: {
    title: "Nilai Isu & Peringatan",
    arti: "Tingkat “aman” kegiatan dari masalah. Makin tinggi makin aman.",
    rumus: "Setiap kegiatan diberi skor dari level isu tertingginya, lalu dirata-rata.",
    skor: [["Tidak ada isu", "100%"], ["Rendah (Low)", "80%"], ["Sedang (Medium)", "60%"], ["Tinggi (High)", "40%"]],
    catatan: "Jika satu kegiatan punya beberapa isu, yang dipakai level tertinggi.",
  },

  // ------------------------------------------------------------ kemajuan ---
  progress: {
    title: "Program Selesai",
    arti: "Jumlah program yang seluruh kegiatannya sudah selesai, dibanding total program DITSAMA.",
    rumus: "Jumlah program Selesai ÷ total program (10, termasuk SUGT) × 100%. Keterangan di bawah bar: kegiatan Selesai ÷ seluruh kegiatan yang dicatat di dashboard ini (tanpa kelas dari aplikasi SUGT).",
    skor: STATUS_KEGIATAN,
    catatan: "Program dihitung Selesai bila punya kegiatan dan semuanya Selesai. SUGT dihitung Selesai bila kegiatannya di dashboard ini dan Kegiatan Terlaksana di aplikasi SUGT semuanya selesai. Ikut filter yang dipilih.",
  },
  programProgress: {
    title: "Kemajuan Program",
    arti: "Jumlah kegiatan program yang sudah selesai dibanding seluruh kegiatannya.",
    rumus: "Kegiatan Selesai / seluruh kegiatan program; persentasenya = Selesai ÷ seluruh kegiatan × 100%.",
    skor: STATUS_KEGIATAN,
    catatan: "Status program: Selesai bila semua kegiatan Selesai; Sedang berlangsung bila ada kegiatan Selesai atau Berlangsung; selain itu Belum dilaksanakan. Angka ini sama di Portofolio Program dan di dashboard program.",
  },
  lastActivity: {
    title: "Kegiatan Terakhir",
    arti: "Kegiatan paling baru yang tanggalnya hari ini atau sebelumnya.",
    rumus: "Diambil dari kegiatan bertanggal paling akhir yang sudah lewat atau sedang berjalan; uraiannya disusun dari data yang diisi (lokasi, fase, kehadiran, nilai, keberjalanan, isu).",
    catatan: "Klik nama kegiatan untuk melihat rincian lengkapnya.",
  },

  // ------------------------------------------ kinerja portofolio program ---
  completedTotal: {
    title: "Selesai / Total",
    arti: "Jumlah kegiatan selesai dibanding total kegiatan per program.",
    rumus: "Hitung kegiatan Selesai ÷ hitung seluruh kegiatan program tersebut.",
    catatan: "Ini progres (kuantitas), bukan Nilai Kinerja.",
  },
  programPercent: {
    title: "Progres",
    arti: "Persentase kegiatan program yang sudah selesai.",
    rumus: "Kegiatan Selesai ÷ seluruh kegiatan program × 100%.",
    skor: STATUS_KEGIATAN,
    catatan: "Program tanpa kegiatan ditampilkan “–”. SUGT: Selesai / Total dan Progres menggabungkan kegiatan di dashboard ini dengan Kegiatan Terlaksana (sesi kelas, pretest, posttest) dari aplikasi SUGT.",
  },
  performanceScore: {
    title: "Nilai Kinerja",
    arti: "Kualitas pelaksanaan program secara keseluruhan.",
    rumus: "Langkah 1, per kegiatan: rata-rata komponen yang terisi (Nilai Capaian, Kehadiran, Umpan Balik, skor Keberjalanan, skor Isu). Langkah 2: rata-rata Nilai Kinerja semua kegiatan program (maks. 100%).",
    catatan: "Skor Isu selalu ada (tanpa isu = 100%), jadi kegiatan yang belum diisi apa pun tetap bernilai 100% dan bisa menaikkan Nilai Kinerja.",
  },
  programPerformance: {
    title: "Performa",
    arti: "Kualitas pelaksanaan program, dirangkum jadi satu angka.",
    rumus: "Rata-rata 5 indikator Performa kegiatan program tersebut: Nilai Capaian Peserta, Performa Kehadiran Peserta, Performa Keberjalanan Kegiatan, Umpan Balik Peserta, dan Nilai Isu & Peringatan.",
    skor: [["Baik (hijau)", "≥ 80%"], ["Perlu perhatian (kuning)", "60% – 79%"], ["Kritis (merah)", "< 60%"]],
    catatan: "Indikator yang belum diisi kegiatan mana pun tidak ikut dirata-rata, mis. (100 + 75 + 90) ÷ 3 = 88%. Program tanpa kegiatan ditampilkan “–”. Angkanya sama dengan rata-rata kartu Performa kegiatan saat program itu difilter. SUGT: rata-rata Performa kegiatan di dashboard ini dan Umpan Balik SUGT dari aplikasi SUGT.",
  },
  status: {
    title: "Status Program",
    arti: "Tahap pelaksanaan program.",
    rumus: "Ditentukan dari status kegiatan program.",
    skor: [["Selesai", "semua kegiatan Selesai"], ["Sedang berlangsung", "ada kegiatan Selesai atau Berlangsung"], ["Belum dilaksanakan", "belum ada kegiatan yang Selesai atau Berlangsung"]],
  },

  // ---------------------------------------------------------------- SUGT ---
  sugtFeedback: {
    title: "Umpan Balik SUGT",
    arti: "Gabungan penilaian peserta dan evaluasi perjalanan dinas SUGT.",
    rumus: "(Rata-rata aspek Umpan Balik Peserta + rata-rata aspek Evaluasi Perjalanan Dinas) ÷ 2, lalu skala 1–10 diubah ke persen (× 10). Mis. (9,05 + 9,06) ÷ 2 = 9,06 → 91%.",
    catatan: "Aspek yang belum dinilai (“—”) tidak ikut dirata-rata. Bila salah satu bagian belum ada penilaian, dipakai bagian yang ada saja.",
  },
  sugtOffline: {
    title: "Sesi Luring",
    arti: "Sesi tatap muka di sekolah yang sudah terlaksana.",
    rumus: "Sesi luring terlaksana ÷ seluruh sesi luring yang direncanakan (2 per sekolah) × 100%.",
  },
  sugtOnline: {
    title: "Sesi Daring",
    arti: "Sesi online yang sudah terlaksana.",
    rumus: "Sesi daring terlaksana ÷ seluruh sesi daring yang direncanakan (6 per sekolah) × 100%.",
  },
  sugtPretest: {
    title: "Pretest",
    arti: "Isian pretest yang sudah lengkap.",
    rumus: "Isian pretest yang sudah dicentang ÷ seluruh isian (4 per sekolah: 2 jalur × 2 jenis peserta) × 100%.",
  },
  sugtPosttest: {
    title: "Posttest",
    arti: "Isian posttest yang sudah lengkap.",
    rumus: "Isian posttest yang sudah dicentang ÷ seluruh isian (4 per sekolah: 2 jalur × 2 jenis peserta) × 100%.",
    catatan: "Tetap 0% sampai posttest mulai dicatat.",
  },
  sugtParticipantFeedback: {
    title: "Umpan Balik Peserta",
    arti: "Penilaian peserta terhadap pelaksanaan SUGT.",
    rumus: "Rata-rata nilai (skala 1–10) tiap aspek dari semua formulir umpan balik peserta, dibulatkan 1 desimal.",
    skor: [["Baik (hijau)", "≥ 8,0"], ["Perlu perhatian (kuning)", "6,0 – 7,9"], ["Kritis (merah)", "< 6,0"]],
    catatan: "“—” berarti belum ada penilaian untuk aspek itu (bukan 0). Hands-on RBL hanya dinilai peserta kelas siswa.",
  },
  sugtPerjadinFeedback: {
    title: "Evaluasi Perjalanan Dinas",
    arti: "Penilaian tim yang berangkat ke sekolah terhadap perjalanan dinasnya.",
    rumus: "Rata-rata nilai (skala 1–10) tiap aspek dari semua evaluasi perjalanan dinas, dibulatkan 1 desimal.",
    skor: [["Baik (hijau)", "≥ 8,0"], ["Perlu perhatian (kuning)", "6,0 – 7,9"], ["Kritis (merah)", "< 6,0"]],
    catatan: "“—” berarti belum ada penilaian (bukan 0). Penginapan dilewati bila perjalanan tanpa hotel; Bantuan Pendamping hanya dinilai narasumber dan pimpinan.",
  },

  // ---------------------------------------------------- analisis peserta ---
  totalActivities: {
    title: "Jumlah Kegiatan",
    arti: "Jumlah kegiatan yang punya data peserta.",
    rumus: "Hitung kegiatan yang mengisi minimal satu angka terdaftar atau hadir.",
    catatan: "Ikut filter Program & Bulan saja.",
  },
  totalRegistered: {
    title: "Total Pendaftaran",
    arti: "Total peserta terdaftar.",
    rumus: "Jumlah peserta terdaftar dari semua kategori di semua kegiatan.",
    catatan: "Ikut filter Program & Bulan saja. Sementara, bila Program dan Bulan = Semua, angka ini memakai total rekap kepesertaan (2.102 terlayani + 6.380 rencana = 8.482); % Kehadiran tetap dihitung dari data kegiatan.",
  },
  totalPresent: {
    title: "Total Kehadiran",
    arti: "Total peserta yang hadir.",
    rumus: "Jumlah peserta hadir dari semua kategori di semua kegiatan.",
    catatan: "Ikut filter Program & Bulan saja.",
  },
  weightedAttendance: {
    title: "% Kehadiran (tertimbang)",
    arti: "Persentase kehadiran yang berbobot jumlah peserta.",
    rumus: "Total Kehadiran ÷ Total Pendaftaran × 100%.",
    catatan: "Berbeda dengan Performa Kehadiran Peserta (rata-rata per kegiatan): di sini kegiatan besar berbobot lebih besar.",
  },

  // ----------------------------------------------------------- lain-lain ---
  issues: {
    title: "Isu & peringatan",
    arti: "Masalah yang dicatat PIC pada kegiatan, diurutkan dari level tertinggi.",
    rumus: "Diambil dari isu yang diisi di form kegiatan dan ikut semua filter.",
    skor: [["Tinggi (High)", "masalah berat"], ["Sedang (Medium)", "masalah sedang"], ["Rendah (Low)", "masalah ringan"]],
  },
  ongoing: {
    title: "Sedang berlangsung",
    arti: "Kegiatan program yang berstatus Berlangsung.",
    rumus: "Tanggal kegiatan hari ini (hari H) dan belum ditandai selesai.",
    catatan: "Kegiatan tanpa tanggal (bukan agenda) juga dihitung Berlangsung. Lewat hari H tanpa ditandai selesai, kegiatan pindah ke Telat update.",
  },
  late: {
    title: "Telat update",
    arti: "Kegiatan yang tanggalnya sudah lewat tetapi datanya belum dilengkapi atau belum ditandai selesai.",
    rumus: "Tanggal kegiatan sebelum hari ini dan belum ditandai selesai. Tetap di daftar ini sampai PIC menekan Tandai selesai.",
    catatan: "Lengkapi data lewat Isi data (kehadiran, nilai capaian, umpan balik, isu), lalu tandai selesai. Badge oranye di menu hanya menghitung yang tanggalnya 1–14 hari lalu; daftar ini tetap memuat semuanya.",
  },
  upcoming: {
    title: "Agenda mendatang",
    arti: "Agenda yang belum dimulai, diurutkan dari tanggal terdekat.",
    rumus: "Semua kegiatan (jenis apa pun) yang tanggalnya setelah hari ini. Pada hari H, kegiatan pindah ke Sedang berlangsung.",
    catatan: "Aturan ini sama di Portofolio Program, dashboard program, dan badge kuning di menu. Agenda yang belum bertanggal (jenis “Agenda mendatang”) tampil di dashboard program dan ikut dihitung di badge kuning."
  },
  timeline: {
    title: "Linimasa Fase Kegiatan",
    arti: "Rentang waktu tiap fase kegiatan.",
    rumus: "Batang dimulai dari tanggal kegiatan paling awal dan berakhir di tanggal kegiatan paling akhir pada fase tersebut.",
    catatan: "Hanya kegiatan yang punya tanggal dan fase yang ikut dihitung.",
  },
  calendar: {
    title: "Kalender Kegiatan",
    arti: "Sebaran kegiatan per tanggal, berwarna sesuai status.",
    rumus: "Status dihitung dari tanggal kegiatan dibanding hari ini.",
    skor: STATUS_KEGIATAN,
  },
};
