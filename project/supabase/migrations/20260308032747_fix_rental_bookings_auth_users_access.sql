/*
  # Fix Rental Bookings RLS Policy - Remove auth.users Access

  ## Problem
  The "Admins can view all rental bookings" policy attempts to query auth.users table,
  which anonymous users cannot access, causing "permission denied for table users" errors
  when checking property availability.

  ## Solution
  Replace the problematic policy that queries auth.users with one that uses the is_admin()
  helper function instead.

  ## Changes
  1. Drop the policy that queries auth.users directly
  2. Create new admin policy using is_admin() function
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all rental bookings" ON rental_bookings;

-- Create new admin policy using is_admin() helper
CREATE POLICY "Admins can view all rental bookings"
  ON rental_bookings FOR SELECT
  TO authenticated
  USING (is_admin());
