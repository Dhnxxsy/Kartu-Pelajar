// ============================================================
//  PENYIMPAN KOMENTAR — Google Apps Script
//  Cara pakai:
//  1. Buka https://script.google.com  ->  + Proyek baru (New project)
//  2. Hapus isi Code.gs, tempel SEMUA kode ini, simpan (Ctrl+S)
//  3. Di menu atas pilih fungsi "setup" lalu klik Run (Tombol ▶)
//     -> izinkan akses (Review permissions, pilih akun, Advanced lalu
//        "Go to ... (unsafe)" -> Allow)
//  4. Deploy -> New deployment -> (gear) Web app
//     - Execute as: Me
//     - Who has access: Anyone
//     -> Deploy -> Salin Web app URL (akar dari https://script.google.com/macros/s/XXXX/exec)
//  5. Tempel URL itu ke js/config.js bagian gsbase, lalu push website.
// ============================================================

var SHEET_NAME = 'Komentar';

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
  if (sh.getLastRow() === 0) {
    sh.getRange('A1:E1').setValues([['Waktu', 'KartuKey', 'Tipe', 'Nama', 'Isi']]);
    sh.setFrozenRows(1);
  }
  return 'Selesai. Spreadsheet: ' + ss.getUrl() + '\nLanjut ke langkah Deploy di atas.';
}

function getSheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Jalankan setup() dulu sekali');
  return SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
}

function doGet(e) {
  var sh = getSheet();
  var rows = sh.getDataRange().getValues().slice(1).filter(function (r) { return r[0]; });
  var out = rows.reverse().map(function (r) {
    return { date: String(r[0]), key: String(r[1]), type: String(r[2]), author: String(r[3]), msg: String(r[4]) };
  });
  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var b = JSON.parse(e.postData.contents);
  var sh = getSheet();
  sh.appendRow([new Date(), b.key || '', b.type || 'Komentar', b.name || '', b.msg || '']);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doDelete(e) {
  // Opsional: hapus baris terakhir yang kartukey-nya cocok
  return doGet(e);
}