# PRD — Aplikasi Pelacak Nutrisi & Komposisi Tubuh Pribadi

- **Tanggal:** 12 November 2026
- **Status:** Draf untuk direview
- **Pemilik:** pengguna tunggal (pemilik aplikasi)
- **Nama kerja:** "Nutrisi Pribadi" (nama final bebas diganti)

---

## 1. Ringkasan

Aplikasi web pribadi (PWA, mobile-first untuk iPhone) untuk:

1. Mencatat makanan dan minuman dengan cepat dari database nutrisi, tanpa AI berbayar.
2. Menetapkan dan mengejar target kalori, makro, serat, dan air sesuai goal (sekarang: **bulking**).
3. Mencatat berat badan harian dan hasil scan komposisi tubuh dari gym.
4. Menghubungkan asupan makan dengan perubahan komposisi tubuh, dan memproyeksikan progres ke goal.

Perhatian khusus: **serat** adalah target utama (setara protein) karena pengguna punya ambeien.

## 2. Konteks & Batasan

| Batasan | Konsekuensi |
|---|---|
| Satu pengguna | Tidak ada fitur multi-user. Pendaftaran akun dimatikan. |
| Hosting gratis: Vercel Hobby + Supabase Free | Hobby hanya untuk penggunaan pribadi non-komersial. Project Supabase free di-pause setelah tidak aktif beberapa hari (lihat §14). |
| Tanpa API AI berbayar | Nutrisi berasal dari database dan input pengguna. Deteksi foto makanan hanya setelah lolos uji akurasi (§13). |
| Apple Health tidak bisa diakses dari web | Integrasi ditunda ke fase berikutnya, lewat iOS Shortcuts → endpoint API (§12). |
| Foto tidak disimpan permanen | Tidak memakai Supabase Storage. Foto hanya diproses atau ditampilkan di memori browser. |
| Mayoritas makanan dari warung/resto | Akurasi pencatatan terbatas. Desain mengompensasi dengan pencatatan per komponen, porsi terkalibrasi, dan analisis berbasis tren berat. |

## 3. Kriteria Sukses

1. Mencatat waktu makan rutin (dari favorit/terakhir/meal tersimpan) dalam **≤ 15 detik**. Makanan baru dalam **≤ 60 detik**.
2. Aplikasi dipakai setiap hari selama 4 minggu pertama, dengan log berat dan makan ≥ 80% hari.
3. Setelah ≥ 3 scan, pengguna bisa melihat apakah rata-rata asupannya menghasilkan perubahan komposisi sesuai goal, beserta tanda keandalan datanya.

## 4. Ruang Lingkup

### 4.1 Masuk v1
- Login magic link (Supabase Auth), satu akun.
- Profil, goal (satu aktif), target otomatis yang bisa diedit.
- Database makanan: seed dari USDA/TKPI, makanan dari label, makanan rakitan (resep), estimasi cepat.
- Pencatatan makan per waktu makan (4 tetap + Lainnya), air minum, berat harian lewat slider dengan getar.
- Navigasi HP 5 tab dan tata letak desktop dengan rel kiri, tab Profil berisi pengaturan.
- Input manual hasil scan komposisi tubuh, dengan foto pembanding sementara (tidak di-upload).
- Dashboard Hari Ini, tren berat, progres goal + proyeksi, analisis periode antar-scan, TDEE aktual estimasi.
- Banner pengingat di dalam aplikasi.
- Antrean kirim ulang saat sinyal buruk.

### 4.2 Ditunda (urutan perkiraan)
| Fase | Fitur |
|---|---|
| v1.1 | Deteksi jenis makanan dari foto, **hanya jika** lolos uji coba (§13) |
| Fase 2 | Mode target adaptif (target menyesuaikan dari TDEE aktual) |
| Fase 2 | Integrasi Apple Health via iOS Shortcuts |
| Fase 2 | OCR untuk laporan scan dan label gizi |
| Fase 2 | Getar (haptic) asli di iPhone lewat wrapper native (mis. Capacitor) |
| Nanti | Scan barcode, log latihan, foto progres, perbandingan dua scan berdampingan, push notification |
| Nanti | Mode gelap. Keputusan pemilik: v1 hanya tema terang. |

### 4.3 Di luar lingkup
- Saran medis. Aplikasi adalah alat pencatat. Keluhan ambeien tetap dikonsultasikan ke dokter.
- Penggunaan komersial atau multi-user.

