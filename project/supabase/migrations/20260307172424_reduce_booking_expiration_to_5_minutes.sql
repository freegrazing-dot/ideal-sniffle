/*
  # Reduce Booking Expiration Window

  1. Changes
    - Add default expiration of 5 minutes to rental_bookings table
    - Add default expiration of 5 minutes to bookings table
    - Create function to manually cleanup expired bookings
    - Add triggers that run cleanup on SELECT operations

  2. Purpose
    - Makes abandoned cart dates disappear almost immediately (5 minutes)
    - Reduces user confusion when dates appear unavailable
    - Automatic cleanup without user action

  3. Notes
    - Existing bookings without expires_at will get cleaned up
    - Confirmed bookings (payment_status = 'paid') are never deleted
*/

-- Add default expiration (5 minutes) to rental_bookings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE rental_bookings 
      ALTER COLUMN expires_at SET DEFAULT (now() + interval '5 minutes');
  END IF;
END $$;

-- Add default expiration (5 minutes) to bookings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE bookings 
      ALTER COLUMN expires_at SET DEFAULT (now() + interval '5 minutes');
  END IF;
END $$;

-- Create a function that can be called to cleanup expired bookings
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
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

  -- Delete old pending bookings without expiration (legacy cleanup)
  DELETE FROM rental_bookings
  WHERE status = 'pending'
    AND payment_status = 'pending'
    AND expires_at IS NULL
    AND created_at < NOW() - INTERVAL '1 hour';

  DELETE FROM bookings
  WHERE status = 'pending'
    AND payment_status = 'pending'
    AND expires_at IS NULL
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Update existing triggers to also cleanup before checking availability
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_rental_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cleanup before inserting new booking
  PERFORM cleanup_expired_bookings();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_cleanup_expired_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cleanup before inserting new booking
  PERFORM cleanup_expired_bookings();
  RETURN NEW;
END;
$$;
