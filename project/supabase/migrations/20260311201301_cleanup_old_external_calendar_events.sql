/*
  # Cleanup Old External Calendar Events

  ## Problem
  External calendar events from Airbnb/Booking.com sync remain in the database
  forever, even after the dates have passed. This causes old dates to appear
  blocked in the calendar indefinitely.

  ## Solution
  1. Delete all external calendar events where end_date is in the past
  2. Create a function to clean up old events (30+ days past)
  3. Schedule automatic cleanup to run daily

  ## Changes
  1. Delete existing old events
  2. Create cleanup_old_calendar_events function
  3. Schedule daily cleanup at midnight
*/

-- Delete all external calendar events that ended more than 30 days ago
DELETE FROM external_calendar_events
WHERE end_date < CURRENT_DATE - INTERVAL '30 days';

-- Create function to clean up old external calendar events
CREATE OR REPLACE FUNCTION cleanup_old_calendar_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete external calendar events that ended more than 30 days ago
  DELETE FROM external_calendar_events
  WHERE end_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_old_calendar_events() TO anon;
GRANT EXECUTE ON FUNCTION cleanup_old_calendar_events() TO authenticated;

-- Schedule automatic cleanup to run daily at midnight (if pg_cron is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Try to unschedule existing job if it exists (ignore errors)
    BEGIN
      PERFORM cron.unschedule('cleanup-old-calendar-events');
    EXCEPTION
      WHEN OTHERS THEN
        -- Job doesn't exist, continue
        NULL;
    END;
    
    -- Schedule new job to run daily at midnight
    PERFORM cron.schedule(
      'cleanup-old-calendar-events',
      '0 0 * * *',
      'SELECT cleanup_old_calendar_events()'
    );
  END IF;
END $$;
