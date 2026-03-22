/*
  # External Calendar URLs Table

  ## Overview
  Creates a dedicated table to store multiple external calendar URLs per property,
  supporting Airbnb, Booking.com, VRBO, and other platforms.

  ## Changes

  ### 1. Create `external_calendar_urls` table
  - `id` (uuid, primary key) - Unique identifier
  - `property_id` (uuid, foreign key) - Links to properties table
  - `source` (text) - Calendar source (airbnb, booking_com, vrbo, etc.)
  - `ical_url` (text) - iCal feed URL
  - `last_synced_at` (timestamptz) - Last sync timestamp
  - `is_active` (boolean) - Whether sync is enabled
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. Security
  - Enable RLS on external_calendar_urls table
  - Only admins can manage calendar URLs
  - Authenticated users can view their property's calendar URLs

  ## Notes
  - Each property can have multiple calendar URLs from different sources
  - The sync function will process all active calendar URLs
*/

-- Create external calendar URLs table
CREATE TABLE IF NOT EXISTS external_calendar_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL CHECK (source IN ('airbnb', 'booking_com', 'vrbo', 'homeaway', 'tripadvisor', 'other')),
  ical_url text NOT NULL,
  last_synced_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_property_source UNIQUE(property_id, source)
);

-- Enable RLS
ALTER TABLE external_calendar_urls ENABLE ROW LEVEL SECURITY;

-- Only admins can view calendar URLs
CREATE POLICY "Only admins can view external calendar URLs"
  ON external_calendar_urls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can insert calendar URLs
CREATE POLICY "Only admins can insert external calendar URLs"
  ON external_calendar_urls FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can update calendar URLs
CREATE POLICY "Only admins can update external calendar URLs"
  ON external_calendar_urls FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can delete calendar URLs
CREATE POLICY "Only admins can delete external calendar URLs"
  ON external_calendar_urls FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_external_calendar_urls_property 
  ON external_calendar_urls(property_id, is_active);