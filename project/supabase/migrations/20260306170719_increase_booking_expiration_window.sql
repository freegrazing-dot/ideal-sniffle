/*
  # Increase Booking Expiration Window

  1. Changes
    - Increase booking expiration from 2 minutes to 15 minutes
    - This gives users adequate time to complete Stripe checkout in a new window
    - Prevents dates from being released while payment is in progress

  2. Notes
    - Users typically need 5-10 minutes to complete payment in external window
    - 15 minutes provides buffer while still cleaning up abandoned checkouts reasonably quickly
*/

-- Update existing pending bookings to expire in 15 minutes from creation
UPDATE rental_bookings
SET expires_at = created_at + interval '15 minutes'
WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Update the trigger function to set 15 minute expiration
CREATE OR REPLACE FUNCTION set_booking_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + interval '15 minutes';
  END IF;
  RETURN NEW;
END;
$$;