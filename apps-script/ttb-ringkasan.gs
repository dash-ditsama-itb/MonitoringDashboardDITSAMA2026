/**
 * Data dashboard Teman Tumbuh Bersama (TTB) TPB ITB untuk halaman
 * Pendidikan Persiapan → Pembinaan Karakter TPB → Teman Tumbuh (TTB).
 *
 * Membaca tab "Ringkasan" dan "Timeline" di spreadsheet TTB, lalu mengirimnya sebagai JSON.
 * Pasang di spreadsheet TTB: Ekstensi → Apps Script → tempel file ini → Terapkan → Deployment baru →
 * jenis "Aplikasi web", Jalankan sebagai "Saya", Yang memiliki akses "Siapa saja". Salin URL /exec-nya
 * ke TTB_API_URL di app/lib/karakter.js (lihat README).
 *
 * Baris di Ringkasan dikenali dari teks labelnya (kolom A), bukan dari nomor baris, jadi baris boleh
 * digeser atau ditambah. Indikator bernomor (mis. "8. ...") yang kolom TARGET-nya diisi otomatis ikut
 * tampil di kartu "Indikator vs target".
 */

const SHEET_SUMMARY = 'Ringkasan';
const SHEET_TIMELINE = 'Timeline';
const YEAR = '2026';
const CACHE_SECONDS = 60; // dashboard membaca ulang sheet paling lama 1 menit setelah data berubah

// label (awal teks kolom A) → nama field di JSON
const FIELDS = [
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

function doGet() {
  const cache = CacheService.getScriptCache();
  let body = cache.get('ttb');
  if (!body) {
    try {
      body = JSON.stringify(buildTtb());
      cache.put('ttb', body, CACHE_SECONDS);
    } catch (err) {
      body = JSON.stringify({ ok: false, error: String(err && err.message || err) });
    }
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function buildTtb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const sheet = ss.getSheetByName(SHEET_SUMMARY);
  if (!sheet) throw new Error('Tab "' + SHEET_SUMMARY + '" tidak ditemukan');
  const range = sheet.getDataRange();
  const values = range.getValues();
  const formats = range.getNumberFormats();

  const out = { ok: true, year: YEAR, updatedAt: new Date().toISOString(), targets: [] };
  values.forEach((row, r) => {
    const label = String(row[0]).trim();
    if (!label) return;
    const value = toNumber(row[1], formats[r][1]);
    const field = FIELDS.find(([re]) => re.test(label));
    if (field && value !== null) out[field[1]] = value;
    if (field && field[1] === 'targetToDate') out.weekLabel = String(row[2]).trim(); // mis. "Pekan ke-6"

    // indikator bernomor dengan kolom TARGET terisi → kartu "Indikator vs target"
    const target = toNumber(row[3], formats[r][3]);
    if (/^\d+[a-z]?\.\s/i.test(label) && target !== null && value !== null) {
      const gap = toNumber(row[4], formats[r][4]);
      out.targets.push({
        key: field ? field[1] : label,
        label: label.replace(/^\d+[a-z]?\.\s*/i, '').replace(/\s*\(%\)\s*$/, ''),
        value: value,
        target: target,
        gap: gap !== null ? gap : value - target,
        unit: isPercent(formats[r][1]) ? '%' : '',
      });
    }
  });

  const week = String(out.weekLabel || '').match(/\d+/);
  out.week = week ? Number(week[0]) : null;
  out.timeline = readTimeline(ss, tz);
  if (!out.week) out.week = currentWeek(out.timeline, tz);
  return out;
}

function readTimeline(ss, tz) {
  const sheet = ss.getSheetByName(SHEET_TIMELINE);
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
      start: toIsoDate(row[cStart], tz),
      end: toIsoDate(row[cEnd], tz),
      activity: String(row[cAct]).trim(),
      cumTarget: Number(row[cCum]) || 0,
    }));
}

// pekan berjalan dari tanggal hari ini, bila label "Pekan ke-…" di Ringkasan kosong
function currentWeek(timeline, tz) {
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const now = timeline.find((w) => w.start && w.end && w.start <= today && today <= w.end);
  return now ? now.week : null;
}

// angka dari sel: persen disimpan sebagai pecahan (0,4245) → 42,45
function toNumber(v, format) {
  if (v === '' || v === null) return null;
  let n = typeof v === 'number' ? v : Number(String(v).replace(/%/g, '').replace(/\./g, '').replace(',', '.'));
  if (isNaN(n)) return null;
  if (typeof v === 'number' && isPercent(format)) n = n * 100;
  return Math.round(n * 100) / 100;
}

function isPercent(format) {
  return /%/.test(String(format || ''));
}

// tanggal bisa berupa Date atau teks "14/09/2026"
function toIsoDate(v, tz) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}

// Jalankan dari editor Apps Script untuk melihat hasilnya di Log eksekusi.
function cobaLihatData() {
  Logger.log(JSON.stringify(buildTtb(), null, 2));
}
