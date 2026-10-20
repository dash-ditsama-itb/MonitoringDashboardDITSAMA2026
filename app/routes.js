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
      route("program/:programKey", "./routes/dashboard/program.jsx"),
      route("sugt", "./routes/dashboard/sugt.jsx"),
    ]),
  ]),

  ...prefix("pendidikan-persiapan", [
    layout("./routes/persiapan/layout.jsx", [
      index("./routes/persiapan/index.jsx"),
      route("laporan/:reportId", "./routes/persiapan/report.jsx"),
      route("kelola", "./routes/persiapan/manage.jsx"),
    ]),
  ]),

  // URL lama situs statis -> URL baru
  route("index.html", "./routes/legacy-redirect.jsx", { id: "legacy-index" }),
  route("dashboard.html", "./routes/legacy-redirect.jsx", { id: "legacy-dashboard" }),

  route("*", "./routes/not-found.jsx"),
];
