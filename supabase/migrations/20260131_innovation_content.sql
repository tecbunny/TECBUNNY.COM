-- Innovation content tables (modes + devices)

create table if not exists public.innovation_modes (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  sub text not null,
  title text not null,
  description text not null,
  icon text not null,
  rec_id text not null,
  items jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.innovation_devices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  accent text not null,
  icon text not null,
  chips jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.innovation_modes enable row level security;
alter table public.innovation_devices enable row level security;

-- Public read-only
drop policy if exists innovation_modes_read on public.innovation_modes;
create policy innovation_modes_read
on public.innovation_modes
for select
to anon, authenticated
using (true);

drop policy if exists innovation_devices_read on public.innovation_devices;
create policy innovation_devices_read
on public.innovation_devices
for select
to anon, authenticated
using (true);

-- Admin write access
drop policy if exists innovation_modes_admin_write on public.innovation_modes;
create policy innovation_modes_admin_write
on public.innovation_modes
for all
to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
));

drop policy if exists innovation_devices_admin_write on public.innovation_devices;
create policy innovation_devices_admin_write
on public.innovation_devices
for all
to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
));

-- Seed defaults
insert into public.innovation_modes (
  id, key, label, sub, title, description, icon, rec_id, items, is_active, display_order
) values
(
  '11111111-1111-1111-1111-111111111111',
  'security',
  'Fortress Mode',
  'Security & Monitoring',
  'Fortress Configuration',
  'A robust perimeter defense setup utilizing door sensors, motion detection, and automated alert lighting.',
  'Shield',
  'SEC-01',
  '[{"icon":"DoorClosed","text":"Entry Sensors","accent":"text-violet-300"},{"icon":"Wifi","text":"Motion Detectors","accent":"text-violet-300"},{"icon":"Bell","text":"Smart Siren","accent":"text-violet-300"},{"icon":"Camera","text":"IP Cam Integration","accent":"text-violet-300"}]'::jsonb,
  true,
  1
),
(
  '22222222-2222-2222-2222-222222222222',
  'chill',
  'Chill Ambience',
  'Lighting & Comfort',
  'Relaxation Protocol',
  'Automated mood lighting and climate control designed for evening downtime and media consumption.',
  'Speaker',
  'RLX-05',
  '[{"icon":"Lightbulb","text":"RGB Ambient Light","accent":"text-cyan-300"},{"icon":"Cpu","text":"Automation Logic","accent":"text-cyan-300"},{"icon":"Speaker","text":"Audio Sync","accent":"text-cyan-300"},{"icon":"Zap","text":"Dimmer Switches","accent":"text-cyan-300"}]'::jsonb,
  true,
  2
),
(
  '33333333-3333-3333-3333-333333333333',
  'energy',
  'Eco Saver',
  'Automation & Efficiency',
  'Eco-Efficiency Grid',
  'Optimize power usage with smart scheduling for heavy appliances and precise radar sensing.',
  'Leaf',
  'ECO-99',
  '[{"icon":"Zap","text":"Heavy Duty Plugs","accent":"text-emerald-300"},{"icon":"Cpu","text":"Schedule Timers","accent":"text-emerald-300"},{"icon":"Leaf","text":"Usage Monitoring","accent":"text-emerald-300"},{"icon":"Wifi","text":"mmWave Radar","accent":"text-emerald-300"}]'::jsonb,
  true,
  3
)
on conflict (key) do update
set label = excluded.label,
    sub = excluded.sub,
    title = excluded.title,
    description = excluded.description,
    icon = excluded.icon,
    rec_id = excluded.rec_id,
    items = excluded.items,
    is_active = excluded.is_active,
    display_order = excluded.display_order,
    updated_at = now();

insert into public.innovation_devices (
  id, title, description, accent, icon, chips, is_active, display_order
) values
(
  '44444444-4444-4444-4444-444444444444',
  'Biometric Smart Lock Pro',
  'Fingerprint • RFID • App Control',
  'violet',
  'Shield',
  '["1 Year Battery","AES-128 Enc","Remote Unlock","Tamper Alert"]'::jsonb,
  true,
  1
),
(
  '55555555-5555-5555-5555-555555555555',
  'mmWave Presence Sensor',
  'Micro-Motion Breath Detection',
  'cyan',
  'Wifi',
  '["Sub-mm Accuracy","24/7 Powered","Light Sensor","Zigbee 3.0"]'::jsonb,
  true,
  2
),
(
  '66666666-6666-6666-6666-666666666666',
  'Neon Flex RGBIC',
  'Addressable LED • Music Sync',
  'amber',
  'Lightbulb',
  '["16M Colors","Voice Control","IP67 Waterproof","Auto Schedule"]'::jsonb,
  true,
  3
)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    accent = excluded.accent,
    icon = excluded.icon,
    chips = excluded.chips,
    is_active = excluded.is_active,
    display_order = excluded.display_order,
    updated_at = now();
