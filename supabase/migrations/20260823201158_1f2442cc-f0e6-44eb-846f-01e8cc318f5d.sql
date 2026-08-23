alter table public.search_events add column if not exists savings_usd numeric not null default 0;

create or replace function public.total_search_savings()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(savings_usd), 0)::numeric from public.search_events;
$$;

grant execute on function public.total_search_savings() to anon, authenticated, service_role;