/*
  # Vacation Rental Properties Schema

  ## Overview
  Creates tables and policies for managing vacation rental properties alongside adventure activities.

  ## New Tables
  
  ### `properties`
  Stores vacation rental property listings
  - `id` (uuid, primary key) - Unique property identifier
  - `name` (text) - Property name/title
  - `description` (text) - Detailed property description
  - `location` (text) - Property location/address
  - `price_per_night` (numeric) - Nightly rental rate
  - `max_guests` (integer) - Maximum number of guests
  - `bedrooms` (integer) - Number of bedrooms
  - `bathrooms` (numeric) - Number of bathrooms (can be decimal like 2.5)
  - `image_url` (text) - Main property image
  - `amenities` (text[]) - Array of amenity names
  - `active` (boolean) - Whether property is available for booking
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `rental_bookings`
  Tracks vacation rental reservations
  - `id` (uuid, primary key) - Unique booking identifier
  - `property_id` (uuid, foreign key) - Links to properties table
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `customer_name` (text) - Guest name
  - `customer_email` (text) - Guest email
  - `customer_phone` (text) - Guest phone number
  - `check_in_date` (date) - Check-in date
  - `check_out_date` (date) - Check-out date
  - `guests` (integer) - Number of guests
  - `total_nights` (integer) - Duration of stay
  - `total_price` (numeric) - Total booking cost
  - `status` (text) - Booking status (pending, confirmed, cancelled)
  - `payment_status` (text) - Payment status (pending, paid, refunded)
  - `stripe_session_id` (text) - Stripe checkout session ID
  - `special_requests` (text) - Guest special requests or notes
  - `created_at` (timestamptz) - Booking creation timestamp

  ## Security
  - Enable RLS on all tables
  - Public can view active properties
  - Only authenticated users can create bookings
  - Users can view their own bookings
  - Admin users can manage all data
*/

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  price_per_night numeric NOT NULL CHECK (price_per_night > 0),
  max_guests integer NOT NULL CHECK (max_guests > 0),
  bedrooms integer NOT NULL CHECK (bedrooms >= 0),
  bathrooms numeric NOT NULL CHECK (bathrooms >= 0),
  image_url text NOT NULL,
  amenities text[] DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rental_bookings table
CREATE TABLE IF NOT EXISTS rental_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  guests integer NOT NULL CHECK (guests > 0),
  total_nights integer NOT NULL CHECK (total_nights > 0),
  total_price numeric NOT NULL CHECK (total_price > 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_session_id text,
  special_requests text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_bookings ENABLE ROW LEVEL SECURITY;

-- Properties policies
CREATE POLICY "Anyone can view active properties"
  ON properties FOR SELECT
  USING (active = true);

CREATE POLICY "Authenticated users can view all properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can update properties"
  ON properties FOR UPDATE
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

-- Rental bookings policies
CREATE POLICY "Users can view their own rental bookings"
  ON rental_bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create rental bookings"
  ON rental_bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pending rental bookings"
  ON rental_bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all rental bookings"
  ON rental_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update all rental bookings"
  ON rental_bookings FOR UPDATE
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rental_bookings_property_dates 
  ON rental_bookings(property_id, check_in_date, check_out_date);

CREATE INDEX IF NOT EXISTS idx_rental_bookings_user 
  ON rental_bookings(user_id);
