/*
  # Add gallery images support to merchandise items

  1. Changes
    - Add `gallery_images` array field to `merchandise_items` table
    - This allows merchandise items to have multiple product images
    - Main image remains in `image_url`, additional images in `gallery_images`

  2. Notes
    - Gallery images are optional and can be empty
    - Frontend can display main image + gallery in carousel/slideshow
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchandise_items' AND column_name = 'gallery_images'
  ) THEN
    ALTER TABLE merchandise_items ADD COLUMN gallery_images text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;
