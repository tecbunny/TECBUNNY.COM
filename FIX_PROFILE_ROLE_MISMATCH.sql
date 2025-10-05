-- =====================================================
-- FIX PROFILE ROLE MISMATCH ISSUE
-- Sync profile roles with auth metadata
-- =====================================================

-- PROBLEM: Profile shows "Customer" but user should be admin/superadmin
-- CAUSE: Role in profiles table doesn't match raw_app_meta_data role in auth.users
-- SOLUTION: Sync both roles to ensure consistency

-- =====================================================
-- STEP 1: CHECK CURRENT ROLE STATUS
-- =====================================================

-- Check what roles are currently set
SELECT 
    u.email,
    u.raw_app_meta_data->>'role' as jwt_role,
    p.role::text as profile_role,
    CASE 
        WHEN u.raw_app_meta_data->>'role' IS NULL AND p.role IS NULL THEN '❌ NO ROLES SET'
        WHEN u.raw_app_meta_data->>'role' IS NULL THEN '⚠️ Missing JWT role'
        WHEN p.role IS NULL THEN '⚠️ Missing profile role'
        WHEN u.raw_app_meta_data->>'role' != p.role::text THEN '⚠️ MISMATCH: ' || (u.raw_app_meta_data->>'role') || ' vs ' || p.role::text
        ELSE '✅ Roles match: ' || (u.raw_app_meta_data->>'role')
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY u.email;

-- =====================================================
-- STEP 2: FIX THE ROLE MISMATCH
-- =====================================================

-- Set both JWT role and profile role to superadmin
UPDATE auth.users
SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', 'superadmin')
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com');

-- Update profile role to match
UPDATE public.profiles
SET 
    role = 'superadmin',
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
);

-- =====================================================
-- STEP 3: CREATE PROFILE IF IT DOESN'T EXIST
-- =====================================================

-- Insert profile if it doesn't exist (handles both emails)
INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', u.email),
    'superadmin',
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ON CONFLICT (id) 
DO UPDATE SET 
    role = 'superadmin',
    email = EXCLUDED.email,
    name = COALESCE(profiles.name, EXCLUDED.name),
    updated_at = NOW();

-- =====================================================
-- STEP 4: VERIFY THE FIX
-- =====================================================

-- Verify both roles are now set correctly
SELECT 
    '=== VERIFICATION AFTER FIX ===' as step,
    u.email,
    u.raw_app_meta_data->>'role' as jwt_role,
    p.role::text as profile_role,
    p.name,
    CASE 
        WHEN u.raw_app_meta_data->>'role' = 'superadmin' 
         AND p.role::text = 'superadmin' 
        THEN '✅ FIXED - Both roles are superadmin'
        ELSE '❌ STILL BROKEN'
    END as result
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY u.email;

-- =====================================================
-- STEP 5: CREATE TRIGGER TO KEEP ROLES IN SYNC
-- =====================================================

-- Create function to sync roles automatically
CREATE OR REPLACE FUNCTION public.sync_profile_role_from_jwt()
RETURNS TRIGGER AS $$
BEGIN
    -- When user's app_metadata role changes, update profile role
    IF (NEW.raw_app_meta_data->>'role') IS DISTINCT FROM (OLD.raw_app_meta_data->>'role') THEN
        UPDATE public.profiles
        SET 
            role = (NEW.raw_app_meta_data->>'role')::text,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON auth.users;
CREATE TRIGGER sync_profile_role_trigger
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (NEW.raw_app_meta_data IS DISTINCT FROM OLD.raw_app_meta_data)
    EXECUTE FUNCTION public.sync_profile_role_from_jwt();

-- =====================================================
-- STEP 6: UPDATE PROFILE DISPLAY NAME
-- =====================================================

-- Update profile with proper name if needed
UPDATE public.profiles
SET 
    name = 'TecBunny Solutions Admin',
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
)
AND (name IS NULL OR name = email);

-- =====================================================
-- STEP 7: FINAL VERIFICATION
-- =====================================================

-- Complete profile check
SELECT 
    '=== FINAL PROFILE CHECK ===' as step,
    p.id,
    p.email,
    p.name,
    p.role::text as profile_role,
    p.mobile,
    u.raw_app_meta_data->>'role' as jwt_role,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    u.last_sign_in_at,
    CASE 
        WHEN u.raw_app_meta_data->>'role' = p.role::text 
         AND p.role::text IN ('admin', 'superadmin')
        THEN '✅ PERFECT - Profile configured correctly'
        ELSE '❌ NEEDS ATTENTION'
    END as status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
ORDER BY p.email;

-- =====================================================
-- IMPORTANT: SIGN OUT AND SIGN IN AGAIN
-- =====================================================

/*
⚠️ CRITICAL STEP ⚠️

After running this script, you MUST:

1. Sign out completely from the application
2. Close the browser tab
3. Wait 30 seconds (for JWT to expire)
4. Sign in again

Why? The JWT token is cached and contains the OLD role.
Signing in again will generate a NEW JWT with the correct role.

Without this step, the profile page will still show "Customer"
even though the database has been updated!
*/

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

/*
If profile still shows "Customer" after signing in again:

1. Check if role is set in both places:
   SELECT email, raw_app_meta_data->>'role' as jwt, role::text as profile
   FROM auth.users u
   JOIN profiles p ON p.id = u.id
   WHERE email = 'tecbunnysolution@gmail.com';

2. Clear browser cache and cookies

3. Try incognito/private browsing mode

4. Check the actual JWT token:
   - Open browser DevTools (F12)
   - Go to Application → Local Storage
   - Find 'supabase.auth.token'
   - Decode at jwt.io
   - Check if 'role' field shows 'superadmin'

5. If still not working, run EMERGENCY_DEBUG_ADMIN.sql
*/

-- =====================================================
-- END OF SCRIPT
-- =====================================================
