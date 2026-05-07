import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';

const stripeSecret =
  Deno.env.get('STRIPE_SECRET_KEY');

const resendKey =
  Deno.env.get('RESEND_API_KEY');

const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      appInfo: {
        name: 'TKAC Verify Payment',
        version: '1.0.0',
      },
    })
  : null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(
  session: Stripe.Checkout.Session
) {
  if (!resendKey) {
    console.error(
      'Missing RESEND_API_KEY'
    );

    return;
  }

  const customerEmail =
    session.customer_details
      ?.email ||
    session.customer_email ||
    session.metadata
      ?.customer_email ||
    'freegrazing@gmail.com';

  const customerName =
    session.customer_details
      ?.name ||
    session.metadata
      ?.customer_name ||
    'Customer';

  const cartItems =
    session.metadata
      ?.cart_items ||
    'No cart items';

  // CUSTOMER EMAIL
  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        from:
          'onboarding@resend.dev',

        to: [
          'freegrazing@gmail.com',
        ],

        subject:
          'TKAC Order Confirmation',

        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px;">

            <h1 style="color:#0f172a;">
              Thank You For Your Order
            </h1>

            <p>
              Hi ${customerName},
            </p>

            <p>
              Your payment has been received successfully.
            </p>

            <div style="background:#f8fafc; padding:16px; border-radius:12px; margin-top:20px;">

              <h2 style="margin-top:0;">
                Order Details
              </h2>

              <p>
                <strong>Email:</strong>
                ${customerEmail}
              </p>

              <p>
                <strong>Session ID:</strong>
                ${session.id}
              </p>

            </div>

            <p style="margin-top:30px;">
              Thank you for choosing TKAC Vacations.
            </p>

          </div>
        `,

        text: `
Thank you for your order.

Customer:
${customerName}

Email:
${customerEmail}

Session:
${session.id}
        `,
      }),
    }
  );

  const result =
    await response.text();

  // ADMIN EMAIL
  await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify({
        from:
          'onboarding@resend.dev',

        to: [
          'freegrazing@gmail.com',
        ],

        subject:
          'NEW TKAC ORDER',

        html: `
          <h1>
            New Order Received
          </h1>

          <p>
            <strong>Customer:</strong>
            ${customerName}
          </p>

          <p>
            <strong>Email:</strong>
            ${customerEmail}
          </p>

          <pre>
${cartItems}
          </pre>
        `,
      }),
    }
  );

  console.log(
    'EMAIL RESULT:',
    result
  );

  if (!response.ok) {
    console.error(
      'EMAIL FAILED:',
      result
    );
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error:
            'Method not allowed',
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    if (!stripe) {
      return new Response(
        JSON.stringify({
          error:
            'Stripe not configured',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    const body =
      await req.json();

    const sessionId =
      body?.sessionId;

    console.log(
      'VERIFY SESSION:',
      sessionId
    );

    if (!sessionId) {
      return new Response(
        JSON.stringify({
          error:
            'Missing sessionId',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    const session =
      await stripe.checkout.sessions.retrieve(
        sessionId
      );

    console.log(
      'SESSION STATUS:',
      {
        id: session.id,
        payment_status:
          session.payment_status,
      }
    );

    if (
      session.payment_status !==
      'paid'
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Payment not completed',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    await sendEmail(session);

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error(
      'VERIFY PAYMENT ERROR:',
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          'Verify payment failed',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    );
  }
});