## 5. Profil Awal (referensi contoh)

Dari hasil scan 7 Nov 2026: pria, 26 tahun, tinggi 165 cm, berat 61,8 kg, % lemak 14,9%, fat mass 9,2 kg, visceral fat 4, WHR 0,95, BMR alat 1.465 kkal. Goal sekarang: **bulking**.

Angka-angka ini dipakai sebagai contoh perhitungan di §8. Tanggal lahir, faktor aktivitas, dan target goal (berat/% lemak/tanggal) diisi pengguna di aplikasi saat onboarding.

## 6. Arsitektur

- **Frontend + backend:** Next.js (App Router, TypeScript), di-deploy ke Vercel Hobby.
  - Mutasi data memakai Server Actions atau Route Handlers.
  - Endpoint API disiapkan untuk integrasi masa depan (Apple Health).
- **Database & auth:** Supabase Postgres + Supabase Auth (magic link).
  - Pendaftaran publik dimatikan. Email yang diizinkan disimpan di environment variable.
  - Semua tabel memakai Row Level Security dengan kondisi `user_id = auth.uid()`.
- **Pencarian makanan:** ekstensi Postgres `pg_trgm` untuk pencarian toleran salah ketik pada nama dan alias.
- **PWA:**
  - Web app manifest dan service worker, supaya bisa ditambahkan ke home screen iPhone.
  - Antrean entri tertunda disimpan di IndexedDB.
- **Logika perhitungan:** modul TypeScript murni tanpa I/O, terpisah dari UI dan database. Ini memudahkan unit test dan nantinya dipakai ulang oleh mode adaptif.
- **Tanpa object storage.** Foto tidak pernah di-upload.

### 6.1 Unit utama
| Unit | Tanggung jawab | Bergantung pada |
|---|---|---|
| `nutrition-calc` | Nutrisi entri dari makanan + gram, agregasi harian, cakupan data, gula tambahan | — |
| `targets-calc` | BMR, TDEE, target kalori/makro/serat/air/batas | — |
| `trend-calc` | Tren berat (EMA), laju, proyeksi, TDEE aktual, kelengkapan log | — |
| `food-db` | CRUD makanan, porsi, resep, pencarian | Supabase |
| `logging` | Entri makan/air/berat/scan + antrean offline | Supabase, IndexedDB |
| `ui` | Layar dan komponen | Semua di atas |

## 7. Model Data

Semua tabel memiliki `id`, `user_id`, `created_at`, `updated_at`. Satuan: gram, kkal, mg (natrium), ml (air), kg (berat).

**`profile`** (1 baris): `sex`, `birth_date`, `height_cm`, `activity_factor` (1.2 | 1.375 | 1.55 | 1.725 | 1.9), `bmr_method` (`auto` | `katch` | `mifflin` | `scan`), `timezone` (default `Asia/Jakarta`).

**`goals`**: `type` (`bulk` | `cut` | `maintain`), `start_date`, `end_date` (null = aktif), `target_weight_kg?`, `target_bf_pct?`, `target_date?`, `rate_pct_per_week` (default bulk 0,3; cut −0,5; maintain 0), `notes`.
- Constraint: maksimal satu baris dengan `end_date IS NULL` per user.

**`targets`**: `effective_from` (tanggal), `kcal`, `protein_g`, `carb_g`, `fat_g`, `fiber_g`, `water_ml`, `added_sugar_max_g`, `sodium_max_mg`, `satfat_max_g`, `is_manual_override`, `calc_inputs` (JSON: BMR, metode, faktor, berat yang dipakai).
- Target untuk tanggal D = baris dengan `effective_from` terbesar yang ≤ D.

**`foods`**:
- `name`, `aliases[]`, `source` (`usda` | `tkpi` | `label` | `custom` | `recipe` | `estimate`), `source_ref` (ID/URL sumber).
- Nutrisi per 100 g: `kcal`, `protein_g`, `carb_g`, `fat_g`, `fiber_g?`, `sugar_g?`, `added_sugar_g?`, `sodium_mg?`, `satfat_g?`.
- `is_sweetener` (gula pasir, gula aren, kecap manis, sirup, SKM), `is_favorite`, `is_estimate`.
- **Null = tidak diketahui**, bukan 0. Untuk `source=recipe`, nilai nutrisi dihitung dari `recipe_items` (tidak disimpan manual).

**`food_portions`**: `food_id`, `label` (mis. "1 centong", "1 potong paha"), `grams`, `is_calibrated` (true jika pengguna sudah menimbang).

