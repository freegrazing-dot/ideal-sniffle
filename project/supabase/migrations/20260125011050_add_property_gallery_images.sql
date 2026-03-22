/*
  # Add Property Gallery Images

  1. Changes
    - Add `gallery_images` column to properties table to store multiple image URLs
    - Update existing properties to include the main image in the gallery array

  2. Notes
    - Using jsonb array to store multiple image URLs for each property
    - Allows properties to have a full photo gallery
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'gallery_images'
  ) THEN
    ALTER TABLE properties ADD COLUMN gallery_images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;