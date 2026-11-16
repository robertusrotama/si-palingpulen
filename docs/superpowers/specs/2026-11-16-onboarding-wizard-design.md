# Onboarding bertahap (satu pertanyaan per layar)

Disetujui pemilik 2026-11-16.

## Kenapa
Onboarding lama berupa satu form panjang. Pemilik ingin alur bertahap seperti pola onboarding aplikasi kalori populer (referensi visual dari pemilik): satu pertanyaan per layar, progress bar, panah kembali, kartu pilihan besar, tombol "Lanjut" menempel di bawah.

## Tujuan
- Alur 7 langkah + layar hasil target yang sudah ada.
- Angka diisi dengan komponen timbangan (`WeightRuler`) yang sudah dipakai di layar Timbang, termasuk getar.
- Server action `onboardAction` dan `TargetEditor` tidak berubah.

## Bukan tujuan / anti-tujuan
- Tidak meniru merek, teks, grafik, atau gaya hitam-putih aplikasi referensi; tetap memakai gaya app ini (navy, panel timbul).
- Tidak ada layar promosi atau survei ("dengar dari mana", "pernah coba app lain").
- Tidak ada satuan imperial.

## Langkah
1. Jenis kelamin: kartu Pria / Wanita.
2. Tanggal lahir: roda tanggal · bulan · tahun (scroll-snap).
3. Tinggi: penggaris, cm, langkah 1 (100–250).
4. Berat: penggaris, kg, langkah 0,1 (30–200).
5. Aktivitas: kartu per faktor dari `ACTIVITY`.
6. Goal: kartu Bulking / Cutting / Maintain.
7. Target berat (dilewati jika Maintain): penggaris kg, bisa "Lewati".
8. % lemak dari scan: penggaris %, langkah 0,1 (3–60), bisa "Belum punya".
Lalu "Hitung target" → `TargetEditor`.

## Pendekatan
- **Dipilih:** satu komponen klien dengan state langkah; penggaris dijadikan generik (`Ruler`) dan `WeightRuler` membungkusnya agar layar Timbang tidak berubah perilakunya.
- Ditolak: halaman/rute per langkah (state harus disimpan antar rute, tombol kembali browser jadi rumit, tanpa manfaat nyata).
- Ditolak: pustaka wizard/picker pihak ketiga (dependensi baru untuk UI sederhana).

## Detail yang diputuskan builder
- Nilai awal: tinggi 165 cm, berat 60 kg, lahir 1 Jan 2000, aktivitas 1,55, goal Bulking, target = berat + 3 kg (bulk) / −3 kg (cut), % lemak 20.
- Transisi geser antar layar; mati saat `prefers-reduced-motion`.
- Panah kembali di langkah 1 tidak tampil.
