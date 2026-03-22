/*
  # Set Up Daily Calendar Sync

  1. Extensions
    - Enable `pg_cron` for scheduling tasks
    - Enable `pg_net` for making HTTP requests from database
  
  2. New Functions
    - `sync_all_property_calendars()` - Syncs calendars for all properties with active external calendar URLs
    - Calls the sync-airbnb-calendar edge function for each property
  
  3. Scheduled Jobs
    - Daily sync at 2:00 AM UTC for all property calendars
    - Runs automatically to keep all calendars up-to-date
  
  4. Notes
    - Uses pg_cron to schedule the sync job
    - Uses pg_net to call the edge function
    - Syncs all active calendar URLs (Airbnb, VRBO, Booking.com)
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to sync all property calendars
CREATE OR REPLACE FUNCTION sync_all_property_calendars()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_record RECORD;
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get Supabase URL and service role key from environment
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/sync-airbnb-calendar';
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Loop through all distinct properties with active calendar URLs
  FOR property_record IN 
    SELECT DISTINCT property_id 
    FROM external_calendar_urls 
    WHERE is_active = true
  LOOP
    -- Make async HTTP request to sync edge function
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'property_id', property_record.property_id
      )
    );
  END LOOP;
  
  -- Log the sync execution
  RAISE NOTICE 'Calendar sync triggered for all properties at %', NOW();
END;
$$;

-- Schedule daily sync at 2:00 AM UTC
SELECT cron.schedule(
  'daily-calendar-sync',
  '0 2 * * *',
  'SELECT sync_all_property_calendars();'
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;