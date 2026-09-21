// ============================================================
//  PENYIMPAN KOMENTAR v2 — Google Apps Script
//  Cara pakai:
//  1. Buka https://script.google.com  ->  + Proyek baru (New project)
//  2. Hapus isi Code.gs, tempel SEMUA kode ini, simpan (Ctrl+S)
//  3. Di menu atas pilih fungsi "setup" lalu klik Run (Tombol ▶)
//     -> izinkan akses (Review permissions, pilih akun, Advanced lalu
//        "Go to ... (unsafe)" -> Allow)
//     CATATAN: setup akan MENGHAPUS isi baris lama dan membuat tabel
//     baru yang rapih (baris tes "cek/bot" ikut terhapus).
//  4. Deploy -> New deployment -> (gear) Web app
//     - Execute as: Me
//     - Who has access: Anyone
//     -> Deploy -> Salin Web app URL (akar: https://script.google.com/macros/s/XXXX/exec)
//     (kalau sudah pernah deploy, cukup Edit deployment yang sama +
//      pilih "New version" supaya URL-nya tidak berubah)
//  5. Tempel URL itu ke js/config.js bagian gsbase, lalu push website.
//  Cara CEK data: jalankan "setup" -> lihat log -> "Selesai. Spreadsheet: <URL>"
//  Dan lewat webapp: <execURL>?action=url  -> mengembalikan link spreadsheet-nya.
// ============================================================

var SHEET_NAME = 'Komentar';
var STUDENT_URL = 'https://dhnxxsy.github.io/Kartu-Pelajar/data/data.json';
// kolom: 1 Waktu, 2 NIS, 3 NISN, 4 Kelas, 5 Nama Siswa, 6 KartuKey,
//        7 Tipe, 8 Nama Pengirim, 9 Isi Laporan
// Tipe dapat berupa: Perbaikan, Komentar, Pertanyaan, Verifikasi, Batal Verifikasi.
// (Verifikasi/Batal Verifikasi dipakai tombol "Verifikasi" di kartu; di simpan
//  di sheet yang sama agar tanpa perlu menambah kolom atau merombak sheet.)
var HEADERS = ['Waktu', 'NIS', 'NISN', 'Kelas', 'Nama Siswa', 'KartuKey', 'Tipe', 'Nama Pengirim', 'Isi Laporan'];

function setup() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('Kartu Pelajar - Komentar');
    props.setProperty('SHEET_ID', ss.getId());
  }
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sh.clearContents();
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 24);
  return 'Selesai. Spreadsheet: ' + ss.getUrl() + '\nLanjut ke langkah Deploy di atas.';
}

function getSheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Jalankan setup() dulu sekali');
  return SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
}

function studentMap() {
  var cache = CacheService.getScriptCache();
  var fromCache = cache.get('kp_students');
  if (fromCache) return JSON.parse(fromCache);
  var byKey = {};
  try {
    var res = UrlFetchApp.fetch(STUDENT_URL, { muteHttpExceptions: true, timeoutSeconds: 30 });
    var data = JSON.parse(res.getContentText());
    (data || []).forEach(function (s) {
      if (s && s.key) byKey[s.key] = { name: s.name || '', nis: s.nis || '', nisn: s.nisn || '', jur: s.jurusan || '' };
    });
  } catch (e) { /* situs tak bisa diakses -> tetap simpan apa adanya */ }
  cache.put('kp_students', JSON.stringify(byKey), 21600);
  return byKey;
}

function doGet(e) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  if (e && e.parameter && e.parameter.action === 'url') {
    var ss = id ? SpreadsheetApp.openById(id) : null;
    return ContentService
      .createTextOutput(JSON.stringify({ url: ss ? ss.getUrl() : '' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var sh = getSheet();
  var rows = sh.getDataRange().getValues().slice(1).filter(function (r) { return r[0]; });
  var out = rows.reverse().map(function (r) {
    return {
      date: String(r[0]),
      nis: String(r[1]), nisn: String(r[2]), kelas: String(r[3]),
      name: String(r[4]), key: String(r[5]),
      type: String(r[6]), author: String(r[7]), msg: String(r[8])
    };
  });
  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var b = JSON.parse(e.postData.contents);
  var byKey = studentMap();
  var st = byKey[b.key] || {};
  var sh = getSheet();
  sh.appendRow([
    new Date(),
    st.nis || '',
    st.nisn || '',
    st.jur || '',
    st.name || b.key || '',
    b.key || '',
    b.type || 'Komentar',
    b.name || '',
    b.msg || ''
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, name: st.name || '', kelas: st.jur || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doDelete(e) {
  // Opsional: hapus baris yang cocok
  return doGet(e);
}