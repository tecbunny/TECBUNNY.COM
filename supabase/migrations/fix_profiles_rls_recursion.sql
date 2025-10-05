-- Fix infinite recursion in profiles RLS policies
-- Use auth.jwt() to check role instead of querying profiles table

-- Drop existing admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recreate admin policies using auth metadata to avoid recursion
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
        OR auth.uid() = id
    );

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
        OR auth.uid() = id
    );

-- Add insert policy for new user registration
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
