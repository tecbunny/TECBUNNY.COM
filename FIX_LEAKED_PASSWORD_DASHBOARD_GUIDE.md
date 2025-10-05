# ⚠️ IMPORTANT: Leaked Password Protection Must Be Enabled via Dashboard

## Why SQL Doesn't Work

The error `relation "auth.config" does not exist` occurs because:

- ❌ Leaked password protection is **NOT** a database setting
- ❌ It cannot be enabled via SQL queries
- ✅ It's a **Supabase configuration** setting
- ✅ Must be enabled through the **Supabase Dashboard UI**

---

## ✅ Correct Method: Use Supabase Dashboard

### Step-by-Step Instructions (With Visual Guide)

#### 1. **Access Your Supabase Dashboard**
```
URL: https://supabase.com/dashboard
```
- Log in to your Supabase account
- Select your project (tecbunny)

---

#### 2. **Navigate to Authentication Settings**

**Option A - Via Authentication Menu:**
```
Left Sidebar → Authentication → Configuration
```

**Option B - Via Project Settings:**
```
Left Sidebar → Settings (⚙️) → Authentication
```

---

#### 3. **Find Password Settings Section**

Scroll down to find one of these sections:
- "Auth Providers"
- "Password Settings" 
- "Security"
- "Policies"

Look for subsection labeled:
- "Password Strength"
- "Password Requirements"
- "Security Policies"

---

#### 4. **Enable Leaked Password Protection**

You should see a toggle or checkbox like:

```
┌─────────────────────────────────────────────────┐
│ Password Strength Settings                       │
├─────────────────────────────────────────────────┤
│                                                   │
│ ☐ Minimum password length: [8] characters       │
│                                                   │
│ ☐ Require uppercase letters                     │
│                                                   │
│ ☐ Require lowercase letters                     │
│                                                   │
│ ☐ Require numbers                               │
│                                                   │
│ ☐ Require special characters                    │
│                                                   │
│ ☑ Check against HaveIBeenPwned breach database │  ← ENABLE THIS
│                                                   │
└─────────────────────────────────────────────────┘
```

**Check/Toggle ON:** 
- "Check against HaveIBeenPwned breach database"
- OR "Enable leaked password protection"
- OR "Check for compromised passwords"

---

#### 5. **Save Changes**

Click the **Save** button at the bottom of the page

You should see a success message:
```
✓ Authentication settings updated successfully
```

---

### Alternative: Via Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Update project config
supabase db remote commit

# Or directly via API (requires service role key)
curl -X PATCH 'https://api.supabase.com/v1/projects/YOUR_PROJECT_ID/config/auth' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "SECURITY_PASSWORD_HIBP_ENABLED": true
  }'
```

---

## 🧪 How to Verify It's Enabled

### Test 1: Try Compromised Password via Your App

1. Go to your signup page: `https://tecbunny.com/auth/signup`

2. Try to sign up with these known compromised passwords:

```javascript
// Test in your browser console or signup form
const testPasswords = [
  'password123',  // Found in 3.7M breaches
  '123456',       // Found in 23M breaches
  'qwerty',       // Found in 3.8M breaches
  'letmein'       // Found in 235K breaches
];
```

3. **Expected Result:**
   - ❌ Signup should FAIL
   - Error message should mention "breach" or "compromised"
   - User should be forced to choose different password

### Test 2: Try Strong Password

```javascript
const strongPassword = 'MyUnique!P@ssw0rd2024#';
```

- ✅ Signup should SUCCEED
- ✅ Account created normally

---

## 📱 What Users Will See

### Before Enabling (Current State)
```
User enters: "password123"
↓
✅ Account created successfully
↓
⚠️ Account is vulnerable to attacks
```

### After Enabling (Desired State)
```
User enters: "password123"
↓
❌ Error: "This password has appeared in a data breach"
↓
User forced to choose secure password
↓
✅ Account protected
```

---

## 🔍 Troubleshooting

### "I can't find the password settings"

**Try these locations:**

1. **Authentication → Configuration → Providers → Email**
   - May be under Email provider settings

2. **Settings → Authentication → Security**
   - Look for Security or Policies tab

3. **Authentication → Policies**
   - Some versions have it here

4. **Project Settings → API → Auth**
   - Might be under API settings

### "The toggle is grayed out"

**Possible reasons:**
- You don't have owner/admin permissions
- Your Supabase plan might not support this feature (though it should be on all plans)
- Try refreshing the dashboard

### "I enabled it but tests still pass with weak passwords"

**Solutions:**
1. Wait 1-2 minutes for settings to propagate
2. Clear your browser cache
3. Sign out and sign back in to Supabase Dashboard
4. Check if you're testing on production or local instance

---

## 📊 Expected Configuration

After enabling, your auth configuration should be:

| Setting | Value |
|---------|-------|
| **Leaked Password Protection** | ✅ Enabled |
| **Minimum Password Length** | 8 characters (recommended) |
| **Require Uppercase** | ✅ Enabled (recommended) |
| **Require Lowercase** | ✅ Enabled (recommended) |
| **Require Numbers** | ✅ Enabled (recommended) |
| **Require Special Characters** | ✅ Enabled (optional) |

---

## 🎯 Quick Checklist

- [ ] Logged into Supabase Dashboard
- [ ] Navigated to Authentication settings
- [ ] Found Password Strength/Security section
- [ ] Enabled "Check against HaveIBeenPwned" toggle
- [ ] Saved changes
- [ ] Waited 1-2 minutes for propagation
- [ ] Tested with "password123" (should reject)
- [ ] Tested with strong password (should accept)
- [ ] Verified error message mentions breach/compromised
- [ ] Updated team documentation

---

## 📞 Support

If you still can't find or enable the setting:

1. **Supabase Documentation:**
   - https://supabase.com/docs/guides/auth/password-security

2. **Supabase Support:**
   - Discord: https://discord.supabase.com
   - GitHub: https://github.com/supabase/supabase/discussions

3. **Stack Overflow:**
   - Tag: `supabase` + `authentication`

---

## 🔐 Additional Security Measures

While you're in the Authentication settings, also configure:

### Recommended Settings:

```
✅ Minimum password length: 8-12 characters
✅ Require uppercase letters
✅ Require lowercase letters  
✅ Require numbers
✅ Require special characters
✅ Check against HaveIBeenPwned ← THIS ONE
✅ Enable email confirmations
✅ Enable MFA/TOTP (if available)
✅ Set session timeout (24 hours recommended)
```

---

## 🚀 After Enabling

Once enabled, all new signups and password changes will automatically:

1. Check password against 600M+ breached passwords
2. Reject compromised passwords with clear error
3. Force users to choose unique, secure passwords
4. Improve overall account security

**No code changes needed in your application!**

---

**This is a one-time dashboard configuration that takes 2 minutes to complete.**

**Do it now!** 🔒
