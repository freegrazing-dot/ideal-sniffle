/*
  # Add Damage Protection to Jet Ski Bookings

  1. Changes to bookings table
    - Add `damage_protection_type` column (insurance or hold)
    - Add `damage_protection_amount` column (25 for insurance, 500 for hold)
    - Add `damage_hold_authorization_id` column for storing Stripe payment intent ID for holds
    
  2. Notes
    - Insurance adds $25 to the total charge
    - Hold creates a $500 authorization that can be released or captured
    - Only applies to jet ski rentals
*/

-- Add damage protection columns to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'damage_protection_type'
  ) THEN
    ALTER TABLE bookings ADD COLUMN damage_protection_type text CHECK (damage_protection_type IN ('insurance', 'hold'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'damage_protection_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN damage_protection_amount numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'damage_hold_authorization_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN damage_hold_authorization_id text;
  END IF;
END $$;