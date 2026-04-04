/*
  # Add Tax Tracking Fields

  This migration adds detailed tax tracking fields to bookings and rental_bookings tables
  to properly account for state sales tax, lodging tax, and surtax collections.

  ## Tax Rates
  - Lodging (vacation rentals): 6.5% state sales tax + 5% lodging tax = 11.5% total
  - Jet ski rentals: 6.5% sales tax + 0.5% surtax = 7% total

  ## New Fields for `bookings` (Jet Ski Rentals)
  - `subtotal` - Pre-tax amount
  - `sales_tax` - 6.5% state sales tax
  - `surtax` - 0.5% local surtax
  - `tax_total` - Total tax collected (sales_tax + surtax)

  ## New Fields for `rental_bookings` (Vacation Rentals)
  - `subtotal` - Pre-tax amount (room rate + cleaning fee)
  - `sales_tax` - 6.5% state sales tax on lodging
  - `lodging_tax` - 5% lodging tax
  - `tax_total` - Total tax collected (sales_tax + lodging_tax)

  ## Notes
  - Existing records will have NULL values for new fields
  - Future bookings must populate these fields for accurate tax reporting
  - These fields enable compliance reporting for state and county tax authorities
*/

-- Add tax tracking fields to bookings table (jet ski rentals)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE bookings ADD COLUMN subtotal numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'sales_tax'
  ) THEN
    ALTER TABLE bookings ADD COLUMN sales_tax numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'surtax'
  ) THEN
    ALTER TABLE bookings ADD COLUMN surtax numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'tax_total'
  ) THEN
    ALTER TABLE bookings ADD COLUMN tax_total numeric DEFAULT 0;
  END IF;
END $$;

-- Add tax tracking fields to rental_bookings table (vacation rentals)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE rental_bookings ADD COLUMN subtotal numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'sales_tax'
  ) THEN
    ALTER TABLE rental_bookings ADD COLUMN sales_tax numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'lodging_tax'
  ) THEN
    ALTER TABLE rental_bookings ADD COLUMN lodging_tax numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_bookings' AND column_name = 'tax_total'
  ) THEN
    ALTER TABLE rental_bookings ADD COLUMN tax_total numeric DEFAULT 0;
  END IF;
END $$;

-- Create tax reporting view for easy analysis
CREATE OR REPLACE VIEW tax_report AS
SELECT
  'jet_ski' as booking_type,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as booking_count,
  COALESCE(SUM(subtotal), 0) as total_subtotal,
  COALESCE(SUM(sales_tax), 0) as total_sales_tax,
  COALESCE(SUM(surtax), 0) as total_surtax,
  0 as total_lodging_tax,
  COALESCE(SUM(tax_total), 0) as total_tax_collected
FROM bookings
WHERE payment_status = 'paid'
GROUP BY DATE_TRUNC('month', created_at)

UNION ALL

SELECT
  'vacation_rental' as booking_type,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as booking_count,
  COALESCE(SUM(subtotal), 0) as total_subtotal,
  COALESCE(SUM(sales_tax), 0) as total_sales_tax,
  0 as total_surtax,
  COALESCE(SUM(lodging_tax), 0) as total_lodging_tax,
  COALESCE(SUM(tax_total), 0) as total_tax_collected
FROM rental_bookings
WHERE payment_status = 'paid'
GROUP BY DATE_TRUNC('month', created_at);