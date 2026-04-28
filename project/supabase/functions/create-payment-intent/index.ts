import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      appInfo: {
        name: 'TKAC Adventures Cart',
        version: '1.0.0',
      },
    })
  : null;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CartItem {
  id?: string;
  type: 'activity' | 'property' | 'merchandise' | 'security_deposit';
  activity?: {
    id: string;
    name?: string;
  };
  property?: {
    id: string;
    name?: string;
  };
  merchandiseName?: string;
  name?: string;
  propertyName?: string;
  quantity?: number;
  bookingDate?: string;
  bookingTime?: string;
  numPeople?: number;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number;
  price?: number;
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
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!stripe) {
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
      lodgingTax = 0,
      salesTax = 0,
      operatorDob,
      boatingSafetyCardUrl,
      acknowledgments,
      promoCode,
      promoDiscount,
    } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid items' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bookingIds: string[] = [];

    for (const item of items as CartItem[]) {
      if (item.type === 'activity' && item.activity?.id) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        const { data, error } = await supabase
          .from('bookings')
          .insert({
            activity_id: item.activity.id,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: item.phoneNumber || '',
            booking_date: item.bookingDate || '',
            booking_time: item.bookingTime || '',
            num_people: item.numPeople || 1,
            total_price: Number(item.price || 0),
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

        if (error) {
          console.error('Activity booking creation error:', error);
          throw new Error('Failed to create activity booking');
        }

        bookingIds.push(data.id);
      }

      if (item.type === 'property' && item.property?.id) {
        const checkIn = new Date(item.checkInDate || '');
        const checkOut = new Date(item.checkOutDate || '');
        const totalNights = Math.max(
          1,
          Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        );

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        const { data, error } = await supabase
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
            total_price: Number(item.price || 0),
            special_requests: item.specialRequests || '',
            payment_status: 'pending',
            status: 'pending',
            expires_at: expiresAt.toISOString(),
          })
          .select('id')
          .single();

        if (error) {
          console.error('Property booking creation error:', error);
          throw new Error('Failed to create property booking');
        }

        bookingIds.push(data.id);
      }
    }

    const lineItems = (items as CartItem[])
      .filter((item) => item.type !== 'security_deposit')
      .map((item) => {
        let name = 'TKAC Booking';
        let description = 'TKAC checkout item';

        if (item.type === 'activity') {
          name = item.activity?.name || item.name || 'Activity Booking';
          description = `${item.bookingDate || ''} ${item.bookingTime || ''} - ${item.numPeople || 1} people`;
        }

        if (item.type === 'property') {
          name = item.property?.name || item.name || 'Property Rental';
          description = `${item.checkInDate || ''} to ${item.checkOutDate || ''} - ${item.guests || 1} guests`;
        }

        if (item.type === 'merchandise') {
          name = item.merchandiseName || item.name || 'Merchandise';
          description = `Quantity: ${item.quantity || 1}`;
        }

        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name,
              description,
            },
            unit_amount: Math.max(50, Math.round(Number(item.price || 0) * 100)),
          },
          quantity: item.type === 'merchandise' ? item.quantity || 1 : 1,
        };
      });

    if (Number(salesTax) > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Sales Tax',
            description: 'Sales tax',
          },
          unit_amount: Math.round(Number(salesTax) * 100),
        },
        quantity: 1,
      });
    }

    if (Number(lodgingTax) > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Lodging Tax',
            description: 'Lodging tax',
          },
          unit_amount: Math.round(Number(lodgingTax) * 100),
        },
        quantity: 1,
      });
    }

    const hasPropertyRental = (items as CartItem[]).some((item) => item.type === 'property');
    const hasActivityBooking = (items as CartItem[]).some((item) => item.type === 'activity');
    const bookingType = hasPropertyRental ? 'rental' : hasActivityBooking ? 'activity' : 'merch';

    let stripeCoupon = null;

    if (promoCode && Number(promoDiscount) > 0) {
      stripeCoupon = await stripe.coupons.create({
        percent_off: Number(promoDiscount),
        duration: 'once',
        name: `${promoCode} - ${promoDiscount}% off`,
      });
    }

    const siteUrl = Deno.env.get('VITE_SITE_URL');
    const origin =
      siteUrl ||
      req.headers.get('origin') ||
      req.headers.get('referer')?.replace(/\/$/, '') ||
      'http://localhost:5173';

    const successUrl = `${origin}/success?session_id={CHECKOUT_SESSION_ID}${
      promoCode ? `&promo=${encodeURIComponent(promoCode)}` : ''
    }`;

    const cancelUrl = `${origin}${promoCode ? `?promo=${encodeURIComponent(promoCode)}` : ''}`;

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        booking_ids: bookingIds.join(','),
        booking_type: bookingType,
        has_property_rental: String(hasPropertyRental),
        promo_code: promoCode || '',
        promo_discount: promoDiscount ? String(promoDiscount) : '',
      },
    };

    if (stripeCoupon) {
      sessionConfig.discounts = [{ coupon: stripeCoupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    let depositPaymentIntentId = null;

    if (hasPropertyRental) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 50000,
        currency: 'usd',
        description: 'Security Deposit Authorization Hold',
        capture_method: 'manual',
        metadata: {
          booking_ids: bookingIds.join(','),
          type: 'security_deposit',
          customer_email: customerEmail,
        },
      });

      depositPaymentIntentId = paymentIntent.id;

      for (const bookingId of bookingIds) {
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
    return new Response(JSON.stringify({ error: error.message || 'Checkout failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});