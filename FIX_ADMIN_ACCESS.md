# Fix Admin Access Issues

## Problem
- Admin portal pages showing "Failed to fetch offers" and "Failed to fetch policies"
- Access denied errors on `/management/admin` pages
- User `tecbunnysolution@gmail.com` needs admin privileges

## Solution

### Step 1: Run SQL Migration in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Open your project
3. Click "SQL Editor" in the sidebar
4. Create a new query and paste this SQL:

```sql
-- Make tecbunnysolution@gmail.com an admin
BEGIN;

-- Update auth.users table to set app_metadata role to 'admin'
UPDATE auth.users
SET 
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  ),
  updated_at = now()
WHERE email = 'tecbunnysolution@gmail.com';

-- Update profiles table to match
UPDATE public.profiles
SET 
  role = 'admin',
  updated_at = now()
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'tecbunnysolution@gmail.com'
);

-- Verify the changes
SELECT 
  u.id,
  u.email,
  u.raw_app_meta_data->>'role' as app_metadata_role,
  p.role as profile_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tecbunnysolution@gmail.com';

COMMIT;
```

5. Click "Run" to execute
6. You should see output showing both roles as 'admin'

### Step 2: Sign Out and Sign Back In

**IMPORTANT:** You must sign out and sign back in for the role change to take effect.

1. Sign out of `tecbunnysolution@gmail.com` account
2. Clear browser cache/cookies (optional but recommended)
3. Sign back in
4. Navigate to `/management/admin`

### Step 3: Verify Admin Access

After signing back in, test these admin pages:
- `/management/admin` - Dashboard
- `/management/admin/offers` - Offers Management  
- `/management/admin/policies` - Policies Management
- `/management/admin/products` - Product Catalog
- `/management/admin/users` - User Management

All should load without "Access denied" or "Failed to fetch" errors.

## Technical Details

### Why This Happens

The admin role is stored in two places:
1. **`auth.users.raw_app_meta_data`** - Secure, admin-only editable (used by RLS policies)
2. **`public.profiles.role`** - For display purposes

The application checks both locations:
- `app_metadata.role` (from JWT token) - Primary, secure
- `profiles.role` (from database) - Fallback

### Code Changes Made

1. **AuthProvider.tsx** - Updated to read `app_metadata.role` from JWT first
2. **admin-auth.ts** - Created helper to check both sources
3. **Admin API routes** - Will check `app_metadata` before `profiles`

### Troubleshooting

**If admin access still doesn't work after signing in:**

1. Check the SQL ran successfully (you should see verification output)
2. Make sure you completely signed out and back in
3. Try in incognito/private window
4. Check browser console for errors (F12)
5. Verify the JWT token contains the admin role:
   - Open browser console (F12)
   - Run: `JSON.parse(atob(document.cookie.split('sb-access-token=')[1]?.split('.')[1]))`
   - Look for `app_metadata: { role: 'admin' }`

**If policies/offers still fail to load:**

The API routes need updating to use the new `isUserAdmin()` helper function. The fixes are already in place in `src/lib/admin-auth.ts`.

## Next Steps

Once admin access is working, you may want to:
1. Create additional admin users using the same SQL pattern
2. Implement role-based access control for other roles
3. Add audit logging for admin actions
