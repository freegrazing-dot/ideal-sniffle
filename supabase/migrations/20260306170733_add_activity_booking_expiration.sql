/*
  # Add Expiration to Activity Bookings

  1. Changes
    - Add `expires_at` column to `bookings` table
    - Create trigger to automatically set 15-minute expiration for pending bookings
    - Update cleanup function to handle both rental and activity bookings

  2. Security
    - Maintains existing RLS policies
    - Cleanup function uses SECURITY DEFINER to bypass RLS

  3. Notes
    - 15 minutes gives users adequate time to complete Stripe checkout
    - Expired bookings are cleaned up automatically when checking availability
*/

-- Add expires_at column to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Set expires_at for existing pending bookings (15 minutes from creation)
UPDATE bookings
SET expires_at = created_at + interval '15 minutes'
WHERE status = 'pending' AND expires_at IS NULL;

-- Create trigger for activity bookings expiration
DROP TRIGGER IF EXISTS set_activity_booking_expiration_trigger ON bookings;
CREATE TRIGGER set_activity_booking_expiration_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_expiration();

-- Update cleanup function to handle both tables
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired pending rental bookings
  DELETE FROM rental_bookings
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  -- Delete expired pending activity bookings
  DELETE FROM bookings
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;