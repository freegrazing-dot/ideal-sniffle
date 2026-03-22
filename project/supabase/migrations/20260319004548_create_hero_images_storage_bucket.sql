/*
  # Create hero-images storage bucket
  
  1. Storage
    - Creates `hero-images` bucket for hero banner images
    - Public access for reading images
    - Admin-only upload permissions
  
  2. Security
    - Anonymous users can view images
    - Only admins can upload/update/delete images
*/

-- Create hero-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-images',
  'hero-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view hero images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can upload hero images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update hero images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete hero images" ON storage.objects;

-- Allow public read access
CREATE POLICY "Anyone can view hero images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'hero-images');

-- Only admins can upload
CREATE POLICY "Only admins can upload hero images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'hero-images' 
    AND auth.jwt()->>'email' IN (
      SELECT email FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "Only admins can update hero images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'hero-images'
    AND auth.jwt()->>'email' IN (
      SELECT email FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can delete
CREATE POLICY "Only admins can delete hero images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'hero-images'
    AND auth.jwt()->>'email' IN (
      SELECT email FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
    )
  );