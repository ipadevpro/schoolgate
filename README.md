# SchoolGate - Manajemen Perizinan Sekolah

SchoolGate adalah aplikasi web untuk manajemen perizinan dan poin tata tertib sekolah yang menggunakan Google Apps Script sebagai backend dan Google Sheets sebagai database.

## Fitur

- **Multi-role (Siswa dan Guru)**
- **Manajemen Perizinan**
  - Siswa dapat mengajukan permintaan izin
  - Guru dapat menyetujui atau menolak permintaan izin
- **Manajemen Poin Tata Tertib**
  - Guru dapat menambah/mengurangi poin pelanggaran siswa
  - Siswa dapat melihat riwayat dan total poin mereka
- **Otentikasi Pengguna**
  - Login dengan username dan password
  - Menyimpan sesi login di browser

## Persiapan

### 1. Siapkan Google Spreadsheet sebagai Database

1. Buat spreadsheet baru di Google Drive
2. Buat 3 sheet:
   - **Users** (untuk data pengguna)
   - **Permissions** (untuk data permintaan izin)
   - **DisciplinePoints** (untuk data poin tata tertib)

#### Format Sheet Users:
| id | username | password | role | name | class |
|----|----------|----------|------|------|-------|
| S001 | john | password123 | student | John Doe | 10-A |
| T001 | smith | teacher123 | teacher | Mr. Smith | |

#### Format Sheet Permissions:
| id | studentId | reason | date | time | notes | status | teacherId | teacherNotes | timestamp |
|----|-----------|--------|------|------|-------|--------|-----------|--------------|-----------|

#### Format Sheet DisciplinePoints:
| id | studentId | violation | points | notes | timestamp |
|----|-----------|-----------|--------|-------|-----------|

### 2. Deploy Backend di Google Apps Script

1. Buka [Google Apps Script](https://script.google.com/) dan buat project baru
2. Copy-paste kode dari `Code.gs` ke editor
3. Update nilai `SS_ID` dengan ID Spreadsheet yang telah dibuat:
   ```javascript
   const SS_ID = "GANTI_DENGAN_ID_SPREADSHEET_ANDA"; // Ambil dari URL spreadsheet
   ```
4. Simpan project
5. Klik **Deploy** > **New Deployment**
6. Pilih tipe: **Web app**
7. Atur:
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Klik **Deploy**
9. Salin URL yang diberikan - ini akan menjadi endpoint API Anda

### 3. Deploy Frontend di GitHub Pages

1. Push semua file (kecuali Code.gs) ke repository GitHub:
   - index.html
   - main.js
   - README.md
   - CORSrules.txt (sebagai referensi)

2. Buka file `main.js` dan update URL API dengan URL deployment Google Apps Script:
   ```javascript
   const CONFIG = {
       API_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
       // ...
   };
   ```

3. Aktifkan GitHub Pages:
   - Buka repository GitHub > Settings > Pages
   - Pilih branch main dan folder root (/) sebagai source
   - Klik Save
   - Tunggu beberapa menit hingga website di-deploy

## Cara Penggunaan

### Untuk Siswa:

1. Login dengan username dan password siswa
2. Di tab "Manajemen Perizinan", klik "Ajukan Izin" untuk membuat permintaan izin baru
3. Isi formulir dengan alasan izin dan tanggal/waktu
4. Pantau status permintaan izin
5. Lihat riwayat poin tata tertib di tab "Poin Tata Tertib"

### Untuk Guru:

1. Login dengan username dan password guru
2. Di tab "Manajemen Perizinan", lihat semua permintaan izin dari siswa
3. Klik "Setujui" atau "Tolak" untuk memproses permintaan izin
4. Di tab "Poin Tata Tertib", tambah/kurangi poin pelanggaran siswa

## Catatan Penting tentang CORS

Aplikasi ini menggunakan pendekatan khusus untuk menangani masalah CORS dengan Google Apps Script:

1. **Tidak menggunakan header kustom** seperti Content-Type: application/json atau Authorization
2. **Hanya menggunakan URLSearchParams** (application/x-www-form-urlencoded) untuk body request POST
3. **Menghindari preflight OPTIONS request** dengan menghindari penggunaan custom headers
4. Google Apps Script secara otomatis mengizinkan CORS untuk request sederhana

Jika mengalami masalah, pastikan:
- Tetap menggunakan fetch dengan metode POST
- Body request menggunakan format URLSearchParams, bukan JSON
- Tidak ada custom headers ditambahkan ke request

## Catatan Keamanan

- Aplikasi ini menggunakan metode otentikasi sederhana (plaintext password di spreadsheet) yang cocok untuk penggunaan internal. Untuk penggunaan yang lebih luas, pertimbangkan untuk mengimplementasikan metode otentikasi yang lebih aman.
- Pastikan akses spreadsheet terbatas hanya pada admin yang berwenang.
- Jangan menyimpan informasi sensitif dalam aplikasi ini.

## Troubleshooting

**Masalah CORS:**
- Jika mengalami masalah CORS, pastikan telah mengikuti petunjuk yang ada di `CORSrules.txt`.
- Buka URL Apps Script di browser dan verifikasi bahwa endpoint berfungsi.

**Masalah Otorisasi:**
- Jika muncul error otorisasi, coba buka URL Apps Script secara langsung dan berikan izin manual.
- Pastikan spreadsheet dan Apps Script dijalankan dengan akun Google yang sama.

## Pengembangan Lebih Lanjut

- Sistem notifikasi real-time
- Ekspor data ke PDF/Excel
- Integrasi dengan sistem sekolah lainnya
- Penambahan statistik dan laporan
- Implementasi fitur lupa password 