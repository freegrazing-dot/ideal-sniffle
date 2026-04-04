/*
  # Lock storage image uploads/updates/deletes to admin-only

  1. Security Changes
    - Update storage bucket policies to require admin role for uploads, updates, and deletes
    - Public users can still view/read all images
    - Only authenticated admin users can modify images through the admin panel

  2. Changes Made
    - Drop existing authenticated user policies for hero-images, activity-images, and property-images
    - Create new restrictive policies that check for admin role using is_admin() function
*/

-- Hero Images: Only admins can upload, update, or delete
DROP POLICY IF EXISTS "Authenticated users can upload hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete hero images" ON storage.objects;

CREATE POLICY "Admins can upload hero images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hero-images' AND is_admin());

CREATE POLICY "Admins can update hero images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'hero-images' AND is_admin())
  WITH CHECK (bucket_id = 'hero-images' AND is_admin());

CREATE POLICY "Admins can delete hero images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'hero-images' AND is_admin());

-- Activity Images: Only admins can upload, update, or delete
DROP POLICY IF EXISTS "Authenticated users can upload activity images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update activity images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete activity images" ON storage.objects;

CREATE POLICY "Admins can upload activity images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'activity-images' AND is_admin());

CREATE POLICY "Admins can update activity images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'activity-images' AND is_admin())
  WITH CHECK (bucket_id = 'activity-images' AND is_admin());

CREATE POLICY "Admins can delete activity images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'activity-images' AND is_admin());

-- Property Images: Only admins can upload, update, or delete
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete property images" ON storage.objects;

CREATE POLICY "Admins can upload property images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND is_admin());

CREATE POLICY "Admins can update property images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-images' AND is_admin())
  WITH CHECK (bucket_id = 'property-images' AND is_admin());

CREATE POLICY "Admins can delete property images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-images' AND is_admin());