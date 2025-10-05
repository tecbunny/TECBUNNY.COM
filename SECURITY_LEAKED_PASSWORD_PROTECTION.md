# Enable Leaked Password Protection - Security Enhancement

## ⚠️ Security Warning

**Issue:** Leaked Password Protection is currently **DISABLED**

**Risk Level:** WARNING  
**Category:** SECURITY  
**Impact:** Users can sign up with compromised passwords that are known to be leaked in data breaches

---

## What is Leaked Password Protection?

Leaked Password Protection is a security feature that checks user passwords against the [HaveIBeenPwned](https://haveibeenpwned.com/) database - a collection of over 600 million passwords that have been exposed in data breaches.

When enabled, Supabase Auth will:
- ✅ Check passwords during signup
- ✅ Check passwords during password changes
- ✅ Check passwords during password resets
- ✅ Reject passwords found in breach databases
- ✅ Prompt users to choose stronger, unique passwords

---

## How to Enable (Step-by-Step)

### Method 1: Via Supabase Dashboard (RECOMMENDED)

1. **Go to Supabase Dashboard**
   - Open your project at https://supabase.com/dashboard

2. **Navigate to Authentication Settings**
   - Click on **Authentication** in the left sidebar
   - Click on **Policies** (or **Settings**)

3. **Find Password Strength Section**
   - Scroll to "Password Strength" or "Password Security"

4. **Enable Leaked Password Protection**
   - Toggle **ON** the option: "Check against HaveIBeenPwned breach database"
   - Or enable "Leaked Password Protection"

5. **Save Changes**
   - Click **Save** or **Update**

---

### Method 2: Via Project Settings

1. **Go to Project Settings**
   - Click the **Settings** icon (⚙️) in the left sidebar
   - Click **Authentication**

2. **Scroll to Password Settings**
   - Find "Password Strength" or "Security" section

3. **Enable the Feature**
   - Check the box for "Enable leaked password protection"
   - Or toggle the "HaveIBeenPwned" option

4. **Save Configuration**
   - Click **Save** to apply changes

---

## What Happens After Enabling?

### For New Users (Signup):
```
User tries to sign up with password: "password123"
↓
Supabase checks HaveIBeenPwned database
↓
Password found in 3.7+ million breaches
↓
❌ Signup REJECTED
↓
Error: "Password has been compromised in a data breach"
```

### For Existing Users (Password Change):
```
User tries to change password to: "qwerty123"
↓
Supabase checks HaveIBeenPwned database
↓
Password found in breaches
↓
❌ Change REJECTED
↓
User must choose a different password
```

### For Strong Passwords:
```
User signs up with: "MyStr0ng!P@ssw0rd2024#"
↓
Supabase checks HaveIBeenPwned database
↓
Password NOT found in breaches
↓
✅ Signup APPROVED
↓
Account created successfully
```

---

## Testing the Feature

After enabling, test with these passwords:

### ❌ Should Be REJECTED (Compromised):
- `password123`
- `123456`
- `qwerty`
- `letmein`
- `welcome`

### ✅ Should Be ACCEPTED (Not in Breach Database):
- `MyUnique!P@ssw0rd2024#`
- `Tec8unny$ecure!Pass`
- Any strong, unique password not in breaches

---

## Error Messages Users Will See

When a compromised password is detected:

**Error Code:** `422 Unprocessable Entity`

**Error Message:**
```
"Password has been found in a data breach and cannot be used"
```

Or:

```
"This password has appeared in a data breach. Please choose a different password."
```

---

## Additional Security Recommendations

While enabling leaked password protection, also consider:

### 1. **Strong Password Requirements**
In Supabase Dashboard → Authentication → Settings:
- ✅ Minimum password length: 8-12 characters
- ✅ Require at least one uppercase letter
- ✅ Require at least one lowercase letter
- ✅ Require at least one number
- ✅ Require at least one special character

### 2. **Account Lockout Policy**
- Lock accounts after 5-10 failed login attempts
- Set lockout duration (e.g., 15 minutes)

### 3. **Multi-Factor Authentication (MFA)**
- Enable TOTP (Time-based One-Time Password)
- Encourage or require MFA for admin accounts

### 4. **Session Security**
- Set appropriate session timeouts
- Implement refresh token rotation
- Use secure cookies (httpOnly, secure, sameSite)

### 5. **Password History**
- Prevent reuse of last 5 passwords
- Force password change on first login (optional)

---

## Performance Impact

**✅ No Significant Impact:**
- HaveIBeenPwned API is fast (< 100ms)
- Only checked during auth operations (signup, password change)
- Results are cached by Supabase
- Uses k-anonymity protocol (first 5 chars of SHA-1 hash)

**Privacy:**
- Full password is **NEVER** sent to HaveIBeenPwned
- Only first 5 characters of password hash are sent
- No way to reverse-engineer the actual password

---

## Implementation in Your App

If you want to show helpful messages to users:

### Frontend Validation (Optional)

```typescript
// src/lib/password-validator.ts

export async function checkPasswordStrength(password: string) {
  // Check password against HaveIBeenPwned (client-side check - optional)
  // This is just for user feedback; Supabase will do the real check
  
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  const strength = Object.values(checks).filter(Boolean).length;
  
  return {
    isStrong: strength >= 4,
    checks,
    score: strength,
    message: strength < 4 
      ? 'Password is too weak' 
      : 'Password strength is good'
  };
}
```

### Signup Error Handling

```typescript
// Handle compromised password error
try {
  const { error } = await supabase.auth.signUp({
    email: email,
    password: password
  });
  
  if (error) {
    if (error.message.includes('breach') || error.message.includes('compromised')) {
      toast({
        title: 'Compromised Password',
        description: 'This password has been found in a data breach. Please choose a different, more secure password.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }
} catch (err) {
  console.error('Signup error:', err);
}
```

---

## Monitoring & Analytics

After enabling, monitor:

1. **Failed Signup Attempts**
   - Track how many users are rejected due to weak passwords
   - Helps understand user password habits

2. **Password Change Patterns**
   - Monitor successful vs. rejected password changes

3. **Security Metrics**
   - Track reduction in account compromises
   - Monitor failed login attempts

---

## Documentation Links

- [Supabase Auth Password Security](https://supabase.com/docs/guides/auth/password-security)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)
- [Password Strength Best Practices](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

---

## Compliance Benefits

Enabling leaked password protection helps with:

- ✅ **GDPR** - Demonstrates "appropriate security measures"
- ✅ **PCI DSS** - Requirement 8.2.3 (strong passwords)
- ✅ **SOC 2** - Shows commitment to security controls
- ✅ **ISO 27001** - Password management best practices
- ✅ **NIST** - Aligns with NIST password guidelines

---

## Quick Checklist

- [ ] Enable leaked password protection in Supabase Dashboard
- [ ] Set minimum password length (8+ characters)
- [ ] Require mixed case, numbers, and symbols
- [ ] Test with known compromised passwords
- [ ] Update signup form to show password requirements
- [ ] Add helpful error messages for users
- [ ] Consider enabling MFA for admin accounts
- [ ] Document the change for your team
- [ ] Monitor failed authentication attempts

---

## ⚠️ Action Required

**Priority:** HIGH  
**Time Required:** 5 minutes  
**Difficulty:** Easy (just toggle a setting)

**Do This Now:**
1. Open Supabase Dashboard
2. Go to Authentication → Policies
3. Enable "Leaked Password Protection"
4. Save changes
5. Test with a compromised password
6. ✅ Done!

---

**Security is not optional. Enable this feature today!** 🔒
