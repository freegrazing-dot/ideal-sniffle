/*
  # Airbnb Calendar Integration

  ## Overview
  Adds support for syncing Airbnb calendars via iCal URLs to prevent double bookings
  across platforms.

  ## Changes

  ### 1. Update `properties` table
  - Add `airbnb_ical_url` (text) - URL to Airbnb's iCal export feed
  - Add `last_sync_at` (timestamptz) - Last time calendar was synced

  ### 2. Create `external_calendar_events` table
  Stores events imported from external calendars (Airbnb, VRBO, etc.)
  - `id` (uuid, primary key) - Unique event identifier
  - `property_id` (uuid, foreign key) - Links to properties table
  - `source` (text) - Calendar source (airbnb, vrbo, etc.)
  - `external_id` (text) - External event ID from source
  - `start_date` (date) - Event start date
  - `end_date` (date) - Event end date
  - `summary` (text) - Event title/summary
  - `description` (text) - Event description
  - `status` (text) - Event status (blocked, reserved, etc.)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on external_calendar_events table
  - Only admins can manage external calendar events
  - Public can view events for availability checking

  ## Notes
  - External calendar events will be checked alongside rental_bookings for availability
  - Sync should be performed regularly (e.g., every hour) via scheduled edge function
  - Multiple properties can have their own Airbnb calendar URLs
*/

-- Add Airbnb calendar fields to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'airbnb_ical_url'
  ) THEN
    ALTER TABLE properties ADD COLUMN airbnb_ical_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'last_sync_at'
  ) THEN
    ALTER TABLE properties ADD COLUMN last_sync_at timestamptz;
  END IF;
END $$;

-- Create external calendar events table
CREATE TABLE IF NOT EXISTS external_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL CHECK (source IN ('airbnb', 'vrbo', 'booking_com', 'other')),
  external_id text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  summary text DEFAULT '',
  description text DEFAULT '',
  status text DEFAULT 'blocked' CHECK (status IN ('blocked', 'reserved', 'unavailable')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date),
  UNIQUE(property_id, source, external_id)
);

-- Enable RLS on external_calendar_events
ALTER TABLE external_calendar_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view external calendar events for availability checking
CREATE POLICY "Anyone can view external calendar events"
  ON external_calendar_events FOR SELECT
  USING (true);

-- Only admins can insert external calendar events
CREATE POLICY "Only admins can insert external calendar events"
  ON external_calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can update external calendar events
CREATE POLICY "Only admins can update external calendar events"
  ON external_calendar_events FOR UPDATE
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

-- Only admins can delete external calendar events
CREATE POLICY "Only admins can delete external calendar events"
  ON external_calendar_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_calendar_events_property_dates 
  ON external_calendar_events(property_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_external_calendar_events_source 
  ON external_calendar_events(property_id, source);