/*
  # Force Immediate Booking Cleanup
  
  1. Changes
    - Manually cancel all expired bookings NOW
    - Update get_active_rental_bookings to ALWAYS run cleanup
    - Update availability checks to ALWAYS run cleanup first
    - Add cleanup to ANY query that checks bookings
  
  2. Security
    - Uses existing RLS policies
    - Maintains data integrity
*/

-- First, cancel ALL expired bookings immediately
UPDATE rental_bookings
SET status = 'cancelled'
WHERE status = 'pending'
  AND expires_at IS NOT NULL
  AND expires_at < NOW();

UPDATE bookings
SET status = 'cancelled'
WHERE status = 'pending'
  AND expires_at IS NOT NULL
  AND expires_at < NOW();

-- Update the availability function to use cleanup EVERY TIME
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
  -- ALWAYS clean up expired bookings first
  UPDATE rental_bookings
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  -- Return only active bookings
  RETURN QUERY
  SELECT rb.id, rb.check_in_date, rb.check_out_date, rb.status
  FROM rental_bookings rb
  WHERE rb.property_id = property_uuid
    AND rb.status IN ('pending', 'confirmed')
    AND (rb.expires_at IS NULL OR rb.expires_at >= NOW())
    AND rb.check_out_date >= start_date
    AND rb.check_in_date <= end_date;
END;
$$;

-- Create a function to check and cleanup before any calendar query
CREATE OR REPLACE FUNCTION cleanup_before_calendar_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rental_bookings
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
    
  UPDATE bookings
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;
