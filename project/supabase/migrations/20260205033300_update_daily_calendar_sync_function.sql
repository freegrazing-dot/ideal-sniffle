/*
  # Update Daily Calendar Sync Function

  1. Updates
    - Update `sync_all_property_calendars()` function to call the correct edge function
    - Uses the new `sync-all-calendars` endpoint instead of calling per-property
    - More efficient single call to sync all calendars at once
  
  2. Notes
    - This replaces the previous function with a simpler implementation
    - The edge function handles all property syncing in one request
    - Scheduled job remains at 2:00 AM UTC daily
*/

-- Update function to call the sync-all-calendars edge function
CREATE OR REPLACE FUNCTION sync_all_property_calendars()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
BEGIN
  -- Get Supabase URL from settings
  supabase_url := current_setting('request.headers', true)::json->>'host';
  
  -- If we can't get it from headers, construct it
  IF supabase_url IS NULL THEN
    supabase_url := COALESCE(
      current_setting('app.settings.supabase_url', true),
      'https://' || current_setting('request.jwt.claims', true)::json->>'iss'
    );
  END IF;
  
  -- Construct function URL
  function_url := supabase_url || '/functions/v1/sync-all-calendars';
  
  -- Make async HTTP request to sync edge function
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object()
  );
  
  -- Log the sync execution
  RAISE NOTICE 'Calendar sync triggered at %', NOW();
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Calendar sync failed: %', SQLERRM;
END;
$$;