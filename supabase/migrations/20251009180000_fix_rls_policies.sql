-- Fix infinite recursion in profiles RLS policies
-- Create a security definer function to check admin status

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION is_staff(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role IN ('sales', 'manager', 'accounts', 'admin', 'superadmin')
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Recreate policies using the security definer functions
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (is_admin(auth.uid()));

-- Also fix other tables that might have similar issues
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can view orders based on role" ON orders;
CREATE POLICY "Staff can view orders based on role" ON orders
  FOR SELECT USING (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update orders" ON orders;
CREATE POLICY "Staff can update orders" ON orders
  FOR UPDATE USING (is_staff(auth.uid()));

-- Add similar fixes for other tables as needed
-- (Add more policy fixes here if other tables have the same issue)