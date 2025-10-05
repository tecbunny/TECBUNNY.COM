# 🔧 Complete Profile Fix - Name, Mobile & Role

## Current Issues:
1. ❌ **Name** shows email address instead of actual name
2. ❌ **Role** shows "Customer" instead of "Superadmin"  
3. ❌ **Mobile** shows "Not provided"

## ✅ Complete Fix (3 Minutes)

### **Method 1: Quick Fix (Recommended)**

**Step 1:** Open `QUICK_FIX_PROFILE_ROLE.sql` in Supabase SQL Editor

**Step 2:** Run it - This will:
- ✅ Set role to "Superadmin"
- ✅ Set name to "TecBunny Solutions"
- ✅ Create profile if missing

**Step 3:** Sign out and sign in again

**Step 4:** To add your mobile number:
```sql
UPDATE public.profiles
SET mobile = '+919876543210'  -- Your actual number
WHERE email = 'tecbunnysolution@gmail.com';
```

---

### **Method 2: Custom Setup (For Custom Name/Mobile)**

**Step 1:** Open `SETUP_COMPLETE_PROFILE.sql`

**Step 2:** Edit these lines (around line 17-19):
```sql
admin_email TEXT := 'tecbunnysolution@gmail.com';  -- Your email
admin_name TEXT := 'Your Actual Name';              -- CHANGE THIS
admin_mobile TEXT := '+919876543210';               -- CHANGE THIS
```

**Step 3:** Run the script

**Step 4:** Sign out and sign in

---

## 🎯 Expected Result After Fix

Your profile page should show:

```
Name:   TecBunny Solutions (or your custom name)
Email:  tecbunnysolution@gmail.com
Role:   Superadmin
Mobile: +919876543210 (or your number)
```

---

## ⚡ Super Quick Fix (One Query)

If you just want to fix everything right now:

```sql
-- Replace values in this query:
UPDATE auth.users u
SET 
    raw_app_meta_data = raw_app_meta_data || '{"role":"superadmin"}',
    raw_user_meta_data = raw_user_meta_data || '{"name":"Your Name"}'
WHERE email = 'tecbunnysolution@gmail.com';

UPDATE public.profiles p
SET 
    name = 'Your Name',
    mobile = '+919876543210',
    role = 'superadmin'
WHERE email = 'tecbunnysolution@gmail.com';
```

Then **sign out and sign in**.

---

## 📝 Files Available:

1. **`QUICK_FIX_PROFILE_ROLE.sql`** ⚡
   - Fixes role and sets default name
   - Fastest option

2. **`SETUP_COMPLETE_PROFILE.sql`** 🎨
   - Customize name and mobile
   - More control

3. **`FIX_PROFILE_ROLE_MISMATCH.sql`** 🔧
   - Full diagnostic and fix
   - Creates auto-sync trigger

---

## 🔄 Why Sign Out/In is Required

**For Role Change:** JWT token contains old role, must refresh

**For Name/Mobile:** Not required, just refresh page

**Best Practice:** Always sign out/in after running profile fixes

---

## ✅ Quick Checklist

- [ ] Run SQL script in Supabase
- [ ] Verify script shows "✅ FIXED" or "✅ PERFECT"
- [ ] Sign out from tecbunny.com
- [ ] Wait 30 seconds
- [ ] Sign in again
- [ ] Visit /profile page
- [ ] Verify Name is not email address
- [ ] Verify Role shows "Superadmin"
- [ ] Verify Mobile shows your number (or update it)

---

## 💡 Pro Tip

You can also update your profile through the UI:
1. Click "Edit Profile" button on profile page
2. Update Name and Mobile
3. Click Save

But role can only be changed via SQL for security reasons.

---

**Time: 3 minutes | Difficulty: Easy | Files: 3 SQL scripts ready** 🚀
