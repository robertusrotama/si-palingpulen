# Onboarding Bertahap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti form onboarding dengan alur 8 layar (satu pertanyaan per layar) yang memakai komponen timbangan.

**Architecture:** `OnboardingWizard` (klien) menyimpan state langkah dan nilai; tiap langkah komponen kecil. Penggaris dijadikan generik (`Ruler`), `WeightRuler` membungkusnya. Urutan langkah ditentukan fungsi murni `onboardingSteps(goal)` supaya bisa diuji unit. `onboardAction` dan `TargetEditor` tidak diubah.

**Tech Stack:** Next.js 16 App Router, React 19, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-16-onboarding-wizard-design.md`

## Global Constraints
- Teks UI Bahasa Indonesia; tidak memakai merek/teks/grafik aplikasi referensi.
- Gaya: kelas yang ada (`panel`, `raised`, `inset`, `btn`, `navy`, `label`, `muted`).
- Rentang: tinggi 100–250 cm (langkah 1), berat & target 30–200 kg (0,1), % lemak 3–60 (0,1).
- Tanpa dependensi baru. Animasi mati saat `prefers-reduced-motion`.

## Review Focus
- Ganti goal ke Maintain setelah mengisi target → target berat dikirim `null` (test: unit `onboardingSteps` + E2E Maintain).
- Tombol kembali menjaga nilai yang sudah diisi (E2E: kembali dari langkah berat, tinggi tetap 170).
- Tanggal lahir 31 dipilih lalu bulan diganti Februari → tanggal dijepit ke hari terakhir bulan (unit `clampDay`).
- Server menolak (error) → pesan error tampil di layar terakhir, tombol bisa ditekan lagi.
- Layar Timbang tetap berfungsi setelah refaktor `WeightRuler` (E2E `body.spec.ts` yang ada).

---

### Task 1: Logika langkah + penggaris generik

**Files:**
- Create: `src/app/onboarding/steps.ts`, `src/app/onboarding/steps.test.ts`
- Create: `src/components/form/Ruler.tsx`
- Modify: `src/components/body/WeightRuler.tsx` (jadi pembungkus `Ruler`)

**Interfaces:**
- Produces: `type StepId = 'sex' | 'birth' | 'height' | 'weight' | 'activity' | 'goal' | 'target' | 'bodyfat'`; `onboardingSteps(goal: 'bulk'|'cut'|'maintain'): StepId[]`; `clampDay(year: number, month1to12: number, day: number): number`.
- Produces: `Ruler({ value, onChange, min, max, step, unit, label, decimals })` — `label` dipakai untuk aria-label slider ("Berat badan dalam kilogram") dan tombol −/+ ("Kurangi 0,1 kilogram").

- [ ] Tes: `onboardingSteps('maintain')` tidak berisi `'target'`; `onboardingSteps('bulk')` = 8 langkah urut seperti spec; `clampDay(2001, 2, 31) === 28`, `clampDay(2000, 2, 31) === 29`, `clampDay(2000, 4, 15) === 15`.
- [ ] Jalankan `npx vitest run src/app/onboarding/steps.test.ts` → FAIL, implementasi, → PASS.
- [ ] `Ruler`: pindahkan isi `WeightRuler`, skala tick mengikuti `step` (tick utama tiap 10 langkah). `WeightRuler` memanggil `Ruler` dengan step 0,1, unit kg, label lama.
- [ ] `npx playwright test e2e/body.spec.ts` → PASS.

### Task 2: Wizard + layar langkah

**Files:**
- Create: `src/app/onboarding/OnboardingWizard.tsx`, `src/app/onboarding/WheelPicker.tsx`, `src/app/onboarding/ChoiceCard.tsx`
- Modify: `src/app/onboarding/page.tsx` (render wizard tanpa header lama)
- Delete: `src/app/onboarding/OnboardingForm.tsx`
- Modify: `e2e/onboarding.spec.ts`

**Interfaces:**
- Consumes: `onboardingSteps`, `clampDay`, `Ruler`, `WeightRuler`, `useHaptics`, `ACTIVITY`, `onboardAction`, `TargetEditor`.
- `ChoiceCard({ title, description?, selected, onSelect })` → `<button role="radio" aria-checked>` di dalam `role="radiogroup"`.
- `WheelPicker({ label, items: {value:number,label:string}[], value, onChange })` → list scroll-snap, `role="listbox"`, opsi `role="option"` bisa diklik; nilai terpilih di tengah.

- [ ] Tes E2E (tulis dulu, gagal): alur bulk — Pria → Lanjut → tanggal 1 Mei 2000 → tinggi 165 → berat 61,8 → aktivitas 1,55 → Bulking → target Lewati → % lemak 14,9 → "Hitung target" → `BMR 1.506 × 1,55 + 204`, kkal 2540 (nilai sama dengan tes lama). Isi angka via slider: `getByRole('slider', { name: 'Tinggi badan dalam sentimeter' }).fill('165')`.
- [ ] Tes E2E kedua: Maintain melewati layar target; kembali dari berat menjaga tinggi 170.
- [ ] Implementasi wizard: header (panah kembali, progress bar `role="progressbar"` dengan aria-valuenow = indeks+1), judul besar + subjudul, isi langkah, tombol `Lanjut` menempel bawah (`position: sticky; bottom`), langkah terakhir tombol `Hitung target`. Transisi geser CSS kelas `.ob-step` dengan animasi `ob-in` di `globals.css`.
- [ ] `npm run typecheck && npm run lint && npm test && npx playwright test` → semua PASS.
- [ ] Commit.
