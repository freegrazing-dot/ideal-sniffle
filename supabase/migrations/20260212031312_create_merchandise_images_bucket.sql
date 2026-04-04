/*
  # Create merchandise images storage bucket
  
  1. New Storage Bucket
    - `merchandise-images` - stores product photos
  
  2. Security
    - Public read access for all users
    - Admin-only upload/update/delete access
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merchandise-images',
  'merchandise-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for merchandise images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'merchandise-images');

CREATE POLICY "Admin upload access for merchandise images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'merchandise-images' AND is_admin());

CREATE POLICY "Admin update access for merchandise images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'merchandise-images' AND is_admin())
  WITH CHECK (bucket_id = 'merchandise-images' AND is_admin());

CREATE POLICY "Admin delete access for merchandise images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'merchandise-images' AND is_admin());