**`recipe_items`**: `recipe_food_id`, `ingredient_food_id`, `grams`. Hasil resep juga punya `food_portions` (mis. "1 mangkok").

**`saved_meals`** + **`saved_meal_items`** (`food_id`, `grams`): template kombinasi. Saat dipakai, template dipecah menjadi beberapa `food_entries`.

**`food_entries`**: `date` (lokal, sesuai `profile.timezone`), `meal_slot` (`breakfast` | `lunch` | `snack` | `dinner` | `other`), `meal_label?` (nama bebas, hanya untuk `other`, mis. "Larut malam"), `logged_at`, `food_id`, `grams`, `portion_label?`, **salinan nutrisi** (semua kolom nutrisi untuk gram tsb, termasuk null), `client_id` (UUID dari klien untuk mencegah duplikasi saat kirim ulang).

**`water_entries`**: `date`, `logged_at`, `ml`, `client_id`.

**`weight_entries`**: `date`, `measured_at`, `weight_kg`, `condition` (`fasted` | `fed`, default `fasted`), `source` (default `manual`; nanti `apple_health`), `client_id`. Satu tanggal bisa memiliki beberapa entri; tren memakai entri pertama hari itu.

**`body_scans`**:
- `scanned_at`, `device` (default "FTL FitScan"), `condition` (`fasted` | `fed`), `post_workout` (bool).
- Metrik: `weight_kg`, `bmi`, `fat_mass_kg`, `bf_pct`, `muscle_pct`, `other_pct`, `visceral_fat`, `whr`, `bmr_kcal`, `body_age`, `bcm_score`.
- Segmen: `arm_r_muscle_kg`, `arm_r_fat_kg`, `arm_l_muscle_kg`, `arm_l_fat_kg`, `torso_muscle_kg`, `torso_fat_kg`, `leg_r_muscle_kg`, `leg_r_fat_kg`, `leg_l_muscle_kg`, `leg_l_fat_kg`.
- Semua nilai disimpan apa adanya dari alat. Lean mass turunan = `weight_kg − fat_mass_kg`.

**Keputusan:** nutrisi disalin ke setiap entri agar riwayat stabil. Saat data makanan dikoreksi, ada aksi eksplisit "Terapkan ke entri lama" (pilih rentang tanggal).

## 8. Perhitungan

### 8.1 BMR
- **Katch-McArdle:** `370 + 21,6 × LBM`, dengan `LBM = berat × (1 − bf_pct/100)` dari scan terakhir.
- **Mifflin-St Jeor:** pria `10×berat + 6,25×tinggi − 5×umur + 5`; wanita `… − 161`.
- **Scan:** `bmr_kcal` dari scan terakhir.
- **`auto` (default):** Katch-McArdle jika ada scan ≤ 60 hari, selain itu Mifflin. Berat yang dipakai = tren berat terbaru (§8.5), atau berat scan jika belum ada data timbang.

### 8.2 Target
- `TDEE = BMR × activity_factor`
- `surplus = rate_pct_per_week/100 × berat × 7.700 / 7` (negatif untuk cut)
- `kcal = round10(TDEE + surplus)`
- `protein_g = 1,8 × berat` (bisa diubah, rentang 1,6–2,2)
- `fat_g = max(0,25 × kcal / 9; 0,6 × berat)`
- `carb_g = (kcal − 4×protein − 9×fat) / 4`
- `fiber_g = max(25; 14 × kcal / 1000)`
- `water_ml = round50(35 × berat)`
- `added_sugar_max_g = 0,10 × kcal / 4`
- `sodium_max_mg = 2000`
- `satfat_max_g = 0,10 × kcal / 9`
- Semua nilai bisa diedit. Mengedit akan membuat baris `targets` baru dengan `is_manual_override = true`.

**Contoh** (faktor 1,55, berat 61,8, BF 14,9%): LBM 52,6 → BMR ≈ 1.506 → TDEE ≈ 2.334 → surplus ≈ +204 → **2.540 kkal**, protein 111 g, lemak 71 g, karbo ≈ 365 g, serat 36 g, air 2.150 ml (round50).

**Usulan pembaruan target:** saat ada scan baru, atau tren berat berubah > 2% dari berat di `calc_inputs`, tampil banner yang menunjukkan selisih target lama dan baru. Target baru hanya berlaku jika pengguna menyetujui, mulai hari itu.

