-- Kolom pengaturan di profil (spec F10) dan RPC ganti goal dalam satu transaksi.
alter table public.profile
  add column display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  add column lean_error_kg numeric not null default 1.0 check (lean_error_kg between 0.1 and 5),
  add column haptics_enabled boolean,
  add column reminders_disabled text[] not null default '{}';

create or replace function public.start_goal(
  p_type text, p_start_date date, p_rate_pct_per_week numeric,
  p_target_weight_kg numeric default null, p_target_bf_pct numeric default null, p_target_date date default null
) returns public.goals
language plpgsql security invoker
set search_path = public
as $$
declare g public.goals;
begin
  update public.goals set end_date = p_start_date - 1
   where user_id = auth.uid() and end_date is null;
  insert into public.goals (type, start_date, rate_pct_per_week, target_weight_kg, target_bf_pct, target_date)
  values (p_type, p_start_date, p_rate_pct_per_week, p_target_weight_kg, p_target_bf_pct, p_target_date)
  returning * into g;
  return g;
end $$;
