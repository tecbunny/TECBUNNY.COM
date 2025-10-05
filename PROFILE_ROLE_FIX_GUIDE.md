# 🔧 PROFILE ROLE MISMATCH - Complete Fix Guide

## 🔴 Problem Identified

**Issue:** Your profile page shows "Role: Customer" when you should be admin/superadmin

**Root Causes:**
1. ❌ Profile role in `public.profiles` table doesn't match JWT role in `auth.users`
2. ❌ Profile component defaults to "Customer" if role is null/undefined
3. ❌ JWT token cached in browser with old role information

---

## ✅ Complete Fix (3 Steps)

### **Step 1: Run the SQL Fix**

Open Supabase SQL Editor and run `FIX_PROFILE_ROLE_MISMATCH.sql`

This will:
- ✅ Update JWT metadata role to 'superadmin'
- ✅ Update profile table role to 'superadmin'
- ✅ Create profile if it doesn't exist
- ✅ Create automatic sync trigger
- ✅ Set proper display name

---

### **Step 2: Sign Out and Sign In**

⚠️ **CRITICAL - DO NOT SKIP THIS STEP**

1. Click on your profile icon
2. Click "Sign Out"
3. Close the browser tab
4. Wait 30 seconds
5. Open a new browser tab
6. Go to https://tecbunny.com
7. Sign in again with your credentials

**Why?** Your JWT token is cached and contains the old "Customer" role. A new sign-in creates a fresh JWT with the correct "superadmin" role.

---

### **Step 3: Verify the Fix**

After signing in:
1. Go to https://tecbunny.com/profile
2. Check "Role" field - should now show "Superadmin" or "Admin"
3. Try accessing admin pages - should work now

---

## 🛠️ What the SQL Script Does

### 1. **Diagnostic Check**
```sql
-- Shows current role mismatch
SELECT email, jwt_role, profile_role, status
```

### 2. **Fix JWT Role**
```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role":"superadmin"}'
WHERE email = 'tecbunnysolution@gmail.com';
```

### 3. **Fix Profile Role**
```sql
UPDATE public.profiles
SET role = 'superadmin'
WHERE email = 'tecbunnysolution@gmail.com';
```

### 4. **Create Sync Trigger**
```sql
-- Automatically keeps roles in sync
CREATE TRIGGER sync_profile_role_trigger
```

### 5. **Verification**
```sql
-- Confirms both roles match
SELECT email, jwt_role, profile_role, result
```

---

## 🔍 How to Verify Roles Are Synced

### Method 1: Check Database
```sql
SELECT 
    u.email,
    u.raw_app_meta_data->>'role' as jwt_role,
    p.role::text as profile_role
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'tecbunnysolution@gmail.com';
```

**Expected Result:**
| email | jwt_role | profile_role |
|-------|----------|--------------|
| tecbunnysolution@gmail.com | superadmin | superadmin |

---

### Method 2: Check JWT Token

1. Open browser DevTools (F12)
2. Go to: **Application** → **Local Storage** → `https://tecbunny.com`
3. Find key: `sb-<project-ref>-auth-token`
4. Copy the JWT token value
5. Go to https://jwt.io
6. Paste the token
7. Check the payload - should see:
```json
{
  "role": "superadmin",
  "email": "tecbunnysolution@gmail.com"
}
```

---

### Method 3: Check Profile Page

Visit: https://tecbunny.com/profile

Should show:
```
Name:   TecBunny Solutions Admin (or your name)
Email:  tecbunnysolution@gmail.com
Role:   Superadmin  ← Should NOT say "Customer"
Mobile: Not provided
```

---

## 🚨 Troubleshooting

### Problem: Still shows "Customer" after signing in

**Solutions:**

1. **Clear Browser Cache**
   ```
   Chrome: Ctrl + Shift + Delete → Clear cached images and files
   ```

2. **Try Incognito Mode**
   ```
   Chrome: Ctrl + Shift + N
   Firefox: Ctrl + Shift + P
   ```

3. **Check if SQL ran successfully**
   ```sql
   SELECT email, raw_app_meta_data->>'role', role::text
   FROM auth.users u
   JOIN profiles p ON p.id = u.id
   WHERE email = 'tecbunnysolution@gmail.com';
   ```

4. **Force JWT refresh**
   - Delete `sb-*-auth-token` from Local Storage
   - Refresh page (will force sign out)
   - Sign in again

---

### Problem: Profile not found

**Solution:** Run this to create profile:

```sql
INSERT INTO public.profiles (id, email, name, role)
SELECT id, email, email, 'superadmin'
FROM auth.users
WHERE email = 'tecbunnysolution@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'superadmin';
```

---

### Problem: Access denied to admin pages

**Solution:** Check RLS policies:

```sql
-- This should return TRUE for your user
SELECT 
    email,
    (raw_app_meta_data->>'role') IN ('admin', 'superadmin') as has_admin_role
FROM auth.users
WHERE email = 'tecbunnysolution@gmail.com';
```

If FALSE, run the SQL fix again and sign out/in.

---

## 📊 Role Hierarchy

| Role | Access Level |
|------|--------------|
| **superadmin** | ✅ Full access to everything |
| **admin** | ✅ Access to admin panel (limited) |
| **sales_agent** | ✅ Access to sales features |
| **customer** | ❌ No admin access |

Your account should be: **superadmin** ✅

---

## 🔐 Security Note

The trigger we create ensures:
- ✅ When JWT role changes, profile role auto-updates
- ✅ Both roles stay in sync permanently
- ✅ No manual intervention needed in future
- ✅ Works for all role changes (admin, sales_agent, etc.)

---

## ✅ Final Checklist

- [ ] Ran `FIX_PROFILE_ROLE_MISMATCH.sql` in Supabase
- [ ] SQL completed without errors
- [ ] Signed out completely
- [ ] Waited 30 seconds
- [ ] Signed in again
- [ ] Checked profile page - shows "Superadmin"
- [ ] Tested admin panel access - works
- [ ] Verified JWT token contains correct role

---

## 🎯 Quick Reference

**SQL File:** `FIX_PROFILE_ROLE_MISMATCH.sql`  
**Expected Role:** `superadmin`  
**Profile Page:** https://tecbunny.com/profile  
**Admin Panel:** https://tecbunny.com/management  

**Time to Fix:** 5 minutes  
**Requires:** Supabase SQL Editor access  
**Difficulty:** Easy  

---

## 📞 Still Having Issues?

If profile still shows "Customer" after all steps:

1. Check if email is correct: `tecbunnysolution@gmail.com` (with or without 's'?)
2. Run `EMERGENCY_DEBUG_ADMIN.sql` to see detailed status
3. Check browser console for errors (F12 → Console)
4. Verify you're on production site, not local dev

---

**This fix is permanent. Once applied, roles will stay in sync automatically!** ✅
