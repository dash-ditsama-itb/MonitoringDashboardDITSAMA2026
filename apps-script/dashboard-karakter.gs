/**
 * Data dashboard Pembinaan Karakter TPB (Pendidikan Persiapan) dari spreadsheet TTB, dikirim sebagai JSON:
 *   <URL /exec>?data=ttb      → halaman Teman Tumbuh (TTB): tab "Ringkasan" dan "Timeline"
 *   <URL /exec>?data=mapping  → halaman Mapping Banner: langsung dari file Tim Humas "Master Data Lokasi
 *                               Kampanye", semua tab "Potensial Pemasangan Banner <kampus> <tahun>" (tahun dari
 *                               nama tab). Bila file itu tidak bisa dibuka: tab "Kampanye_Lokasi" / "Lokasi Kampanye".
 *
 * Pasang di spreadsheet TTB: Ekstensi → Apps Script → tambah FILE BARU (tombol + → Skrip, mis. "Dashboard_TTB")
 * lalu tempel file ini; jangan menghapus kode lain yang sudah ada (mis. pembaruan dari file klaster).
 * Terapkan → Deployment baru → jenis "Aplikasi web", Jalankan sebagai "Saya", Yang memiliki akses "Siapa saja".
 * Salin URL /exec-nya ke KARAKTER_API_URL di app/lib/karakter.js (lihat README).
 * Semua nama di file ini berawalan TTB_/ttb/MAP_/map agar tidak bentrok dengan kode lain di proyek yang sama
 * (semua file .gs dalam satu proyek berbagi nama global); hanya doGet yang harus bernama tetap.
 *
 * Baris di Ringkasan dikenali dari teks labelnya (kolom A), bukan dari nomor baris, jadi baris boleh
 * digeser atau ditambah. Indikator bernomor (mis. "8. ...") yang kolom TARGET-nya diisi otomatis ikut
 * tampil di kartu "Indikator vs target".
 */

const TTB_SHEET_SUMMARY = 'Ringkasan';
const TTB_SHEET_TIMELINE = 'Timeline';
const TTB_YEAR = '2026';
const TTB_CACHE_SECONDS = 60; // dashboard membaca ulang sheet paling lama 1 menit setelah data berubah

// label (awal teks kolom A) → nama field di JSON
const TTB_FIELDS = [
  [/^target pertemuan per kelompok/i, 'targetMeetings'],
  [/^target pertemuan hingga pekan ini/i, 'targetToDate'],
  [/^1\.\s*total mahasiswa/i, 'students'],
  [/^2\.\s*pementor/i, 'mentors'],
  [/^3\.\s*realisasi/i, 'realization'],
  [/^4\.\s*kelengkapan laporan/i, 'reportCompleteness'],
  [/^5a\.\s*jumlah dosen/i, 'lecturers'],
  [/^5b\.\s*jumlah kelompok/i, 'groups'],
  [/^6a\.\s*kehadiran mahasiswa/i, 'studentAttendance'],
  [/^6b\.\s*kehadiran pementor/i, 'mentorAttendance'],
  [/^7\.\s*kelompok yang menyelesaikan/i, 'groupsDone'],
  [/^target jumlah pertemuan/i, 'meetingsTarget'],
  [/^pertemuan yang sudah terlaksana/i, 'meetingsHeld'],
  [/^kekurangan/i, 'meetingsShort'],
];

