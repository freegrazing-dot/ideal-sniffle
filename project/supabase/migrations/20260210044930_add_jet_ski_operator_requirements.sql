/*
  # Add Jet Ski Operator Requirements to Bookings

  1. Schema Changes
    - Add `operator_dob` (date) to bookings table for operator date of birth
    - Add `boating_safety_card_url` (text) to bookings table for document storage URL
    - Add `acknowledgments` (jsonb) to bookings table for storing required checkboxes

  2. Purpose
    - Support Florida boating law compliance
    - Store operator age verification
    - Store boating safety education card when required
    - Track customer acknowledgments of safety rules
*/

DO $$
BEGIN
  -- Add operator date of birth field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'operator_dob'
  ) THEN
    ALTER TABLE bookings ADD COLUMN operator_dob date;
  END IF;

  -- Add boating safety card URL field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'boating_safety_card_url'
  ) THEN
    ALTER TABLE bookings ADD COLUMN boating_safety_card_url text;
  END IF;

  -- Add acknowledgments field for storing checkbox confirmations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'acknowledgments'
  ) THEN
    ALTER TABLE bookings ADD COLUMN acknowledgments jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;