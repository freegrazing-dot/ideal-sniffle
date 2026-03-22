/*
  # Add Deposit Authorization Tracking
  
  1. Changes to rental_bookings table
    - Add `deposit_payment_intent_id` - Stores Stripe PaymentIntent ID for the deposit authorization
    - Add `deposit_status` - Tracks status: 'pending', 'authorized', 'released', 'captured'
    - Add `deposit_captured_amount` - Amount captured if there are damages
    - Add `deposit_capture_reason` - Reason for capturing the deposit
    - Add `deposit_released_at` - Timestamp when deposit was released
    
  2. Purpose
    - Enable authorization holds instead of immediate charges for security deposits
    - Track the lifecycle of deposits (hold → release or capture)
    - Maintain audit trail for deposit management
*/

-- Add deposit tracking columns to rental_bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'deposit_payment_intent_id'
  ) THEN
    ALTER TABLE rental_bookings ADD COLUMN deposit_payment_intent_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'deposit_status'
  ) THEN
    ALTER TABLE rental_bookings ADD COLUMN deposit_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'deposit_captured_amount'
  ) THEN
    ALTER TABLE rental_bookings ADD COLUMN deposit_captured_amount decimal(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'deposit_capture_reason'
  ) THEN
    ALTER TABLE rental_bookings ADD COLUMN deposit_capture_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'deposit_released_at'
  ) THEN
    ALTER TABLE rental_bookings ADD COLUMN deposit_released_at timestamptz;
  END IF;
END $$;

-- Create index for faster deposit status queries
CREATE INDEX IF NOT EXISTS idx_rental_bookings_deposit_status ON rental_bookings(deposit_status);
