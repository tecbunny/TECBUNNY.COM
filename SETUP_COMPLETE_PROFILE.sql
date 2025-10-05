-- =====================================================
-- COMPLETE PROFILE SETUP - Name, Mobile, and Role
-- =====================================================

-- This script will properly configure:
-- 1. Display name (not email address)
-- 2. Mobile number (if you provide it)
-- 3. Role (superadmin)
-- 4. JWT metadata

-- =====================================================
-- STEP 1: UPDATE YOUR NAME AND MOBILE HERE
-- =====================================================

-- IMPORTANT: Replace these values with your actual details
-- Then run this script in Supabase SQL Editor

DO $$
DECLARE
    admin_email TEXT := 'tecbunnysolution@gmail.com';  -- Your email
    admin_name TEXT := 'TecBunny Solutions';           -- CHANGE THIS to your actual name
    admin_mobile TEXT := NULL;                          -- CHANGE THIS to your mobile (e.g., '+919876543210')
BEGIN

    -- =====================================================
    -- Fix JWT role (for authentication)
    -- =====================================================
    UPDATE auth.users
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', 'superadmin')
    WHERE email = admin_email;

    -- =====================================================
    -- Set user metadata (for display name)
    -- =====================================================
    UPDATE auth.users
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'name', admin_name,
            'mobile', admin_mobile
        )
    WHERE email = admin_email;

    -- =====================================================
    -- Create or update profile table
    -- =====================================================
    INSERT INTO public.profiles (id, email, name, mobile, role, created_at, updated_at)
    SELECT 
        u.id,
        u.email,
        admin_name,
        admin_mobile,
        'superadmin',
        NOW(),
        NOW()
    FROM auth.users u
    WHERE u.email = admin_email
    ON CONFLICT (id) 
    DO UPDATE SET 
        role = 'superadmin',
        name = admin_name,
        mobile = COALESCE(admin_mobile, profiles.mobile),
        updated_at = NOW();

    RAISE NOTICE 'Profile updated successfully!';

END $$;

-- =====================================================
-- STEP 2: VERIFY THE SETUP
-- =====================================================

SELECT 
    '=== PROFILE VERIFICATION ===' as check_name,
    u.email,
    u.raw_user_meta_data->>'name' as user_metadata_name,
    u.raw_user_meta_data->>'mobile' as user_metadata_mobile,
    u.raw_app_meta_data->>'role' as jwt_role,
    p.name as profile_name,
    p.mobile as profile_mobile,
    p.role::text as profile_role,
    CASE 
        WHEN p.name IS NOT NULL AND p.name != u.email AND p.role::text = 'superadmin'
        THEN '✅ PERFECT - Profile configured correctly!'
        WHEN p.name = u.email
        THEN '⚠️ Name is set to email - update admin_name variable above'
        WHEN p.role::text != 'superadmin'
        THEN '❌ Role is not superadmin'
        ELSE '⚠️ Check configuration'
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com');

-- =====================================================
-- STEP 3: QUICK UPDATE OPTIONS (if needed)
-- =====================================================

-- Option A: Just update your name
/*
UPDATE public.profiles
SET name = 'Your Actual Name'  -- Replace with your name
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com');
*/

-- Option B: Just update your mobile
/*
UPDATE public.profiles
SET mobile = '+919876543210'  -- Replace with your mobile
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com');
*/

-- Option C: Update both name and mobile
/*
UPDATE public.profiles
SET 
    name = 'Your Actual Name',    -- Replace with your name
    mobile = '+919876543210',     -- Replace with your mobile
    updated_at = NOW()
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com');
*/

-- =====================================================
-- WHAT SHOULD SHOW ON PROFILE PAGE
-- =====================================================

/*
After running this script and signing in again:

Name:   TecBunny Solutions (or whatever you set)
Email:  tecbunnysolution@gmail.com
Role:   Superadmin
Mobile: +919876543210 (or "Not provided" if not set)

To change the name/mobile:
1. Edit the variables at the top of this script
2. Run the script again
3. Sign out and sign in
*/

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

/*
If profile still shows email as name:
1. Make sure you changed admin_name variable above
2. Run the script
3. Sign out completely
4. Wait 30 seconds
5. Sign in again
6. Refresh profile page

If mobile shows "Not provided":
1. Set admin_mobile variable above (e.g., '+919876543210')
2. Run the script again
3. Refresh page (no need to sign out for mobile)
*/

-- =====================================================
-- END OF SCRIPT
-- =====================================================
