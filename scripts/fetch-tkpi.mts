/**
 * Mengunduh halaman detail TKPI (panganku.org) untuk kode di food-sources.json ke folder cache.
 * Pakai: npx tsx scripts/fetch-tkpi.mts supabase/seed/food-sources.json <cacheDir>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [sourcesPath, cacheDir] = process.argv.slice(2);
if (!sourcesPath || !cacheDir) throw new Error('usage: fetch-tkpi <food-sources.json> <cacheDir>');
mkdirSync(cacheDir, { recursive: true });
const sources: { source: string; ref: string }[] = JSON.parse(readFileSync(sourcesPath, 'utf8'));

for (const s of sources.filter((x) => x.source === 'tkpi')) {
  const res = await fetch('https://www.panganku.org/id-ID/view', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'Mozilla/5.0' },
    body: new URLSearchParams({ haha: s.ref }),
  });
  if (!res.ok) throw new Error(`TKPI ${s.ref}: HTTP ${res.status}`);
  writeFileSync(join(cacheDir, `${s.ref}.html`), await res.text());
  console.log('fetched', s.ref);
}
