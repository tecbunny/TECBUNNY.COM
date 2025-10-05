-- Make tecbunnysolution@gmail.com an admin user
-- This updates both the auth.users app_metadata and the profiles table

BEGIN;

-- Step 1: Update auth.users table to set app_metadata role to 'admin'
-- This is the secure way to set roles (app_metadata is admin-only editable)
UPDATE auth.users
SET 
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  ),
  updated_at = now()
WHERE email = 'tecbunnysolution@gmail.com';

-- Step 2: Update profiles table to match (for display purposes)
UPDATE public.profiles
SET 
  role = 'admin',
  updated_at = now()
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'tecbunnysolution@gmail.com'
);

-- Step 3: Verify the changes
SELECT 
  u.id,
  u.email,
  u.raw_app_meta_data->>'role' as app_metadata_role,
  p.role as profile_role,
  u.created_at,
  u.updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tecbunnysolution@gmail.com';

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this migration, the user should have:
-- 1. app_metadata.role = 'admin' (secure, used by RLS policies)
-- 2. profiles.role = 'admin' (for display in UI)
--
-- The user will now have full admin access to:
-- - View and manage all users
-- - Access admin dashboard
-- - Manage products, orders, services
-- - View analytics and reports
-- - Configure system settings
--
-- NOTE: If the email doesn't exist yet, this migration will do nothing.
-- Make sure the user has completed signup first.
