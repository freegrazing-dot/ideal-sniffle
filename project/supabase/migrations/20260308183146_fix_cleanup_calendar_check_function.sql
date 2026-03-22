/*
  # Fix Calendar Cleanup Function to Delete Expired Bookings

  ## Problem
  The cleanup_before_calendar_check function sets expired bookings to 'cancelled'
  but doesn't delete them. This causes dates to remain blocked even after
  the 5-minute expiration window.

  ## Solution
  Update cleanup_before_calendar_check to DELETE expired bookings instead of
  just setting them to cancelled, matching the behavior of cleanup_expired_bookings.

  ## Changes
  1. Recreate cleanup_before_calendar_check to DELETE expired bookings
  2. Ensure consistent behavior across all cleanup functions
*/

-- Recreate the cleanup_before_calendar_check function to DELETE instead of UPDATE
CREATE OR REPLACE FUNCTION cleanup_before_calendar_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired rental bookings that are still pending
  DELETE FROM rental_bookings
  WHERE status = 'pending'
    AND payment_status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  -- Delete expired activity bookings that are still pending
  DELETE FROM bookings
  WHERE status = 'pending'
    AND payment_status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_before_calendar_check() TO anon;
GRANT EXECUTE ON FUNCTION cleanup_before_calendar_check() TO authenticated;