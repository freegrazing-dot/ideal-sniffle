/*
  # Booking System for Water Sports Activities

  1. New Tables
    - `activities`
      - `id` (uuid, primary key)
      - `name` (text) - Activity name (e.g., "Boat Tour", "Fishing Charter")
      - `description` (text) - Full description
      - `duration_hours` (numeric) - Duration in hours
      - `capacity` (integer) - Maximum people per booking
      - `base_price` (numeric) - Base price in USD
      - `image_url` (text) - Activity image
      - `active` (boolean) - Whether activity is currently offered
      - `created_at` (timestamptz)
    
    - `bookings`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `booking_date` (date) - Date of the activity
      - `booking_time` (time) - Start time
      - `num_people` (integer) - Number of people
      - `total_price` (numeric) - Total amount paid
      - `status` (text) - 'pending', 'confirmed', 'cancelled', 'completed'
      - `payment_status` (text) - 'pending', 'paid', 'refunded'
      - `payment_intent_id` (text) - Stripe payment intent ID
      - `special_requests` (text) - Customer notes
      - `source` (text) - 'website', 'airbnb' - where booking came from
      - `external_id` (text) - ID from external system (Airbnb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `availability_exceptions`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key, nullable) - specific activity or null for all
      - `exception_date` (date)
      - `start_time` (time, nullable) - specific time block or null for all day
      - `end_time` (time, nullable)
      - `reason` (text) - 'blocked', 'maintenance', 'weather', 'airbnb_booking'
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `business_hours`
      - `id` (uuid, primary key)
      - `day_of_week` (integer) - 0=Sunday, 6=Saturday
      - `open_time` (time)
      - `close_time` (time)
      - `is_open` (boolean)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Public can read activities and business hours
    - Public can insert bookings (for online booking)
    - Public can read their own bookings (future: with auth)
    - Availability exceptions readable by public (to check availability)
*/

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_hours numeric NOT NULL DEFAULT 2,
  capacity integer NOT NULL DEFAULT 6,
  base_price numeric NOT NULL DEFAULT 0,
  image_url text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active activities"
  ON activities FOR SELECT
  USING (active = true);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE RESTRICT NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text DEFAULT '',
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  num_people integer NOT NULL DEFAULT 1,
  total_price numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_intent_id text DEFAULT '',
  special_requests text DEFAULT '',
  source text DEFAULT 'website' CHECK (source IN ('website', 'airbnb', 'phone', 'other')),
  external_id text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view bookings"
  ON bookings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update bookings"
  ON bookings FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Availability exceptions table
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  start_time time,
  end_time time,
  reason text DEFAULT 'blocked' CHECK (reason IN ('blocked', 'maintenance', 'weather', 'airbnb_booking', 'other')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability exceptions"
  ON availability_exceptions FOR SELECT
  USING (true);

-- Business hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time NOT NULL DEFAULT '09:00',
  close_time time NOT NULL DEFAULT '17:00',
  is_open boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(day_of_week)
);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business hours"
  ON business_hours FOR SELECT
  USING (true);

-- Insert default business hours (9 AM - 5 PM, open every day)
INSERT INTO business_hours (day_of_week, open_time, close_time, is_open)
VALUES 
  (0, '09:00', '17:00', true),
  (1, '09:00', '17:00', true),
  (2, '09:00', '17:00', true),
  (3, '09:00', '17:00', true),
  (4, '09:00', '17:00', true),
  (5, '09:00', '17:00', true),
  (6, '09:00', '17:00', true)
ON CONFLICT (day_of_week) DO NOTHING;

-- Insert sample activities
INSERT INTO activities (name, description, duration_hours, capacity, base_price, image_url, active)
VALUES 
  (
    'Backcountry Boat Tour',
    'Explore the pristine backwaters of Bonita Springs and Naples. See dolphins, manatees, and exotic birds in their natural habitat. Perfect for families and nature lovers.',
    3,
    6,
    350,
    'https://images.pexels.com/photos/163236/luxury-yacht-boat-speed-water-163236.jpeg?auto=compress&cs=tinysrgb&w=1200',
    true
  ),
  (
    'Fishing Charter',
    'Experience world-class fishing in Southwest Florida. Our experienced captains know the best spots for snook, redfish, tarpon, and more. All equipment provided.',
    4,
    4,
    500,
    'https://images.pexels.com/photos/256734/pexels-photo-256734.jpeg?auto=compress&cs=tinysrgb&w=1200',
    true
  ),
  (
    'Jet Ski Adventure',
    'Feel the thrill as you navigate the beautiful coastal waters on your own jet ski. Guided tours available for all skill levels. Life jackets provided.',
    2,
    2,
    200,
    'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=1200',
    true
  ),
  (
    'Sunset Cruise',
    'Relax and unwind on a peaceful evening cruise through the backwaters. Watch the stunning Florida sunset while enjoying complimentary beverages.',
    2,
    6,
    300,
    'https://images.pexels.com/photos/1118874/pexels-photo-1118874.jpeg?auto=compress&cs=tinysrgb&w=1200',
    true
  )
ON CONFLICT DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_activity ON bookings(activity_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_exceptions(exception_date);
CREATE INDEX IF NOT EXISTS idx_availability_activity ON availability_exceptions(activity_id);