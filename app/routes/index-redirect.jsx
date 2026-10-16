import { redirect } from "react-router";

// Tanpa halaman beranda: "/" langsung ke dashboard (yang menampilkan halaman masuk bila belum login).
// Halaman beranda lama tetap disimpan di routes/home.jsx bila dibutuhkan lagi.
export function clientLoader() {
  throw redirect("/dashboard");
}

export default function IndexRedirect() {
  return null;
}