function doGet(e) {
  const key = String((e && e.parameter && e.parameter.data) || 'ttb').toLowerCase();
  const build = { ttb: buildTtb, mapping: buildMapping }[key];
  if (!build) return ttbJson_({ ok: false, error: 'Parameter data tidak dikenal: ' + key + ' (pakai ttb atau mapping)' });
  const cache = CacheService.getScriptCache();
  let body = cache.get(key);
  if (!body) {
    try {
      body = JSON.stringify(build());
      cache.put(key, body, TTB_CACHE_SECONDS);
    } catch (err) {
      body = JSON.stringify({ ok: false, error: String(err && err.message || err) });
    }
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function ttbJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function buildTtb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const sheet = ss.getSheetByName(TTB_SHEET_SUMMARY);
  if (!sheet) throw new Error('Tab "' + TTB_SHEET_SUMMARY + '" tidak ditemukan');
  const range = sheet.getDataRange();
  const values = range.getValues();
  const formats = range.getNumberFormats();

  const out = { ok: true, year: TTB_YEAR, updatedAt: new Date().toISOString(), targets: [] };
  values.forEach((row, r) => {
    const label = String(row[0]).trim();
    if (!label) return;
    const value = ttbNumber_(row[1], formats[r][1]);
    const field = TTB_FIELDS.find(([re]) => re.test(label));
    if (field && value !== null) out[field[1]] = value;
    if (field && field[1] === 'targetToDate') out.weekLabel = String(row[2]).trim(); // mis. "Pekan ke-6"

    // indikator bernomor dengan kolom TARGET terisi → kartu "Indikator vs target"
    const target = ttbNumber_(row[3], formats[r][3]);
    if (/^\d+[a-z]?\.\s/i.test(label) && target !== null && value !== null) {
      const gap = ttbNumber_(row[4], formats[r][4]);
      out.targets.push({
        key: field ? field[1] : label,
        label: label.replace(/^\d+[a-z]?\.\s*/i, '').replace(/\s*\(%\)\s*$/, ''),
        value: value,
        target: target,
        gap: gap !== null ? gap : value - target,
        unit: ttbIsPercent_(formats[r][1]) ? '%' : '',
      });
    }
  });

  const week = String(out.weekLabel || '').match(/\d+/);
  out.week = week ? Number(week[0]) : null;
  out.timeline = ttbTimeline_(ss, tz);
  if (!out.week) out.week = ttbCurrentWeek_(out.timeline, tz);
  return out;
}

function ttbTimeline_(ss, tz) {
  const sheet = ss.getSheetByName(TTB_SHEET_TIMELINE);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const head = rows[0].map((h) => String(h).trim().toLowerCase());
  const col = (re, fallback) => { const i = head.findIndex((h) => re.test(h)); return i < 0 ? fallback : i; };
  const cWeek = col(/^pekan/, 0), cStart = col(/^mulai/, 1), cEnd = col(/^selesai/, 2);
  const cAct = col(/^kegiatan/, 3), cCum = col(/kumulatif/, 4);
  return rows.slice(1)
    .filter((row) => row[cWeek] !== '' && !isNaN(Number(row[cWeek])))
    .map((row) => ({
      week: Number(row[cWeek]),
      start: ttbIsoDate_(row[cStart], tz),
      end: ttbIsoDate_(row[cEnd], tz),
      activity: String(row[cAct]).trim(),
      cumTarget: Number(row[cCum]) || 0,
    }));
}

// pekan berjalan dari tanggal hari ini, bila label "Pekan ke-…" di Ringkasan kosong
function ttbCurrentWeek_(timeline, tz) {
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const now = timeline.find((w) => w.start && w.end && w.start <= today && today <= w.end);
  return now ? now.week : null;
}

// angka dari sel: persen disimpan sebagai pecahan (0,4245) → 42,45
function ttbNumber_(v, format) {
  if (v === '' || v === null) return null;
  let n = typeof v === 'number' ? v : Number(String(v).replace(/%/g, '').replace(/\./g, '').replace(',', '.'));
  if (isNaN(n)) return null;
  if (typeof v === 'number' && ttbIsPercent_(format)) n = n * 100;
  return Math.round(n * 100) / 100;
}

function ttbIsPercent_(format) {
  return /%/.test(String(format || ''));
}

// tanggal bisa berupa Date atau teks "14/09/2026"
function ttbIsoDate_(v, tz) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}

/* ---------- MAPPING BANNER (Kampanye Etika) ---------- */

// File Tim Humas "Master Data Lokasi Kampanye". Link yang disimpan menu "Ganti link sumber kampanye"
// (properti LINK_SUMBER_KAMPANYE di proyek ini) dipakai lebih dulu; ID di bawah sebagai cadangan.
const MAP_SOURCE_ID = '1xbGXXFdCZlj8AeqUN1Dg1xG9wlx2KEdqNC09Zobvqi0';
const MAP_TAB_PATTERN = /pemasangan banner/i; // tab matriks banner; tahun diambil dari nama tab (mis. "... JTN 2025")
// cadangan: tab hasil menu "Perbarui data lokasi kampanye"; nama kedua untuk tab yang sudah diganti namanya
const MAP_SHEETS = ['Kampanye_Lokasi', 'Lokasi Kampanye'];

function buildMapping() {
  let source;
  try {
    source = mapOpenSource_();
  } catch (err) {
    const out = mapFromSummaryTab_();
    out.warning = 'File Tim Humas tidak bisa dibuka (' + (err && err.message || err) + '); memakai tab ' + out.sheet;
    return out;
  }
  const items = [];
  const tabs = [];
  source.getSheets().forEach((sh) => {
    const name = sh.getName();
    const year = (name.match(/(20\d{2})/) || [])[1];
    if (!MAP_TAB_PATTERN.test(name) || !year) return;
    const parsed = mapParseMatrix_(sh.getDataRange().getValues());
    parsed.rows.forEach((r) => items.push({
      year: year, campus: parsed.campus, area: r.area, location: r.location, theme: r.theme, done: r.done, note: r.note,
    }));
    tabs.push(name + ' (' + parsed.rows.length + ')');
  });
  return { ok: true, updatedAt: new Date().toISOString(), sheet: source.getName(), tabs: tabs, items: items };
}

