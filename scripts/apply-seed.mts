/**
 * Memasukkan supabase/seed/foods.seed.json ke akun ALLOWED_EMAIL (idempoten: upsert per source + source_ref).
 * Pakai: npm run seed   (membaca .env.local bila ada; user harus sudah ada di Supabase Auth)
 */
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { resolveAddedSugarPer100 } from '../src/lib/calc/nutrition';

for (const f of ['.env.local']) if (existsSync(f) && !process.env.NEXT_PUBLIC_SUPABASE_URL) process.loadEnvFile(f);

type SeedFood = {
  key: string; name: string; aliases: string[]; source: 'usda' | 'tkpi'; source_ref: string; is_sweetener: boolean;
  per100: Record<'kcal' | 'protein_g' | 'carb_g' | 'fat_g' | 'fiber_g' | 'sugar_g' | 'sodium_mg' | 'satfat_g', number | null>;
  portions: { label: string; grams: number }[];
};

const email = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
if (!email) throw new Error('ALLOWED_EMAIL belum diisi');
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: users, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;
const user = users.users.find((u) => u.email?.toLowerCase() === email);
if (!user) throw new Error(`User ${email} belum ada. Buat dulu di Supabase Auth.`);

const foods: SeedFood[] = JSON.parse(readFileSync('supabase/seed/foods.seed.json', 'utf8'));
for (const f of foods) {
  const row = {
    user_id: user.id, name: f.name, aliases: f.aliases, source: f.source, source_ref: f.source_ref,
    is_sweetener: f.is_sweetener, ...f.per100,
    added_sugar_g: resolveAddedSugarPer100({ source: f.source, isSweetener: f.is_sweetener, sugarPer100: f.per100.sugar_g }),
  };
  const { data, error } = await admin.from('foods').upsert(row, { onConflict: 'user_id,source,source_ref' }).select('id').single();
  if (error) throw new Error(`${f.key}: ${error.message}`);
  for (const p of f.portions) {
    const { error: pe } = await admin
      .from('food_portions')
      .upsert({ user_id: user.id, food_id: data.id, label: p.label, grams: p.grams }, { onConflict: 'food_id,label' });
    if (pe) throw new Error(`${f.key} portion: ${pe.message}`);
  }
}
console.log(`seeded ${foods.length} foods for ${email}`);
