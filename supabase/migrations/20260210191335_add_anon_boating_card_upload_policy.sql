/*
  # Allow Anonymous Users to Upload Boating Safety Cards

  1. Changes
    - Add policy to allow anonymous (anon) users to upload boating safety cards
    - This is needed because jet ski bookings don't require user authentication
    - Users upload their cards during the booking process before authentication

  2. Security
    - Limited to boating-cards bucket only
    - Files are publicly readable for verification
    - Upload is restricted to specific bucket to prevent abuse
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Allow anonymous uploads to boating-cards'
  ) THEN
    CREATE POLICY "Allow anonymous uploads to boating-cards"
    ON storage.objects FOR INSERT
    TO anon
    WITH CHECK (bucket_id = 'boating-cards');
  END IF;
END $$;
