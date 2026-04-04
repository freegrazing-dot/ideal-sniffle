/*
  # Dynamic Pricing and Cart Integration for Vacation Rentals

  ## Overview
  Adds dynamic pricing rules for vacation rentals and integrates rental bookings with the cart system.

  ## New Tables
  
  ### `property_pricing_rules`
  Stores custom pricing rules for specific date ranges
  - `id` (uuid, primary key) - Unique rule identifier
  - `property_id` (uuid, foreign key) - Links to properties table
  - `start_date` (date) - Rule start date
  - `end_date` (date) - Rule end date
  - `price_per_night` (numeric) - Custom nightly rate for this period
  - `min_nights` (integer) - Minimum nights required for this period
  - `active` (boolean) - Whether rule is active
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `cart_items`
  Unified cart system for both activities and rental properties
  - `id` (uuid, primary key) - Unique cart item identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `item_type` (text) - Type: 'activity' or 'rental'
  - `activity_id` (uuid, foreign key) - Links to activities (nullable)
  - `property_id` (uuid, foreign key) - Links to properties (nullable)
  - `booking_date` (date) - For activities
  - `booking_time` (text) - For activities
  - `check_in_date` (date) - For rentals
  - `check_out_date` (date) - For rentals
  - `guests` (integer) - Number of guests/people
  - `total_price` (numeric) - Calculated total price
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access their own cart items
  - Public can view active pricing rules
  - Only admins can manage pricing rules
*/

-- Create property_pricing_rules table
CREATE TABLE IF NOT EXISTS property_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  price_per_night numeric NOT NULL CHECK (price_per_night > 0),
  min_nights integer DEFAULT 1 CHECK (min_nights > 0),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('activity', 'rental')),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  booking_date date,
  booking_time text,
  check_in_date date,
  check_out_date date,
  guests integer NOT NULL CHECK (guests > 0),
  total_price numeric NOT NULL CHECK (total_price > 0),
  special_requests text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT activity_or_property CHECK (
    (item_type = 'activity' AND activity_id IS NOT NULL AND property_id IS NULL) OR
    (item_type = 'rental' AND property_id IS NOT NULL AND activity_id IS NULL)
  )
);

-- Enable RLS
ALTER TABLE property_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Pricing rules policies
CREATE POLICY "Anyone can view active pricing rules"
  ON property_pricing_rules FOR SELECT
  USING (active = true);

CREATE POLICY "Authenticated users can view all pricing rules"
  ON property_pricing_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert pricing rules"
  ON property_pricing_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can update pricing rules"
  ON property_pricing_rules FOR UPDATE
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

-- Cart items policies
CREATE POLICY "Users can view their own cart items"
  ON cart_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own cart items"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own cart items"
  ON cart_items FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own cart items"
  ON cart_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_rules_property_dates 
  ON property_pricing_rules(property_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_cart_items_user 
  ON cart_items(user_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_activity 
  ON cart_items(activity_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_property 
  ON cart_items(property_id);
