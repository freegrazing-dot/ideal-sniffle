/*
  # Lock images to admin-only updates

  1. Security Changes
    - Update site_settings policies to require admin role for updates
    - Update properties policies to require admin role for updates
    - Update activities policies to require admin role for updates
    - This ensures that only authenticated admin users can change images through the admin panel
    - Public users can still read/view all images

  2. Changes Made
    - Drop existing update policies for site_settings, properties, and activities
    - Create new restrictive policies that check for admin role using is_admin() function
*/

-- Site Settings: Only admins can update
DROP POLICY IF EXISTS "Authenticated users can update site settings" ON site_settings;
DROP POLICY IF EXISTS "Authenticated users can insert site settings" ON site_settings;

CREATE POLICY "Admins can insert site settings"
  ON site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update site settings"
  ON site_settings
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Properties: Only admins can update
DROP POLICY IF EXISTS "Authenticated users can update properties" ON properties;

CREATE POLICY "Admins can update properties"
  ON properties
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Activities: Only admins can update (policy already exists but let's ensure it's correct)
DROP POLICY IF EXISTS "Admins can update activities" ON activities;

CREATE POLICY "Admins can update activities"
  ON activities
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());