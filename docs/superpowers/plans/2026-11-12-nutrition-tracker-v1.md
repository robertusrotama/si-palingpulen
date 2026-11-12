# Si Paling Pulen v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun PWA pribadi untuk mencatat makanan/air/berat/scan, menghitung target bulking, dan menganalisis progres komposisi tubuh, sesuai PRD.

**Architecture:**
- Next.js App Router full-stack di Vercel, Supabase Postgres + Auth (satu akun, RLS).
- Semua perhitungan ada di modul TypeScript murni `src/lib/calc/*` tanpa I/O.
- Akses data lewat fungsi `src/lib/db/*` yang menerima `SupabaseClient`.
- UI memanggil Server Actions. Antrean offline memakai IndexedDB di klien.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`, Supabase CLI), zod, idb, Recharts, Vitest (+ fake-indexeddb), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-nutrition-tracker-design.md`. Nomor bagian `§x` di bawah merujuk ke dokumen ini.

## Global Constraints

- Node.js ≥ 20. Versi paket di-pin exact (`npm install --save-exact`), memakai rilis stabil terbaru saat Task 1 dikerjakan.
- **Bahasa UI: Indonesia.** Istilah gym (bulking, cutting, TDEE, macro) tetap dalam bahasa Inggris.
- Format angka memakai `Intl.NumberFormat('id-ID')`, contohnya `1.506 kkal`, `61,8 kg`.
- Semua input angka menerima koma maupun titik desimal (`parseDecimal`, Task 2).
- Satuan: gram, kkal, mg (natrium), ml (air), kg (berat).
- Nutrisi `null` = tidak diketahui, **tidak pernah** diperlakukan sebagai 0.
- Zona waktu default `Asia/Jakarta`. Semua `date` adalah tanggal lokal `YYYY-MM-DD` sesuai `profile.timezone`.
- Satu pengguna. Sign-up publik dimatikan. Semua tabel memakai RLS `user_id = auth.uid()`.
- Tidak ada Supabase Storage dan tidak ada upload foto.
- Setiap angka nutrisi seed punya `source` + `source_ref`. **Tidak ada angka nutrisi yang dikarang.**
- Hosting: Vercel Hobby + Supabase Free.
- Target interaksi: mencatat menu rutin ≤ 5 ketukan (proksi ≤ 15 detik).
- E2E Playwright memakai viewport iPhone (`devices['iPhone 14']`) dan dijalankan dengan `--trace off`.

## Review Focus

1. **Entri dekat tengah malam / zona waktu.** Makan pukul 23.30 WIB harus masuk hari itu, bukan hari berikutnya menurut UTC. Tes: Task 2 (`localDate`), Task 11 (`daySummary` memakai tanggal lokal).
2. **Desimal koma dari keyboard iPhone berbahasa Indonesia.** Input "9,2" harus terbaca 9.2, bukan NaN atau 92. Tes: Task 2 (`parseDecimal`), Task 14 (E2E mengetik "9,2").
3. **Kirim ulang saat sinyal buruk.** Pengiriman ulang tidak boleh membuat entri ganda. Tes: Task 6 (upsert `client_id`), Task 12 (flush dua kali → satu baris).
4. **Makanan diedit atau diarsipkan setelah dicatat.** Riwayat harian tidak boleh berubah, dan entri lama tetap menampilkan nama makanannya. Tes: Task 9.
5. **Target diubah di tengah riwayat.** Hari-hari sebelum perubahan tetap dinilai dengan target lama. Tes: Task 4 (`targetFor`), Task 13 (integrasi).

---

## File Structure

```
src/
  app/
    login/page.tsx, login/actions.ts
    auth/callback/route.ts
    api/test/login/route.ts            # hanya aktif saat E2E=1
    api/export/route.ts                # ekspor JSON/CSV
    manifest.ts
    (app)/layout.tsx                   # wajib sesi + profil; nav bawah
    (app)/page.tsx                     # Hari Ini
    (app)/catat/page.tsx               # alur pencatatan
    (app)/makanan/page.tsx, makanan/[id]/page.tsx, makanan/baru/page.tsx
    (app)/tubuh/berat/page.tsx, tubuh/scan/page.tsx
    (app)/progres/page.tsx
    (app)/pengaturan/page.tsx
    (app)/onboarding/page.tsx
    (app)/*/actions.ts                 # server actions per area
  components/                          # komponen UI per area (today/, log/, food/, body/, progress/)
  lib/
    calc/types.ts, nutrition.ts, targets.ts, trend.ts, periods.ts, reminders.ts
    dates.ts
    validation/number.ts, body.ts
    supabase/server.ts, client.ts, admin.ts, middleware.ts
    db/profile.ts, goals.ts, targets.ts, foods.ts, entries.ts, body.ts, analysis.ts, export.ts
    offline/queue.ts
  middleware.ts
public/sw.js, public/icons/*
supabase/
  migrations/0001_schema.sql, 0002_rls.sql, 0003_search.sql, 0004_views.sql
  seed/food-sources.json, seed/foods.seed.json
scripts/build-seed.ts, scripts/apply-seed.ts
tests/integration/helpers.ts, *.test.ts
e2e/helpers.ts, *.spec.ts
vitest.config.ts, vitest.integration.config.ts, playwright.config.ts
```

---

### Task 1: Scaffold proyek & tooling

**Files:**
- Create: proyek Next.js di root repo, `vitest.config.ts`, `vitest.integration.config.ts`, `playwright.config.ts`, `src/lib/smoke.test.ts`, `e2e/smoke.spec.ts`, `.env.example`, `README.md`

**Interfaces:**
- Produces: script npm `test` (unit), `test:int` (integration), `test:e2e`, `typecheck`, `lint`.

- [ ] **Step 1:** Jalankan `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`. Pin semua versi di `package.json` menjadi exact.
- [ ] **Step 2:** Pasang dev deps: `vitest`, `fake-indexeddb`, `@playwright/test` (versi yang cocok dengan Playwright terpasang di container; jika berbeda, set `executablePath: '/opt/pw-browsers/chromium'`), `supabase` (CLI). Pasang deps: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `idb`, `recharts`.
- [ ] **Step 3:** Konfigurasi:
  - `vitest.config.ts`: include `src/**/*.test.ts`, environment `node`.
  - `vitest.integration.config.ts`: include `tests/integration/**/*.test.ts`, `fileParallelism: false`.
  - `playwright.config.ts`: `webServer: npm run dev` dengan env `E2E=1`, project `iPhone 14`.
