/*
  # Add Stripe Session to Bookings

  1. Changes
    - Add `stripe_session_id` column to `bookings` table to track Stripe checkout sessions
    - Add `stripe_payment_intent_id` column to store the payment intent ID after successful payment

  2. Notes
    - These fields are optional and will be populated during the checkout process
    - Used to track payment status and reconcile payments with bookings
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'stripe_session_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN stripe_session_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN stripe_payment_intent_id text;
  END IF;
END $$;