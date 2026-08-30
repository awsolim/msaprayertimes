create table if not exists public.display_settings (
  id smallint primary key default 1,
  theme_name text not null default 'green-red',
  logo_url text,
  events_qr_image_url text,
  events_signup_url text,
  show_logo boolean not null default false,
  updated_at timestamptz not null default now(),

  constraint display_settings_singleton_check check (id = 1)
);

create table if not exists public.display_modules (
  module_key text primary key,
  enabled boolean not null default true,
  display_order smallint not null,
  duration_seconds smallint not null default 10,
  updated_at timestamptz not null default now(),

  constraint display_modules_key_check
    check (module_key in ('countdown', 'events', 'hadith')),
  constraint display_modules_order_check
    check (display_order between 1 and 100),
  constraint display_modules_duration_check
    check (duration_seconds between 5 and 300)
);

alter table public.display_settings enable row level security;
alter table public.display_modules enable row level security;

create or replace function public.set_display_configuration_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_display_settings_updated_at
  on public.display_settings;
create trigger set_display_settings_updated_at
before update on public.display_settings
for each row execute function public.set_display_configuration_updated_at();

drop trigger if exists set_display_modules_updated_at
  on public.display_modules;
create trigger set_display_modules_updated_at
before update on public.display_modules
for each row execute function public.set_display_configuration_updated_at();

drop policy if exists "Display settings are publicly readable"
  on public.display_settings;
create policy "Display settings are publicly readable"
  on public.display_settings
  for select to anon, authenticated
  using (true);

drop policy if exists "Display modules are publicly readable"
  on public.display_modules;
create policy "Display modules are publicly readable"
  on public.display_modules
  for select to anon, authenticated
  using (true);

grant select on table public.display_settings to anon, authenticated;
grant select on table public.display_modules to anon, authenticated;
revoke insert, update, delete on table public.display_settings from anon, authenticated;
revoke insert, update, delete on table public.display_modules from anon, authenticated;

insert into public.display_settings (id, theme_name, show_logo)
values (1, 'green-red', false)
on conflict (id) do nothing;

insert into public.display_modules
  (module_key, enabled, display_order, duration_seconds)
values
  ('hadith', true, 1, 10),
  ('events', true, 2, 10),
  ('countdown', true, 3, 10)
on conflict (module_key) do nothing;

