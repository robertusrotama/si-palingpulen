-- Pencarian makanan toleran salah ketik (trigram) pada nama + alias.
create or replace function public.foods_set_search_text() returns trigger
language plpgsql as $$
begin
  new.search_text := lower(new.name || ' ' || array_to_string(new.aliases, ' '));
  return new;
end $$;

create trigger foods_search_text before insert or update of name, aliases on public.foods
for each row execute function public.foods_set_search_text();

create index foods_search_trgm on public.foods using gin (search_text extensions.gin_trgm_ops);

create or replace function public.search_foods(q text, max_results int default 20)
returns setof public.foods
language sql stable security invoker
set search_path = public, extensions
as $$
  select f.*
  from public.foods f
  where f.archived_at is null
    and (f.search_text ilike '%' || lower(q) || '%' or word_similarity(lower(q), f.search_text) >= 0.3)
  order by word_similarity(lower(q), f.search_text) desc, f.name
  limit max_results;
$$;
