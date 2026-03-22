import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');

if (!stripeSecret) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'TKAC Adventures Booking',
    version: '1.0.0',
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const body = await req.json();
    const bookingId = body.booking_id || body.bookingId;
    const bookingType = body.bookingType || 'activity';
    const customerEmail = body.customerEmail || body.customer_email;
    const amount = body.amount;
    const description = body.description || body.activity_name;
    const promoCode = body.promoCode || body.promo_code;

    if (!bookingId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tableName = bookingType === 'rental' ? 'rental_bookings' : 'bookings';

    const { data: booking, error: bookingError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const successUrl = promoCode
      ? `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}&promo=${encodeURIComponent(promoCode)}`
      : `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = promoCode
      ? `${req.headers.get('origin')}?promo=${encodeURIComponent(promoCode)}`
      : `${req.headers.get('origin')}`;

    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: description,
            description: `Booking for ${booking.customer_name}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ];

    const metadata: any = {
      booking_id: bookingId,
      booking_type: bookingType,
    };

    if (booking.damage_protection_type === 'hold') {
      metadata.damage_protection_type = 'hold';
      metadata.damage_protection_amount = '500';
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail || booking.customer_email,
      metadata,
      payment_intent_data: booking.damage_protection_type === 'hold' ? {
        capture_method: 'automatic',
        metadata,
      } : undefined,
    });

    const { error: updateSessionError } = await supabase
      .from(tableName)
      .update({ stripe_session_id: session.id })
      .eq('id', bookingId);

    if (updateSessionError) {
      console.error('Failed to update stripe_session_id:', updateSessionError);
    }

    return new Response(
      JSON.stringify({ sessionUrl: session.url, sessionId: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
