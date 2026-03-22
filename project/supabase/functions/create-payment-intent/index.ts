import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('[create-payment-intent] STRIPE_SECRET_KEY present:', !!stripeSecret);

if (!stripeSecret) {
  console.error('[create-payment-intent] STRIPE_SECRET_KEY is not configured');
}

const stripe = stripeSecret ? new Stripe(stripeSecret, {
  appInfo: {
    name: 'TKAC Adventures Cart',
    version: '1.0.0',
  },
}) : null;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CartItem {
  type: 'activity' | 'property';
  activity?: {
    id: string;
    name: string;
  };
  property?: {
    id: string;
    name: string;
  };
  bookingDate?: string;
  bookingTime?: string;
  numPeople?: number;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number;
  price: number;
  specialRequests?: string;
  phoneNumber?: string;
  damageProtection?: 'insurance' | 'hold';
  damageProtectionAmount?: number;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!stripe) {
      console.error('[create-payment-intent] Stripe not initialized - missing secret key');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured. Please contact support.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const {
      items,
      customerEmail,
      customerName,
      lodgingTax,
      salesTax,
      operatorDob,
      boatingSafetyCardUrl,
      acknowledgments,
      promoCode,
      promoDiscount
    } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid items' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const bookingIds: string[] = [];

    for (const item of items) {
      if (item.type === 'activity' && item.activity) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            activity_id: item.activity.id,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: item.phoneNumber || '',
            booking_date: item.bookingDate || '',
            booking_time: item.bookingTime || '',
            num_people: item.numPeople || 1,
            total_price: item.price,
            special_requests: item.specialRequests || '',
            payment_status: 'pending',
            status: 'pending',
            operator_dob: operatorDob || null,
            boating_safety_card_url: boatingSafetyCardUrl || null,
            acknowledgments: acknowledgments || null,
            damage_protection_type: item.damageProtection || null,
            damage_protection_amount: item.damageProtectionAmount || null,
            expires_at: expiresAt.toISOString(),
          })
          .select('id')
          .single();

        if (bookingError) {
          console.error('Activity booking creation error:', bookingError);
          throw new Error('Failed to create activity booking');
        }

        bookingIds.push(bookingData.id);
      } else if (item.type === 'property' && item.property) {
        const checkIn = new Date(item.checkInDate || '');
        const checkOut = new Date(item.checkOutDate || '');
        const totalNights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        const { data: rentalData, error: rentalError } = await supabase
          .from('rental_bookings')
          .insert({
            property_id: item.property.id,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: item.phoneNumber || '',
            check_in_date: item.checkInDate || '',
            check_out_date: item.checkOutDate || '',
            guests: Math.max(1, item.guests || 1),
            total_nights: totalNights,
            total_price: item.price,
            special_requests: item.specialRequests || '',
            payment_status: 'pending',
            status: 'pending',
            expires_at: expiresAt.toISOString(),
          })
          .select('id')
          .single();

        if (rentalError) {
          console.error('Property booking creation error:', rentalError);
          throw new Error('Failed to create property booking');
        }

        bookingIds.push(rentalData.id);
      }
    }

    const lineItems = items.map((item: CartItem) => {
      let description = '';
      let name = '';

      if (item.type === 'activity' && item.activity) {
        name = item.activity.name;
        description = `${item.bookingDate} at ${item.bookingTime} - ${item.numPeople} ${item.numPeople === 1 ? 'person' : 'people'}`;
      } else if (item.type === 'property' && item.property) {
        name = item.property.name;
        description = `${item.checkInDate} to ${item.checkOutDate} - ${item.guests} ${item.guests === 1 ? 'guest' : 'guests'}`;
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name,
            description,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: 1,
      };
    });

    if (salesTax && salesTax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Sales Tax (6.5%)',
            description: 'State sales tax',
          },
          unit_amount: Math.round(salesTax * 100),
        },
        quantity: 1,
      });
    }

    if (lodgingTax && lodgingTax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Lodging Tax (11.5%)',
            description: 'State lodging tax',
          },
          unit_amount: Math.round(lodgingTax * 100),
        },
        quantity: 1,
      });
    }

    const hasPropertyRental = items.some((item: CartItem) => item.type === 'property');

    const siteUrl = Deno.env.get('VITE_SITE_URL');
    const origin = siteUrl || req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'http://localhost:5173';
    console.log('[create-payment-intent] Site URL:', siteUrl, 'Using origin:', origin);

    const hasActivityBooking = items.some((item: CartItem) => item.type === 'activity');
    const bookingType = hasPropertyRental ? 'rental' : (hasActivityBooking ? 'activity' : 'activity');

    let stripeCoupon = null;
    console.log('[create-payment-intent] Promo code received:', { promoCode, promoDiscount });

    if (promoCode && promoDiscount && promoDiscount > 0) {
      try {
        stripeCoupon = await stripe.coupons.create({
          percent_off: promoDiscount,
          duration: 'once',
          name: `${promoCode} - ${promoDiscount}% off`,
        });
        console.log('[create-payment-intent] Created Stripe coupon:', stripeCoupon.id, 'with', promoDiscount, '% off');
      } catch (err) {
        console.error('[create-payment-intent] Failed to create Stripe coupon:', err);
      }
    } else {
      console.log('[create-payment-intent] No promo code to apply');
    }

    const successUrl = promoCode
      ? `${origin}/success?session_id={CHECKOUT_SESSION_ID}&promo=${encodeURIComponent(promoCode)}`
      : `${origin}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = promoCode
      ? `${origin}?promo=${encodeURIComponent(promoCode)}`
      : `${origin}`;

    const sessionConfig: any = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        booking_ids: bookingIds.join(','),
        booking_type: bookingType,
        has_property_rental: hasPropertyRental.toString(),
        promo_code: promoCode || '',
      },
    };

    if (stripeCoupon) {
      sessionConfig.discounts = [{
        coupon: stripeCoupon.id,
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('[create-payment-intent] Created session:', session.id, 'Success URL:', session.success_url);

    // Note: Promo code usage is incremented in the webhook AFTER successful payment
    // This prevents incrementing usage for abandoned checkouts

    let depositPaymentIntentId = null;

    if (hasPropertyRental) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 50000,
        currency: 'usd',
        description: 'Security Deposit Authorization (Hold)',
        capture_method: 'manual',
        metadata: {
          booking_ids: bookingIds.join(','),
          type: 'security_deposit',
          customer_email: customerEmail,
        },
      });

      depositPaymentIntentId = paymentIntent.id;
      console.log('[create-payment-intent] Created deposit authorization:', depositPaymentIntentId);

      const rentalBookingIds = bookingIds.filter((_, index) => items[index].type === 'property');
      for (const bookingId of rentalBookingIds) {
        await supabase
          .from('rental_bookings')
          .update({
            deposit_payment_intent_id: depositPaymentIntentId,
            deposit_status: 'authorized',
          })
          .eq('id', bookingId);
      }
    }

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
        depositPaymentIntentId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Payment intent error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
