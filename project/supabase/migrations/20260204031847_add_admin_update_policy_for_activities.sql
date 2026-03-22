/*
  # Add admin update policy for activities table
  
  1. Changes
    - Add UPDATE policy for activities table to allow admins to update activity images and other fields
  
  2. Security
    - Only users with admin role in raw_app_meta_data can update activities
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'activities' 
    AND policyname = 'Only admins can update activities'
  ) THEN
    CREATE POLICY "Only admins can update activities"
      ON activities
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE users.id = auth.uid()
          AND users.raw_app_meta_data->>'role' = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE users.id = auth.uid()
          AND users.raw_app_meta_data->>'role' = 'admin'
        )
      );
  END IF;
END $$;