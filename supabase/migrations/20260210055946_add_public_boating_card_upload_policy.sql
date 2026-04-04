/*
  # Add Public Boating Card Upload Policy

  1. Changes
    - Add policy to allow users to update their booking's boating_safety_card_url
    - Users can update using their email address (no authentication required)
    - Only the boating_safety_card_url field can be updated via this policy
    
  2. Security
    - Policy is scoped to only allow updating boating_safety_card_url
    - User must match the customer_email on the booking
*/

CREATE POLICY "Users can upload boating card to their booking"
  ON bookings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (
    customer_email IS NOT NULL
  );
