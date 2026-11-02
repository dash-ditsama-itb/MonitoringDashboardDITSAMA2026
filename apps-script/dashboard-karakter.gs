/**
 * Data dashboard Pembinaan Karakter TPB (Pendidikan Persiapan) dari spreadsheet TTB, dikirim sebagai JSON:
 *   <URL /exec>?data=ttb      → halaman Teman Tumbuh (TTB): tab "Ringkasan" dan "Timeline"
 *   <URL /exec>?data=mapping  → halaman Mapping Banner: langsung dari file Tim Humas "Master Data Lokasi
 *                               Kampanye", semua tab "Potensial Pemasangan Banner <kampus> <tahun>" (tahun dari
 *                               nama tab). Bila file itu tidak bisa dibuka: tab "Kampanye_Lokasi" / "Lokasi Kampanye".
 *   POST <URL /exec>           → simpan Catatan lokasi Mapping Banner dari dashboard ke file Tim Humas (lihat
 *                               "CATATAN MAPPING BANNER" di bawah; perlu Properti skrip DITSAMA_API_URL).
 *
 * Pasang di spreadsheet TTB: Ekstensi → Apps Script → tambah FILE BARU (tombol + → Skrip, mis. "Dashboard_TTB")
 * lalu tempel file ini; jangan menghapus kode lain yang sudah ada (mis. pembaruan dari file klaster).
 * Terapkan → Deployment baru → jenis "Aplikasi web", Jalankan sebagai "Saya", Yang memiliki akses "Siapa saja".
 * Salin URL /exec-nya ke KARAKTER_API_URL di app/lib/karakter.js (lihat README).
 * Semua nama di file ini berawalan TTB_/ttb/MAP_/map agar tidak bentrok dengan kode lain di proyek yang sama
 * (semua file .gs dalam satu proyek berbagi nama global); hanya doGet dan doPost yang harus bernama tetap.
 * Setelah file ini diubah: Terapkan → Kelola deployment → edit (ikon pensil) → Versi: "Versi baru" → Terapkan,
 * agar URL /exec tetap sama.
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
  let body = ttbCacheGet_(cache, key);
  if (!body) {
    try {
      body = JSON.stringify(build());
      ttbCachePut_(cache, key, body);
    } catch (err) {
      body = JSON.stringify({ ok: false, error: String(err && err.message || err) });
    }
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// CacheService menolak nilai di atas 100 KB, jadi isinya dimampatkan. Cache hanya mempercepat:
// bila gagal baca/tulis, data tetap dibaca langsung dari sheet.
function ttbCacheGet_(cache, key) {
  try {
    const packed = cache.get(key);
    if (!packed) return null;
    return Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(packed), 'application/x-gzip')).getDataAsString('UTF-8');
  } catch (err) {
    return null;
  }
}

function ttbCachePut_(cache, key, body) {
  try {
    cache.put(key, Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(body)).getBytes()), TTB_CACHE_SECONDS);
  } catch (err) {
    Logger.log('Cache ' + key + ' tidak disimpan: ' + (err && err.message || err));
  }
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
// judul kolom (baris 1) di tab matriks; dua kolom terakhir dibuat otomatis di kanan CATATAN saat catatan pertama disimpan
const MAP_NOTE_HEADER = 'CATATAN';
const MAP_TIME_HEADER = 'TERAKHIR DIPERBARUI';
const MAP_BY_HEADER = 'DIPERBARUI OLEH';

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
      noteAt: r.noteAt, noteBy: r.noteBy,
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

// Satu tab matriks Tim Humas: baris 1 berisi judul (dan kolom CATATAN, TERAKHIR DIPERBARUI, DIPERBARUI OLEH),
// baris 2 berisi nama kampus (kolom A) dan jenis banner; baris tanpa centang dan tanpa catatan = judul area;
// kotak centang TRUE/FALSE = sudah/belum. Jenis banner yang selnya kosong untuk suatu lokasi = tidak direncanakan
// (tidak dikirim). row = nomor baris di sheet (untuk menyimpan catatan).
function mapParseMatrix_(values) {
  const out = { campus: '', rows: [] };
  if (values.length < 3) return out;
  const hdr1 = values[0], hdr2 = values[1];
  out.campus = String(hdr2[0]).trim();
  const head = (name) => hdr1.findIndex((h) => String(h).trim().toUpperCase() === name);
  const noteCol = head(MAP_NOTE_HEADER), timeCol = head(MAP_TIME_HEADER), byCol = head(MAP_BY_HEADER);
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
    const at = timeCol < 0 ? '' : row[timeCol];
    const noteAt = Object.prototype.toString.call(at) === '[object Date]' ? at.toISOString() : '';
    const noteBy = byCol < 0 ? '' : String(row[byCol]).trim();
    themes.forEach((t) => {
      const done = mapStatus_(row[t.col]);
      if (done !== null) out.rows.push({ area: area, location: location, theme: t.name, done: done, note: note, noteAt: noteAt, noteBy: noteBy, row: i + 1 });
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

/* ---------- CATATAN MAPPING BANNER (ditulis dari dashboard) ---------- */

