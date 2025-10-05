-- =====================================================
-- FIX: GRANT ADMIN ACCESS TO tecbunnysolution@gmail.com
-- Copy this entire script and run it in Supabase SQL Editor
-- =====================================================

BEGIN;

-- Grant admin role in app_metadata (secure, used by JWT and RLS)
UPDATE auth.users
SET 
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  ),
  updated_at = now()
WHERE email = 'tecbunnysolution@gmail.com';

-- Grant admin role in profiles table (for UI display)
UPDATE public.profiles
SET 
  role = 'admin',
  updated_at = now()
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'tecbunnysolution@gmail.com'
);

-- Verify the fix worked
SELECT 
  u.email,
  u.raw_app_meta_data->>'role' as app_metadata_role,
  p.role as profile_role,
  CASE 
    WHEN u.raw_app_meta_data->>'role' = 'admin' AND p.role = 'admin' 
    THEN '✅ SUCCESS! Admin roles granted successfully'
    ELSE '❌ FAILED - Check if user exists'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tecbunnysolution@gmail.com';

COMMIT;

-- =====================================================
-- EXPECTED OUTPUT AFTER RUNNING THIS:
-- =====================================================
-- email: tecbunnysolution@gmail.com
-- app_metadata_role: admin
-- profile_role: admin
-- status: ✅ SUCCESS! Admin roles granted successfully
-- =====================================================

-- =====================================================
-- ⚠️ CRITICAL NEXT STEPS (REQUIRED):
-- =====================================================
-- 1. ✅ This SQL has been run successfully
-- 2. ❗ SIGN OUT of your website account
-- 3. ❗ SIGN BACK IN with tecbunnysolution@gmail.com
-- 4. ✅ Go to /management/admin/sales-agents
-- 5. ✅ Should work without "Access denied"
-- =====================================================
