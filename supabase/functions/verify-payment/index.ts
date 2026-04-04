import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = stripeSecret ? new Stripe(stripeSecret, {
  appInfo: {
    name: 'TKAC Adventures Verify',
    version: '1.0.0',
  },
}) : null;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://tkacvacations.com',
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

    if (!stripe) {
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Retrieved session:', {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata
    });

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const bookingType = session.metadata?.booking_type || 'activity';
    const bookingId = session.metadata?.booking_id;
    const bookingIds = session.metadata?.booking_ids?.split(',') || [];

    console.log('Extracted metadata:', { bookingType, bookingId, bookingIds });

    if (!bookingId && bookingIds.length === 0) {
      console.error('No booking IDs found in session metadata');
      return new Response(
        JSON.stringify({ error: 'No bookings found for this payment' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tableName = bookingType === 'rental' ? 'rental_bookings' : 'bookings';
    const idsToUpdate = bookingId ? [bookingId] : bookingIds;

    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        payment_status: 'paid',
        status: 'confirmed',
      })
      .in('id', idsToUpdate);

    if (updateError) {
      console.error('Booking update error:', updateError);
      throw updateError;
    }

    let bookings;
    if (bookingType === 'rental') {
      const { data, error: fetchError } = await supabase
        .from('rental_bookings')
        .select('*, properties(name)')
        .in('id', idsToUpdate);

      if (fetchError) {
        console.error('Rental booking fetch error:', fetchError);
        throw fetchError;
      }
      bookings = data;
    } else {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select('*, activities(name)')
        .in('id', idsToUpdate);

      if (fetchError) {
        console.error('Booking fetch error:', fetchError);
        throw fetchError;
      }
      bookings = data;
    }

    return new Response(
      JSON.stringify({ bookings, success: true, bookingType }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
