/*
  # Reduce booking expiration to 10 seconds for immediate cleanup

  This migration reduces the booking expiration window from 1 minute to 10 seconds
  to ensure that abandoned bookings are cleaned up almost immediately, preventing
  calendar blocking issues.

  1. Changes
    - Update expires_at default to 10 seconds for rental_bookings
    - Update expires_at default to 10 seconds for bookings
    - Force cleanup of any currently expired bookings
*/

-- Update default expiration for rental_bookings to 10 seconds
ALTER TABLE rental_bookings 
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '10 seconds');

-- Update default expiration for bookings to 10 seconds
ALTER TABLE bookings 
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '10 seconds');

-- Force cleanup of expired bookings
SELECT cleanup_expired_bookings();
