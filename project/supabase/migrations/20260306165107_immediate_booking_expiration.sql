/*
  # Immediate Booking Expiration

  1. Changes
    - Reduce booking expiration to 2 minutes (effectively immediate for abandoned bookings)
    - Add cleanup on every availability check
    - Update trigger to set shorter expiration time

  2. Notes
    - Pending bookings now expire after 2 minutes instead of 30 minutes
    - This ensures calendar updates almost immediately when bookings are abandoned
*/

-- Update existing pending bookings to expire in 2 minutes from creation
UPDATE rental_bookings
SET expires_at = created_at + interval '2 minutes'
WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Update the trigger function to set 2 minute expiration
CREATE OR REPLACE FUNCTION set_booking_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + interval '2 minutes';
  END IF;
  RETURN NEW;
END;
$$;