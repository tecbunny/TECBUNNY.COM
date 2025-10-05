# ⚠️ STILL GETTING "ACCESS DENIED" ON SALES AGENTS PAGE?

## Quick Fix - Follow These Steps EXACTLY:

### ✅ Step 1: Run SQL to Grant Admin Role

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**
5. Copy and paste this SQL:

```sql
BEGIN;

UPDATE auth.users
SET 
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  ),
  updated_at = now()
WHERE email = 'tecbunnysolution@gmail.com';

UPDATE public.profiles
SET 
  role = 'admin',
  updated_at = now()
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'tecbunnysolution@gmail.com'
);

SELECT 
  u.email,
  u.raw_app_meta_data->>'role' as app_role,
  p.role as profile_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tecbunnysolution@gmail.com';

COMMIT;
```

6. Click **"Run"** (or press F5)
7. **Verify output shows:**
   - `app_role`: "admin"
   - `profile_role`: "admin"

### ✅ Step 2: Sign Out Completely

**THIS IS CRITICAL - You MUST sign out and back in!**

1. Click your profile icon in the website
2. Click **"Sign Out"** or **"Logout"**
3. Wait for redirect to login page
4. **Optional but recommended:** Clear browser cookies
   - Chrome: Ctrl+Shift+Delete → Cookies → Clear
   - Firefox: Ctrl+Shift+Delete → Cookies → Clear

### ✅ Step 3: Sign Back In

1. Go to your login page
2. Enter email: `tecbunnysolution@gmail.com`
3. Enter your password
4. Click Sign In

### ✅ Step 4: Test Admin Access

1. Go to: `https://yourdomain.com/management/admin/sales-agents`
2. Should now load without "Access denied"

---

## Still Not Working? Run Verification

### Check Your Admin Setup

1. Go to Supabase SQL Editor
2. Run this verification script:

```sql
-- Quick verification
SELECT 
  u.email,
  u.raw_app_meta_data->>'role' as app_metadata_role,
  p.role as profile_role,
  u.last_sign_in_at,
  CASE 
    WHEN u.raw_app_meta_data->>'role' IN ('admin', 'superadmin') 
     AND p.role IN ('admin', 'superadmin') 
    THEN '✅ CONFIGURED CORRECTLY'
    ELSE '❌ NOT CONFIGURED'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tecbunnysolution@gmail.com';
```

**Expected output:**
- `app_metadata_role`: admin
- `profile_role`: admin
- `status`: ✅ CONFIGURED CORRECTLY

**If you see ❌ NOT CONFIGURED:**
- Run the SQL fix from Step 1 again
- Make sure there are no errors in the SQL output

---

## Debug: Check JWT Token

After signing in, check if your JWT token has the admin role:

1. Open your website
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Paste and run this code:

```javascript
// Check if you have admin role in JWT
const token = document.cookie.match(/sb-access-token=([^;]+)/)?.[1];
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('🔍 Your current role:', payload.app_metadata?.role);
  console.log('✅ Should be:', 'admin');
  if (payload.app_metadata?.role === 'admin') {
    console.log('✅ JWT token is correct!');
  } else {
    console.log('❌ JWT token does NOT have admin role');
    console.log('👉 You need to SIGN OUT and SIGN BACK IN');
  }
} else {
  console.log('❌ No JWT token found - you are not signed in');
}
```

**Expected output:**
```
🔍 Your current role: admin
✅ Should be: admin
✅ JWT token is correct!
```

**If you see "JWT token does NOT have admin role":**
- You didn't sign out and back in after running the SQL
- Sign out NOW and sign back in

---

## Common Mistakes

### ❌ Mistake 1: Not Running the SQL
**Fix:** Run the SQL in Supabase SQL Editor (Step 1 above)

### ❌ Mistake 2: Not Signing Out After SQL
**Fix:** You MUST sign out and sign back in for the JWT to update

### ❌ Mistake 3: Just Refreshing the Page
**Fix:** Refreshing doesn't work - you need to fully sign out and back in

### ❌ Mistake 4: Wrong Email Address
**Fix:** Make sure you're using the exact email: `tecbunnysolution@gmail.com`

### ❌ Mistake 5: SQL Ran But Returned 0 Rows
**Fix:** The email doesn't exist - create an account first, then run SQL

---

## Advanced: Check Browser Console for Errors

1. Press **F12** → **Console** tab
2. Try to access `/management/admin/sales-agents`
3. Look for red error messages
4. Common errors and fixes:

**Error: "Authentication required"**
- ❌ You're not signed in
- ✅ Sign in first

**Error: "You do not have permission to perform this action"**
- ❌ SQL not run OR didn't sign out/in after SQL
- ✅ Run SQL, then sign out and back in

**Error: "Failed to fetch"**
- ❌ API route error or database issue
- ✅ Check Supabase logs, verify database is online

---

## Still Having Issues?

If none of the above works, provide:

1. **Screenshot of SQL verification output** (from "Check Your Admin Setup" section)
2. **Console output from JWT token check** (from "Debug: Check JWT Token" section)
3. **Screenshot of the error message** you're seeing
4. **Last sign-in time** (from verification query)

This will help diagnose the exact issue.

---

## Success Checklist

- [ ] SQL ran successfully in Supabase
- [ ] Verification query shows both roles as "admin"
- [ ] Signed out completely
- [ ] Signed back in with tecbunnysolution@gmail.com
- [ ] JWT token check shows role = "admin"
- [ ] Can access /management/admin (dashboard)
- [ ] Can access /management/admin/sales-agents (no access denied)

**Once all checked, the issue should be resolved! ✅**
