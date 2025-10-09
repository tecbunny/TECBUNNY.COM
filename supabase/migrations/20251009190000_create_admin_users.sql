-- Create admin and superadmin users
-- IMPORTANT: Create the auth users FIRST in Supabase Dashboard, then update this script with their UUIDs

-- Step 1: Go to Supabase Dashboard > Authentication > Users
-- Step 2: Add these users manually:
--   - Email: tecbunnysolution@gmail.com, Password: Bunny@6010
--   - Email: tecbunnysolutions@gmail.com, Password: Bunny@6010
-- Step 3: Copy the UUIDs from the dashboard
-- Step 4: Replace the placeholder UUIDs below with the actual UUIDs
-- Step 5: Run this migration

-- Insert admin user profile (REPLACE THE UUID BELOW WITH ACTUAL AUTH USER UUID)
-- Example: Find the UUID for tecbunnysolution@gmail.com in Supabase Dashboard
INSERT INTO profiles (
  id,
  name,
  email,
  mobile,
  role,
  email_verified,
  is_active,
  created_at,
  updated_at
) VALUES (
  'REPLACE_WITH_ACTUAL_ADMIN_UUID', -- ← Replace this with the real UUID from auth.users
  'Shubham Bhisaji',
  'tecbunnysolution@gmail.com',
  '9604136010',
  'admin',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  mobile = EXCLUDED.mobile,
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Insert superadmin user profile (REPLACE THE UUID BELOW WITH ACTUAL AUTH USER UUID)
-- Example: Find the UUID for tecbunnysolutions@gmail.com in Supabase Dashboard
INSERT INTO profiles (
  id,
  name,
  email,
  mobile,
  role,
  email_verified,
  is_active,
  created_at,
  updated_at
) VALUES (
  'REPLACE_WITH_ACTUAL_SUPERADMIN_UUID', -- ← Replace this with the real UUID from auth.users
  'Shubham Bhisaji',
  'tecbunnysolutions@gmail.com',
  '7387375651',
  'superadmin',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  mobile = EXCLUDED.mobile,
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Alternative: Use the API endpoint instead
-- POST to /api/admin/setup-initial-admins with header: x-admin-token: YOUR_TOKEN
-- But you need to set ADMIN_MAINT_TOKEN in your environment variables first