/*
  # Create Image Storage Buckets
  
  ## Overview
  Sets up Supabase Storage buckets for persistent image storage
  
  ## Changes
  1. Creates storage buckets:
     - `property-images` - For vacation rental property photos
     - `activity-images` - For water adventure activity photos
     - `hero-images` - For hero section background images
  
  2. Security:
     - Public read access for all buckets
     - Authenticated users can upload images
     - File size limits and type restrictions
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('property-images', 'property-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('activity-images', 'activity-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('hero-images', 'hero-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view activity images" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view hero images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload activity images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload hero images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update property images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete property images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update activity images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete activity images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update hero images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete hero images" ON storage.objects;
END $$;

-- Allow public to read images
CREATE POLICY "Public can view property images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Public can view activity images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'activity-images');

CREATE POLICY "Public can view hero images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload property images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can upload activity images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'activity-images');

CREATE POLICY "Authenticated users can upload hero images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hero-images');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Authenticated users can update property images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can delete property images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can update activity images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'activity-images');

CREATE POLICY "Authenticated users can delete activity images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'activity-images');

CREATE POLICY "Authenticated users can update hero images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'hero-images');

CREATE POLICY "Authenticated users can delete hero images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'hero-images');