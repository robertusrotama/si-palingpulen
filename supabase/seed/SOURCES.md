# Sumber data seed makanan

Setiap angka di `foods.seed.json` diambil otomatis oleh `scripts/build-seed.mts` dari dua sumber di bawah. Tidak ada angka yang diketik manual.

## USDA FoodData Central, SR Legacy (April 2018)

- Unduhan: `https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip`
- Lisensi: domain publik (data pemerintah AS). [High confidence]
- Kolom dipakai: Energy (1008), Protein (1003), Carbohydrate by difference (1005), Total lipid (1004), Fiber total dietary (1079), Sugars total (2000), Sodium (1093), Fatty acids total saturated (1258).
- `source_ref` = `fdc:<fdc_id>`. Porsi hanya dari `food_portion.csv` (mis. telur "large").

## TKPI, Kemenkes (panganku.org)

- Halaman detail: POST `https://www.panganku.org/id-ID/view` dengan `haha=<kode>`.
- Kolom dipakai: Energi (ENERC), Total Protein, Lemak (FATCE), Karbohidrat (CHOCDF), Serat (FIBTG), Natrium (NA). TKPI tidak memuat gula dan lemak jenuh, jadi kolom itu kosong (tidak diketahui).
- Lisensi: situs tidak mencantumkan lisensi. Disclaimer hanya menyatakan pemerintah tidak bertanggung jawab atas penggunaan data. Dipakai untuk aplikasi pribadi non-komersial. [Perlu verifikasi jika aplikasi dibagikan]
- `source_ref` = `tkpi:<kode>`.

## Tidak di-seed (dengan alasan)

| Item | Alasan |
|---|---|
| Bubur nasi, beras putih (TKPI AP0405) | 355 kkal dan lemak 12 g per 100 g, tidak masuk akal untuk bubur. Kemungkinan data bentuk lain atau salah input di sumber. |
| Kecap (TKPI NP0005) | Natrium tercatat 1 mg per 100 g, tidak masuk akal untuk kecap. |
| Soto ayam, kuah kaldu, gulai/ayam pop, sayur nangka | Tidak ada di sumber dalam bentuk yang cocok. Dirakit pemilik di aplikasi (fitur Rakit resep) atau dicatat sebagai Estimasi. |
| Kecap manis, gula aren sebagai bahan resep | Gula aren ada (TKPI MP0005), tapi gula totalnya tidak tercatat, jadi gula tambahannya tercatat "tidak diketahui". |

## Catatan nilai sumber yang perlu diketahui

- Buah naga merah (TKPI ER0012) mencatat lemak 3 g per 100 g, lebih tinggi dari umumnya buah. Dipakai apa adanya.
- Kacang tanah rebus (USDA 174260) adalah versi bergaram (natrium 751 mg per 100 g).
- "Tempe dimasak" (USDA 172467) bukan tempe goreng; tempe goreng warung lebih berminyak.

## Membangun ulang

```bash
NODE_USE_ENV_PROXY=1 npx tsx scripts/fetch-tkpi.mts supabase/seed/food-sources.json <cacheDir>
npx tsx scripts/build-seed.mts <folder CSV SR Legacy> <cacheDir>
npx vitest run scripts/seed.test.ts
npm run seed
```
