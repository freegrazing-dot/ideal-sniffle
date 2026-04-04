/*
  # Fix admin role checking with secure function
  
  1. Changes
    - Create a SECURITY DEFINER function to check if current user is admin
    - Drop and recreate RLS policies to use the new function instead of directly querying auth.users
  
  2. Security
    - Function runs with elevated privileges to read auth.users table
    - Policies remain restrictive, only allowing admin users to update
*/

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (raw_app_meta_data->>'role')::text = 'admin',
      false
    )
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing admin policies
DROP POLICY IF EXISTS "Only admins can insert properties" ON properties;
DROP POLICY IF EXISTS "Only admins can update properties" ON properties;
DROP POLICY IF EXISTS "Only admins can update activities" ON activities;

-- Recreate policies using the helper function
CREATE POLICY "Only admins can insert properties"
  ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update properties"
  ON properties
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update activities"
  ON activities
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());