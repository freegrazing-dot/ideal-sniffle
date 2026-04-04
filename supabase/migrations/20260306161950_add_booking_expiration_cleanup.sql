/*
  # Add Booking Expiration and Cleanup

  1. Changes
    - Add `expires_at` column to `rental_bookings` table to track when pending bookings expire
    - Create function to automatically clean up expired pending bookings
    - Create a scheduled job to run cleanup every 5 minutes (pg_cron)
    - Update calendar queries to exclude expired bookings

  2. Security
    - Function runs with security definer to bypass RLS
    - Only affects bookings with status 'pending' and expired timestamp
*/

-- Add expires_at column to rental_bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE rental_bookings ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Set expires_at for existing pending bookings (30 minutes from creation)
UPDATE rental_bookings
SET expires_at = created_at + interval '30 minutes'
WHERE status = 'pending' AND expires_at IS NULL;

-- Create function to clean up expired pending bookings
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired pending bookings
  DELETE FROM rental_bookings
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;

-- Create a trigger to automatically set expires_at on new pending bookings
CREATE OR REPLACE FUNCTION set_booking_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + interval '30 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_booking_expiration_trigger ON rental_bookings;
CREATE TRIGGER set_booking_expiration_trigger
  BEFORE INSERT OR UPDATE ON rental_bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_expiration();

-- Note: pg_cron is not available in all Supabase plans
-- Instead, we'll rely on the frontend to call the cleanup function periodically
-- or clean up on-demand when checking availability

-- Create a helper function to get non-expired bookings for a property
CREATE OR REPLACE FUNCTION get_active_rental_bookings(property_uuid uuid, start_date date, end_date date)
RETURNS TABLE (
  id uuid,
  check_in_date date,
  check_out_date date,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First clean up expired bookings
  PERFORM cleanup_expired_bookings();
  
  -- Then return active bookings
  RETURN QUERY
  SELECT rb.id, rb.check_in_date, rb.check_out_date, rb.status
  FROM rental_bookings rb
  WHERE rb.property_id = property_uuid
    AND rb.status IN ('pending', 'confirmed')
    AND rb.check_out_date >= start_date
    AND rb.check_in_date <= end_date
    AND (rb.status != 'pending' OR rb.expires_at IS NULL OR rb.expires_at > NOW());
END;
$$;