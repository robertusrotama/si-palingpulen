/**
 * Membangun supabase/seed/foods.seed.json dari sumber resmi:
 * - USDA FoodData Central SR Legacy (CSV, domain publik)
 * - TKPI Kemenkes (halaman detail panganku.org yang sudah diunduh fetch-tkpi.mts)
 * Tidak ada angka yang diisi manual.
 * Pakai: npx tsx scripts/build-seed.mts <usdaSrLegacyCsvDir> <tkpiCacheDir>
 */
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

type Source = {
  key: string; name: string; aliases: string[]; source: 'usda' | 'tkpi'; ref: string;
  isSweetener?: boolean; portions?: { usdaModifier: string; label: string }[];
};
type Per100 = Record<'kcal' | 'protein_g' | 'carb_g' | 'fat_g' | 'fiber_g' | 'sugar_g' | 'sodium_mg' | 'satfat_g', number | null>;

const [usdaDir, tkpiDir] = process.argv.slice(2);
if (!usdaDir || !tkpiDir) throw new Error('usage: build-seed <usdaDir> <tkpiCacheDir>');
const sources: Source[] = JSON.parse(readFileSync('supabase/seed/food-sources.json', 'utf8'));

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function eachRow(file: string, fn: (cells: string[]) => void) {
  const rl = createInterface({ input: createReadStream(file) });
  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; }
    fn(parseCsvLine(line));
  }
}

const USDA_NUTRIENTS: Record<string, keyof Per100> = {
  '1008': 'kcal', '1003': 'protein_g', '1005': 'carb_g', '1004': 'fat_g',
  '1079': 'fiber_g', '2000': 'sugar_g', '1093': 'sodium_mg', '1258': 'satfat_g',
};

const empty = (): Per100 => ({ kcal: null, protein_g: null, carb_g: null, fat_g: null, fiber_g: null, sugar_g: null, sodium_mg: null, satfat_g: null });

const usdaIds = new Set(sources.filter((s) => s.source === 'usda').map((s) => s.ref));
const usda = new Map<string, Per100>([...usdaIds].map((id) => [id, empty()]));
const usdaNames = new Map<string, string>();
const usdaPortions = new Map<string, { modifier: string; grams: number }[]>();

await eachRow(join(usdaDir, 'food.csv'), ([id, , desc]) => { if (usdaIds.has(id)) usdaNames.set(id, desc); });
await eachRow(join(usdaDir, 'food_nutrient.csv'), ([, fdcId, nutrientId, amount]) => {
  const key = USDA_NUTRIENTS[nutrientId];
  if (key && usda.has(fdcId)) usda.get(fdcId)![key] = Number(amount);
});
await eachRow(join(usdaDir, 'food_portion.csv'), (c) => {
  const [, fdcId, , , , , modifier, grams] = c;
  if (!usdaIds.has(fdcId)) return;
  const list = usdaPortions.get(fdcId) ?? [];
  list.push({ modifier, grams: Number(grams) });
  usdaPortions.set(fdcId, list);
});

const TKPI_FIELDS: Record<string, keyof Per100> = { ENERC: 'kcal', 'Total Protein': 'protein_g', FATCE: 'fat_g', CHOCDF: 'carb_g', FIBTG: 'fiber_g', NA: 'sodium_mg' };

function parseTkpi(ref: string): { name: string; per100: Per100 } {
  const html = readFileSync(join(tkpiDir, `${ref}.html`), 'utf8');
  const text = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => text(c[1])));
  const per100 = empty();
  let name = '';
  for (const r of rows) {
    if (r[0] === 'Kode' && r[2] !== ref) throw new Error(`TKPI cache ${ref} is for ${r[2]}`);
    if (r[0] === 'Nama') name = r[2];
    for (const [needle, key] of Object.entries(TKPI_FIELDS)) {
      if (r[0]?.includes(`(${needle})`) || (needle === 'Total Protein' && r[0]?.startsWith('Total Protein'))) {
        const m = r[1]?.match(/-?\d+(\.\d+)?/);
        if (m) per100[key] = Number(m[0]);
      }
    }
  }
  return { name, per100 };
}

const out = sources.map((s) => {
  if (s.source === 'usda') {
    const per100 = usda.get(s.ref)!;
    const portions = (s.portions ?? []).flatMap((p) => {
      const hit = usdaPortions.get(s.ref)?.find((x) => x.modifier === p.usdaModifier);
      return hit ? [{ label: p.label, grams: hit.grams }] : [];
    });
    return {
      key: s.key, name: s.name, aliases: s.aliases, source: 'usda', source_ref: `fdc:${s.ref}`,
      source_name: usdaNames.get(s.ref) ?? null, is_sweetener: !!s.isSweetener, per100, portions,
    };
  }
  const t = parseTkpi(s.ref);
  return {
    key: s.key, name: s.name, aliases: s.aliases, source: 'tkpi', source_ref: `tkpi:${s.ref}`,
    source_name: t.name, is_sweetener: !!s.isSweetener, per100: t.per100, portions: [],
  };
});

writeFileSync('supabase/seed/foods.seed.json', JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${out.length} foods`);
