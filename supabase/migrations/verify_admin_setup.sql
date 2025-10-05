-- =====================================================
-- ADMIN ACCESS VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to check your admin setup
-- =====================================================

-- Step 1: Check if tecbunnysolution@gmail.com exists
SELECT 
  'User Account Check' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ User exists'
    ELSE '❌ User does not exist - please create account first'
  END as status
FROM auth.users
WHERE email = 'tecbunnysolution@gmail.com';

-- Step 2: Check app_metadata role
SELECT 
  'App Metadata Role' as check_type,
  CASE 
    WHEN raw_app_meta_data->>'role' = 'admin' THEN '✅ Admin role set in app_metadata'
    WHEN raw_app_meta_data->>'role' = 'superadmin' THEN '✅ Superadmin role set in app_metadata'
    WHEN raw_app_meta_data->>'role' IS NULL THEN '❌ No role in app_metadata - RUN FIX BELOW'
    ELSE '⚠️ Role is: ' || (raw_app_meta_data->>'role') || ' - should be admin'
  END as status,
  raw_app_meta_data->>'role' as current_role
FROM auth.users
WHERE email = 'tecbunnysolution@gmail.com';

-- Step 3: Check profiles table role
SELECT 
  'Profiles Table Role' as check_type,
  CASE 
    WHEN p.role = 'admin' THEN '✅ Admin role set in profiles'
    WHEN p.role = 'superadmin' THEN '✅ Superadmin role set in profiles'
    WHEN p.role IS NULL THEN '❌ No role in profiles - RUN FIX BELOW'
    ELSE '⚠️ Role is: ' || p.role || ' - should be admin'
  END as status,
  p.role as current_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tecbunnysolution@gmail.com';

-- Step 4: Complete verification
SELECT 
  u.email,
  u.raw_app_meta_data->>'role' as app_metadata_role,
  p.role as profile_role,
  p.name,
  u.created_at,
  u.last_sign_in_at,
  CASE 
    WHEN u.raw_app_meta_data->>'role' IN ('admin', 'superadmin') 
     AND p.role IN ('admin', 'superadmin') 
    THEN '✅ ADMIN ACCESS CONFIGURED CORRECTLY'
    ELSE '❌ ADMIN ACCESS NOT CONFIGURED - RUN FIX BELOW'
  END as overall_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tecbunnysolution@gmail.com';

-- =====================================================
-- IF ANY CHECKS FAIL, RUN THIS FIX:
-- =====================================================

/*
BEGIN;

-- Grant admin role in app_metadata (secure, used by JWT)
UPDATE auth.users
SET 
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  ),
  updated_at = now()
WHERE email = 'tecbunnysolution@gmail.com';

-- Grant admin role in profiles (for UI display)
UPDATE public.profiles
SET 
  role = 'admin',
  updated_at = now()
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'tecbunnysolution@gmail.com'
);

-- Verify the fix
SELECT 
  u.email,
  u.raw_app_meta_data->>'role' as app_role,
  p.role as profile_role,
  '✅ Admin roles granted successfully' as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tecbunnysolution@gmail.com';

COMMIT;
*/

-- =====================================================
-- IMPORTANT: AFTER RUNNING THE FIX
-- =====================================================
-- 1. Sign out of your account completely
-- 2. Sign back in to get new JWT token with admin role
-- 3. Navigate to /management/admin/sales-agents
-- 4. Should work without "Access denied"
-- =====================================================
