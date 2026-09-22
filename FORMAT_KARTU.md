# FORMAT BAKU KARTU PELAJAR (jangan diubah tanpa izin user)

Hasil akhir yang disetujui user = seperti kartu acuan `cards/MP2/ahmad-luthfi.jpg`
(gambar referensi user). Semua update kartu WAJIB mengikuti format ini.

## Kanvas & file
- Ukuran: `1016 x 661` px.
- Source: `D:\Kartu Pelajar\{JUR}\{Nama Lengkap}.png` (PNG).
- Web: `cards/{JUR}/{slug}.jpg` (JPEG quality 90).
- Thumb: `cards/thumb/{key}.jpg` (480x312, JPEG q80) + `{key}.webp` (q75).
- `key`, `img`, `nama`, `nis`, `nisn` di `data/data.json` TIDAK BOLEH berubah
  (agar verifikasi & komentar di Google Sheets tidak hilang).
- Jika TTL/alamat sudah lengkap: hapus entri murid dari `data/problems.json`
  lalu renumber `no` 1..n.

## Blok teks data (Times New Roman Bold / `timesbd.ttf`)
- `x_label = 278`, `x_colon = 400`, `x_value = 415`
- `y_start = 302`, `line_h = 35`
- Field utama (Nama, NIS, NISN, TTL, Jurusan + label "Alamat"): **27pt**.
- Lanjutan alamat: **27pt sama rata** (revisi: 22pt terlihat kecil & tidak sejajar),
  dibungkus max 3 baris dengan syarat `x_value + lebar_teks <= 747`
  (cek via `font.getbbox`; semua alamat sejauh ini muat: max 323px).
- Zona `x535-580, y291-299` (di atas Nama) harus bersih putih — di master ada
  sisa speck gelap, wajib diputihkan per kartu.
- Contoh split alamat:
  - `Jl. Pejaten Timur, No. 24A,` / `RT. 010/007, Ps. Minggu,` / `Jakarta Selatan`
  - `Jl. Guru Muhyin, No. 99,` / `RT. 004/002, Jagakarsa,` / `Jakarta Selatan`
  - `Jl. Kayu Manis, No. 42,` / `RT. 005/003, Keramat Jati,` / `Jakarta Timur`
  - `Jl. Wr. Jati Timur, No. 78,` / `RT. 005/004, Pancoran,` / `Jakarta Selatan`
- Warna teks: `(12,12,12)`.

## Foto
- Crop foto murid: `(22, 252, 225 x 307)`.
- Area border kuning + shadow foto: `(14, 244, 239 x 321)` — salin dari kartu
  original murid yang sama, jangan render ulang.

## Banner "KARTU PELAJAR" — PENTING
- File `master kartu pelajar 26.psd` me-render banner **~3px lebih rendah**
  + shadow lebih tipis dibanding kartu acuan yang sudah bagus.
- Maka banner JANGAN di-render dari PSD. Transplant blok utuh
  `x540-1016, y210-300` dari kartu acuan `cards/MP2/ahmad-luthfi.jpg`
  (area ini tidak memuat data murid: teks mulai y302, foto berakhir x247).
- Verifikasi: tepi-atas `187.3=187.3`, bawah-banner `110.7=110.7`.

## Warna acuan (jangan pakai render Photoshop langsung!)
- Kuning banner: `(246, 235, 20)` (render Photoshop memberi `239,255,9` = salah).
- Ungu logo: `(88, 0, 85)` (render Photoshop memberi `63,0,130` = salah).
- Shadow bawah banner: mean `~110` (bukan versi tipis `~167`).

## Verifikasi sebelum commit (wajib)
- Assert piksel: area foto `(22,252,247,559)` dan teks `(275,302,747,573)`
  identik dengan versi disetujui (tidak boleh berubah selain field yang diupdate).
- Bandingkan `purple(30,30)`, `yellow(600,240)`, profil bawah-banner vs kartu acuan.
- Commit + push, tunggu deploy, cek `js/config.js` VERSION baru + `Content-Length`
  gambar live berubah. Minta user `Ctrl+F5`.
