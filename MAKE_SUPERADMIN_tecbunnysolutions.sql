-- =====================================================
-- GRANT SUPERADMIN ACCESS TO tecbunnysolutions@gmail.com
-- Copy this entire script and run it in Supabase SQL Editor
-- =====================================================

BEGIN;

-- Grant superadmin role in app_metadata (secure, used by JWT and RLS)
UPDATE auth.users
SET 
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"superadmin"'
  ),
  updated_at = now()
WHERE email = 'tecbunnysolutions@gmail.com';

-- Grant superadmin role in profiles table (for UI display)
UPDATE public.profiles
SET 
  role = 'superadmin',
  updated_at = now()
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'tecbunnysolutions@gmail.com'
);

-- Verify the fix worked
SELECT 
  u.email,
  u.raw_app_meta_data->>'role' as app_metadata_role,
  p.role as profile_role,
  p.name,
  u.created_at,
  CASE 
    WHEN u.raw_app_meta_data->>'role' = 'superadmin' AND p.role = 'superadmin' 
    THEN '✅ SUCCESS! Superadmin roles granted successfully'
    WHEN u.raw_app_meta_data->>'role' = 'superadmin' AND p.role IS NULL
    THEN '⚠️ WARNING! Profile not created yet - sign in first, then run this SQL again'
    ELSE '❌ FAILED - Check if user exists or email is correct'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tecbunnysolutions@gmail.com';

COMMIT;

-- =====================================================
-- EXPECTED OUTPUT AFTER RUNNING THIS:
-- =====================================================
-- email: tecbunnysolutions@gmail.com
-- app_metadata_role: superadmin
-- profile_role: superadmin
-- status: ✅ SUCCESS! Superadmin roles granted successfully
-- =====================================================

-- =====================================================
-- ⚠️ CRITICAL NEXT STEPS (REQUIRED):
-- =====================================================
-- 1. ✅ This SQL has been run successfully
-- 2. ❗ SIGN OUT of your website account (if logged in)
-- 3. ❗ SIGN BACK IN with tecbunnysolutions@gmail.com
-- 4. ✅ Go to /management/admin (dashboard)
-- 5. ✅ Go to /management/admin/sales-agents
-- 6. ✅ All admin pages should work without "Access denied"
-- =====================================================

-- =====================================================
-- VERIFY BOTH ACCOUNTS (OPTIONAL):
-- =====================================================
-- Run this to see all admin/superadmin users:

SELECT 
  u.email,
  u.raw_app_meta_data->>'role' as app_metadata_role,
  p.role as profile_role,
  p.name,
  u.last_sign_in_at,
  CASE 
    WHEN u.raw_app_meta_data->>'role' IN ('admin', 'superadmin') 
     AND p.role IN ('admin', 'superadmin') 
    THEN '✅ CONFIGURED CORRECTLY'
    ELSE '❌ NOT CONFIGURED'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY u.created_at DESC;

-- =====================================================
-- WHAT IS SUPERADMIN?
-- =====================================================
-- Superadmin has the same permissions as admin, but:
-- - Higher in the role hierarchy
-- - Can be used for future super-admin-only features
-- - Useful for distinguishing between primary admin and secondary admins
-- - In current implementation, both can access all admin pages
-- =====================================================
