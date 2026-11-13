-- Setiap baris hanya bisa dibaca dan ditulis pemiliknya.
do $$
declare t text;
begin
  foreach t in array array['profile','goals','targets','foods','food_portions','recipe_items','saved_meals',
                           'saved_meal_items','food_entries','water_entries','weight_entries','body_scans'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy owner_all on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