### 8.3 Nutrisi entri & agregasi
- Nutrisi entri = `nilai_per_100g × grams / 100`. Null tetap null.
- Nutrisi resep per 100 g = Σ(nutrisi bahan untuk gram-nya) / Σ gram bahan × 100. Jika ada bahan yang null untuk suatu nutrien, hasil resep untuk nutrien itu ditandai **sebagian** (disimpan nilai parsial + flag).
- **Cakupan data** nutrien n per hari = Σ kkal entri yang n-nya diketahui / Σ kkal semua entri × 100%. Tampil jika < 100%.

### 8.4 Gula tambahan
- **Gula total** hanya informasi, tanpa batas.
- **Gula tambahan** menjadi batas:
  - Makanan `is_sweetener`: `added_sugar = sugar`.
  - Makanan `label`: memakai nilai gula tambahan dari label jika ada, jika tidak null.
  - Bahan tunggal USDA/TKPI non-pemanis: 0.
  - Resep: Σ gula tambahan bahan.
  - `estimate`/`custom` tanpa isian: null.

### 8.5 Tren, laju, proyeksi
- **Tren berat (EMA):** `trend₀ = w₀`; `trendₜ = trendₜ₋₁ + 0,1 × (wₜ − trendₜ₋₁)` untuk hari yang punya timbangan. Hari tanpa timbangan tidak memperbarui tren.
- **Laju:** kemiringan regresi linier nilai tren terhadap hari, selama 21 hari terakhir. Syarat minimal 14 hari rentang dan ≥ 10 timbangan. Satuan kg/minggu dan %/minggu.
- **Status laju vs goal:** dalam rentang jika laju berada di [0,5×; 1,5×] dari `rate_pct_per_week`.
  - Peringatan "kemungkinan lebih banyak lemak bertambah" jika laju bulk > 1,5× selama ≥ 14 hari berturut-turut.
  - Peringatan "berat tidak naik" jika laju bulk ≤ 0 selama ≥ 14 hari.
- **Proyeksi berat:** sisa = target − tren sekarang. Estimasi tanggal dihitung dengan laju ± 1 standard error kemiringan.
  - Jika batas bawah laju ≤ 0 (berlawanan arah goal), hanya tampil "paling cepat <tanggal>".
  - Jika laju sendiri ≤ 0: "Belum ada proyeksi: tren berat datar/berlawanan".
  - Tanggal dibulatkan ke pertengahan atau akhir bulan.
- **Proyeksi % lemak:** regresi linier `bf_pct` terhadap tanggal scan, butuh ≥ 3 scan. Aturan rentang sama.

### 8.6 Kelengkapan log & TDEE aktual
- **Hari lengkap:** ≥ 2 waktu makan tercatat **dan** total kkal ≥ 60% target hari itu.
- **TDEE aktual estimasi:** `rata-rata kkal hari lengkap − (laju_kg_per_hari × 7.700)`, selama 28 hari terakhir.
  - Tampil hanya jika ≥ 21 hari data dan kelengkapan ≥ 80%.
  - Hanya informasi, tidak mengubah target.

## 9. Fitur & Alur

### F1. Onboarding
Isi profil (jenis kelamin, tanggal lahir, tinggi, faktor aktivitas), scan atau berat awal, dan goal. Aplikasi menampilkan target hasil hitungan, yang bisa diedit lalu disimpan.

**Penerimaan:** target tampil beserta rincian perhitungannya ("BMR 1.506 × 1,55 + 204").

### F2. Layar Hari Ini
- Indikator besar: kalori, protein, serat (aktual, target, sisa).
- Indikator kecil: karbo, lemak, air.
- Batas: gula tambahan, natrium, lemak jenuh, dengan cakupan data.
- Daftar per waktu makan berurutan Sarapan, Makan siang, Snack, Makan malam, dengan subtotal kkal dan serat. Kartu "Lainnya" hanya tampil kalau hari itu ada entri `other`; tiap label `meal_label` berbeda tampil sebagai kartu sendiri.
- Tombol air `+250`, `+500`, `lainnya`.
- Banner pengingat (F9).
- Navigasi tanggal (kemarin/lusa) untuk melihat dan mengedit hari lain.

