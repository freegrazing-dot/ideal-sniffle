/*
  # Reduce Booking Expiration to 1 Minute

  1. Changes
    - Change default expiration from 5 minutes to 1 minute
    - Dates will appear available almost immediately after abandoning cart

  2. Purpose
    - Minimize time that dates appear blocked when user exits without booking
    - Better user experience for real-time availability
*/

-- Update default expiration to 1 minute for rental_bookings
ALTER TABLE rental_bookings 
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 minute');

-- Update default expiration to 1 minute for bookings
ALTER TABLE bookings 
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 minute');
