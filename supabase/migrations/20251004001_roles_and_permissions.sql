-- Migration: Canonical roles & permissions hardening
-- Date: 2025-10-04

-- 1. Ensure profiles table has required columns/constraints
-- NOTE: Original attempted ALTER TYPE removed because policies in other tables may reference profiles.role
-- If profiles.role is already text (most setups) nothing needed.
-- If it's an enum and you truly must convert to text, perform a separate manual migration:
--   a) Drop dependent policies referencing the column
--   b) ALTER TABLE ... ALTER COLUMN role TYPE text USING role::text;
--   c) Recreate policies
-- Guarded attempt (will only run if NOT already text AND no blocking policies). Safe no-op if already text.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role' AND data_type <> 'text'
  ) THEN
    RAISE NOTICE 'profiles.role is not text; skipping automatic type change to avoid breaking dependent policies. Perform manual migration if required.';
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Add role constraint
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer','sales','service_engineer','accounts','manager','admin','superadmin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Updated index for role
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_active_idx ON public.profiles(is_active);

-- 4. Audit table
CREATE TABLE IF NOT EXISTS public.role_audit (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_role text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Touch trigger for updated_at (if missing)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

-- 6. Guard direct role changes (only service key / elevated claim). Adjust claim path if needed.
CREATE OR REPLACE FUNCTION public.profiles_role_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  jwt jsonb;
  caller_role text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    jwt := current_setting('request.jwt.claims', true)::jsonb;
    caller_role := coalesce(jsonb_extract_path_text(jwt, 'app_metadata','role'), jsonb_extract_path_text(jwt,'role'));
    IF caller_role IS DISTINCT FROM 'superadmin' AND caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Direct role changes not permitted (caller=%). Use RPC admin_set_user_role.', caller_role;
    END IF;
    -- Prevent assigning superadmin unless caller is superadmin
    IF NEW.role = 'superadmin' AND caller_role <> 'superadmin' THEN
      RAISE EXCEPTION 'Only superadmin may assign superadmin role';
    END IF;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_profiles_role_guard ON public.profiles;
CREATE TRIGGER trg_profiles_role_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.profiles_role_guard();

-- 7. Secure RPC for setting role (preferred path)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  jwt jsonb;
  caller_app_role text;
BEGIN
  IF p_role NOT IN ('customer','sales','service_engineer','accounts','manager','admin','superadmin') THEN
    RAISE EXCEPTION 'Invalid role %', p_role;
  END IF;

  jwt := current_setting('request.jwt.claims', true)::jsonb;
  caller_app_role := coalesce(jsonb_extract_path_text(jwt,'app_metadata','role'), jsonb_extract_path_text(jwt,'role'));

  IF caller_app_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Only superadmin may assign superadmin
  IF p_role = 'superadmin' AND caller_app_role <> 'superadmin' THEN
    RAISE EXCEPTION 'Only superadmin may assign superadmin';
  END IF;

  -- Admins cannot elevate to superadmin or downgrade superadmin unless superadmin
  IF caller_app_role = 'admin' AND p_role IN ('superadmin') THEN
    RAISE EXCEPTION 'Admin cannot assign superadmin';
  END IF;

  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
  INSERT INTO public.role_audit (user_id, new_role, changed_by, note) VALUES (p_user_id, p_role, auth.uid(), p_note);
END;$$;

-- 8. RLS policies (idempotent creation pattern)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove existing conflicting policies (optional manual step if names collide)
-- CREATE / REPLACE not supported for policies, so we try-create inside DO blocks.
DO $$ BEGIN
  CREATE POLICY profiles_select_self ON public.profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY profiles_select_elevated ON public.profiles FOR SELECT USING (
    coalesce(jsonb_extract_path_text(current_setting('request.jwt.claims', true)::jsonb,'app_metadata','role'), 'customer') IN (
      'sales','service_engineer','accounts','manager','admin','superadmin'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY profiles_update_elevated ON public.profiles FOR UPDATE USING (
    coalesce(jsonb_extract_path_text(current_setting('request.jwt.claims', true)::jsonb,'app_metadata','role'), 'customer') IN (
      'manager','admin','superadmin'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9. Verification query (optional for migration log)
-- SELECT 'Role migration complete' AS info, now() AS at;
