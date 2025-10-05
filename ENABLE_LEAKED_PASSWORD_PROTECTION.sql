-- =====================================================
-- ENABLE LEAKED PASSWORD PROTECTION
-- Supabase Auth Security Enhancement
-- =====================================================

-- This script enables leaked password protection in Supabase Auth.
-- This feature checks user passwords against the HaveIBeenPwned database
-- to prevent the use of compromised passwords.

-- =====================================================
-- IMPORTANT: Run this in Supabase Dashboard
-- =====================================================
-- Go to: Authentication → Policies → Password Strength
-- Or: Dashboard → Project Settings → Authentication

-- =====================================================
-- CONFIGURATION (Run via Supabase CLI or Dashboard)
-- =====================================================

-- Option 1: Via Supabase Dashboard (RECOMMENDED)
-- 1. Go to: Dashboard → Authentication → Policies
-- 2. Find "Password Strength" section
-- 3. Toggle ON "Check against HaveIBeenPwned breach database"
-- 4. Click "Save"

-- Option 2: Via SQL (if you have service role access)
-- Note: This requires direct access to auth schema configuration
-- Usually done through the dashboard settings

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Note: Leaked password protection is a Supabase configuration setting,
-- not a database setting. It cannot be enabled via SQL.
-- You must enable it through the Supabase Dashboard.

-- To verify auth settings are working, you can check:
-- 1. Try signing up with a known compromised password
-- 2. Check if it's rejected with appropriate error message

-- Check existing users count (to verify auth is working)
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
    COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as unconfirmed_users
FROM 
    auth.users;

-- =====================================================
-- WHAT THIS FEATURE DOES
-- =====================================================

/*
Leaked Password Protection checks user passwords against the 
HaveIBeenPwned database when:

1. User signs up with a new password
2. User changes their password
3. User resets their password

If a password is found in the breach database:
- Signup/password change is rejected
- User receives an error message
- User must choose a different password

Benefits:
- Prevents use of compromised passwords
- Reduces risk of credential stuffing attacks
- Improves overall account security
- No performance impact (cached checks)
*/

-- =====================================================
-- TESTING
-- =====================================================

/*
To test if leaked password protection is working:

1. Try to sign up with a known breached password:
   - Password: "password123"
   - Password: "123456"
   - These should be REJECTED

2. Try to sign up with a strong, unique password:
   - Should be ACCEPTED

3. Check the error message returned:
   - Should indicate password is compromised
*/

-- =====================================================
-- ADDITIONAL SECURITY RECOMMENDATIONS
-- =====================================================

/*
Along with leaked password protection, consider enabling:

1. Strong Password Requirements:
   - Minimum length: 8-12 characters
   - Require uppercase, lowercase, numbers, symbols

2. Account Lockout Policy:
   - Lock account after X failed login attempts
   - Temporary lockout duration

3. MFA (Multi-Factor Authentication):
   - Enable TOTP (Time-based One-Time Password)
   - SMS verification (if applicable)

4. Password Expiry:
   - Force password change every 90-180 days (optional)

5. Session Management:
   - Set appropriate session timeouts
   - Implement refresh token rotation
*/

-- =====================================================
-- MONITORING
-- =====================================================

-- Monitor authentication events
-- Note: audit_log_entries table may not be available in all Supabase projects

-- Check recent user signups
SELECT 
    DATE_TRUNC('day', created_at) as signup_date,
    COUNT(*) as new_users,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed
FROM 
    auth.users
WHERE 
    created_at > NOW() - INTERVAL '7 days'
GROUP BY 
    DATE_TRUNC('day', created_at)
ORDER BY 
    signup_date DESC;

-- Check recent users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed'
        ELSE 'Pending Confirmation'
    END as status
FROM 
    auth.users
ORDER BY 
    created_at DESC
LIMIT 10;

-- =====================================================
-- END OF SCRIPT
-- =====================================================
