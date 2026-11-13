# Si Paling Pulen

PWA pribadi untuk mencatat makanan, air, berat, dan hasil scan komposisi tubuh, dengan target bulking/cutting.

- PRD: `docs/superpowers/specs/2026-11-12-nutrition-tracker-design.md`
- Rencana implementasi: `docs/superpowers/plans/2026-11-12-nutrition-tracker-v1.md`

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi nilainya
npx supabase start           # butuh Docker
npm run dev
```

## Tes

```bash
npm test            # unit (Vitest)
npm run test:int    # integrasi, butuh Supabase lokal
npm run test:e2e    # Playwright, viewport iPhone
npm run typecheck && npm run lint
```

## Catatan verifikasi

- **AKG serat (PRD §15 butir 6):** PMK No. 28 Tahun 2019 (Kemenkes) mencantumkan serat **37 g/hari** untuk laki-laki 19–29 tahun ([dokumen JDIH Kemenkes](https://jdih.kemkes.go.id/common/dokumen/PMK%20No.%2028%20Th%202019%20ttg%20Angka%20Kecukupan%20Gizi%20Yang%20Dianjurkan%20Untuk%20Masyarakat%20Indonesia.pdf)). Angka dibaca dari hasil pencarian yang mengutip tabel PMK; cocokkan dengan PDF aslinya. Default aplikasi tetap `max(25, 14 g per 1.000 kkal)` (36 g pada 2.540 kkal) sampai pemilik memutuskan lain.
