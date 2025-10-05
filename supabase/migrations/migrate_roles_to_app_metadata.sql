-- Migrate admin roles from user_metadata to app_metadata
-- This must be run AFTER fix_rls_security_issues.sql

BEGIN;

-- Move role from user_metadata to app_metadata for all users
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    COALESCE(raw_user_meta_data->'role', '"user"'::jsonb)
)
WHERE raw_user_meta_data ? 'role';

-- Specifically ensure admin users have correct app_metadata
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"superadmin"'::jsonb
)
WHERE email = 'tecbunnysolutions@gmail.com';

UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'::jsonb
)
WHERE email = 'tecbunnysolution@gmail.com';

-- Optional: Clean up user_metadata (only if you want to remove it)
-- UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data - 'role';

COMMIT;
