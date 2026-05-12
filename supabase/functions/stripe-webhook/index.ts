import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(
  Deno.env.get('STRIPE_SECRET_KEY')!,
  {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  }
);

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const resendKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// TESTING EMAILS
const TEST_EMAIL = 'freegrazing@gmail.com';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

async function sendEmail(payload: {
  subject: string;
  html: string;
  text: string;
}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: [TEST_EMAIL],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  const result = await response.text();
  console.log('EMAIL RESULT:', result);

  if (!response.ok) {
    console.error('EMAIL FAILED:', result);
  }
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
    console.error('Invalid webhook signature:', err);
    return jsonResponse({ error: 'Invalid webhook signature' }, 400);
  }

  try {
    console.log('WEBHOOK EVENT:', event.type);

    if (event.type !== 'checkout.session.completed') {
      return jsonResponse({ ignored: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    console.log('SESSION:', session.id);

    if (session.payment_status !== 'paid') {
      return jsonResponse({ skipped: 'Session not paid' });
    }

    const customerEmail =
      session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.customer_email ||
      'Unknown';

    const customerName =
      session.customer_details?.name ||
      session.metadata?.customer_name ||
      'Customer';

    const cartItems = session.metadata?.cart_items || 'No cart items';

    const taxAmount = Number(session.total_details?.amount_tax || 0) / 100;

    console.log('TAX AMOUNT FROM STRIPE:', {
      sessionId: session.id,
      taxAmount,
      amountTotal: Number(session.amount_total || 0) / 100,
    });

    if (taxAmount > 0) {
      const { error: taxInsertError } = await supabase
        .from('tax_reports')
        .insert({
          booking_id: crypto.randomUUID(),
          tax_amount: taxAmount,
        });

      if (taxInsertError) {
        console.error('TAX REPORT INSERT ERROR:', taxInsertError);
      } else {
        console.log('TAX REPORT INSERTED:', taxAmount);
      }
    } else {
      console.log('NO TAX TO INSERT');
    }

    await sendEmail({
      subject: 'TKAC TEST ORDER RECEIVED',
      text: `
Customer:
${customerName}

Email:
${customerEmail}

Cart:
${cartItems}
      `,
      html: `
        <h1>TKAC TEST ORDER</h1>

        <p>
          <strong>Customer:</strong>
          ${customerName}
        </p>

        <p>
          <strong>Email:</strong>
          ${customerEmail}
        </p>

        <p>
          <strong>Tax Collected:</strong>
          $${taxAmount.toFixed(2)}
        </p>

        <pre>${cartItems}</pre>
      `,
    });

    return jsonResponse({
      received: true,
      session: session.id,
      taxAmount,
    });
  } catch (err: any) {
    console.error('WEBHOOK ERROR:', err);

    return jsonResponse(
      {
        error: err?.message || 'Webhook failed',
      },
      500
    );
  }
});