// Dashboard mengirim POST (body JSON sebagai teks):
//   { action: 'mapping-notes', token, changes: [{ key, year, campus, area, location, previous, note }] }
// URL /exec terbuka untuk siapa saja, jadi token login dashboard diperiksa ke backend DITSAMA (GET /auth/me):
// hanya akun dengan izin Kelola laporan (manageReports) yang boleh menulis. Alamat backend (termasuk /api, mis.
// https://…/api) disimpan di Setelan proyek → Properti skrip → DITSAMA_API_URL.
// Catatan ditulis ke kolom CATATAN file Tim Humas; waktu dan nama penyimpan ke TERAKHIR DIPERBARUI / DIPERBARUI OLEH.
// previous = catatan yang dilihat pengguna; bila isi sheet sudah berbeda (diubah orang lain), baris itu tidak ditimpa.
const MAP_NOTE_MAX = 500;

function doPost(e) {
  let req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return ttbJson_({ ok: false, code: 'request', error: 'Isi permintaan bukan JSON' });
  }
  if (req.action !== 'mapping-notes') return ttbJson_({ ok: false, code: 'request', error: 'Aksi tidak dikenal: ' + req.action });
  if (!Array.isArray(req.changes) || !req.changes.length) return ttbJson_({ ok: false, code: 'request', error: 'Tidak ada perubahan' });

  let user;
  try {
    user = mapVerifyUser_(req.token);
  } catch (err) {
    return ttbJson_({ ok: false, code: err.code || 'auth', error: String(err && err.message || err) });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return ttbJson_({ ok: false, code: 'busy', error: 'Penyimpanan lain sedang berjalan' });
  try {
    const results = mapWriteNotes_(req.changes, user);
    CacheService.getScriptCache().remove('mapping'); // GET ?data=mapping berikutnya langsung membaca isi terbaru
    return ttbJson_({ ok: true, results: results });
  } catch (err) {
    return ttbJson_({ ok: false, code: 'write', error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function mapAuthError_(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

// akun dari token login dashboard; melempar error ber-code login / forbidden / config
function mapVerifyUser_(token) {
  if (!token) throw mapAuthError_('login', 'Token login tidak dikirim');
  const api = PropertiesService.getScriptProperties().getProperty('DITSAMA_API_URL');
  if (!api) throw mapAuthError_('config', 'Properti skrip DITSAMA_API_URL belum diisi');
  const res = UrlFetchApp.fetch(api.replace(/\/+$/, '') + '/auth/me', {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() === 401) throw mapAuthError_('login', 'Sesi login tidak valid atau sudah berakhir');
  if (res.getResponseCode() !== 200) throw mapAuthError_('config', 'Backend menjawab HTTP ' + res.getResponseCode());
  const user = (JSON.parse(res.getContentText()).data || {}).user;
  if (!user || !user.permissions || !user.permissions.manageReports) {
    throw mapAuthError_('forbidden', 'Akun ' + (user && user.email) + ' tidak punya izin Kelola laporan');
  }
  return user;
}

function mapWriteNotes_(changes, user) {
  const source = mapOpenSource_();
  const tabs = source.getSheets().filter((sh) => MAP_TAB_PATTERN.test(sh.getName()) && /(20\d{2})/.test(sh.getName()));
  const by = user.name || user.email;
  const now = new Date();
  const parsedBySheet = {};
  return changes.map((ch) => {
    const fail = (code, extra) => Object.assign({ key: ch.key, ok: false, code: code }, extra || {});
    const sh = tabs.find((t) => t.getName().match(/(20\d{2})/)[1] === String(ch.year) &&
      String(t.getRange(2, 1).getValue()).trim() === String(ch.campus).trim());
    if (!sh) return fail('notfound');
    const cols = mapNoteColumns_(sh);
    if (!cols) return fail('notfound');
    const name = sh.getName();
    // kolom baru bisa saja baru dibuat, jadi isi sheet dibaca setelah mapNoteColumns_
    parsedBySheet[name] = parsedBySheet[name] || mapParseMatrix_(sh.getDataRange().getValues());
    const hit = parsedBySheet[name].rows.find((r) => r.area === ch.area && r.location === ch.location);
    if (!hit) return fail('notfound');

    const cell = sh.getRange(hit.row, cols.note);
    const current = String(cell.getValue()).trim();
    if (current !== String(ch.previous || '').trim()) {
      return fail('conflict', { note: current, noteAt: hit.noteAt, noteBy: hit.noteBy });
    }
    const note = String(ch.note || '').trim().slice(0, MAP_NOTE_MAX);
    cell.setValue(/^[=+\-@]/.test(note) ? "'" + note : note); // teks, bukan rumus
    sh.getRange(hit.row, cols.time).setValue(now).setNumberFormat('dd/MM/yyyy HH:mm');
    sh.getRange(hit.row, cols.by).setValue(by);
    // baris lain di sheet ini yang lokasinya sama tetap memakai hasil baca awal; catatan berikutnya dibandingkan ulang
    hit.note = note;
    return { key: ch.key, ok: true, note: note, noteAt: now.toISOString(), noteBy: by };
  });
}

// nomor kolom (mulai 1) CATATAN, TERAKHIR DIPERBARUI, DIPERBARUI OLEH; dua kolom terakhir dibuat di kanan CATATAN
// bila belum ada. null bila tab tidak punya kolom CATATAN.
function mapNoteColumns_(sh) {
  const width = sh.getLastColumn();
  const read = () => sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map((h) => String(h).trim().toUpperCase());
  let hdr = read();
  const note = hdr.indexOf(MAP_NOTE_HEADER) + 1;
  if (!note || !width) return null;
  const missing = [MAP_TIME_HEADER, MAP_BY_HEADER].filter((h) => hdr.indexOf(h) < 0);
  if (missing.length) {
    sh.insertColumnsAfter(note, missing.length);
    missing.forEach((h, i) => sh.getRange(1, note + 1 + i).setValue(h).setFontWeight('bold'));
    hdr = read();
  }
  return { note: note, time: hdr.indexOf(MAP_TIME_HEADER) + 1, by: hdr.indexOf(MAP_BY_HEADER) + 1 };
}

// Catatan yang diketik langsung di file Tim Humas juga mendapat waktu otomatis: jalankan sekali
// pasangWaktuCatatanOtomatis() dari editor (memasang pemicu "saat diedit" pada file Tim Humas).
function pasangWaktuCatatanOtomatis() {
  const id = mapOpenSource_().getId();
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'mapCatatanDiubah')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('mapCatatanDiubah').forSpreadsheet(id).onEdit().create();
  Logger.log('Pemicu terpasang di ' + mapOpenSource_().getName());
}

function mapCatatanDiubah(e) {
  const range = e && e.range;
  if (!range || range.getRow() < 3) return;
  const sh = range.getSheet();
  if (!MAP_TAB_PATTERN.test(sh.getName())) return;
  const hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map((h) => String(h).trim().toUpperCase());
  const note = hdr.indexOf(MAP_NOTE_HEADER) + 1, time = hdr.indexOf(MAP_TIME_HEADER) + 1, by = hdr.indexOf(MAP_BY_HEADER) + 1;
  if (!note || !time || note < range.getColumn() || note > range.getLastColumn()) return;
  const who = (e.user && e.user.getEmail && e.user.getEmail()) || 'Spreadsheet Tim Humas';
  for (let r = range.getRow(); r <= range.getLastRow(); r++) {
    sh.getRange(r, time).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm');
    if (by) sh.getRange(r, by).setValue(who);
  }
  CacheService.getScriptCache().remove('mapping');
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
