/*
  # Create Merchandise System

  1. New Tables
    - `merchandise_items`
      - `id` (uuid, primary key)
      - `name` (text) - Item name (e.g., "TKAC Logo T-Shirt")
      - `description` (text) - Item description
      - `price` (numeric) - Item price
      - `category` (text) - Category (e.g., "apparel", "accessories")
      - `sizes` (text[]) - Available sizes (e.g., ["S", "M", "L", "XL"])
      - `colors` (text[]) - Available colors
      - `image_url` (text) - Product image URL
      - `stock_quantity` (integer) - Current stock level
      - `active` (boolean) - Whether item is available for purchase
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `merchandise_items` table
    - Add policy for public to read active items
    - Add policy for admins to manage items

  3. Purpose
    - Allow customers to purchase TKAC merchandise like hats and t-shirts
    - Track inventory and manage product catalog
*/

-- Create merchandise_items table
CREATE TABLE IF NOT EXISTS merchandise_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL CHECK (price >= 0),
  category text NOT NULL DEFAULT 'apparel',
  sizes text[] DEFAULT ARRAY[]::text[],
  colors text[] DEFAULT ARRAY[]::text[],
  image_url text,
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE merchandise_items ENABLE ROW LEVEL SECURITY;

-- Public can view active merchandise
CREATE POLICY "Anyone can view active merchandise"
  ON merchandise_items
  FOR SELECT
  TO public
  USING (active = true);

-- Admins can manage merchandise
CREATE POLICY "Admins can insert merchandise"
  ON merchandise_items
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update merchandise"
  ON merchandise_items
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete merchandise"
  ON merchandise_items
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Insert sample merchandise items
INSERT INTO merchandise_items (name, description, price, category, sizes, colors, stock_quantity, active)
VALUES 
  (
    'TKAC Adventures T-Shirt',
    'Premium cotton t-shirt with the TKAC Adventures logo. Comfortable and perfect for your next adventure!',
    24.99,
    'apparel',
    ARRAY['S', 'M', 'L', 'XL', '2XL'],
    ARRAY['Navy', 'White', 'Gray'],
    100,
    true
  ),
  (
    'TKAC Baseball Cap',
    'Adjustable baseball cap with embroidered TKAC logo. One size fits most.',
    19.99,
    'accessories',
    ARRAY['One Size'],
    ARRAY['Navy', 'Black', 'Khaki'],
    75,
    true
  ),
  (
    'TKAC Performance Polo',
    'Moisture-wicking performance polo perfect for outdoor activities. Features the TKAC logo.',
    34.99,
    'apparel',
    ARRAY['S', 'M', 'L', 'XL', '2XL'],
    ARRAY['Navy', 'White', 'Light Blue'],
    50,
    true
  )
ON CONFLICT DO NOTHING;
