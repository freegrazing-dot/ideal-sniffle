/*
  # Grant Public Access to Promo Code Functions

  ## Problem
  The promo code validation and increment functions may not be accessible
  to anonymous users on the production deployment.

  ## Solution
  Grant EXECUTE permissions to public (anon role) and authenticated users
  for both promo code functions.

  ## Changes
  1. Grant EXECUTE on validate_promo_code to anon and authenticated
  2. Grant EXECUTE on increment_promo_code_usage to anon and authenticated
*/

-- Grant access to validate_promo_code function
GRANT EXECUTE ON FUNCTION validate_promo_code(text, text) TO anon;
GRANT EXECUTE ON FUNCTION validate_promo_code(text, text) TO authenticated;

-- Grant access to increment_promo_code_usage function
GRANT EXECUTE ON FUNCTION increment_promo_code_usage(text) TO anon;
GRANT EXECUTE ON FUNCTION increment_promo_code_usage(text) TO authenticated;
