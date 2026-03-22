/*
  # Fix Promo Code Validation Function Response Format

  1. Problem
    - Database function returns: valid, discount_percentage, message
    - Frontend expects: is_valid, discount_type, discount_value
    - This mismatch causes promo codes to appear invalid even when they're valid

  2. Solution
    - Update function to return is_valid, discount_type, discount_value
    - Keep supporting only percentage discounts for now (as per table schema)

  3. Changes
    - Recreate validate_promo_code function with correct return columns
*/

-- Drop existing function
DROP FUNCTION IF EXISTS validate_promo_code(text, text);

-- Recreate with correct return signature
CREATE OR REPLACE FUNCTION validate_promo_code(
  code_text text,
  applies_to_type text DEFAULT 'all'
)
RETURNS TABLE (
  is_valid boolean,
  discount_type text,
  discount_value numeric,
  message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo_record record;
BEGIN
  -- Find the promo code (case-insensitive)
  SELECT 
    pc.id,
    pc.code,
    pc.discount_percentage,
    pc.max_uses,
    pc.current_uses,
    pc.applies_to
  INTO promo_record
  FROM promo_codes pc
  WHERE UPPER(pc.code) = UPPER(code_text)
    AND pc.active = true
    AND pc.valid_from <= now()
    AND (pc.valid_until IS NULL OR pc.valid_until >= now());

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'percentage'::text, 0::numeric, 'Invalid or expired promo code'::text;
    RETURN;
  END IF;

  -- Check if max uses exceeded
  IF promo_record.max_uses IS NOT NULL AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN QUERY SELECT false, 'percentage'::text, 0::numeric, 'This promo code has reached its maximum usage limit'::text;
    RETURN;
  END IF;

  -- Check if applies to the right type
  IF promo_record.applies_to != 'all' AND promo_record.applies_to != applies_to_type THEN
    RETURN QUERY SELECT false, 'percentage'::text, 0::numeric, 'This promo code cannot be used for this type of booking'::text;
    RETURN;
  END IF;

  -- Valid code - return percentage discount
  RETURN QUERY SELECT 
    true, 
    'percentage'::text, 
    promo_record.discount_percentage, 
    ('Promo code applied! You save ' || promo_record.discount_percentage || '%')::text;
END;
$$;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION validate_promo_code(text, text) TO anon, authenticated;
