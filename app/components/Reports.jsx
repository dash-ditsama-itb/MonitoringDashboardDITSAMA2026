// Laporan Power BI dashboard Pendidikan Persiapan (GET /persiapan/reports).
import { useApi } from "../stores/data.js";

export const REPORTS_PATH = "/persiapan/reports";
export const reportPath = (id) => `/pendidikan-persiapan/laporan/${id}`;

/** { reports, error, loading, reload } — urut sesuai susunan di Kelola laporan. */
export function useReports() {
  const { data, error, loading, reload } = useApi(REPORTS_PATH);
  return { reports: data?.data, error, loading, reload };
}

// ------------------------------------------------ bagian bertingkat ---
// Kolom `section` menyimpan jalur bagian, mis. "Layanan / Akademik TPB". Pengguna tidak mengetik jalur ini:
// Kelola laporan memakai pemilih bagian, jadi pemisah " / " hanya urusan penyimpanan.
export const SECTION_SEP = " / ";
export const splitSection = (section) => String(section || "").split("/").map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean);
export const joinSection = (parts) => parts.join(SECTION_SEP);
export const sectionTrail = (section) => splitSection(section).join(" › ");
const keyOf = (parts) => parts.map((p) => p.toLowerCase()).join("\u0000");
export const sectionKey = (section) => keyOf(splitSection(section));

/**
 * Pohon bagian dari daftar laporan (urutan posisi). Tiap bagian: { name, parts, key, depth, items, parent },
 * items = [{ group }] | [{ report }] berurutan sesuai kemunculan pertama. Nama bagian dicocokkan tanpa beda huruf besar/kecil.
 */
export function buildTree(reports) {
  const root = { name: "", parts: [], key: "", depth: -1, items: [], parent: null, index: new Map() };
  for (const r of reports || []) {
    let node = root;
    splitSection(r.section).forEach((name) => {
      const parts = [...node.parts, name];
      const key = keyOf(parts);
      let child = node.index.get(key);
      if (!child) {
        child = { name, parts, key, depth: parts.length - 1, items: [], parent: node, index: new Map() };
        node.index.set(key, child);
        node.items.push({ group: child });
      }
      node = child;
    });
    node.items.push({ report: r });
  }
  return root;
}

// urutan datar (menelusuri pohon) = urutan posisi yang disimpan backend
export const flattenReports = (node) => node.items.flatMap((it) => (it.report ? [it.report] : flattenReports(it.group)));
// semua bagian, menelusuri pohon (untuk pemilih bagian)
export const allGroups = (node) => node.items.flatMap((it) => (it.group ? [it.group, ...allGroups(it.group)] : []));
export const findGroup = (root, key) => allGroups(root).find((g) => g.key === key) || null;

// sama dengan backend: terima link atau seluruh kode <iframe> dari Power BI, ambil src-nya
export function extractEmbedUrl(value) {
  const text = String(value || "").trim();
  const src = /<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i.exec(text)?.[1];
  return (src ?? text).replace(/&amp;/g, "&").trim();
}

export function isPowerBiUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "app.powerbi.com";
  } catch {
    return false;
  }
}
