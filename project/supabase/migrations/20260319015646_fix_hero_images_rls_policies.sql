/*
  # Fix Hero Images RLS Policies

  1. Changes
    - Drop duplicate and conflicting RLS policies for hero-images bucket
    - Keep only the policies that use the is_admin() function
    - Ensure admins can upload, update, and delete hero images
    - Ensure public can view hero images

  2. Security
    - Admins have full control over hero images
    - Public has read-only access
*/

-- Drop duplicate/conflicting policies
DROP POLICY IF EXISTS "Only admins can upload hero images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update hero images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete hero images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view hero images" ON storage.objects;

-- The working policies (using is_admin() function) are already in place:
-- "Admins can upload hero images"
-- "Admins can update hero images"
-- "Admins can delete hero images"
-- "Public can view hero images"
