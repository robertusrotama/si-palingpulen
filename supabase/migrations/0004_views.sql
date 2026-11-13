-- Total harian per user. security_invoker agar RLS tabel dasar berlaku.
create view public.daily_totals with (security_invoker = true) as
select
  user_id,
  date,
  sum(kcal) as kcal,
  sum(protein_g) as protein_g,
  sum(fiber_g) as fiber_g,
  count(distinct meal_slot)::int as slots_logged
from public.food_entries
where deleted_at is null
group by user_id, date;
