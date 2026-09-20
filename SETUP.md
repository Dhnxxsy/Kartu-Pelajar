# Setup deploy (sekali saja, ±10 menit)

Website ini statis murni, disimpan di **GitHub** dan diupload ke **GitHub Pages**.
Komentar pelajar disimpan sebagai **GitHub Issues** di repo yang sama, lalu ditampilkan kembali di website (dengan badge jumlah laporan baru).

---

## Langkah 1 — Buat repo di GitHub

1. Buka <https://github.com/new> (login dulu jika belum).
2. Repository name: **`kartu-pelajar-preview`**
3. Pilih **Private** (penting: repo berisi data siswa & foto).
4. Klik **Create repository**.
5. Salin URL repo di halaman yang muncul, contoh: `https://github.com/username/kartu-pelajar-preview.git`

> Dev sekaligus juga bisa bantu push: tinggal jalankan `PUSH.bat` dan tempel URL di atas.

---

## Langkah 2 — Aktifkan token komentar

1. Buka <https://github.com/settings/tokens?type=beta>.
2. Klik **Generate new token** → **Generate new token (beta)**.
3. **Token name**: `kartu-komentar`
4. **Expiration**: pilih yang panjang (misal 90 hari / custom).
5. **Repository access**: pilih **Only select repositories** → pilih `kartu-pelajar-preview`.
6. Bagian **Permissions → Repository permissions**:
   - set **Issues** menjadi **Read and write**
   - biarkan yang lain **No access**.
7. Klik **Generate token** → **salin token** (awalan `github_pat_...`). Hanya tampil sekali!

## Langkah 3 — Tempel ke config.js

Buka file **`js/config.js`** dan isi:

```js
window.CONFIG = {
  owner: "USERNAME_KAMU",   // ganti dengan username GitHub
  repo:  "kartu-pelajar-preview",
  token: "github_pat_xxxxxxxx"   // ganti dengan token tadi
};
```

> Token ini **hanya** bisa membuat/membaca Issues di repo itu. Untuk keamanan, jangan bagikan ke orang lain.

---

## Langkah 4 — Upload ke GitHub & aktifkan Pages

1. Jalankan **`PUSH.bat`**, tempel URL repo saat diminta.
2. Di GitHub, buka repo → **Settings** → **Pages** (menu kiri).
3. **Source**: pilih **Deploy from a branch** → **Branch**: `main` / `(root)` → **Save**.
4. Tunggu ±1 menit, situs muncul di
   **`https://USERNAME.github.io/kartu-pelajar-preview/`**

Bagikan URL itu ke para murid / wali kelas.

---

## Cara update kartu

Jika ada kartu baru / data diperbaiki:

1. Rendering ulang kartu (PNG) ke folder `D:\Kartu Pelajar` → jalankan script build → hasil di folder ini otomatis menyesuaikan.
2. Lalu jalankan **`PUSH.bat`** lagi.

---

## Cara melihat laporan pelajar

- Klik **ikon lonceng** di kanan atas website → semua laporan muncul di sana, dengan tanda berapa yang belum dibaca.
- Alternatif: tab **Issues** di repo GitHub.

---

## Catatan privasi

Website di GitHub Pages bisa diakses publik lewat URL. Kartu berisi NIS, NISN, TTL, alamat, dan foto murid. Disarankan situs hanya dipakai dalam masa pengisian data, lalu bisa dihapus / dibuat hanya-terbuka-saat-diperlukan.