-- Manual migration: Convert profiles.role from enum to text
-- Only run if you need to change the type and policies depend on the column
-- 1. List policies referencing profiles.role
SELECT polname, pg_get_expr(polqual, polrelid) AS policy_expr
FROM pg_policy
WHERE polrelid = 'profiles'::regclass AND pg_get_expr(polqual, polrelid) ILIKE '%role%';

-- 2. Drop policies referencing profiles.role (edit names as needed)
-- Example:
-- DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
-- DROP POLICY IF EXISTS profiles_select_elevated ON public.profiles;
-- DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
-- DROP POLICY IF EXISTS profiles_update_elevated ON public.profiles;
-- (Add any other policies referencing role)

-- 3. Convert column type
ALTER TABLE public.profiles ALTER COLUMN role TYPE text USING role::text;

-- 4. Recreate policies (copy from main migration)
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_select_elevated ON public.profiles FOR SELECT USING (
  coalesce(jsonb_extract_path_text(current_setting('request.jwt.claims', true)::jsonb,'app_metadata','role'), 'customer') IN (
    'sales','service_engineer','accounts','manager','admin','superadmin'
  )
);
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_elevated ON public.profiles FOR UPDATE USING (
  coalesce(jsonb_extract_path_text(current_setting('request.jwt.claims', true)::jsonb,'app_metadata','role'), 'customer') IN (
    'manager','admin','superadmin'
  )
);

-- 5. Verify
SELECT pg_typeof(role) FROM public.profiles LIMIT 1;
-- Should return 'text'