### F3. Catat makanan
1. Tombol "+ Catat". `meal_slot` otomatis: < 10.00 sarapan, 10.00–14.59 siang, 15.00–17.59 snack, ≥ 18.00 malam. Bisa diganti ke salah satu dari 5 pilihan: Sarapan, Siang, Snack, Malam, **Lainnya**. Lainnya tidak pernah dipilih otomatis; saat dipilih, muncul kolom nama opsional (`meal_label`).
2. Layar pencarian menampilkan:
   - Kartu **"<waktu makan> kemarin"** berisi daftar item kemarin (nama + porsi), total kkal/protein/serat, dan tombol "Ulangi N item". Kartu disembunyikan jika slot itu kemarin kosong.
   - Tab Favorit, Terakhir dimakan (14 hari, urut frekuensi), Meal tersimpan.
3. Pencarian trigram pada nama + alias. Hasil muncul saat mengetik.
4. Pilih makanan, lalu pilih porsi lewat chip porsi atau input gram dengan stepper. Pratinjau nutrisi tampil langsung.
5. Tambah item lagi atau Simpan.

**Penerimaan:**
- Menu rutin tercatat ≤ 15 detik (diukur di uji E2E sebagai ≤ 5 ketukan).
- Entri bisa diedit dan dihapus. Hapus menyediakan undo 5 detik.

### F4. Kelola makanan
- **Dari label:** isi ukuran sajian (g/ml) + nilai per sajian, lalu disimpan per 100 g. Bisa ditambah porsi "1 scoop", "1 botol".
- **Rakit (resep):** pilih bahan + gram. Nutrisi dihitung otomatis. Tambah porsi hasil.
- **Estimasi cepat:** kkal + P/K/L wajib, sisanya opsional. Ditandai `estimate`.
- Edit makanan dan kelola porsi. Kalibrasi porsi: "Saya sudah menimbang: 1 centong = ___ g" → `is_calibrated`.
- Tandai favorit dan buat meal tersimpan.

### F5. Air minum
Tambah cepat dari layar Hari Ini. Riwayat harian bisa diedit.

### F6. Berat badan
Layar "Timbang badan" (dibuka dari banner atau Hari Ini):
- Angka besar berat (1 desimal) + selisih terhadap tren ("+0,1 kg dari tren 61,8").
- **Penggaris geser:** garis tiap 0,1 kg, garis tengah tiap 0,5 kg, garis tebal + angka tiap 1 kg, jarum oranye di tengah.
- **Slider native** (`<input type="range">`, 30–200, langkah 0,1) + tombol −/+ 0,1 kg. Keyboard: panah kiri/kanan.
- Nilai awal = berat terakhir (atau berat scan jika belum ada).
- Kondisi (default puasa) dan tombol "Simpan X kg".

**Haptic (keputusan pemilik: opsi B, web + trik iOS):**
- Getar pendek setiap nilai melewati kelipatan 0,1 kg, getar lebih tegas tiap 1 kg.
- Android dan browser yang punya `navigator.vibrate`: pakai Vibration API.
- iPhone (Safari/PWA): tidak ada API getar resmi. Dipakai trik tidak resmi: elemen `<input type="checkbox" switch>` tersembunyi yang di-toggle lewat `<label>` memicu getar sistem di iOS 18+. **Risiko:** bisa berhenti bekerja di versi iOS berikutnya tanpa pemberitahuan; aplikasi harus tetap berfungsi tanpa getar. [Perlu verifikasi di iOS yang dipakai.]
- Trackpad MacBook: tidak bisa dipicu dari web, jadi tanpa getar.
- Ada sakelar "Getar saat menggeser" di Profil (default menyala). Saat `prefers-reduced-motion: reduce`, default mati.
- Getar asli lewat wrapper native ditunda ke Fase 2 (§4.2).

**Validasi:** 30–200 kg. Peringatan jika berbeda > 3% dari tren (bisa tetap disimpan).

### F7. Input hasil scan
- Form disusun mengikuti urutan laporan gym: header (tanggal, jam, kondisi), segmen (lengan kanan/kiri, torso, kaki kanan/kiri: otot + lemak), lalu metrik (BMI, fat mass, visceral, WHR, berat, BMR, body age, % otot/lemak/lainnya, skor BCM).
- Pengguna bisa memilih foto laporan, yang tampil di samping/atas form **hanya di memori browser** (object URL, dilepas saat layar ditutup). Tidak ada upload.

**Validasi:**
- `bf_pct` 3–60, `muscle_pct + bf_pct + other_pct` ≈ 100 ± 1.
- `fat_mass_kg ≈ weight × bf_pct/100 ± 0,5`.
- Peringatan jika `bf_pct` berubah > 3 poin atau berat > 3 kg dari scan sebelumnya.

