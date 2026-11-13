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
