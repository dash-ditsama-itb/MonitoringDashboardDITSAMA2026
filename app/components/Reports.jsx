// Laporan Power BI dashboard Pendidikan Persiapan (GET /persiapan/reports).
import { useApi } from "../stores/data.js";

export const REPORTS_PATH = "/persiapan/reports";
export const reportPath = (id) => `/pendidikan-persiapan/laporan/${id}`;

/** { reports, error, loading, reload } — urut sesuai susunan di Kelola laporan. */
export function useReports() {
  const { data, error, loading, reload } = useApi(REPORTS_PATH);
  return { reports: data?.data, error, loading, reload };
}

// kelompokkan per bagian sesuai urutan kemunculan pertama: [[bagian, laporan[]], ...]
export function groupBySection(reports) {
  const groups = new Map();
  (reports || []).forEach((r) => groups.set(r.section, [...(groups.get(r.section) || []), r]));
  return [...groups.entries()];
}

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
