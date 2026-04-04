import { supabase } from './supabase';
import type { Property, PropertyPricingRule } from '../types';

export async function calculateRentalPrice(
  property: Property,
  checkInDate: string,
  checkOutDate: string
): Promise<{ totalPrice: number; nightlyBreakdown: { date: string; price: number }[]; cleaningFee: number; subtotal: number }> {
  const checkIn = new Date(checkInDate + 'T00:00:00');
  const checkOut = new Date(checkOutDate + 'T00:00:00');

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  if (nights <= 0) {
    throw new Error('Check-out date must be after check-in date');
  }

  const { data: pricingRules, error } = await supabase
    .from('property_pricing_rules')
    .select('*')
    .eq('property_id', property.id)
    .eq('active', true);

  if (error) {
    console.error('Error fetching pricing rules:', error);
  }

  const nightlyBreakdown: { date: string; price: number }[] = [];
  let subtotal = 0;

  for (let i = 0; i < nights; i++) {
    const currentDate = new Date(checkInDate + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + i);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let nightPrice = property.price_per_night;

    if (pricingRules && pricingRules.length > 0) {
      const applicableRule = pricingRules.find(
        (rule: PropertyPricingRule) => dateStr >= rule.start_date && dateStr <= rule.end_date
      );

      if (applicableRule) {
        nightPrice = applicableRule.price_per_night;
      }
    }

    nightlyBreakdown.push({ date: dateStr, price: nightPrice });
    subtotal += nightPrice;
  }

  const cleaningFee = property.cleaning_fee || 0;
  const totalPrice = subtotal + cleaningFee;

  return { totalPrice, nightlyBreakdown, cleaningFee, subtotal };
}

export async function checkAvailability(
  propertyId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<boolean> {
  const requestedCheckIn = new Date(checkInDate + 'T00:00:00');
  const requestedCheckOut = new Date(checkOutDate + 'T00:00:00');

  // Trigger cleanup of expired bookings
  try {
    await supabase.rpc('cleanup_expired_bookings');
  } catch (err) {
    console.error('Cleanup error:', err);
  }

  // Check rental bookings
  const { data: existingBookings, error } = await supabase
    .from('rental_bookings')
    .select('id, check_in_date, check_out_date')
    .eq('property_id', propertyId)
    .in('status', ['pending', 'confirmed']);

  if (error) {
    console.error('Error checking availability:', error);
    return false;
  }

  if (existingBookings && existingBookings.length > 0) {
    for (const booking of existingBookings) {
      const bookingCheckIn = new Date(booking.check_in_date + 'T00:00:00');
      const bookingCheckOut = new Date(booking.check_out_date + 'T00:00:00');

      if (requestedCheckIn < bookingCheckOut && requestedCheckOut > bookingCheckIn) {
        return false;
      }
    }
  }

  // Check external calendar events (Airbnb, etc.)
  const { data: externalEvents, error: externalError } = await supabase
    .from('external_calendar_events')
    .select('id, start_date, end_date')
    .eq('property_id', propertyId);

  if (externalError) {
    console.error('Error checking external events:', externalError);
    return false;
  }

  if (externalEvents && externalEvents.length > 0) {
    for (const event of externalEvents) {
      const eventStart = new Date(event.start_date + 'T00:00:00');
      const eventEnd = new Date(event.end_date + 'T00:00:00');

      if (requestedCheckIn < eventEnd && requestedCheckOut > eventStart) {
        return false;
      }
    }
  }

  return true;
}
