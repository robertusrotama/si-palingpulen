-- Skema inti (PRD §7). Semua tabel milik satu user lewat user_id = auth.uid().
create extension if not exists pg_trgm with schema extensions;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table public.profile (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  sex text not null check (sex in ('male', 'female')),
  birth_date date not null,
  height_cm numeric not null check (height_cm between 100 and 250),
  activity_factor numeric not null check (activity_factor in (1.2, 1.375, 1.55, 1.725, 1.9)),
  bmr_method text not null default 'auto' check (bmr_method in ('auto', 'katch', 'mifflin', 'scan')),
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('bulk', 'cut', 'maintain')),
  start_date date not null,
  end_date date,
  target_weight_kg numeric check (target_weight_kg between 30 and 200),
  target_bf_pct numeric check (target_bf_pct between 3 and 60),
  target_date date,
  rate_pct_per_week numeric not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date - 1)
);
create unique index goals_one_active on public.goals (user_id) where end_date is null;

create table public.targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  effective_from date not null,
  kcal numeric not null check (kcal > 0),
  protein_g numeric not null check (protein_g >= 0),
  carb_g numeric not null check (carb_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  fiber_g numeric not null check (fiber_g >= 0),
  water_ml numeric not null check (water_ml >= 0),
  added_sugar_max_g numeric not null check (added_sugar_max_g >= 0),
  sodium_max_mg numeric not null check (sodium_max_mg >= 0),
  satfat_max_g numeric not null check (satfat_max_g >= 0),
  is_manual_override boolean not null default false,
  calc_inputs jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, effective_from)
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  aliases text[] not null default '{}',
  source text not null check (source in ('usda', 'tkpi', 'label', 'custom', 'recipe', 'estimate')),
  source_ref text,
  kcal numeric not null check (kcal >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carb_g numeric not null check (carb_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  fiber_g numeric check (fiber_g >= 0),
  sugar_g numeric check (sugar_g >= 0),
  added_sugar_g numeric check (added_sugar_g >= 0),
  label_added_sugar_g numeric check (label_added_sugar_g >= 0),
  sodium_mg numeric check (sodium_mg >= 0),
  satfat_g numeric check (satfat_g >= 0),
  partial_nutrients text[] not null default '{}',
  is_sweetener boolean not null default false,
  is_favorite boolean not null default false,
  is_estimate boolean not null default false,
  search_text text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, source_ref)
);

create table public.food_portions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  grams numeric not null check (grams > 0),
  is_calibrated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (food_id, label)
);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_food_id uuid not null references public.foods (id) on delete cascade,
  ingredient_food_id uuid not null references public.foods (id) on delete restrict,
  grams numeric not null check (grams > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  saved_meal_id uuid not null references public.saved_meals (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  grams numeric not null check (grams > 0),
  portion_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null,
  date date not null,
  meal_slot text not null check (meal_slot in ('breakfast', 'lunch', 'snack', 'dinner', 'other')),
  meal_label text check (meal_label is null or (meal_slot = 'other' and char_length(meal_label) between 1 and 40)),
  logged_at timestamptz not null,
  food_id uuid not null references public.foods (id) on delete restrict,
  grams numeric not null check (grams > 0),
  portion_label text,
  kcal numeric not null,
  protein_g numeric not null,
  carb_g numeric not null,
  fat_g numeric not null,
  fiber_g numeric,
  sugar_g numeric,
  added_sugar_g numeric,
  sodium_mg numeric,
  satfat_g numeric,
  partial_nutrients text[] not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index food_entries_user_date on public.food_entries (user_id, date);

create table public.water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null,
  date date not null,
  logged_at timestamptz not null,
  ml numeric not null check (ml > 0 and ml <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null,
  date date not null,
  measured_at timestamptz not null,
  weight_kg numeric not null check (weight_kg between 30 and 200),
  condition text not null default 'fasted' check (condition in ('fasted', 'fed')),
  source text not null default 'manual' check (source in ('manual', 'apple_health')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create table public.body_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scanned_at timestamptz not null,
  device text not null default 'FTL FitScan',
  condition text not null default 'fasted' check (condition in ('fasted', 'fed')),
  post_workout boolean not null default false,
  weight_kg numeric not null check (weight_kg between 30 and 200),
  bmi numeric,
  fat_mass_kg numeric not null check (fat_mass_kg >= 0),
  bf_pct numeric not null check (bf_pct between 3 and 60),
  muscle_pct numeric,
  other_pct numeric,
  visceral_fat numeric,
  whr numeric,
  bmr_kcal numeric,
  body_age numeric,
  bcm_score numeric,
  arm_r_muscle_kg numeric, arm_r_fat_kg numeric,
  arm_l_muscle_kg numeric, arm_l_fat_kg numeric,
  torso_muscle_kg numeric, torso_fat_kg numeric,
  leg_r_muscle_kg numeric, leg_r_fat_kg numeric,
  leg_l_muscle_kg numeric, leg_l_fat_kg numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['profile','goals','targets','foods','food_portions','recipe_items','saved_meals',
                           'saved_meal_items','food_entries','water_entries','weight_entries','body_scans'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
