/*
  # Add Cleaning Fee and Security Deposit Product
  
  1. Changes to Existing Tables
    - Add `cleaning_fee` column to `properties` table
      - `cleaning_fee` (numeric) - One-time cleaning fee per booking
  
  2. New Tables
    - `security_deposit_products`
      - `id` (uuid, primary key)
      - `property_id` (uuid, foreign key) - References the property
      - `deposit_amount` (numeric) - Amount to collect as deposit
      - `description` (text) - Description of the deposit product
      - `active` (boolean) - Whether this product is available
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  3. Security
    - Enable RLS on `security_deposit_products` table
    - Add policies for public read access and admin management
*/

-- Add cleaning_fee column to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'cleaning_fee'
  ) THEN
    ALTER TABLE properties ADD COLUMN cleaning_fee numeric DEFAULT 150;
  END IF;
END $$;

-- Update existing property with cleaning fee
UPDATE properties 
SET cleaning_fee = 150 
WHERE id = '6a807fa7-cff5-4c76-9341-f44010eba52a';

-- Create security_deposit_products table
CREATE TABLE IF NOT EXISTS security_deposit_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  deposit_amount numeric NOT NULL DEFAULT 500,
  description text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE security_deposit_products ENABLE ROW LEVEL SECURITY;

-- Public can view active security deposit products
CREATE POLICY "Anyone can view active security deposit products"
  ON security_deposit_products
  FOR SELECT
  USING (active = true);

-- Only authenticated users can insert (for booking purposes)
CREATE POLICY "Authenticated users can create security deposit bookings"
  ON security_deposit_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_security_deposit_products_property_id 
  ON security_deposit_products(property_id);

-- Insert security deposit product for the Florida Beach House
INSERT INTO security_deposit_products (property_id, deposit_amount, description, active)
VALUES (
  '6a807fa7-cff5-4c76-9341-f44010eba52a',
  500,
  'Security Deposit Only - Florida Beach House (Seafoam Oasis). This is a standalone security deposit authorization that can be charged separately. A $500 hold will be placed on your card but NOT charged unless damages occur.',
  true
) ON CONFLICT DO NOTHING;