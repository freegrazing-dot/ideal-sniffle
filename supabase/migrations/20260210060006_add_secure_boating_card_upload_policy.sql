/*
  # Add Secure Boating Card Upload Policy

  1. Changes
    - Drop the overly permissive policy
    - Note: The upload functionality uses the service role via a secure edge function
    - The frontend will call an edge function which has proper authentication
    
  2. Security
    - No direct client updates allowed
    - All updates go through authenticated edge function
*/

DROP POLICY IF EXISTS "Users can upload boating card to their booking" ON bookings;
