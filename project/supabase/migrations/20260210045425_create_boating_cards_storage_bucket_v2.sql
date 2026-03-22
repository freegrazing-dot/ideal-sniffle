/*
  # Create Boating Safety Cards Storage Bucket

  1. New Storage Bucket
    - Create `boating-cards` bucket for storing boating safety education cards
    - Public access for uploaded documents

  2. Security
    - Authenticated users can upload documents
    - Public read access to allow verification
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('boating-cards', 'boating-cards', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Allow authenticated uploads to boating-cards'
  ) THEN
    CREATE POLICY "Allow authenticated uploads to boating-cards"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'boating-cards');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Allow public read access to boating-cards'
  ) THEN
    CREATE POLICY "Allow public read access to boating-cards"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'boating-cards');
  END IF;
END $$;