- [ ] **Step 4:** Tulis tes asap `smoke.test.ts` (`expect(1+1).toBe(2)`) dan `smoke.spec.ts` (halaman `/login` merespons 200).
- [ ] **Step 5:** Jalankan `npm test && npm run typecheck && npm run lint && npx playwright test e2e/smoke.spec.ts --trace off`. Expected: semua PASS.
- [ ] **Step 6:** Isi `.env.example` dengan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_EMAIL`, `E2E`, `CRON_SECRET`. README berisi cara menjalankan lokal.
- [ ] **Step 7:** Commit: `chore: scaffold Next.js + Vitest + Playwright`.

---

### Task 2: Tipe bersama, tanggal lokal, parsing desimal

**Files:**
- Create: `src/lib/calc/types.ts`, `src/lib/dates.ts`, `src/lib/validation/number.ts`
- Test: `src/lib/dates.test.ts`, `src/lib/validation/number.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export const NUTRIENTS = ['kcal','protein_g','carb_g','fat_g','fiber_g','sugar_g','added_sugar_g','sodium_mg','satfat_g'] as const;
  export type NutrientKey = typeof NUTRIENTS[number];
  export type Nutrients = Record<NutrientKey, number | null>; // kcal/protein/carb/fat wajib non-null (divalidasi saat simpan)
  export type FoodSource = 'usda'|'tkpi'|'label'|'custom'|'recipe'|'estimate';
  export type MealSlot = 'breakfast'|'lunch'|'dinner'|'snack';
  export interface FoodNutrition { per100: Nutrients; partial: NutrientKey[] }
  export interface EntryNutrients { values: Nutrients; partial: NutrientKey[] }
  ```
- Produces (`dates.ts`):
  - `localDate(instantIso: string, tz: string): string` (YYYY-MM-DD)
  - `localTime(instantIso: string, tz: string): string` (HH:mm)
  - `mealSlotFor(hhmm: string): MealSlot`
  - `addDays(date: string, n: number): string`
  - `daysBetween(a: string, b: string): number` (b − a)
- Produces (`number.ts`): `parseDecimal(input: string): number | null`

- [ ] **Step 1: Tes gagal.**
  ```ts
  expect(localDate('2026-11-12T16:30:00Z','Asia/Jakarta')).toBe('2026-11-12'); // 23.30 WIB
  expect(localDate('2026-11-12T17:30:00Z','Asia/Jakarta')).toBe('2026-11-13'); // 00.30 WIB
  expect(mealSlotFor('09:59')).toBe('breakfast'); expect(mealSlotFor('10:00')).toBe('lunch');
  expect(mealSlotFor('14:59')).toBe('lunch');     expect(mealSlotFor('15:00')).toBe('snack');
  expect(mealSlotFor('17:59')).toBe('snack');     expect(mealSlotFor('18:00')).toBe('dinner');
  expect(addDays('2026-11-12', 70)).toBe('2027-01-21'); expect(daysBetween('2026-11-12','2027-01-21')).toBe(70);
  expect(parseDecimal('9,2')).toBe(9.2); expect(parseDecimal(' 61.8 ')).toBe(61.8); expect(parseDecimal('120')).toBe(120);
  expect(parseDecimal('9,2,1')).toBeNull(); expect(parseDecimal('abc')).toBeNull(); expect(parseDecimal('')).toBeNull();
  ```
- [ ] **Step 2:** `npx vitest run src/lib/dates.test.ts src/lib/validation/number.test.ts`. Expected: FAIL (modul belum ada).
- [ ] **Step 3:** Implementasi.
  - `localDate`/`localTime` memakai `Intl.DateTimeFormat` dengan `timeZone`, tanpa dependensi tambahan.
  - `addDays`/`daysBetween` bekerja dalam UTC pada tanggal murni.
  - `parseDecimal` menerima tepat satu pemisah `,` atau `.` dan menolak pemisah ribuan.
- [ ] **Step 4:** Jalankan tes yang sama. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: shared types, local dates, decimal parsing`.

---

### Task 3: Kalkulasi nutrisi (§8.3, §8.4)

**Files:**
- Create: `src/lib/calc/nutrition.ts`
- Test: `src/lib/calc/nutrition.test.ts`

**Interfaces:**
- Consumes: tipe dari Task 2.
- Produces:
  - `entryNutrients(food: FoodNutrition, grams: number): EntryNutrients`
  - `scaleEntry(e: EntryNutrients, fromGrams: number, toGrams: number): EntryNutrients`
  - `recipePer100(items: { food: FoodNutrition; grams: number }[]): FoodNutrition`
  - `resolveAddedSugarPer100(i: { source: FoodSource; isSweetener: boolean; sugarPer100: number|null; labelAddedSugarPer100?: number|null }): number|null`
  - `sumDay(entries: EntryNutrients[]): { totals: Nutrients; coverage: Record<NutrientKey, number> }`
  - `perServingToPer100(perServing: Partial<Nutrients>, servingG: number): Nutrients`

- [ ] **Step 1: Tes gagal** (angka di bawah adalah fixture uji, bukan data seed):
  ```ts
  const rice = { per100: n({kcal:130, protein_g:2.7, carb_g:28, fat_g:0.3, fiber_g:0.4, sugar_g:null}), partial: [] };
  expect(entryNutrients(rice,150).values.kcal).toBeCloseTo(195);
  expect(entryNutrients(rice,150).values.sugar_g).toBeNull();
  // resep: A 100 g gula 10/100g, B 50 g gula null -> gula sebagian 6.67/100g
  const r = recipePer100([{food:A,grams:100},{food:B,grams:50}]);
  expect(r.per100.sugar_g).toBeCloseTo(6.667,2); expect(r.partial).toContain('sugar_g');
  // nutrien yang semua bahannya null -> null, bukan sebagian
  // sumDay: 400 kkal natrium diketahui + 600 kkal natrium null -> coverage 40
  expect(sumDay([e400, e600]).coverage.sodium_mg).toBe(40);
  expect(sumDay([]).totals.kcal).toBe(0);
  // gula tambahan
  expect(resolveAddedSugarPer100({source:'usda',isSweetener:true,sugarPer100:98})).toBe(98);
  expect(resolveAddedSugarPer100({source:'usda',isSweetener:false,sugarPer100:12})).toBe(0);
  expect(resolveAddedSugarPer100({source:'tkpi',isSweetener:false,sugarPer100:null})).toBe(0);
  expect(resolveAddedSugarPer100({source:'label',isSweetener:false,sugarPer100:5,labelAddedSugarPer100:3})).toBe(3);
  expect(resolveAddedSugarPer100({source:'label',isSweetener:false,sugarPer100:5})).toBeNull();
  expect(resolveAddedSugarPer100({source:'estimate',isSweetener:false,sugarPer100:null})).toBeNull();
  // perServingToPer100: sajian 30 g, protein 24 -> 80/100g
  expect(scaleEntry(entryNutrients(rice,150),150,75).values.kcal).toBeCloseTo(97.5);
  ```
- [ ] **Step 2:** `npx vitest run src/lib/calc/nutrition.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
  - Gula tambahan resep = `recipePer100` atas kolom `added_sugar_g` bahan (sudah di-resolve saat bahan disimpan), dengan aturan null/sebagian yang sama.
  - `coverage` dihitung berbobot kkal. Hari tanpa kkal → coverage 100.
  - Field `partial` dari entri ikut diwariskan ke totals.
- [ ] **Step 4:** Jalankan tes. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: nutrition calc (entries, recipes, coverage, added sugar)`.

---

### Task 4: Kalkulasi target (§8.1, §8.2)

**Files:**
- Create: `src/lib/calc/targets.ts`
- Test: `src/lib/calc/targets.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type BmrMethod = 'auto'|'katch'|'mifflin'|'scan';
  export interface TargetValues { kcal:number; protein_g:number; carb_g:number; fat_g:number; fiber_g:number; water_ml:number; added_sugar_max_g:number; sodium_max_mg:number; satfat_max_g:number }
  export interface TargetRow extends TargetValues { effective_from: string; is_manual_override: boolean; calc_inputs: CalcInputs | null }
  export interface CalcInputs { bmr:number; method:'katch'|'mifflin'|'scan'; activityFactor:number; weightKg:number; ratePctPerWeek:number }
  ```
  - `mifflin(p: { sex:'male'|'female'; weightKg:number; heightCm:number; ageYears:number }): number`
  - `katch(weightKg:number, bfPct:number): number`
  - `ageOn(birthDate:string, onDate:string): number`
  - `selectBmr(i: { method:BmrMethod; sex; heightCm; birthDate; weightKg; today:string; latestScan: { date:string; bfPct:number|null; bmrKcal:number|null } | null }): { bmr:number; method:'katch'|'mifflin'|'scan' }`
  - `computeTargets(i: { bmr:number; activityFactor:number; weightKg:number; ratePctPerWeek:number; proteinGPerKg?: number }): TargetValues`
  - `targetFor(date:string, rows: TargetRow[]): TargetRow | null`
  - `shouldSuggestUpdate(i: { calcWeightKg:number; trendKg:number|null; targetsEffectiveFrom:string; latestScanDate:string|null }): boolean`

