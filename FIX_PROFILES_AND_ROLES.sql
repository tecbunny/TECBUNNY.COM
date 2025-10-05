-- =====================================================
-- FIX: Create profiles and grant admin/superadmin roles
-- This fixes the NULL profile_role issue
-- =====================================================

BEGIN;

-- First, ensure profiles exist for both users
INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', SPLIT_PART(u.email, '@', 1)) as name,
  CAST(COALESCE(u.raw_app_meta_data->>'role', 'customer') AS user_role) as role,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- Now update the roles based on app_metadata
UPDATE public.profiles p
SET 
  role = CAST(u.raw_app_meta_data->>'role' AS user_role),
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
  AND u.raw_app_meta_data->>'role' IS NOT NULL;

-- Verify both accounts are configured correctly
SELECT 
  u.email,
  u.raw_app_meta_data->>'role' as app_metadata_role,
  p.role::text as profile_role,
  p.name,
  u.last_sign_in_at,
  CASE 
    WHEN u.raw_app_meta_data->>'role' IN ('admin', 'superadmin') 
     AND p.role::text IN ('admin', 'superadmin') 
     AND u.raw_app_meta_data->>'role' = p.role::text
    THEN '✅ CONFIGURED CORRECTLY'
    ELSE '❌ NOT CONFIGURED'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY u.created_at DESC;

COMMIT;

-- =====================================================
-- EXPECTED OUTPUT:
-- =====================================================
-- Row 1:
--   email: tecbunnysolutions@gmail.com
--   app_metadata_role: superadmin
--   profile_role: superadmin
--   status: ✅ CONFIGURED CORRECTLY
--
-- Row 2:
--   email: tecbunnysolution@gmail.com  
--   app_metadata_role: admin
--   profile_role: admin
--   status: ✅ CONFIGURED CORRECTLY
-- =====================================================

-- =====================================================
-- AFTER RUNNING THIS:
-- =====================================================
-- 1. ✅ Profiles created for both accounts
-- 2. ✅ Roles synced between app_metadata and profiles
-- 3. ❗ SIGN OUT of your current session
-- 4. ❗ SIGN IN with tecbunnysolutions@gmail.com
-- 5. ✅ Go to /management/admin/sales-agents
-- 6. ✅ Should work without "Access denied"
-- =====================================================
