import { BackLink } from '@/components/shell/BackLink';
import { addDays, mealSlotFor } from '@/lib/dates';
import { slotPreview } from '@/lib/db/entries';
import { favoriteFoods, listSavedMeals, recentFoods } from '@/lib/db/foods';
import { userClock } from '@/lib/db/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { CatatFlow } from './CatatFlow';

export default async function CatatPage() {
  const sb = await createServerSupabase();
  const clock = await userClock(sb);
  const slot = mealSlotFor(clock.time);
  const [preview, favorites, recent, meals] = await Promise.all([
    slotPreview(sb, { date: addDays(clock.today, -1), slot }),
    favoriteFoods(sb),
    recentFoods(sb, clock.today, 14),
    listSavedMeals(sb),
  ]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackLink />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Catat makanan</h1>
      </header>
      <CatatFlow tz={clock.tz} today={clock.today} initialSlot={slot} initialTime={clock.time} initialPreview={preview}
        favorites={favorites} recent={recent} savedMeals={meals.map((m) => ({ id: m.id, name: m.name, count: m.items.length }))} />
    </div>
  );
}