### F8. Progres & analisis
- **Grafik berat:** titik mentah + garis tren, laju mingguan, status vs rentang goal.
- **Kartu goal:** tren sekarang vs target berat, % lemak scan terakhir vs target, proyeksi (§8.5), atau pesan "butuh N hari/scan lagi".
- **Tabel periode antar-scan:** hari, rata-rata kkal (hari lengkap), protein g/kg, rata-rata serat, kelengkapan log, Δ tren berat, Δ fat mass, Δ lean mass, Δ % lemak. Tanda:
  - Kelengkapan < 80% → "data makan tidak lengkap".
  - |Δ lean mass| < 1,0 kg (ambang bisa diatur) → "di bawah margin error alat".
  - Kondisi scan berbeda (status puasa beda atau selisih jam > 3) → "scan tidak setara".
- **Grafik fat mass & lean mass per scan**, dengan rata-rata kkal per periode.
- **Kartu TDEE aktual estimasi** (§8.6).
- **Riwayat goal/fase.**

### F9. Banner pengingat (di dalam aplikasi)
| Kondisi | Pesan |
|---|---|
| Belum ada timbangan hari ini | "Belum timbang hari ini" |
| ≥ 15.00 dan makan siang kosong | "Makan siang belum dicatat" |
| ≥ 15.00 dan air < 50% target | "Air minum baru X%" |
| ≥ 18.00 dan serat < 50% target | "Serat baru X g dari Y g" |
| Ada usulan target baru (§8.2) | "Target bisa diperbarui" |

Banner bisa ditutup untuk hari itu.

### F10. Profil & pengaturan (tab Profil)
- Akun: nama (placeholder sampai diisi), metode masuk. Tanpa foto profil buatan.
- Profil tubuh: jenis kelamin, tanggal lahir, tinggi, faktor aktivitas, zona waktu.
- Goal: goal aktif (tautan ke layar Target), riwayat fase, "Mulai goal baru" (menutup goal lama).
- Pengaturan: metode BMR, ambang margin error scan, sakelar pengingat (timbang pagi, makan siang, air dan serat), sakelar getar.
- Data: ekspor JSON/CSV. Tombol Keluar.

### F11. Navigasi & tata letak
- **HP (< 1024 px):** navbar bawah 5 tab: Hari Ini, Progres, **Catat** (tombol bulat navy di tengah), Target, Profil. Tampil di layar utama. Layar tugas (Catat, Scan, Timbang, detail makanan) memakai tombol kembali tanpa navbar.
- **Desktop (≥ 1024 px):** rel navigasi kiri: tombol Catat (navy) di atas, lalu Hari Ini, Progres, Target, Profil. Konten maksimal 1.240 px.
  - Hari Ini: kolom kiri (dial kalori + protein + serat, makro/air, batas), kolom kanan (daftar makan).
  - Progres: baris kartu goal/laju/proyeksi, grafik berat lebar, tabel periode antar-scan.
- Tab aktif ditandai bentuk cekung + `aria-current="page"`.

### F12. Desain visual
- **Referensi:** kanvas desain "Si Paling Pulen · Desain Skeuomorphism" (artifact claude.ai pemilik).
- **Gaya:** skeuomorph cerah dan bersih. Timbul = bisa ditekan; cekung = data/isian; arsir diagonal halus = pilihan aktif.
- **Warna:** latar `#EDF1F5→#E1E8EF`, panel `#F6F8FA→#ECF0F4`, cekung `#E4EAF0`, tinta `#141B2D`, teks sekunder `#566273`, garis `#DCE3EA`, navy aksi utama `#2A3550→#121A2C`, **satu aksen oranye `#E0662E`** hanya untuk dial kalori, jarum, titik data terbaru, dan peringatan. Air: biru muda `#A9CDEB→#5E95C6`.
- **Huruf:** Plus Jakarta Sans 400–700, `font-variant-numeric: tabular-nums` untuk angka.
- **Motif identitas:** dial bergaya jam analog (garis menit, jarum, tutup tengah).
- **Tema:** terang saja di v1 (keputusan pemilik).
- **Aturan anti-slop (mode "selama"):** tanpa em dash di teks UI; target sentuh ≥ 44 px; kontras teks ≥ 4,5:1; fokus keyboard terlihat; `cursor: pointer` di semua kontrol; status hover/aktif/nonaktif; gerakan hanya hover dan hormati `prefers-reduced-motion`; tidak ada angka, testimoni, atau aset yang dikarang; setiap tampilan data punya status kosong, memuat, dan gagal.

