import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, bookingReference, cardUrl } = await req.json();

    if (!cardUrl) {
      throw new Error('Card URL is required');
    }

    if (!email && !bookingReference) {
      throw new Error('Email or booking reference is required');
    }

    let booking;

    if (bookingReference) {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingReference)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching booking by reference:', fetchError);
        throw new Error('Failed to find booking');
      }

      if (!data) {
        throw new Error('Booking not found');
      }

      booking = data;
    } else {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_email', email.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching booking by email:', fetchError);
        throw new Error('Failed to find booking');
      }

      if (!data) {
        throw new Error('No booking found with this email');
      }

      booking = data;
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ boating_safety_card_url: cardUrl })
      .eq('id', booking.id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw new Error('Failed to update booking');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Boating safety card uploaded successfully',
        bookingId: booking.id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in upload-boating-card function:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
