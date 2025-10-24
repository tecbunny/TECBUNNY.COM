-- Add tracking columns for first-login WhatsApp onboarding messages
alter table profiles
  add column if not exists first_login_whatsapp_sent boolean default false;

alter table profiles
  add column if not exists first_login_notified_at timestamptz;

comment on column profiles.first_login_whatsapp_sent is 'Marks whether the first-login WhatsApp onboarding template has been sent to the user.';
comment on column profiles.first_login_notified_at is 'Timestamp when the first-login WhatsApp onboarding template was dispatched.';

-- Refresh PostgREST cache so Supabase picks up the new columns immediately
notify pgrst, 'reload schema';
