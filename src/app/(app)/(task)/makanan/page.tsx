import Link from 'next/link';
import { BackLink } from '@/components/shell/BackLink';
import { favoriteFoods } from '@/lib/db/foods';
import { createServerSupabase } from '@/lib/supabase/server';
import { FoodList, FoodSearch } from './FoodSearch';

export default async function FoodsPage() {
  const favs = await favoriteFoods(await createServerSupabase());
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackLink href="/catat" />
        <h1 style={{ margin: 0, flex: 1, fontSize: 24, fontWeight: 700 }}>Makanan</h1>
        <Link href="/makanan/baru" className="btn navy">Tambah makanan</Link>
      </header>
      <FoodSearch />
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="label" style={{ margin: 0 }}>Favorit</h2>
        {favs.length ? <FoodList foods={favs} /> : <p className="muted" style={{ margin: 0 }}>Belum ada favorit.</p>}
      </section>
    </div>
  );
}
