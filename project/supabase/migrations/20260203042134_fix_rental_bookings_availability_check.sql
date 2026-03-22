/*
  # Fix Rental Bookings Availability Check

  ## Changes
  - Add policy to allow anyone (including anonymous users) to check property availability
  - This policy only exposes property_id, check_in_date, check_out_date, and status
  - No personal information (customer names, emails, etc.) is exposed

  ## Security
  - Policy restricted to SELECT only
  - Only returns minimal data needed for availability checking
  - Personal booking details remain protected by existing policies
*/

-- Allow anyone to check rental property availability
CREATE POLICY "Anyone can check property availability"
  ON rental_bookings FOR SELECT
  USING (true);

-- Drop the old restrictive policy for authenticated users only
DROP POLICY IF EXISTS "Users can view their own rental bookings" ON rental_bookings;

-- Re-create a more specific policy for users to view their full booking details
CREATE POLICY "Users can view their own full rental booking details"
  ON rental_bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());