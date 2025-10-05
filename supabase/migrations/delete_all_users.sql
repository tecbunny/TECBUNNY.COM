-- Delete all users from the database
-- WARNING: This will remove ALL users including admins!
-- Make sure to backup data if needed before running this

BEGIN;

-- First, delete from public.profiles (due to foreign key constraints)
DELETE FROM public.profiles;

-- Then delete from auth.users (this will cascade to other auth tables)
DELETE FROM auth.users;

-- Optionally, delete OTP codes
DELETE FROM public.otp_codes;

-- Optionally, reset any user-related sequences
-- ALTER SEQUENCE IF EXISTS public.profiles_id_seq RESTART WITH 1;

COMMIT;

-- After running this, you may want to re-run the admin users migration:
-- Run: add_admin_users.sql to recreate admin accounts
