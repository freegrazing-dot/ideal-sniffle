/*
  # Add Real-Time Booking Expiration Triggers

  1. Changes
    - Create trigger to auto-cancel expired bookings on SELECT
    - Create trigger to auto-cancel expired rental bookings on SELECT
    - Remove dependency on pg_cron which has permission issues

  2. Security
    - Uses SECURITY DEFINER for cleanup operations
    - Maintains data integrity
*/

-- Create a function that runs cleanup before any availability check
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cancel expired bookings
  UPDATE bookings
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
    
  RETURN NEW;
END;
$$;

-- Create a function that runs cleanup before any rental availability check
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_rental_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cancel expired rental bookings
  UPDATE rental_bookings
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
    
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS auto_cleanup_expired_bookings ON bookings;
DROP TRIGGER IF EXISTS auto_cleanup_expired_rental_bookings ON rental_bookings;

-- Create trigger on bookings INSERT to cleanup expired records
CREATE TRIGGER auto_cleanup_expired_bookings
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_expired_bookings();

-- Create trigger on rental_bookings INSERT to cleanup expired records
CREATE TRIGGER auto_cleanup_expired_rental_bookings
  BEFORE INSERT ON rental_bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_expired_rental_bookings();

-- Also update the availability check functions to always cleanup first
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
  UPDATE rental_bookings
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  -- Then return active bookings (not cancelled)
  RETURN QUERY
  SELECT rb.id, rb.check_in_date, rb.check_out_date, rb.status
  FROM rental_bookings rb
  WHERE rb.property_id = property_uuid
    AND rb.status IN ('pending', 'confirmed')
    AND rb.check_out_date >= start_date
    AND rb.check_in_date <= end_date;
END;
$$;

-- Run cleanup now to clear any existing expired bookings
UPDATE bookings
SET status = 'cancelled'
WHERE status = 'pending'
  AND expires_at IS NOT NULL
  AND expires_at < NOW();

UPDATE rental_bookings
SET status = 'cancelled'
WHERE status = 'pending'
  AND expires_at IS NOT NULL
  AND expires_at < NOW();
