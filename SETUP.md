# Setup deploy (sekali saja, ±10 menit)

Website statis murni, disimpan di **GitHub** dan diupload ke **GitHub Pages**.
Komentar pelajar disimpan lewat **Google Apps Script + Google Sheets** (tanpa token GitHub), lalu ditampilkan kembali di website dengan badge jumlah laporan baru.

---

## Langkah 1 — Upload ke GitHub & Pages

1. Pastikan file sudah ter-commit (repo sudah ada: `Dhnxxsy/Kartu-Pelajar`).
2. Jalankan **`PUSH.bat`** (atau `git push origin main`).
3. GitHub Pages aktif otomatis via workflow `.github/workflows/pages.yml` (Actions).
4. Tunggu ±1 menit, situs muncul di
   **`https://dhnxxsy.github.io/Kartu-Pelajar/`**

---

## Langkah 2 — Aktifkan komentar (Google Sheets, tanpa token)

1. Buka file **`apps_script.gs`** (ada di folder project ini) → salin seluruh isinya.
2. Buka <https://script.google.com> → **+ Buat proyek baru** → hapus isi `Code.gs` → tempel → simpan (Ctrl+S).
3. Di menu atas, pastikan dropdown fungsi memilih **`setup`** → tekan **Run (▶)**.
   - Pilih akun Google kamu → **Review permissions** → **Advanced** → **Go to (unsafe)** → **Allow**.
   - Ini otomatis membuat spreadsheet `Kartu Pelajar - Komentar`.
4. **Deploy → New deployment → ikon gerigi → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** → salin **URL** (awalan `https://script.google.com/macros/s/.../exec`).
5. Buka **`js/config.js`** → tempel URL itu di `gsbase` → simpan.
6. Jalankan **`PUSH.bat`** lagi agar situs pakai URL tersebut.
7. Komentar murid kini masuk ke Google Sheet & tampil di website.

> Tips: kalau nanti mengubah kode Apps Script, jalankan **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** biar URL-nya tetap sama.

---

## Cara update kartu

1. Rendering ulang kartu (PNG) di `D:\Kartu Pelajar` → jalankan script build → file di folder ini ikut ter-update.
2. Jalankan **`PUSH.bat`**.

---

## Cara melihat laporan pelajar

- Klik **ikon lonceng** di kanan atas website — semua laporan tampil, lengkap dengan hitungan belum dibaca.
- Bisa juga buka spreadsheet **`Kartu Pelajar - Komentar`** di Google Sheets.

---

## Catatan privasi

Karena akun GitHub Free tidak mendukung Pages untuk repo private, repo `Kartu-Pelajar` dibiarkan **public** (lihat ke depan: kalau mau repo private, host di Cloudflare Pages/Netlify). Kartu berisi NIS, NISN, TTL, alamat, dan foto murid. Disarankan situs hanya dipakai selama masa pengisian data, lalu bisa dihapus.