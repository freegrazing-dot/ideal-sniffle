/*
  # Fix Expired Booking Cleanup

  1. Changes
    - Update cleanup function to mark bookings as 'cancelled' instead of deleting them
    - Manually cancel the expired May bookings
    - Update availability queries to exclude cancelled bookings

  2. Security
    - Preserves data integrity by never deleting bookings
    - Maintains audit trail of all bookings
*/

-- Update the cleanup function to cancel instead of delete
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cancel expired pending rental bookings
  UPDATE rental_bookings
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  -- Cancel expired pending activity bookings
  UPDATE bookings
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;

-- Manually clean up the expired May bookings
UPDATE rental_bookings
SET status = 'cancelled'
WHERE status = 'pending'
  AND expires_at < NOW();

UPDATE bookings
SET status = 'cancelled'
WHERE status = 'pending'
  AND expires_at < NOW();

-- Update the active bookings function to exclude cancelled
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