function mapOpenSource_() {
  const link = PropertiesService.getDocumentProperties().getProperty('LINK_SUMBER_KAMPANYE') || MAP_SOURCE_ID;
  const m = String(link).match(/\/d\/([a-zA-Z0-9_-]+)/);
  return SpreadsheetApp.openById(m ? m[1] : String(link).trim());
}

// Satu tab matriks Tim Humas: baris 1 berisi judul (dan kolom CATATAN), baris 2 berisi nama kampus (kolom A)
// dan jenis banner; baris tanpa centang dan tanpa catatan = judul area; kotak centang TRUE/FALSE = sudah/belum.
// Jenis banner yang selnya kosong untuk suatu lokasi = tidak direncanakan (tidak dikirim).
function mapParseMatrix_(values) {
  const out = { campus: '', rows: [] };
  if (values.length < 3) return out;
  const hdr1 = values[0], hdr2 = values[1];
  out.campus = String(hdr2[0]).trim();
  const noteCol = hdr1.findIndex((h) => String(h).trim().toUpperCase() === 'CATATAN');
  const end = noteCol < 0 ? hdr2.length : noteCol;
  const themes = [];
  for (let j = 1; j < end; j++) { const t = String(hdr2[j]).trim(); if (t) themes.push({ col: j, name: t }); }
  let area = '';
  for (let i = 2; i < values.length; i++) {
    const row = values[i];
    const location = String(row[0]).trim();
    const filled = themes.some((t) => row[t.col] !== '' && row[t.col] !== null);
    const note = noteCol < 0 ? '' : String(row[noteCol]).trim();
    if (!location) continue; // baris kosong / centang tanpa nama lokasi
    if (!filled && !note) { area = location; continue; }
    themes.forEach((t) => {
      const done = mapStatus_(row[t.col]);
      if (done !== null) out.rows.push({ area: area, location: location, theme: t.name, done: done, note: note });
    });
  }
  return out;
}

function mapStatus_(v) {
  if (v === true || v === false) return v;
  const t = String(v).trim().toLowerCase();
  if (t === 'true' || t === 'sudah' || t === 'ya') return true;
  if (t === 'false' || t === 'belum' || t === 'tidak') return false;
  return null;
}

// cadangan: tab Kampanye_Lokasi / Lokasi Kampanye di spreadsheet ini
function mapFromSummaryTab_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = MAP_SHEETS.map((n) => ss.getSheetByName(n)).find((sh) => sh && sh.getLastRow() > 1);
  if (!sheet) throw new Error('File Tim Humas tidak bisa dibuka dan tab ' + MAP_SHEETS.join(' / ') + ' tidak ditemukan');
  const rows = sheet.getDataRange().getValues();
  const head = rows[0].map((h) => String(h).trim().toLowerCase());
  const col = (name) => head.indexOf(name.toLowerCase());
  const c = {
    year: col('Tahun'), campus: col('Kampus'), area: col('Area'), location: col('Lokasi'),
    theme: col('Jenis_Materi'), status: col('Status'), note: col('Catatan_Lokasi'),
  };
  if (c.location < 0 || c.theme < 0 || c.status < 0) throw new Error('Kolom Lokasi / Jenis_Materi / Status tidak ditemukan di tab ' + sheet.getName());
  const cell = (row, i) => (i < 0 ? '' : String(row[i]).trim());
  const items = rows.slice(1)
    .filter((row) => cell(row, c.location) && cell(row, c.theme))
    .map((row) => ({
      year: cell(row, c.year),
      campus: cell(row, c.campus),
      area: cell(row, c.area),
      location: cell(row, c.location),
      theme: cell(row, c.theme),
      done: /^sudah$/i.test(cell(row, c.status)),
      note: cell(row, c.note),
    }));
  return { ok: true, updatedAt: new Date().toISOString(), sheet: sheet.getName(), items: items };
}

// Jalankan dari editor Apps Script untuk melihat hasilnya di Log eksekusi.
function cobaLihatDataTtb() {
  Logger.log(JSON.stringify(buildTtb(), null, 2));
}

function cobaLihatDataMapping() {
  const d = buildMapping();
  Logger.log(d.items.length + ' baris dari ' + d.sheet + (d.tabs ? ' — tab: ' + d.tabs.join(', ') : '') +
    (d.warning ? '\nPERINGATAN: ' + d.warning : '') + '\ncontoh: ' + JSON.stringify(d.items.slice(0, 3), null, 2));
}