## 10. Sumber Data Makanan & Seed

**Prinsip:** setiap angka nutrisi punya sumber (`source` + `source_ref`). **Tidak ada angka yang dikarang.** Item tanpa sumber resmi dibuat sebagai resep dari bahan bersumber, atau sebagai `estimate` yang jelas ditandai.

**Sumber:**
1. **USDA FoodData Central** (domain publik): bahan dasar, termasuk gula total dan natrium.
2. **TKPI (Tabel Komposisi Pangan Indonesia, Kemenkes):** bahan dan sebagian hidangan Indonesia. Format, cakupan, dan lisensi perlu diverifikasi (§15).
3. **Label kemasan:** whey, Xpose, dan produk lain, diinput pengguna.
4. **Open Food Facts** (ODbL, wajib atribusi): cadangan untuk produk kemasan. Opsional di v1, dipakai manual.

**Strategi impor:** tidak mengimpor seluruh dataset. Seed v1 = daftar konsumsi pengguna + bahan penyusunnya, sekitar 40–60 item. Skrip seed menyimpan sumber per item dan bisa dijalankan ulang (idempoten).

**Daftar seed dari pola makan pengguna:**

| Kelompok | Item | Rencana |
|---|---|---|
| Pokok | nasi putih, bubur nasi | Bahan bersumber; porsi "1 centong", "1½ centong" (dikalibrasi pengguna) |
| Telur | telur rebus, telur ceplok, telur dadar | Bahan bersumber |
| Kukusan | ubi rebus, jagung rebus, kacang tanah rebus, kacang-kacangan rebus lain sesuai kebutuhan | Bahan bersumber |
| Ayam | ayam goreng paha/dada, ayam bakar paha/dada (kecap manis = pemanis), ayam geprek (ayam goreng tepung + sambal) | Bahan bersumber atau resep; porsi "1 potong (¼ ekor)" |
| Hidangan | nasi telur, bubur ayam, nasi padang (komponen: nasi, rendang, ayam pop/gulai, daun singkong, sambal hijau, kuah gulai), mie ayam, bakso, soto ayam, nasi goreng | Resep dari komponen bersumber; ditandai estimasi porsi warung |
| Minuman | whey protein, Xpose | Dari label kemasan (merek diisi pengguna) |
| Pemanis | gula pasir, gula aren, kecap manis | Bahan bersumber, `is_sweetener` |
| Buah | pepaya, buah naga, mangga | Bahan bersumber |
| Air | air putih | Dicatat lewat `water_entries`, bukan `foods` |

## 11. Penanganan Error

- **Offline / gagal kirim:** entri masuk antrean IndexedDB dengan `client_id`, berlabel "menunggu terkirim", dan dikirim ulang saat `online` atau saat aplikasi dibuka. Server melakukan upsert berdasarkan `client_id` sehingga tidak ada duplikasi.
- **Sesi login habis:** arahkan ke login. Antrean tetap tersimpan dan dikirim setelah login.
- **Validasi input:** rentang wajar per kolom (§9), peringatan lunak untuk perubahan besar, error keras hanya untuk nilai mustahil (negatif, di luar rentang fisik).
- **Data perhitungan kurang:** tampilkan pesan apa yang kurang ("butuh 5 hari timbangan lagi"), jangan menampilkan angka palsu.
- **Project Supabase ter-pause:** halaman error menjelaskan cara me-restore dari dashboard Supabase.

## 12. Integrasi Masa Depan (antarmuka disiapkan, tidak dibangun di v1)

- **Apple Health:** Route Handler `POST /api/ingest/health` dengan token rahasia. iOS Shortcuts mengirim berat, langkah, kalori aktif, dan workout. v1 tidak membangun endpoint ini, tapi model data `weight_entries` sudah menampung `source` masa depan.
- **Mode adaptif:** memakai `trend-calc` (TDEE aktual) untuk mengusulkan target mingguan.

## 13. Uji Coba Deteksi Foto Makanan (paralel, kode dibuang)

