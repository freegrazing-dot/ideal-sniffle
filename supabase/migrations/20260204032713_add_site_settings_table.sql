/*
  # Add site settings table
  
  1. New Tables
    - `site_settings`
      - `id` (uuid, primary key)
      - `setting_key` (text, unique) - The setting identifier (e.g., 'hero_image_url')
      - `setting_value` (text) - The setting value
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `site_settings` table
    - Add policy for anyone to read settings (public data)
    - Add policy for authenticated users to update settings
  
  3. Initial Data
    - Insert default hero image URL
*/

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (public data)
CREATE POLICY "Anyone can read site settings"
  ON site_settings
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to update settings
CREATE POLICY "Authenticated users can update site settings"
  ON site_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert settings
CREATE POLICY "Authenticated users can insert site settings"
  ON site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default hero image
INSERT INTO site_settings (setting_key, setting_value)
VALUES ('hero_image_url', 'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=1920')
ON CONFLICT (setting_key) DO NOTHING;
