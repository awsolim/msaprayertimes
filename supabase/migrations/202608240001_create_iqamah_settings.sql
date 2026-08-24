create table if not exists public.iqamah_settings (
  prayer text primary key,
  rule_type text not null,
  offset_minutes integer,
  fixed_time time without time zone,
  updated_at timestamptz not null default now(),

  constraint iqamah_settings_prayer_check
    check (prayer in ('Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha')),
  constraint iqamah_settings_rule_type_check
    check (rule_type in ('offset', 'fixed', 'none')),
  constraint iqamah_settings_offset_range_check
    check (offset_minutes is null or offset_minutes between 0 and 180),
  constraint iqamah_settings_rule_values_check
    check (
      (rule_type = 'offset' and offset_minutes is not null and fixed_time is null)
      or (rule_type = 'fixed' and fixed_time is not null and offset_minutes is null)
      or (rule_type = 'none' and offset_minutes is null and fixed_time is null)
    )
);

alter table public.iqamah_settings enable row level security;

create or replace function public.set_iqamah_settings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_iqamah_settings_updated_at
  on public.iqamah_settings;

create trigger set_iqamah_settings_updated_at
before update on public.iqamah_settings
for each row
execute function public.set_iqamah_settings_updated_at();

drop policy if exists "Iqamah settings are publicly readable"
  on public.iqamah_settings;

create policy "Iqamah settings are publicly readable"
  on public.iqamah_settings
  for select
  to anon, authenticated
  using (true);

grant select on table public.iqamah_settings to anon, authenticated;
revoke insert, update, delete on table public.iqamah_settings from anon, authenticated;

insert into public.iqamah_settings
  (prayer, rule_type, offset_minutes, fixed_time)
values
  ('Fajr', 'offset', 30, null),
  ('Sunrise', 'none', null, null),
  ('Dhuhr', 'fixed', null, '14:00'),
  ('Asr', 'offset', 5, null),
  ('Maghrib', 'offset', 5, null),
  ('Isha', 'fixed', null, '21:30')
on conflict (prayer) do nothing;
