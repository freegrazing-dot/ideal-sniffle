import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
);

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const RENTAL_ADMIN_EMAIL = 'tkacvacations@gmail.com';
const ACTIVITY_ADMIN_EMAIL = 'tkacadventures@gmail.com';

type CartItem = {
  type?: string;
  item_type?: string;
  property_id?: string;
  activity_id?: string;
  title?: string;
  name?: string;
  check_in_date?: string;
  check_out_date?: string;
  checkIn?: string;
  checkOut?: string;
  booking_date?: string;
  date?: string;
  guests?: number;
  quantity?: number;
  customer_name?: string;
  customer_email?: string;
  price?: number;
  total?: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseCartItems(metadata: Stripe.Metadata | null | undefined): CartItem[] {
  if (!metadata) return [];

  const raw =
    metadata.cart_items ||
    metadata.items ||
    metadata.cart ||
    metadata.order_items ||
    metadata.booking_items;

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    console.error('Could not parse Stripe metadata cart items:', raw);
    return [];
  }
}

function getCustomerEmail(session: Stripe.Checkout.Session): string | null {
  return (
    session.customer_details?.email ||
    session.customer_email ||
    session.metadata?.customer_email ||
    null
  );
}

function getCustomerName(session: Stripe.Checkout.Session): string {
  return (
    session.customer_details?.name ||
    session.metadata?.customer_name ||
    'Customer'
  );
}

async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'TKAC Vacations <onboarding@resend.dev>';

  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend email failed:', err);
    }

    return;
  }

  const { error } = await supabaseAdmin.functions.invoke('send-booking-email', {
    body: payload,
  });

  if (error) {
    console.error('send-booking-email invoke failed:', error);
  }
}

async function createRentalBooking(item: CartItem, session: Stripe.Checkout.Session) {
  const customerEmail = getCustomerEmail(session);
  const customerName = getCustomerName(session);

  const booking = {
    property_id: item.property_id,
    customer_name: customerName,
    customer_email: customerEmail,
    check_in_date: item.check_in_date || item.checkIn,
    check_out_date: item.check_out_date || item.checkOut,
    guests: item.guests || item.quantity || 1,
    status: 'confirmed',
    stripe_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null,
    total_amount: session.amount_total ? session.amount_total / 100 : item.total || item.price || 0,
  };

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert(booking)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createActivityBooking(item: CartItem, session: Stripe.Checkout.Session) {
  const customerEmail = getCustomerEmail(session);
  const customerName = getCustomerName(session);

  const booking = {
    activity_id: item.activity_id,
    customer_name: customerName,
    customer_email: customerEmail,
    booking_date: item.booking_date || item.date,
    guests: item.guests || item.quantity || 1,
    status: 'confirmed',
    stripe_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null,
    total_amount: item.total || item.price || 0,
  };

  const { data, error } = await supabaseAdmin
    .from('activity_bookings')
    .insert(booking)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function alreadyProcessed(sessionId: string) {
  const rentalCheck = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .limit(1);

  const activityCheck = await supabaseAdmin
    .from('activity_bookings')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .limit(1);

  return Boolean(
    rentalCheck.data?.length ||
      activityCheck.data?.length
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return jsonResponse({ error: 'Missing Stripe signature' }, 400);
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();

    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return jsonResponse({ error: 'Invalid webhook signature' }, 400);
  }

  try {
    if (event.type !== 'checkout.session.completed') {
      return jsonResponse({ received: true, ignored: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== 'paid') {
      return jsonResponse({
        received: true,
        skipped: 'Checkout session not paid',
      });
    }

    if (await alreadyProcessed(session.id)) {
      return jsonResponse({
        received: true,
        skipped: 'Session already processed',
      });
    }

    const cartItems = parseCartItems(session.metadata);

    if (!cartItems.length) {
      console.error('No cart items found in Stripe metadata:', session.metadata);
      return jsonResponse({ error: 'No cart items in metadata' }, 400);
    }

    const customerEmail = getCustomerEmail(session);
    const customerName = getCustomerName(session);

    const createdRentals = [];
    const createdActivities = [];

    for (const item of cartItems) {
      const type = (item.type || item.item_type || '').toLowerCase();

      if (type.includes('rental') || type.includes('property') || item.property_id) {
        const rental = await createRentalBooking(item, session);
        createdRentals.push({ item, booking: rental });
      } else if (type.includes('activity') || item.activity_id) {
        const activity = await createActivityBooking(item, session);
        createdActivities.push({ item, booking: activity });
      } else {
        console.warn('Unknown cart item type, skipped:', item);
      }
    }

    if (createdRentals.length) {
      await sendEmail({
        to: RENTAL_ADMIN_EMAIL,
        subject: 'New TKAC Rental Booking',
        text: `A rental booking was paid and confirmed for ${customerName}. Customer email: ${customerEmail || 'none'}. Stripe session: ${session.id}`,
        html: `
          <h2>New Rental Booking</h2>
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Email:</strong> ${customerEmail || 'None provided'}</p>
          <p><strong>Stripe Session:</strong> ${session.id}</p>
          <pre>${JSON.stringify(createdRentals, null, 2)}</pre>
        `,
      });
    }

    if (createdActivities.length) {
      await sendEmail({
        to: ACTIVITY_ADMIN_EMAIL,
        subject: 'New TKAC Activity Booking',
        text: `An activity booking was paid and confirmed for ${customerName}. Customer email: ${customerEmail || 'none'}. Stripe session: ${session.id}`,
        html: `
          <h2>New Activity Booking</h2>
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Email:</strong> ${customerEmail || 'None provided'}</p>
          <p><strong>Stripe Session:</strong> ${session.id}</p>
          <pre>${JSON.stringify(createdActivities, null, 2)}</pre>
        `,
      });
    }

    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: 'Your TKAC Booking Is Confirmed',
        text: `Hi ${customerName}, your TKAC booking is confirmed. Thank you!`,
        html: `
          <h2>Your TKAC Booking Is Confirmed</h2>
          <p>Hi ${customerName},</p>
          <p>Thank you — your payment was received and your booking is confirmed.</p>
          <p><strong>Rental bookings:</strong> ${createdRentals.length}</p>
          <p><strong>Activity bookings:</strong> ${createdActivities.length}</p>
          <p>We’ll follow up with any details you need before your reservation.</p>
        `,
      });
    }

    return jsonResponse({
      received: true,
      created_rentals: createdRentals.length,
      created_activities: createdActivities.length,
    });
  } catch (err) {
    console.error('Stripe webhook processing failed:', err);
    return jsonResponse(
      {
        error: 'Webhook processing failed',
        details: String(err?.message || err),
      },
      500
    );
  }
});