- [ ] **Step 1: Tes gagal:**
  ```ts
  expect(mifflin({sex:'male',weightKg:61.8,heightCm:165,ageYears:26})).toBeCloseTo(1524.25);
  expect(mifflin({sex:'female',weightKg:61.8,heightCm:165,ageYears:26})).toBeCloseTo(1358.25);
  expect(katch(61.8,14.9)).toBeCloseTo(1505.98,1);
  // auto: scan 30 hari -> katch; 61 hari -> mifflin; tanpa scan -> mifflin; 'scan' tanpa bmrKcal -> mifflin
  const t = computeTargets({bmr:1505.98, activityFactor:1.55, weightKg:61.8, ratePctPerWeek:0.3});
  expect(t).toEqual({kcal:2540, protein_g:111, fat_g:71, carb_g:365, fiber_g:36, water_ml:2150,
                     added_sugar_max_g:64, sodium_max_mg:2000, satfat_max_g:28});
  expect(computeTargets({bmr:1505.98,activityFactor:1.55,weightKg:61.8,ratePctPerWeek:-0.5}).kcal).toBe(1990);
  // fiber minimum 25: kcal 1500 -> 14*1.5=21 -> 25
  expect(targetFor('2026-11-10',[row('2026-11-01'),row('2026-11-11')])!.effective_from).toBe('2026-11-01');
  expect(targetFor('2026-10-31',[row('2026-11-01')])).toBeNull();
  expect(shouldSuggestUpdate({calcWeightKg:61.8,trendKg:63.2,targetsEffectiveFrom:'2026-11-12',latestScanDate:null})).toBe(true);  // +2,27%
  expect(shouldSuggestUpdate({calcWeightKg:61.8,trendKg:63.0,targetsEffectiveFrom:'2026-11-12',latestScanDate:null})).toBe(false); // +1,94%
  expect(shouldSuggestUpdate({calcWeightKg:61.8,trendKg:61.8,targetsEffectiveFrom:'2026-11-12',latestScanDate:'2026-11-20'})).toBe(true);
  ```
- [ ] **Step 2:** `npx vitest run src/lib/calc/targets.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implementasi rumus §8.1–§8.2.
  - `carb_g` dihitung dari protein dan lemak **sebelum dibulatkan**.
  - Pembulatan: kkal `round10`, air `round50`, gram dan mg `Math.round`.
  - Surplus memakai 7.700 kkal/kg.
  - Batas 60 hari scan untuk metode `auto` dihitung dengan `daysBetween`.
- [ ] **Step 4:** Jalankan tes. Expected: PASS.
- [ ] **Step 5: Verifikasi §15 butir 6.** Cek angka AKG serat untuk pria 19–29 tahun dari sumber resmi Kemenkes, lalu catat hasil dan sumbernya di README. **Default kode tidak diubah** tanpa persetujuan pengguna.
- [ ] **Step 6:** Commit: `feat: BMR/TDEE/target calc`.

---

### Task 5: Kalkulasi tren, laju, proyeksi, TDEE aktual (§8.5, §8.6)

**Files:**
- Create: `src/lib/calc/trend.ts`
- Test: `src/lib/calc/trend.test.ts`

**Interfaces:**
- Consumes: `addDays`, `daysBetween` (Task 2).
- Produces:
  ```ts
  export interface TrendPoint { date:string; trendKg:number; rawKg:number }
  export type RateStatus = 'in_range'|'above'|'below'|'wrong_direction'|'n/a';
  export type Projection = { kind:'range'; earliest:string; expected:string; latest:string } | { kind:'earliest_only'; earliest:string } | { kind:'none' };
  ```
  - `emaTrend(weights: { date:string; measuredAt:string; weightKg:number }[], alpha = 0.1): TrendPoint[]`
  - `linearSlope(points: { x:number; y:number }[]): { slope:number; se:number } | null` (n ≥ 3)
  - `weightRate(trend: TrendPoint[], asOf:string): { kgPerWeek:number; pctPerWeek:number; seKgPerWeek:number } | null`
  - `rateStatus(kgPerWeek:number, goal: { type:'bulk'|'cut'|'maintain'; ratePctPerWeek:number }, weightKg:number): RateStatus`
  - `persistentWarning(history: { date:string; status:RateStatus; kgPerWeek:number }[], goalType:'bulk'|'cut'|'maintain'): 'fast_gain'|'no_gain'|null`
  - `projectDate(i: { current:number; target:number; ratePerWeek:number; sePerWeek:number; asOf:string }): Projection`
  - `roundToHalfMonth(date:string): string`
  - `bfRate(scans: { date:string; bfPct:number }[]): { ratePerWeek:number; sePerWeek:number } | null`
  - `isCompleteDay(i: { slotsLogged:number; kcal:number; targetKcal:number }): boolean`
  - `actualTdee(i: { days: { date:string; kcal:number; complete:boolean }[]; slopeKgPerDay:number; firstLogDate:string; asOf:string }): number | null`

- [ ] **Step 1: Tes gagal:**
  ```ts
  // EMA: entri pertama per hari (urut measuredAt); hari kosong tidak memperbarui
  expect(emaTrend([w('2026-11-01',60),w('2026-11-03',61)]).map(p=>p.trendKg)).toEqual([60,60.1]);
  expect(emaTrend([w('2026-11-01',60,'07:00'),w('2026-11-01',62,'20:00')]).length).toBe(1);
  // laju: tren naik 0,04 kg/hari selama 21 hari -> 0,28 kg/minggu
  expect(weightRate(linearTrend(21,0.04),'2026-11-21')!.kgPerWeek).toBeCloseTo(0.28,3);
  expect(weightRate(linearTrend(13,0.04),'2026-11-13')).toBeNull();        // rentang < 14 hari
  expect(weightRate(sparseTrend(9),'2026-11-21')).toBeNull();               // < 10 timbangan
  // status untuk bulk 0,3%/mgg di 61,8 kg -> rentang 0,0927..0,2781 kg/mgg
  expect(rateStatus(0.2,bulk,61.8)).toBe('in_range'); expect(rateStatus(0.3,bulk,61.8)).toBe('above');
  expect(rateStatus(0.05,bulk,61.8)).toBe('below'); expect(rateStatus(-0.1,bulk,61.8)).toBe('wrong_direction');
  expect(rateStatus(0.1,{type:'maintain',ratePctPerWeek:0},61.8)).toBe('n/a');
  // peringatan: 14 hari berturut 'above' -> fast_gain; 13 hari -> null; 14 hari kgPerWeek<=0 -> no_gain
  // proyeksi dari 2026-11-12: sisa 3 kg, laju 0,25±0,05 -> 70/84/105 hari
  expect(projectDate({current:62,target:65,ratePerWeek:0.25,sePerWeek:0.05,asOf:'2026-11-12'}))
    .toEqual({kind:'range',earliest:'2027-01-31',expected:'2027-02-15',latest:'2027-02-28'});
  expect(projectDate({current:62,target:65,ratePerWeek:0.04,sePerWeek:0.05,asOf:'2026-11-12'}).kind).toBe('earliest_only');
  expect(projectDate({current:62,target:65,ratePerWeek:-0.1,sePerWeek:0.05,asOf:'2026-11-12'}).kind).toBe('none');
  expect(roundToHalfMonth('2027-02-04')).toBe('2027-02-15'); expect(roundToHalfMonth('2027-02-16')).toBe('2027-02-28');
  expect(bfRate([s('2026-11-07',14.9),s('2026-12-05',15.1)])).toBeNull(); // < 3 scan
  expect(isCompleteDay({slotsLogged:2,kcal:1524,targetKcal:2540})).toBe(true);
  expect(isCompleteDay({slotsLogged:2,kcal:1523,targetKcal:2540})).toBe(false);
  expect(isCompleteDay({slotsLogged:1,kcal:3000,targetKcal:2540})).toBe(false);
  // TDEE aktual: 28 hari, 25 lengkap, rata2 2600, slope 0,03 kg/hari -> 2600-231 = 2369
  expect(actualTdee(case28)).toBeCloseTo(2369); expect(actualTdee(only20days)).toBeNull(); expect(actualTdee(lowCompleteness)).toBeNull();
  ```
- [ ] **Step 2:** `npx vitest run src/lib/calc/trend.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
  - `weightRate`: regresi `trendKg` terhadap hari, untuk titik dengan `date` dalam (asOf − 20 … asOf). Syarat: `daysBetween(first,last) ≥ 14` dan ≥ 10 titik.
  - `pctPerWeek` = `kgPerWeek` / tren terakhir × 100.
  - `projectDate`: rentang dari laju ± SE (laju cepat → `earliest`). Jika `rate − se ≤ 0` hanya `earliest`. Jika `rate ≤ 0` atau arah laju berlawanan dengan `target − current` → `none`. Semua tanggal lewat `roundToHalfMonth` (tanggal ≤ 15 → tgl 15, selain itu → akhir bulan).
  - `actualTdee`: window = `min(28, daysBetween(firstLogDate, asOf) + 1)`. Syarat window ≥ 21 dan hari lengkap/window ≥ 0,8. Rata-rata hanya dari hari lengkap.
