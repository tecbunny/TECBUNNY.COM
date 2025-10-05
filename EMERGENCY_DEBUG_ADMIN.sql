-- =====================================================
-- EMERGENCY DEBUG - Check what's blocking admin access
-- Run this to see EXACTLY what's wrong
-- =====================================================

-- Check 1: Verify the SQL actually updated the roles
SELECT 
  '=== CHECK 1: USER ROLES ===' as debug_step,
  email,
  raw_app_meta_data->>'role' as app_metadata_role,
  raw_app_meta_data as full_app_metadata,
  last_sign_in_at
FROM auth.users
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY email;

-- Check 2: Verify profiles table has the roles
SELECT 
  '=== CHECK 2: PROFILE ROLES ===' as debug_step,
  u.email,
  p.id as profile_exists,
  p.role::text as profile_role,
  p.name,
  p.created_at,
  p.updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY u.email;

-- Check 3: Verify BOTH are set correctly
SELECT 
  '=== CHECK 3: BOTH ROLES MATCH ===' as debug_step,
  u.email,
  u.raw_app_meta_data->>'role' as jwt_role,
  p.role::text as db_role,
  u.last_sign_in_at as last_signin,
  CASE 
    WHEN u.raw_app_meta_data->>'role' IS NULL THEN '❌ JWT role is NULL - SQL did not run or failed'
    WHEN p.role IS NULL THEN '❌ Profile role is NULL - profile not created'
    WHEN u.raw_app_meta_data->>'role' != p.role::text THEN '⚠️ MISMATCH - roles dont match'
    WHEN u.raw_app_meta_data->>'role' NOT IN ('admin', 'superadmin') THEN '⚠️ Wrong role: ' || (u.raw_app_meta_data->>'role')
    ELSE '✅ PERFECT - both roles set correctly'
  END as diagnosis
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY u.email;

-- Check 4: When did you last sign in? (CRITICAL)
SELECT 
  '=== CHECK 4: DID YOU SIGN OUT AND BACK IN? ===' as debug_step,
  email,
  last_sign_in_at,
  updated_at as role_updated_at,
  CASE 
    WHEN last_sign_in_at IS NULL THEN '❌ Never signed in - sign in now!'
    WHEN last_sign_in_at < updated_at THEN '❌❌❌ SIGNED IN BEFORE SQL RAN - MUST SIGN OUT AND BACK IN NOW!'
    WHEN last_sign_in_at >= updated_at THEN '✅ Signed in AFTER SQL - JWT should have new role'
    ELSE 'Unknown'
  END as critical_issue
FROM auth.users
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY email;

-- =====================================================
-- INTERPRETATION GUIDE:
-- =====================================================
--
-- If CHECK 1 shows NULL for app_metadata_role:
--   → The SQL didn't run or failed
--   → Run SIMPLE_FIX_ADMIN_ACCESS.sql again
--
-- If CHECK 2 shows NULL for profile_role:
--   → Profile wasn't created
--   → Run SIMPLE_FIX_ADMIN_ACCESS.sql again
--
-- If CHECK 3 shows MISMATCH:
--   → Roles don't match between JWT and DB
--   → Run SIMPLE_FIX_ADMIN_ACCESS.sql again
--
-- If CHECK 4 shows "SIGNED IN BEFORE SQL RAN":
--   → ❗❗❗ THIS IS THE PROBLEM ❗❗❗
--   → You MUST sign out and sign in again
--   → Your JWT token is OLD and doesn't have the role
--
-- =====================================================
