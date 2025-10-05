-- Migration: Add superadmin and admin users

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure idempotent creation of superadmin and admin in auth.users and public.profiles
DO $$
DECLARE
  super_id UUID;
  admin_id UUID;
BEGIN
  -- Super Admin
  SELECT id INTO super_id FROM auth.users WHERE email = 'tecbunnysolutions@gmail.com';
  IF super_id IS NULL THEN
    super_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, email_confirmed_at, role, raw_app_meta_data, created_at, updated_at)
    VALUES (super_id, 'tecbunnysolutions@gmail.com', NOW(), 'authenticated', '{"role": "superadmin"}'::jsonb, NOW(), NOW());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = super_id) THEN
    INSERT INTO public.profiles (id, name, email, mobile, role, created_at, updated_at)
    VALUES (super_id, 'Super Administrator', 'tecbunnysolutions@gmail.com', '7387375651', 'superadmin', NOW(), NOW());
  END IF;

  -- Admin
  SELECT id INTO admin_id FROM auth.users WHERE email = 'tecbunnysolution@gmail.com';
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, email_confirmed_at, role, raw_app_meta_data, created_at, updated_at)
    VALUES (admin_id, 'tecbunnysolution@gmail.com', NOW(), 'authenticated', '{"role": "admin"}'::jsonb, NOW(), NOW());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = admin_id) THEN
    INSERT INTO public.profiles (id, name, email, mobile, role, created_at, updated_at)
    VALUES (admin_id, 'Administrator', 'tecbunnysolution@gmail.com', '9604136010', 'admin', NOW(), NOW());
  END IF;
END $$;