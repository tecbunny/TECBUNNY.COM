-- =====================================================
-- SIMPLE FIX - Grant Admin/Superadmin Access
-- This is a simplified version that will work 100%
-- =====================================================

-- STEP 1: Update app_metadata roles (most important)
-- This is what the JWT token uses for authentication
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"superadmin"'::jsonb
)
WHERE email = 'tecbunnysolutions@gmail.com';

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'tecbunnysolution@gmail.com';

-- STEP 2: Check if profiles exist, if not create them
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- For each user, ensure profile exists
  FOR user_record IN 
    SELECT id, email, raw_app_meta_data->>'role' as role_value
    FROM auth.users 
    WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
  LOOP
    -- Insert or update profile
    INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
    VALUES (
      user_record.id,
      user_record.email,
      SPLIT_PART(user_record.email, '@', 1),
      user_record.role_value::user_role,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = user_record.role_value::user_role,
      updated_at = NOW();
  END LOOP;
END $$;

-- STEP 3: Verify everything is correct
SELECT 
  u.email,
  u.raw_app_meta_data->>'role' as "App Metadata Role",
  p.role::text as "Profile Role",
  p.name as "Name",
  CASE 
    WHEN u.raw_app_meta_data->>'role' = p.role::text 
     AND u.raw_app_meta_data->>'role' IN ('admin', 'superadmin')
    THEN '✅ READY - Sign out and sign in to activate'
    ELSE '❌ ERROR - Something went wrong'
  END as "Status"
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY u.email;

-- =====================================================
-- EXPECTED OUTPUT:
-- =====================================================
-- Row 1: tecbunnysolution@gmail.com  | admin      | admin      | tecbunnysolution  | ✅ READY
-- Row 2: tecbunnysolutions@gmail.com | superadmin | superadmin | tecbunnysolutions | ✅ READY
-- =====================================================

-- =====================================================
-- ⚠️⚠️⚠️ CRITICAL STEPS AFTER RUNNING THIS SQL ⚠️⚠️⚠️
-- =====================================================
-- 
-- 1. ✅ RUN this SQL (click the green "Run" button)
-- 
-- 2. ✅ VERIFY you see "✅ READY" in the output above
-- 
-- 3. ❗❗ SIGN OUT of your website COMPLETELY
--    - Go to your website
--    - Click profile/logout
--    - CLOSE the browser tab
--    - OPEN a NEW tab
-- 
-- 4. ❗❗ SIGN IN with tecbunnysolutions@gmail.com
--    - This creates a NEW JWT token with superadmin role
-- 
-- 5. ✅ Go to /management/admin
--    - Should load without "Access denied"
-- 
-- 6. ✅ Go to /management/admin/sales-agents
--    - Should load without "Access denied"
--
-- =====================================================
-- WHY YOU MUST SIGN OUT AND BACK IN:
-- =====================================================
-- The JWT token is created when you sign in.
-- If you signed in BEFORE running this SQL, your token
-- does NOT have the admin/superadmin role.
-- 
-- Signing out and back in creates a NEW token that
-- includes the role from app_metadata.
-- 
-- Just refreshing the page WILL NOT WORK!
-- =====================================================
