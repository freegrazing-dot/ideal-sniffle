/*
  # Create Promo Banners Table

  1. New Tables
    - `promo_banners`
      - `id` (uuid, primary key)
      - `message` (text) - The promotional message to display
      - `background_color` (text) - Hex color for banner background
      - `text_color` (text) - Hex color for banner text
      - `is_active` (boolean) - Whether this banner is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `promo_banners` table
    - Add policy for public to read active banners
    - Add policy for authenticated admins to manage banners

  3. Notes
    - Only one banner should be active at a time (enforced by application logic)
    - Banners are dismissible on the frontend
*/

CREATE TABLE IF NOT EXISTS promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  background_color text NOT NULL DEFAULT '#3b82f6',
  text_color text NOT NULL DEFAULT '#ffffff',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;

-- Public can read active banners
CREATE POLICY "Anyone can view active promo banners"
  ON promo_banners
  FOR SELECT
  USING (is_active = true);

-- Admins can view all banners
CREATE POLICY "Admins can view all promo banners"
  ON promo_banners
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can insert banners
CREATE POLICY "Admins can create promo banners"
  ON promo_banners
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update banners
CREATE POLICY "Admins can update promo banners"
  ON promo_banners
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete banners
CREATE POLICY "Admins can delete promo banners"
  ON promo_banners
  FOR DELETE
  TO authenticated
  USING (is_admin());