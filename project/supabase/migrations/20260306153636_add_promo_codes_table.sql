/*
  # Add Promo Codes System

  1. New Tables
    - `promo_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique) - The promo code string (e.g., "SUMMER10")
      - `discount_percentage` (numeric) - Percentage discount (e.g., 10 for 10% off)
      - `max_uses` (integer, nullable) - Maximum number of times code can be used (null = unlimited)
      - `current_uses` (integer) - Current number of times code has been used
      - `valid_from` (timestamptz) - When the promo code becomes valid
      - `valid_until` (timestamptz, nullable) - When the promo code expires (null = never expires)
      - `applies_to` (text) - What the code applies to: 'properties', 'activities', 'merchandise', or 'all'
      - `active` (boolean) - Whether the code is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `promo_codes` table
    - Add policy for public read access to active, valid codes
    - Add policy for admin to manage promo codes

  3. Functions
    - `validate_promo_code` - Validates a promo code and returns discount
    - `increment_promo_code_usage` - Increments usage count after successful booking
*/

CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_percentage numeric NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz CHECK (valid_until IS NULL OR valid_until > valid_from),
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('properties', 'activities', 'merchandise', 'all')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo codes"
  ON promo_codes FOR SELECT
  USING (
    active = true 
    AND valid_from <= now() 
    AND (valid_until IS NULL OR valid_until >= now())
  );

CREATE POLICY "Admins can insert promo codes"
  ON promo_codes FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update promo codes"
  ON promo_codes FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete promo codes"
  ON promo_codes FOR DELETE
  TO authenticated
  USING (is_admin());

-- Add a function to validate and apply promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
  code_text text,
  applies_to_type text DEFAULT 'all'
)
RETURNS TABLE (
  valid boolean,
  discount_percentage numeric,
  message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  promo_record promo_codes%ROWTYPE;
BEGIN
  -- Find the promo code
  SELECT * INTO promo_record
  FROM promo_codes
  WHERE UPPER(code) = UPPER(code_text)
  AND active = true
  AND valid_from <= now()
  AND (valid_until IS NULL OR valid_until >= now());

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::numeric, 'Invalid or expired promo code';
    RETURN;
  END IF;

  -- Check if max uses exceeded
  IF promo_record.max_uses IS NOT NULL AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN QUERY SELECT false, 0::numeric, 'This promo code has reached its maximum usage limit';
    RETURN;
  END IF;

  -- Check if applies to the right type
  IF promo_record.applies_to != 'all' AND promo_record.applies_to != applies_to_type THEN
    RETURN QUERY SELECT false, 0::numeric, 'This promo code cannot be used for this type of booking';
    RETURN;
  END IF;

  -- Valid code
  RETURN QUERY SELECT true, promo_record.discount_percentage, 'Promo code applied successfully';
END;
$$;

-- Add a function to increment promo code usage
CREATE OR REPLACE FUNCTION increment_promo_code_usage(code_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE UPPER(code) = UPPER(code_text)
  AND active = true;
END;
$$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active, valid_from, valid_until);