- [ ] **Step 4:** Jalankan tes. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: weight trend, rate, projection, actual TDEE`.

---

### Task 6: Skema database, RLS, pencarian

**Files:**
- Create: `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_search.sql`, `0004_views.sql`
- Test: `tests/integration/helpers.ts`, `tests/integration/schema.test.ts`

**Interfaces:**
- Produces: tabel §7 dengan tambahan berikut:
  - `foods`: `search_text text` (dirawat trigger dari `name` + `aliases`), `partial_nutrients text[] default '{}'`, `archived_at timestamptz`, `label_added_sugar_g numeric`.
  - `food_entries`: `partial_nutrients text[]`, `deleted_at timestamptz`.
- Produces: RPC `search_foods(q text, max_results int default 20) returns setof foods`.
- Produces: view `daily_totals(user_id, date, kcal, protein_g, fiber_g, slots_logged)` dengan `security_invoker = true`.
- Produces helper uji:
  - `createTestUser(email:string): Promise<SupabaseClient>` (sudah login)
  - `adminClient(): SupabaseClient`

- [ ] **Step 1:** Jalankan `npx supabase start`. Expected: stack lokal berjalan.
  - Jika daemon Docker tidak tersedia di container, coba `sudo dockerd &` sekali.
  - Jika tetap gagal, minta pengguna membuat project Supabase **terpisah khusus tes** dan isi env-nya di `.env.test.local`. **Jangan pernah memakai project produksi untuk tes.**
- [ ] **Step 2: Tes gagal** (`schema.test.ts`):
  - `rls: user B tidak bisa select/insert food_entries milik user A` (select → 0 baris; insert dengan user_id A → error).
  - `goals: insert goal aktif kedua -> error unique`.
  - `food_entries: upsert dengan client_id sama dua kali -> 1 baris`.
  - `search_foods('gepre') mengembalikan 'ayam geprek'`; `search_foods('geprek')` tidak mengembalikan makanan yang `archived_at` terisi.
  - `daily_totals hanya berisi baris milik pemanggil` dan mengabaikan entri `deleted_at`.
- [ ] **Step 3:** `npm run test:int`. Expected: FAIL.
- [ ] **Step 4:** Tulis migrasi.
  - Semua kolom per §7. FK `food_entries.food_id → foods` dengan `on delete restrict`, karena makanan diarsipkan, bukan dihapus.
  - Unique `(user_id, client_id)` pada ketiga tabel entri.
  - Partial unique index `goals(user_id) where end_date is null`.
  - `check` untuk enum dan rentang dasar (gram > 0, ml > 0).
  - Kolom `user_id uuid not null default auth.uid()`.
  - RLS dengan policy `for all using (user_id = auth.uid()) with check (user_id = auth.uid())` di setiap tabel.
  - `create extension pg_trgm`, index GIN trigram pada `search_text`.
  - `search_foods`: filter `archived_at is null` dan `(search_text ilike '%'||q||'%' or word_similarity(q, search_text) >= 0.3)`, urut `word_similarity desc, name`, `security invoker`.
- [ ] **Step 5:** `npx supabase db reset && npm run test:int`. Expected: PASS.
- [ ] **Step 6:** Jalankan `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`.
- [ ] **Step 7:** Commit: `feat: database schema, RLS, food search`.

---

### Task 7: Auth satu akun & app shell

**Files:**
- Create: `src/lib/supabase/server.ts`, `client.ts`, `admin.ts`, `middleware.ts`, `src/middleware.ts`, `src/app/login/*`, `src/app/auth/callback/route.ts`, `src/app/api/test/login/route.ts`, `src/app/(app)/layout.tsx`, `src/lib/auth/allowlist.ts`
- Test: `src/lib/auth/allowlist.test.ts`, `src/app/api/test/login/route.test.ts`, `e2e/helpers.ts`, `e2e/auth.spec.ts`

**Interfaces:**
- Produces:
  - `createServerSupabase(): Promise<SupabaseClient<Database>>`
  - `createBrowserSupabase(): SupabaseClient<Database>`
  - `isAllowedEmail(email:string, allowed:string): boolean` (case-insensitive, trim)
- Produces E2E helper: `loginAsTestUser(page: Page): Promise<void>`, memanggil `POST /api/test/login`.
- Produces layout: halaman di `(app)` wajib sesi. Jika belum ada `profile`, pengguna diarahkan ke `/onboarding` (halamannya dibangun di Task 13). Nav bawah: Hari Ini, Catat, Progres, Pengaturan.

- [ ] **Step 1: Tes gagal:**
  - `isAllowedEmail(' A@x.com ','a@x.com') === true`; `isAllowedEmail('b@x.com','a@x.com') === false`.
  - Route `/api/test/login` mengembalikan 404 jika `process.env.E2E !== '1'`.
  - E2E `auth.spec.ts`:
    - Tanpa sesi, `/` dialihkan ke `/login`.
    - Submit email apa pun menampilkan teks persis "Kalau email terdaftar, link masuk sudah dikirim." (tidak membocorkan email mana yang diizinkan).
    - Setelah `loginAsTestUser`, `/` tidak dialihkan ke `/login`.
- [ ] **Step 2:** Jalankan `npx vitest run src/lib/auth src/app/api/test && npx playwright test e2e/auth.spec.ts --trace off`. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
  - Login memanggil `signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: <origin>/auth/callback } })` hanya jika `isAllowedEmail`. Respons UI selalu sama.
  - `/auth/callback` menukar `code` menjadi sesi.
  - Middleware me-refresh sesi dengan pola `@supabase/ssr`.
  - `/api/test/login` (hanya saat E2E=1) membuat atau memakai user tes lewat admin client, lalu `signInWithPassword` dan menyetel cookie sesi.
  - Di `supabase/config.toml`, set `[auth] enable_signup = false`.
- [ ] **Step 4:** Jalankan perintah Step 2. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: single-user magic link auth and app shell`.

---

### Task 8: Data seed makanan bersumber (§10)

**Files:**
- Create: `supabase/seed/food-sources.json`, `scripts/build-seed.ts`, `supabase/seed/foods.seed.json` (hasil build, di-commit), `scripts/apply-seed.ts`
- Test: `scripts/seed.test.ts` (masuk konfigurasi unit Vitest)

**Interfaces:**
- Produces format `foods.seed.json`: `{ key:string; name:string; aliases:string[]; source:'usda'|'tkpi'; source_ref:string; is_sweetener:boolean; per100: Nutrients; portions: { label:string; grams:number }[]; atwater_exempt?: string }[]`
- Produces: `npm run seed` memanggil `apply-seed.ts`, yang melakukan upsert berdasarkan `(user_id, source, source_ref)` (idempoten) untuk user dari `ALLOWED_EMAIL`.

- [ ] **Step 1: Verifikasi §15 butir 1–2.**
  - Cek ketersediaan, format, kolom, dan lisensi TKPI dari situs resmi Kemenkes.
  - Cek item USDA FoodData Central dan akses API-nya (`api.nal.usda.gov`).
  - Tulis temuan dan URL-nya di `supabase/seed/SOURCES.md`.
  - Jika host diblokir jaringan container, minta pengguna menambah host lewat pengaturan environment. **Jangan mengisi angka dari ingatan.**
- [ ] **Step 2:** Isi `food-sources.json` dengan daftar **bahan** berikut, masing-masing dengan ID sumber terpilih (fdcId USDA atau kode TKPI):
  - nasi putih, bubur nasi
  - telur rebus, telur ceplok, telur dadar
  - ubi jalar rebus, jagung rebus, kacang tanah rebus, edamame rebus
  - ayam goreng paha dan dada (dengan kulit), ayam panggang paha dan dada, ayam goreng tepung
  - daging sapi masak, mie kuning rebus, bakso sapi
  - tempe goreng, tahu goreng, sawi hijau rebus, daun singkong rebus
  - kaldu/kuah, santan, minyak goreng
  - gula pasir, gula aren, kecap manis (`is_sweetener: true`)
  - pepaya, buah naga, mangga

  Hidangan warung **tidak** di-seed. Pengguna merakitnya di aplikasi (Task 10), supaya komposisi gramnya tidak dikarang.
- [ ] **Step 3: Tes gagal** (`seed.test.ts`), dengan iterasi atas `foods.seed.json`:
  - Setiap item punya `source_ref` non-kosong.
  - `kcal`, `protein_g`, `carb_g`, `fat_g` non-null dan ≥ 0.
  - `|kcal − (4P + 4C + 9F)| / kcal ≤ 0.15` kecuali ada `atwater_exempt` beralasan.
  - Setiap `key` dari `food-sources.json` ada di hasil.
- [ ] **Step 4:** Jalankan `npx tsx scripts/build-seed.ts`. Skrip menarik nilai dari USDA API (`DEMO_KEY` atau key dari env) dan dari file TKPI yang diunduh. Lalu `npx vitest run scripts/seed.test.ts`. Expected: PASS.
- [ ] **Step 5:** Jalankan `npm run seed` dua kali ke database lokal. Expected: jumlah baris `foods` sama setelah eksekusi kedua.
- [ ] **Step 6:** Commit: `feat: sourced food seed data`.

---

### Task 9: Repositori makanan (data layer)

**Files:**
- Create: `src/lib/db/foods.ts`
- Test: `tests/integration/foods.test.ts`

**Interfaces:**
- Consumes: `entryNutrients`, `recipePer100`, `resolveAddedSugarPer100`, `perServingToPer100` (Task 3); RPC `search_foods` (Task 6).
- Produces (semua fungsi menerima `sb: SupabaseClient<Database>` sebagai argumen pertama):
  - `searchFoods(sb, q:string, limit=20): Promise<FoodRow[]>`
  - `favoriteFoods(sb): Promise<FoodRow[]>`
  - `recentFoods(sb, asOf:string, days=14): Promise<FoodRow[]>` (urut frekuensi)
  - `getFood(sb, id): Promise<FoodRow & { portions: PortionRow[] }>`
  - `createLabelFood(sb, i: { name; aliases; servingG:number; perServing: Partial<Nutrients>; addedSugarPerServing?: number|null; isSweetener?: boolean; portions?: {label;grams}[] }): Promise<FoodRow>`
  - `createEstimateFood(sb, i: { name; aliases; per100: Partial<Nutrients>; portions?: {label;grams}[] }): Promise<FoodRow>`
  - `saveRecipe(sb, i: { id?:string; name; aliases; items: { foodId:string; grams:number }[]; portions?: {label;grams}[] }): Promise<FoodRow>`
  - `updateFood(sb, id, patch): Promise<FoodRow>`
  - `archiveFood(sb, id): Promise<void>`
  - `upsertPortion(sb, i: { foodId; label; grams; isCalibrated }): Promise<PortionRow>`
  - `toggleFavorite(sb, id, fav:boolean)`
  - `saveMeal(sb, i: { id?; name; items: { foodId; grams; portionLabel? }[] })`
  - `listSavedMeals(sb)`
  - `applyFoodToPastEntries(sb, foodId, from:string, to:string): Promise<number>`

- [ ] **Step 1: Tes gagal:**
  - `createLabelFood` dengan sajian 30 g dan protein 24 → `protein_g` per 100 = 80.
  - `createEstimateFood` → `source='estimate'`, `is_estimate=true`, `added_sugar_g=null`.
  - `saveRecipe` dari dua bahan → nutrisi per 100 sesuai `recipePer100` dan `partial_nutrients` terisi.
  - `saveRecipe` dengan bahan bertipe resep → error `nested_recipe`.
  - `updateFood(bahan)` → resep yang memakainya dihitung ulang.
  - **Review Focus 4:**
    - `updateFood` setelah makanan dicatat → snapshot `food_entries` lama tidak berubah.
    - `archiveFood` → hilang dari `searchFoods`, tapi entri lama tetap bisa join ke nama makanannya.
    - `archiveFood` pada bahan yang dipakai resep aktif → error `used_in_recipe`.
  - `applyFoodToPastEntries` hanya memperbarui entri dalam rentang tanggal dan mengembalikan jumlahnya.
- [ ] **Step 2:** `npm run test:int -- foods`. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
  - Validasi input dengan zod: kkal/P/K/L wajib, gram > 0.
  - Kolom `added_sugar_g` di-resolve saat simpan.
  - `recentFoods` membaca `food_entries` non-deleted dalam rentang lalu mengelompokkan per `food_id`.
- [ ] **Step 4:** Jalankan tes. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: food repository`.

---

### Task 10: UI kelola makanan (F4)

**Files:**
- Create: `src/app/(app)/makanan/**`, `src/components/food/*`
- Test: `e2e/foods.spec.ts`

**Interfaces:**
- Consumes: fungsi Task 9 lewat server actions di `src/app/(app)/makanan/actions.ts`.
- Produces: komponen `PortionPicker({ portions, grams, onChange })` dan `NutrientPreview({ values, partial })`, yang dipakai ulang di Task 11.

- [ ] **Step 1: Tes E2E gagal:**
  - `buat makanan dari label`: nama "Whey Test", sajian 30 g, kkal 120, P 24, K 3, L 1,5. Halaman detail menampilkan "400 kkal / 100 g".
  - `rakit resep`: pilih nasi putih 150 g + ayam goreng paha 90 g + minyak goreng 5 g, simpan sebagai "Nasi ayam test", tambah porsi "1 piring" = total gram. Pratinjau menampilkan kkal yang sama dengan jumlah bahan.
  - `estimasi cepat`: makanan berlabel "Estimasi" di daftar.
  - `kalibrasi porsi`: ubah "1 centong" nasi menjadi 130 g. Chip porsi menampilkan tanda "ditimbang".
  - `input koma`: kolom lemak menerima "1,5".
- [ ] **Step 2:** `npx playwright test e2e/foods.spec.ts --trace off`. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
  - Halaman daftar (cari, favorit), detail (nutrisi per 100 g, porsi, arsip, "Terapkan ke entri lama" dengan rentang tanggal), dan form baru dengan tiga tab: Label / Rakit / Estimasi.
  - Semua input angka memakai `inputMode="decimal"` dan `parseDecimal`.
  - Nilai null ditampilkan sebagai "—", bukan 0.
- [ ] **Step 4:** Jalankan tes. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: food management UI`.

---

### Task 11: Pencatatan & layar Hari Ini (F2, F3, F5)

**Files:**
- Create: `src/lib/db/entries.ts`, `src/app/(app)/page.tsx`, `src/app/(app)/catat/*`, `src/components/today/*`, `src/components/log/*`
- Test: `tests/integration/entries.test.ts`, `e2e/logging.spec.ts`

**Interfaces:**
- Consumes: Task 3 (`entryNutrients`, `scaleEntry`, `sumDay`), Task 4 (`targetFor`), Task 2 (`localDate`, `localTime`, `mealSlotFor`), Task 9, Task 10 (`PortionPicker`, `NutrientPreview`).
- Produces:
  - `logFoodEntries(sb, rows: { clientId:string; date:string; mealSlot:MealSlot; loggedAt:string; foodId:string; grams:number; portionLabel?:string }[]): Promise<void>` (snapshot dihitung di server, upsert by `client_id`)
  - `updateFoodEntry(sb, id, patch: { grams?:number; mealSlot?:MealSlot }): Promise<void>` (snapshot di-scale dari snapshot lama)
  - `softDeleteEntry(sb, id)`, `restoreEntry(sb, id)`
  - `copySlotFromDate(sb, i: { fromDate; toDate; slot:MealSlot; nowIso:string }): Promise<number>`
  - `expandSavedMeal(sb, i: { mealId; date; slot; nowIso }): Promise<void>`
  - `addWater(sb, i: { clientId; date; loggedAt; ml }): Promise<void>`
  - `daySummary(sb, date:string): Promise<DaySummary>`, dengan
    ```ts
    interface DaySummary { date:string; bySlot: Record<MealSlot, { entries: EntryView[]; kcal:number; fiber_g:number|null }>;
      totals: Nutrients; coverage: Record<NutrientKey,number>; waterMl:number; target: TargetRow|null; slotsLogged:number }
    ```

- [ ] **Step 1: Tes integrasi gagal:**
  - `logFoodEntries` menyimpan snapshot = `entryNutrients(food, grams)`.
  - `updateFoodEntry` grams 150→75 → kkal setengahnya.
  - `softDeleteEntry` → tidak ikut di `daySummary`; `restoreEntry` → ikut lagi.
  - `copySlotFromDate` menyalin semua entri slot itu dengan `client_id` baru.
  - **Review Focus 1:** entri dengan `loggedAt` 2026-11-12T16:30Z dan `date='2026-11-12'` masuk `daySummary('2026-11-12')`.
  - `daySummary.target` = `targetFor(date)`.
- [ ] **Step 2: Tes E2E gagal** (fixture dibuat sendiri di `beforeAll` lewat admin client, tidak bergantung pada tes Task 10):
  - `catat menu favorit ≤ 5 ketukan`: dari Hari Ini, ketuk "+ Catat" → favorit "Nasi ayam test" → chip "1 piring" → "Simpan". Hitungan klik ≤ 5 dan kkal Hari Ini bertambah.
  - `ulangi makan siang kemarin` menyalin entri.
  - `hapus lalu Urungkan` mengembalikan entri.
  - `+250 ml` menambah air.
  - Pencarian "gepre" menampilkan "ayam geprek" jika ada.
  - Waktu makan default mengikuti jam (gunakan `page.clock` untuk menyetel 15:30 → "Snack").
- [ ] **Step 3:** `npm run test:int -- entries && npx playwright test e2e/logging.spec.ts --trace off`. Expected: FAIL.
- [ ] **Step 4:** Implementasi.
  - Layar Hari Ini sesuai F2: indikator besar kkal/protein/serat dengan sisa, indikator kecil karbo/lemak/air, batas dengan teks cakupan *"data dari X% makanan"* jika < 100, daftar per slot dengan subtotal kkal dan serat, navigasi tanggal.
  - Alur Catat sesuai F3. Daftar Terakhir memakai `recentFoods(asOf, 14)`.
  - Tombol "Foto" disiapkan tapi disembunyikan (`hidden`), sebagai titik masuk v1.1 (§13).
  - Undo hapus aktif 5 detik lewat toast.
- [ ] **Step 5:** Jalankan perintah Step 3. Expected: PASS.
- [ ] **Step 6:** Commit: `feat: food/water logging and Today screen`.

---

### Task 12: Antrean offline

**Files:**
- Create: `src/lib/offline/queue.ts`, `src/app/(app)/sync/actions.ts`, `src/components/log/PendingBadge.tsx`
- Test: `src/lib/offline/queue.test.ts`, `e2e/offline.spec.ts`

**Interfaces:**
- Consumes: `logFoodEntries`, `addWater` (Task 11). `addWeight` dari Task 14 ditambahkan ke `send` saat Task 14.
- Produces:
  ```ts
  type QueuedOp = { clientId:string; kind:'food_entries'|'water_entry'|'weight_entry'; payload:unknown; createdAt:string; attempts:number };
  ```
  - `enqueue(op: Omit<QueuedOp,'attempts'>): Promise<void>`
  - `pending(): Promise<QueuedOp[]>`
  - `flush(send: (op:QueuedOp) => Promise<'ok'|'retry'|'drop'>): Promise<{ sent:number; remaining:number }>`
  - Hook `useSyncOnReconnect()`, yang memanggil `flush` saat event `online` dan saat aplikasi dibuka.
- Semua tulis dari UI lewat alur: buat `clientId` (`crypto.randomUUID()`) → coba kirim → jika gagal jaringan → `enqueue`.

- [ ] **Step 1: Tes gagal** (fake-indexeddb):
  - `flush` dengan `send` 'ok' mengosongkan antrean.
  - `retry` menaikkan `attempts` dan item tetap ada.
  - `drop` menghapus item.
  - Urutan pengiriman mengikuti `createdAt`.
  - **Review Focus 3:** E2E `offline.spec.ts`:
    - `context.setOffline(true)` → catat makanan → badge "menunggu terkirim" tampil.
    - `setOffline(false)` → badge hilang, dan entri muncul **tepat sekali** setelah reload, termasuk ketika `flush` dipicu dua kali.
- [ ] **Step 2:** `npx vitest run src/lib/offline && npx playwright test e2e/offline.spec.ts --trace off`. Expected: FAIL.
- [ ] **Step 3:** Implementasi dengan `idb` (DB `spp-queue`, store `ops`, key `clientId`).
  - Error 401 → `retry`, dan antrean disimpan sampai login lagi.
  - Error validasi 4xx lain → `drop` dengan toast.
- [ ] **Step 4:** Jalankan tes. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: offline retry queue`.

---

### Task 13: Profil, goal, target, onboarding, pengaturan (F1, F10, §8.2)

**Files:**
- Create: `src/lib/db/profile.ts`, `goals.ts`, `targets.ts`, `src/app/(app)/onboarding/*`, `src/app/(app)/pengaturan/*`, `supabase/migrations/0005_start_goal.sql`
- Test: `tests/integration/targets.test.ts`, `e2e/onboarding.spec.ts`

**Interfaces:**
- Consumes: Task 4 semua; `emaTrend` (Task 5); `latestScan` (Task 14). Jika Task 14 belum ada, gunakan query `body_scans` langsung di `targets.ts` dan pindahkan ke `db/body.ts` saat Task 14.
- Produces:
  - `getProfile(sb)`, `saveProfile(sb, p)`
  - `activeGoal(sb)`, `goalHistory(sb)`
  - `startGoal(sb, g: { type; startDate; targetWeightKg?; targetBfPct?; targetDate?; ratePctPerWeek? })`, lewat RPC `start_goal` yang dalam satu transaksi menutup goal aktif (`end_date = startDate − 1`) lalu menyisipkan goal baru. Default laju: bulk 0,3, cut −0,5, maintain 0.
  - `recalcTargets(sb, today:string): Promise<{ values: TargetValues; inputs: CalcInputs }>` (belum disimpan)
  - `saveTargets(sb, row: TargetRow)` (upsert by `(user_id, effective_from)`)
  - `targetUpdateSuggestion(sb, today:string): Promise<{ current: TargetRow; proposed: TargetValues } | null>`

- [ ] **Step 1: Tes integrasi gagal:**
  - `startGoal` kedua menutup goal pertama dan hanya ada satu goal aktif.
  - `recalcTargets` dengan profil contoh §5 (pria, 165 cm, lahir sehingga umur 26, faktor 1,55, goal bulk) + scan 2026-11-07 (61,8 kg, 14,9%) → `values.kcal === 2540`.
  - **Review Focus 5:** simpan target A `effective_from 2026-11-01`, lalu target B `2026-11-15` → `daySummary('2026-11-10').target.kcal === A.kcal`.
  - Edit manual → baris baru dengan `is_manual_override=true`.
  - `targetUpdateSuggestion` mengembalikan usulan saat ada scan setelah `effective_from`.
- [ ] **Step 2: Tes E2E gagal:**
  - User baru diarahkan ke `/onboarding`.
  - Isi profil, scan awal (opsional), dan goal bulk → layar ringkasan menampilkan rincian *"BMR 1.506 × 1,55 + 204"* dan target 2.540 kkal.
  - Ubah protein jadi 120 → simpan → Hari Ini menampilkan target protein 120.
  - Di Pengaturan, ganti metode BMR ke Mifflin → ringkasan usulan berubah.
- [ ] **Step 3:** `npm run test:int -- targets && npx playwright test e2e/onboarding.spec.ts --trace off`. Expected: FAIL.
- [ ] **Step 4:** Implementasi. Pengaturan berisi:
  - profil, faktor aktivitas (dengan label deskriptif per nilai), metode BMR
  - ambang margin error scan (default 1,0 kg, disimpan di `profile.lean_error_kg`; tambahkan kolom di migrasi 0005)
  - goal baru dan riwayat goal
  - tombol Ekspor (dibangun di Task 16)
- [ ] **Step 5:** Jalankan perintah Step 3. Expected: PASS.
- [ ] **Step 6:** Commit: `feat: profile, goals, targets, onboarding`.

---

### Task 14: Berat badan & input scan (F6, F7)

**Files:**
- Create: `src/lib/validation/body.ts`, `src/lib/db/body.ts`, `src/app/(app)/tubuh/**`, `src/components/body/*`
- Test: `src/lib/validation/body.test.ts`, `tests/integration/body.test.ts`, `e2e/body.spec.ts`

**Interfaces:**
- Produces:
  - `validateWeight(kg:number, trendKg:number|null): { errors: ('weight_out_of_range')[]; warnings: ('weight_far_from_trend')[] }`
  - `validateScan(s: ScanInput, prev: ScanInput|null): { errors: ScanError[]; warnings: ScanWarning[] }`, dengan
    - `ScanError = 'bf_out_of_range'|'composition_sum'|'fat_mass_mismatch'`
    - `ScanWarning = 'bf_jump'|'weight_jump'`
  - `addWeight(sb, i: { clientId; date; measuredAt; weightKg; condition })`, `listWeights(sb, from, to)`
  - `addScan(sb, s: ScanInput & { scannedAt; condition; postWorkout })`, `listScans(sb)`, `latestScan(sb)`
  - `ScanInput` memakai field §7 `body_scans` dalam camelCase.

- [ ] **Step 1: Tes gagal** (memakai data scan asli 7 Nov 2026 sebagai fixture valid):
  ```ts
  const scan = { weightKg:61.8, bfPct:14.9, fatMassKg:9.2, musclePct:80.6, otherPct:4.5, /* ... */ };
  expect(validateScan(scan,null)).toEqual({errors:[],warnings:[]});
  expect(validateScan({...scan, bfPct:92},null).errors).toContain('bf_out_of_range');
  expect(validateScan({...scan, otherPct:6.5},null).errors).toContain('composition_sum');   // 102
  expect(validateScan({...scan, fatMassKg:9.8},null).errors).toContain('fat_mass_mismatch'); // > ±0,5
  expect(validateScan({...scan, bfPct:18.0, fatMassKg:11.1},scan).warnings).toContain('bf_jump');
  expect(validateScan({...scan, weightKg:65.0, fatMassKg:9.7},scan).warnings).toContain('weight_jump');
  expect(validateWeight(29,null).errors).toContain('weight_out_of_range');
  expect(validateWeight(64,61.8).warnings).toContain('weight_far_from_trend');   // 3,56%
  expect(validateWeight(63.6,61.8).warnings).toEqual([]);                          // 2,9%
  ```
- [ ] **Step 2: Tes E2E gagal:**
  - Banner/halaman berat: ketik "61,9" → simpan → tampil "61,9 kg" (**Review Focus 2**).
  - Form scan: urutan field sesuai F7.
  - Ketik % lemak "92" → tampil error dan simpan diblokir. Ganti "14,9" → simpan sukses.
  - Pilih foto → pratinjau tampil, dan tidak ada request jaringan yang membawa file gambar (assert `page.on('request')` tanpa body multipart/gambar).
- [ ] **Step 3:** `npx vitest run src/lib/validation && npm run test:int -- body && npx playwright test e2e/body.spec.ts --trace off`. Expected: FAIL.
- [ ] **Step 4:** Implementasi.
  - Pratinjau foto memakai `URL.createObjectURL`, lalu `revokeObjectURL` saat unmount.
  - Peringatan bisa dilewati dengan konfirmasi "Simpan tetap".
  - `addWeight` ikut antrean offline: tambahkan kind `weight_entry` ke `send` di Task 12.
- [ ] **Step 5:** Jalankan perintah Step 3. Expected: PASS.
- [ ] **Step 6:** Commit: `feat: weight and body scan input`.

---

### Task 15: Progres & analisis (F8)

**Files:**
- Create: `src/lib/calc/periods.ts`, `src/lib/db/analysis.ts`, `src/app/(app)/progres/page.tsx`, `src/components/progress/*`
- Test: `src/lib/calc/periods.test.ts`, `e2e/progress.spec.ts`

**Interfaces:**
- Consumes: Task 5 semua, `isCompleteDay`, view `daily_totals`, `listScans`, `listWeights`, `activeGoal`, `goalHistory`, `targetFor`.
- Produces:
  ```ts
  interface DayLog { date:string; kcal:number; protein_g:number; fiber_g:number|null; slotsLogged:number; targetKcal:number|null }
  interface ScanPeriod { from:string; to:string; days:number; avgKcal:number|null; proteinGPerKg:number|null; avgFiberG:number|null;
    completeness:number; dTrendKg:number|null; dFatMassKg:number; dLeanKg:number; dBfPct:number;
    flags: ('incomplete_log'|'lean_below_error'|'scan_not_equivalent')[] }
  ```
  - `buildScanPeriods(i: { scans: ScanRow[]; days: DayLog[]; trend: TrendPoint[]; leanErrorKg:number }): ScanPeriod[]`
  - `progressData(sb, today:string): Promise<{ trend; rate; status; warning; weightProjection; bfProjection; periods; tdeeActual; goal; history }>`

- [ ] **Step 1: Tes gagal** (`periods.test.ts`):
  - Dua scan 28 hari terpisah, 25 hari lengkap → `completeness ≈ 0.893`, tanpa flag `incomplete_log`.
  - 20 hari lengkap → flag `incomplete_log`.
  - `dLeanKg = (w2 − fm2) − (w1 − fm1)`. |0,6| < 1,0 → flag `lean_below_error`.
  - Scan 1 `fasted` 07:00 dan scan 2 `fed` → flag `scan_not_equivalent`. Selisih jam 4 → flag yang sama.
  - `avgKcal` hanya dari hari lengkap.
  - `proteinGPerKg` = rata-rata protein hari lengkap / rata-rata tren dalam periode.
  - Satu scan → `[]`.
- [ ] **Step 2: Tes E2E gagal** (seed via admin client: 30 hari berat naik 0,03 kg/hari, entri harian, 2 scan):
  - Halaman Progres menampilkan laju yang cocok dengan `/\+0,[12]\d kg\/minggu/` (EMA membuat laju tren sedikit di bawah 0,21) dan status "dalam rentang".
  - Kartu proyeksi % lemak menampilkan "Butuh 1 scan lagi".
  - Tabel periode punya 1 baris dengan label "di bawah margin error alat" jika |Δ lean| < 1.
  - Kartu TDEE aktual tampil.
  - Dengan 10 hari data, kartu proyeksi berat menampilkan "Butuh 4 hari timbangan lagi" (minimal 14 hari rentang).
- [ ] **Step 3:** `npx vitest run src/lib/calc/periods.test.ts && npx playwright test e2e/progress.spec.ts --trace off`. Expected: FAIL.
- [ ] **Step 4:** Implementasi.
  - Grafik (Recharts): titik berat mentah + garis tren; fat mass dan lean mass per scan dengan batang rata-rata kkal per periode.
  - Teks proyeksi `range`: "kemungkinan <bulan earliest>–<bulan latest>". Teks `earliest_only`: "paling cepat <tanggal>". Teks `none`: "Belum ada proyeksi: tren berat datar/berlawanan".
  - Riwayat goal ditampilkan sebagai daftar.
- [ ] **Step 5: Verifikasi §15 butir 7.** Cari perkiraan margin error lean mass dari dokumentasi alat atau literatur BIA dan catat di README. Default 1,0 kg tetap kecuali pengguna setuju diubah.
- [ ] **Step 6:** Jalankan perintah Step 3. Expected: PASS.
- [ ] **Step 7:** Commit: `feat: progress and scan-period analysis`.

---

### Task 16: Banner pengingat, ekspor data, halaman error (F9, F10, §11)

**Files:**
- Create: `src/lib/calc/reminders.ts`, `src/components/today/ReminderBanners.tsx`, `src/lib/db/export.ts`, `src/app/api/export/route.ts`, `src/app/error.tsx`, `src/app/(app)/error.tsx`
- Test: `src/lib/calc/reminders.test.ts`, `tests/integration/export.test.ts`, `e2e/reminders.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  type ReminderId = 'weigh_in'|'lunch_missing'|'water_low'|'fiber_low'|'target_update';
  ```
  - `activeReminders(i: { nowHHmm:string; hasWeighInToday:boolean; lunchLogged:boolean; waterMl:number; waterTargetMl:number; fiberG:number|null; fiberTargetG:number; targetUpdateSuggested:boolean; dismissed: ReminderId[] }): ReminderId[]`
  - `exportAll(sb, format:'json'|'csv'): Promise<{ filename:string; contentType:string; body:string|Uint8Array }>`. JSON berisi semua tabel. CSV berbentuk zip per tabel, atau satu CSV `food_entries` jika zip menambah dependensi. Pilih **JSON + CSV `food_entries`, `weight_entries`, `body_scans` dalam zip memakai `fflate`**.
- Teks banner persis sesuai tabel F9: "Belum timbang hari ini", "Makan siang belum dicatat", "Air minum baru X%", "Serat baru X g dari Y g", "Target bisa diperbarui".

- [ ] **Step 1: Tes gagal:**
  - 14:59 tanpa makan siang → tidak ada `lunch_missing`; 15:00 → ada.
  - Air 1000/2150 pukul 15:00 → `water_low`; 1100/2150 → tidak (51%).
  - Serat 17/36 pukul 18:00 → `fiber_low`; pukul 17:59 → tidak.
  - `dismissed` menghapus id terkait.
  - Ekspor JSON berisi kunci semua tabel §7 dan hanya data milik user.
  - E2E: tutup banner "Belum timbang" → tetap tertutup setelah reload hari yang sama (disimpan di `localStorage` per tanggal, dalam try/catch).
- [ ] **Step 2:** `npx vitest run src/lib/calc/reminders.test.ts && npm run test:int -- export && npx playwright test e2e/reminders.spec.ts --trace off`. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
  - Halaman error mendeteksi kegagalan koneksi Supabase dan menampilkan panduan: "Database mungkin di-pause. Buka dashboard Supabase → project → Restore."
  - Error lain menampilkan pesan umum + tombol coba lagi.
- [ ] **Step 4:** Jalankan perintah Step 2. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: reminders, data export, error pages`.

---

### Task 17: PWA & deploy

**Files:**
- Create: `src/app/manifest.ts`, `public/sw.js`, `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `src/components/RegisterSW.tsx`; opsional `vercel.json`, `src/app/api/keepalive/route.ts`
- Test: `e2e/pwa.spec.ts`

**Interfaces:**
- Produces: manifest `name: "Si Paling Pulen"`, `display: "standalone"`, `start_url: "/"`, `lang: "id"`.
- Service worker meng-cache app shell dan aset statis (cache-first untuk `/_next/static`, network-first untuk navigasi dengan fallback halaman offline sederhana). **SW tidak meng-cache respons data.**

- [ ] **Step 1: Tes E2E gagal:**
  - `/manifest.webmanifest` valid dan berisi field di atas.
  - SW terdaftar (`navigator.serviceWorker.ready`).
  - Setelah satu kunjungan, `context.setOffline(true)` + reload `/` → halaman shell tampil (bukan error browser).
- [ ] **Step 2:** `npx playwright test e2e/pwa.spec.ts --trace off`. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
  - Tambahkan meta `apple-mobile-web-app-capable` dan `apple-touch-icon` lewat `metadata`.
  - Ikon dibuat sederhana (huruf/bentuk), tanpa logo merek.
- [ ] **Step 4:** Jalankan tes. Expected: PASS.
- [ ] **Step 5: Verifikasi §15 butir 3–5** dari dokumentasi resmi Supabase, Vercel, dan Apple/WebKit, lalu catat di README:
  - kebijakan pause Supabase Free dan batas database
  - batas Cron Jobs Vercel Hobby
  - dukungan home screen, IndexedDB, dan service worker di iOS
- [ ] **Step 6: Keepalive (opsional, hanya jika cron harian diizinkan di Hobby).**
  - `vercel.json` cron sekali sehari ke `/api/keepalive`.
  - Route menolak request tanpa `Authorization: Bearer ${CRON_SECRET}` (401) dan menjalankan satu query ringan.
  - Tes route: tanpa header → 401.
- [ ] **Step 7: Deploy (butuh tindakan pengguna, minta konfirmasi dulu):**
  - Buat project Supabase produksi, jalankan `npx supabase link` + `npx supabase db push`.
  - Matikan sign-up di dashboard Auth, buat user `ALLOWED_EMAIL`, set Site URL dan redirect URL ke domain Vercel.
  - Import repo di Vercel dan isi env produksi (**tanpa** `E2E`).
  - Jalankan `npm run seed` ke produksi.
  - Verifikasi: login magic link di iPhone, Add to Home Screen, catat satu makanan, matikan data → catat → nyalakan → entri terkirim.
- [ ] **Step 8:** Commit: `feat: PWA manifest, service worker, deploy config`.

---

## Di luar rencana ini

- **Uji coba deteksi foto (§13):** dikerjakan terpisah sebagai kode sekali pakai, saat pengguna mengirim 20–30 foto berlabel. Hasilnya menentukan rencana v1.1.
- **Hidangan warung:** setelah deploy, pengguna merakit resep di aplikasi untuk nasi telur, bubur ayam, ayam geprek, nasi padang, mie ayam, bakso, soto, dan nasi goreng, serta menimbang centong nasi sekali untuk kalibrasi.
- **Fase 2:** mode adaptif, Apple Health, OCR. Masing-masing akan mendapat spec dan rencana sendiri.
