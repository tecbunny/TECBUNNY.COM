-- =====================================================
-- DEBUG: Check Current Admin Setup Status
-- Run this to see what's wrong
-- =====================================================

-- Check 1: Do the users exist?
SELECT 
  '1. USER ACCOUNTS' as check_step,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Email confirmed'
    ELSE '❌ Email NOT confirmed - check your inbox'
  END as email_status
FROM auth.users
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY email;

-- Check 2: What's in app_metadata?
SELECT 
  '2. APP_METADATA (JWT TOKEN ROLE)' as check_step,
  email,
  raw_app_meta_data->>'role' as current_role,
  CASE 
    WHEN raw_app_meta_data->>'role' = 'admin' THEN '✅ Admin role set'
    WHEN raw_app_meta_data->>'role' = 'superadmin' THEN '✅ Superadmin role set'
    WHEN raw_app_meta_data->>'role' IS NULL THEN '❌ NO ROLE - Run SIMPLE_FIX_ADMIN_ACCESS.sql'
    ELSE '⚠️ Role is: ' || (raw_app_meta_data->>'role')
  END as status
FROM auth.users
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY email;

-- Check 3: Do profiles exist?
SELECT 
  '3. PROFILES TABLE' as check_step,
  u.email,
  p.id as profile_id,
  p.role::text as profile_role,
  p.name,
  CASE 
    WHEN p.id IS NULL THEN '❌ NO PROFILE - Run SIMPLE_FIX_ADMIN_ACCESS.sql'
    WHEN p.role::text IN ('admin', 'superadmin') THEN '✅ Profile has admin role'
    ELSE '❌ Profile role is: ' || COALESCE(p.role::text, 'NULL')
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY u.email;

-- Check 4: Are roles synced?
SELECT 
  '4. ROLES MATCH CHECK' as check_step,
  u.email,
  u.raw_app_meta_data->>'role' as app_role,
  p.role::text as profile_role,
  CASE 
    WHEN u.raw_app_meta_data->>'role' IS NULL THEN '❌ NO app_metadata role'
    WHEN p.role IS NULL THEN '❌ NO profile role'
    WHEN u.raw_app_meta_data->>'role' = p.role::text THEN '✅ Roles match perfectly'
    ELSE '⚠️ MISMATCH - app: ' || (u.raw_app_meta_data->>'role') || ', profile: ' || p.role::text
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY u.email;

-- Check 5: Final status
SELECT 
  '5. OVERALL STATUS' as check_step,
  u.email,
  CASE 
    WHEN u.raw_app_meta_data->>'role' IN ('admin', 'superadmin') 
     AND p.role::text IN ('admin', 'superadmin')
     AND u.raw_app_meta_data->>'role' = p.role::text
    THEN '✅✅✅ PERFECT! Now sign out and sign in'
    WHEN u.raw_app_meta_data->>'role' IS NULL
    THEN '❌ NO app_metadata role - RUN: SIMPLE_FIX_ADMIN_ACCESS.sql'
    WHEN p.role IS NULL
    THEN '❌ NO profile - RUN: SIMPLE_FIX_ADMIN_ACCESS.sql'
    ELSE '⚠️ PARTIAL - RUN: SIMPLE_FIX_ADMIN_ACCESS.sql'
  END as what_to_do
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY u.email;

-- =====================================================
-- WHAT TO DO BASED ON RESULTS:
-- =====================================================
-- 
-- If you see ❌ anywhere:
--   → Run: SIMPLE_FIX_ADMIN_ACCESS.sql
--   → Then run this debug script again
--   → Should see all ✅
--
-- If you see all ✅:
--   → SIGN OUT completely
--   → SIGN IN with tecbunnysolutions@gmail.com
--   → Go to /management/admin
--   → Should work!
--
-- If still doesn't work after all ✅:
--   → You didn't sign out and back in
--   → OR you're testing with the wrong account
--   → OR browser cached the old session
-- =====================================================
