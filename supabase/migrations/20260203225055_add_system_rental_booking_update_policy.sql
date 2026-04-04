/*
  # Add system policy for rental booking payment confirmation

  1. Changes
    - Add policy to allow payment confirmation updates on rental_bookings
    - This ensures the verify-payment edge function can update bookings after successful payment
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rental_bookings' 
    AND policyname = 'System can confirm rental booking payments'
  ) THEN
    CREATE POLICY "System can confirm rental booking payments"
      ON rental_bookings
      FOR UPDATE
      TO authenticated
      USING (payment_status = 'pending')
      WITH CHECK (payment_status = 'paid' AND status = 'confirmed');
  END IF;
END $$;
