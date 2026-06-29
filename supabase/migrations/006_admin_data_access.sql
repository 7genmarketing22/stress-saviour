-- Admin data access: allow admins to view/manage all profiles and reviews.
-- Relies on public.is_admin() defined in 003_fix_rls_recursion.sql.

-- PROFILES: admins can view every profile (patients, doctors, staff)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

-- PROFILES: admins can update any profile (e.g. activate / deactivate accounts)
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (public.is_admin());

-- REVIEWS: admins can view and moderate all reviews (including hidden ones)
DROP POLICY IF EXISTS "Admins can manage reviews" ON reviews;
CREATE POLICY "Admins can manage reviews" ON reviews
  FOR ALL USING (public.is_admin());
