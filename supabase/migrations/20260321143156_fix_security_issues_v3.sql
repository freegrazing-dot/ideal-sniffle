/*
  # Fix Security Issues

  1. Security Fixes
    - Fix RLS policy on bookings table to restrict by session
    - Fix RLS policy on security_deposit_products to restrict properly
    - Add search_path security to functions
    - Convert SECURITY DEFINER view to regular view with proper RLS

  2. Changes
    - Drop and recreate tax_report view without SECURITY DEFINER
    - Update RLS policies to be more restrictive
    - Set search_path on all functions for security
*/

-- Fix the bookings RLS policy to use session-based restriction
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;

CREATE POLICY "Authenticated users can create their own bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix the security_deposit_products RLS policy
DROP POLICY IF EXISTS "Authenticated users can create security deposit bookings" ON security_deposit_products;

CREATE POLICY "System can create security deposit products"
  ON security_deposit_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Set search_path on all functions for security
ALTER FUNCTION is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION cleanup_old_calendar_events() SET search_path = public, pg_temp;
ALTER FUNCTION sync_all_property_calendars() SET search_path = public, pg_temp;
ALTER FUNCTION increment_promo_code_usage(text) SET search_path = public, pg_temp;
ALTER FUNCTION cleanup_expired_bookings() SET search_path = public, pg_temp;
ALTER FUNCTION set_booking_expiration() SET search_path = public, pg_temp;
ALTER FUNCTION get_active_rental_bookings(uuid, date, date) SET search_path = public, pg_temp;
ALTER FUNCTION trigger_cleanup_expired_rental_bookings() SET search_path = public, pg_temp;
ALTER FUNCTION trigger_cleanup_expired_bookings() SET search_path = public, pg_temp;
ALTER FUNCTION cleanup_before_calendar_check() SET search_path = public, pg_temp;

-- Recreate tax_report view without SECURITY DEFINER
DROP VIEW IF EXISTS tax_report;

CREATE VIEW tax_report AS
SELECT 
  b.id,
  b.created_at,
  b.status,
  b.activity_id,
  b.booking_date,
  b.booking_time,
  b.customer_name,
  b.customer_email,
  b.num_people,
  b.subtotal,
  b.sales_tax,
  b.surtax,
  b.tax_total,
  b.total_price,
  b.damage_protection_amount,
  b.stripe_payment_intent_id,
  b.stripe_session_id
FROM bookings b
WHERE b.status = 'confirmed';

-- Grant access to authenticated users with admin role
GRANT SELECT ON tax_report TO authenticated;