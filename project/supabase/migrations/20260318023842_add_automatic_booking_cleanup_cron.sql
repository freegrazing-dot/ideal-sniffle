/*
  # Add automatic booking cleanup cron job

  This migration adds a cron job to automatically clean up expired bookings
  every minute, ensuring that dates are always released promptly even if
  no new bookings are created to trigger the cleanup.

  1. Changes
    - Add cron job to run cleanup_expired_bookings() every minute
    - This prevents stuck bookings from blocking dates indefinitely
*/

-- Add cron job to cleanup expired bookings every minute
SELECT cron.schedule(
  'cleanup-expired-bookings-every-minute',
  '* * * * *', -- Run every minute
  'SELECT cleanup_expired_bookings();'
);
