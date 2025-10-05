-- =====================================================
-- ULTRA QUICK FIX - One Query to Fix Everything
-- Copy, replace values, paste in Supabase SQL Editor
-- =====================================================

-- STEP 1: Edit these values
DO $$
BEGIN
    -- ⚠️ CHANGE THESE VALUES BEFORE RUNNING:
    PERFORM (
        -- Fix JWT role
        UPDATE auth.users
        SET 
            raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"superadmin"}'::jsonb,
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"name":"TecBunny Solutions"}'::jsonb
        WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
    );

    -- Fix profile
    PERFORM (
        INSERT INTO public.profiles (id, email, name, mobile, role)
        SELECT id, email, 'TecBunny Solutions', NULL, 'superadmin'
        FROM auth.users
        WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com')
        ON CONFLICT (id) DO UPDATE 
        SET role = 'superadmin', name = 'TecBunny Solutions', updated_at = NOW()
    );

    RAISE NOTICE '✅ FIXED! Now sign out and sign in again.';
END $$;

-- STEP 2: Verify
SELECT 
    email,
    raw_app_meta_data->>'role' as jwt_role,
    raw_user_meta_data->>'name' as user_name,
    p.role::text as profile_role,
    p.name as profile_name
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE email IN ('tecbunnysolution@gmail.com', 'tecbunnysolutions@gmail.com');

-- =====================================================
-- TO CUSTOMIZE NAME:
-- Change "TecBunny Solutions" above to your actual name
-- =====================================================

-- =====================================================
-- TO ADD MOBILE NUMBER:
-- After running above, run this:
-- =====================================================
/*
UPDATE public.profiles
SET mobile = '+919876543210'  -- Your number
WHERE email = 'tecbunnysolution@gmail.com';
*/

-- =====================================================
-- THEN: Sign out, wait 30 sec, sign in
-- =====================================================
