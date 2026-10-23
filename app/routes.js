import { index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  // beranda: pilih dashboard Pra-Universitas atau Pendidikan Persiapan
  index("./routes/home.jsx"),

  ...prefix("dashboard", [
    layout("./routes/dashboard/layout.jsx", [
      index("./routes/dashboard/portfolio.jsx"),
      route("financial", "./routes/dashboard/financial.jsx"),
      route("peserta", "./routes/dashboard/peserta.jsx"),
      route("dosen", "./routes/dashboard/dosen.jsx"),
      route("input", "./routes/dashboard/input.jsx"),
      route("sdm", "./routes/dashboard/sdm.jsx"),
      route("pengaturan-akun", "./routes/dashboard/accounts.jsx"),
      route("program/:programKey", "./routes/dashboard/program.jsx"),
      // dashboard SUGT = dashboard program SUGT + kelas luring & daring dari aplikasi SUGT
      route("sugt", "./routes/dashboard/program.jsx", { id: "sugt-dashboard" }),
    ]),
  ]),

  ...prefix("pendidikan-persiapan", [
    layout("./routes/persiapan/layout.jsx", [
      index("./routes/persiapan/index.jsx"),
      route("laporan/:reportId", "./routes/persiapan/report.jsx"),
      route("kelola", "./routes/persiapan/manage.jsx"),
      // Pembinaan Karakter TPB: beranda + ttb / kampanye / mapping / diskusi / dokumentasi
      route("karakter/:section?", "./routes/persiapan/karakter.jsx"),
    ]),
  ]),

  // URL lama situs statis -> URL baru
  route("index.html", "./routes/legacy-redirect.jsx", { id: "legacy-index" }),
  route("dashboard.html", "./routes/legacy-redirect.jsx", { id: "legacy-dashboard" }),

  route("*", "./routes/not-found.jsx"),
];
