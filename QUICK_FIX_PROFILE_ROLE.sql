-- =====================================================
-- QUICK FIX: Profile Role Mismatch
-- Run this ONE query to fix everything
-- =====================================================

-- This single transaction will:
-- 1. Update JWT role to superadmin
-- 2. Update profile role to superadmin  
-- 3. Create/update profile with proper name and mobile
-- 4. Fix display name

BEGIN;

-- Fix JWT role in auth.users
UPDATE auth.users
SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', 'superadmin')
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com');

-- Also update user metadata with proper name if not set
UPDATE auth.users
SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('name', 'TecBunny Solutions')
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
AND (raw_user_meta_data->>'name' IS NULL OR raw_user_meta_data->>'name' = email);

-- Create or update profile with correct role, name, and placeholder mobile
INSERT INTO public.profiles (id, email, name, mobile, role, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', 'TecBunny Solutions'),
    COALESCE(u.raw_user_meta_data->>'mobile', u.raw_user_meta_data->>'phone', NULL),
    'superadmin',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ON CONFLICT (id) 
DO UPDATE SET 
    role = 'superadmin',
    name = CASE 
        WHEN profiles.name IS NULL OR profiles.name = profiles.email 
        THEN COALESCE(EXCLUDED.name, 'TecBunny Solutions')
        ELSE profiles.name
    END,
    mobile = COALESCE(EXCLUDED.mobile, profiles.mobile),
    updated_at = NOW();

COMMIT;

-- Verify the fix
SELECT 
    u.email,
    u.raw_app_meta_data->>'role' as jwt_role,
    u.raw_user_meta_data->>'name' as user_metadata_name,
    p.role::text as profile_role,
    p.name as profile_name,
    p.mobile as profile_mobile,
    CASE 
        WHEN u.raw_app_meta_data->>'role' = 'superadmin' 
         AND p.role::text = 'superadmin' 
        THEN '✅ FIXED - Now sign out and sign in again!'
        ELSE '❌ Something went wrong - check email spelling'
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com');

-- =====================================================
-- NEXT STEPS:
-- =====================================================
-- 1. ✅ SQL ran successfully above
-- 2. 🚪 Sign OUT from tecbunny.com
-- 3. ⏱️ Wait 30 seconds
-- 4. 🔑 Sign IN again
-- 5. 👤 Check profile page - should show:
--    - Name: TecBunny Solutions (not email)
--    - Role: Superadmin (not Customer)
--    - Mobile: You can update this in Edit Profile
-- =====================================================

-- =====================================================
-- OPTIONAL: Set your mobile number
-- =====================================================
-- If you want to add your mobile number now, uncomment and run:
/*
UPDATE public.profiles
SET mobile = '+91XXXXXXXXXX'  -- Replace with your actual number
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com');
*/
