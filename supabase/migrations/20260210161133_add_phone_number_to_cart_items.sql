/*
  # Add phone number to cart items

  1. Changes
    - Add `customer_phone` column to `cart_items` table
    - This allows collecting phone numbers for each item in the cart before checkout

  2. Notes
    - Phone number is optional (can be empty string) to maintain backward compatibility
    - Default value is empty string
*/

-- Add customer_phone column to cart_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cart_items' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN customer_phone text DEFAULT '';
  END IF;
END $$;