- **Pertanyaan:** apakah model zero-shot di browser (mis. CLIP via Transformers.js) bisa memilih makanan yang benar dari daftar ±30 makanan pengguna?
- **Data:** 20–30 foto asli dari pengguna dengan label nama makanan, termasuk pasangan yang mirip (soto vs bakso, nasi goreng vs nasi telur).
- **Ukuran:** akurasi top-1 dan top-3, ukuran unduhan model, waktu inferensi.
- **Aturan keputusan:**
  - Top-3 ≥ 80% → fitur masuk v1.1 dengan alur foto → 3 kandidat → konfirmasi + pilih porsi. Porsi tidak pernah dari foto.
  - < 80% → pertimbangkan vision LLM free tier, setelah memverifikasi syarat dan kebijakan datanya.
- **Batasan:** sampel kecil. Hasilnya untuk keputusan layak/tidak, bukan angka akurasi presisi.
- **Prasyarat v1:** alur pencatatan menyisakan titik masuk "Foto" di layar pencarian (tersembunyi di v1).

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Porsi warung bervariasi (minyak, santan, ukuran) | Error kalori harian besar | Pencatatan per komponen, porsi terkalibrasi, evaluasi berbasis tren berat, TDEE aktual |
| Noise scan BIA | Kesimpulan otot/lemak keliru | Tanda margin error, kondisi scan dicatat, analisis tren ≥ 3 scan |
| Project Supabase free di-pause saat tidak aktif | Aplikasi tidak bisa diakses | Pemakaian harian biasanya cukup. Opsional: Vercel Cron harian yang melakukan query ringan (batas cron Hobby perlu diverifikasi). Panduan restore di halaman error. |
| Pengguna berhenti memakai karena repot | Seluruh tujuan gagal | Target ≤ 15 detik, favorit/ulangi kemarin, tanpa foto wajib |
| Data gula/natrium kosong | Total menyesatkan | Null = tidak diketahui, indikator cakupan |
| Kebijakan PWA iOS berubah | Fitur home screen terganggu | Fitur inti tidak bergantung pada API PWA khusus selain manifest + service worker |

## 15. Daftar Verifikasi (dikerjakan sebelum/saat implementasi)

Hal berikut belum diverifikasi secara langsung dan **harus dicek** sebelum dijadikan dasar implementasi:

1. TKPI: ketersediaan data dalam format yang bisa diolah, kolom yang tersedia (gula, natrium, lemak jenuh), cakupan hidangan, lisensi.
2. USDA FoodData Central: ketersediaan item spesifik (mis. buah naga/pitaya, kacang rebus) dan format unduhan.
3. Supabase Free: kebijakan pause saat tidak aktif, batas database.
4. Vercel Hobby: batas frekuensi Cron Jobs dan syarat penggunaan.
5. Perilaku PWA di versi iOS pengguna (home screen, IndexedDB, service worker).
6. Angka AKG serat untuk pria 19–29 tahun (sebagai pembanding default 25 g / 14 g per 1.000 kkal).
7. Perkiraan margin error lean mass untuk alat scan yang dipakai (default ambang 1,0 kg).
8. Trik getar iOS (`<input type="checkbox" switch>` di iOS 18+): masih bekerja di versi iOS pengguna, dan di PWA mode home screen.

## 16. Pengujian

- **Unit test (modul `*-calc`):**
  - BMR (ketiga metode), target dan pembulatan, nutrisi entri dan resep dengan null, cakupan data, gula tambahan.
  - EMA, laju regresi, aturan proyeksi (termasuk kasus laju ≤ 0 dan data kurang), kelengkapan log, TDEE aktual.
  - Contoh §8.2 dijadikan kasus uji.
- **Uji integrasi:** RLS (data hanya bisa diakses pemiliknya), constraint satu goal aktif, upsert `client_id`.
- **Uji E2E (Playwright, viewport iPhone):**
  - Onboarding.
  - Mencatat menu rutin ≤ 5 ketukan.
  - Membuat resep.
  - Antrean offline (simulasi offline → online).
  - Input scan dengan peringatan validasi.

## 17. Tahapan Implementasi (garis besar, detail di rencana implementasi)

1. **Fondasi:** proyek Next.js, Supabase (skema, RLS, auth satu akun), deploy Vercel.
2. **Modul perhitungan** + unit test.
3. **Database makanan:** skema, pencarian, skrip seed bersumber.
4. **Pencatatan:** makan, air, berat, antrean offline.
5. **Target & goal:** onboarding, pengaturan, usulan pembaruan.
6. **Scan & analisis:** input scan, progres, proyeksi, tabel periode, TDEE aktual.
7. **PWA & polish:** manifest, service worker, banner pengingat, ekspor data.
