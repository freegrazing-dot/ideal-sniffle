import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const resendKey = Deno.env.get('RESEND_API_KEY');
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SUPPORT_PHONE_DISPLAY = '305-417-8829';
const SUPPORT_PHONE_LINK = '13054178829';
const SUPPORT_EMAIL = 'tkacvacations@gmail.com';
const WEBSITE_URL = 'https://www.tkacvacations.com';

function money(value: unknown): string {
  const num = Number(value || 0);
  return `$${num.toFixed(2)}`;
}

function safe(value: unknown, fallback = ''): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function formatAddress(address: any): string {
  if (!address) return 'Not provided';

  return [
    address.line1,
    address.line2,
    `${address.city || ''}, ${address.state || ''} ${address.postal_code || ''}`.trim(),
    address.country,
  ]
    .filter(Boolean)
    .join('<br>');
}

function getOrderType(session: Stripe.Checkout.Session): string {
  const type = session.metadata?.type || '';
  if (type === 'property') return 'Vacation Rental';
  if (type === 'activity') return 'Adventure / Activity';
  if (type === 'merchandise') return 'Merchandise';
  if (type === 'security_deposit') return 'Security Deposit';
  return 'TKAC Order';
}

function buildEmailShell(title: string, subtitle: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>

      <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, sans-serif; color:#0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 12px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:720px; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 6px 22px rgba(15,23,42,0.10);">
                <tr>
                  <td style="background:linear-gradient(135deg,#0f766e,#2563eb); padding:38px 28px; text-align:center; color:#ffffff;">
                    <div style="font-size:13px; letter-spacing:2px; text-transform:uppercase; opacity:.9;">
                      North Naples & Bonita Springs
                    </div>

                    <h1 style="margin:10px 0 0; font-size:32px; line-height:1.15;">
                      TKAC Vacations & Adventures
                    </h1>

                    <p style="margin:12px 0 0; font-size:16px; opacity:.94;">
                      ${subtitle}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:34px 32px 10px;">
                    <h2 style="margin:0; font-size:28px; color:#0f172a;">
                      ${title}
                    </h2>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 32px 34px; font-size:15px; line-height:1.7;">
                    ${content}
                  </td>
                </tr>

                <tr>
                  <td style="background:#f8fafc; padding:28px 30px; border-top:1px solid #e2e8f0; text-align:center;">
                    <p style="margin:0 0 10px; font-size:15px; font-weight:700; color:#334155;">
                      Need help with your order?
                    </p>

                    <p style="margin:6px 0; font-size:14px;">
                      Phone:
                      <a href="tel:${SUPPORT_PHONE_LINK}" style="color:#2563eb; text-decoration:none; font-weight:700;">
                        ${SUPPORT_PHONE_DISPLAY}
                      </a>
                    </p>

                    <p style="margin:6px 0; font-size:14px;">
                      Email:
                      <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb; text-decoration:none; font-weight:700;">
                        ${SUPPORT_EMAIL}
                      </a>
                    </p>

                    <p style="margin:6px 0; font-size:14px;">
                      Website:
                      <a href="${WEBSITE_URL}" style="color:#2563eb; text-decoration:none; font-weight:700;">
                        tkacvacations.com
                      </a>
                    </p>

                    <p style="margin:18px 0 0; font-size:12px; color:#64748b;">
                      © ${new Date().getFullYear()} TKAC Vacations & Adventures. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildStripeLineItemsHtml(lineItems: any): string {
  const rows = lineItems?.data || [];

  if (!rows.length) {
    return `
      <tr>
        <td colspan="2" style="padding:14px 12px; color:#64748b;">
          Order details were received. Itemized Stripe details were not available.
        </td>
      </tr>
    `;
  }

  return rows
    .map((item: any) => {
      const name = item.description || 'TKAC Item';
      const qty = Number(item.quantity || 1);
      const amount = Number(item.amount_total || 0) / 100;

      return `
        <tr>
          <td style="padding:14px 12px; border-bottom:1px solid #e2e8f0;">
            <div style="font-weight:700; color:#0f172a;">${name}</div>
            <div style="font-size:13px; color:#64748b; margin-top:4px;">Qty: ${qty}</div>
          </td>
          <td style="padding:14px 12px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:700; color:#0f172a;">
            ${money(amount)}
          </td>
        </tr>
      `;
    })
    .join('');
}

function infoCard(title: string, html: string, background = '#f8fafc'): string {
  return `
    <div style="background:${background}; padding:18px; border-radius:14px; margin:22px 0;">
      <h3 style="margin:0 0 12px; font-size:18px; color:#0f172a;">${title}</h3>
      ${html}
    </div>
  `;
}

async function sendEmail(session: Stripe.Checkout.Session) {
  if (!resendKey) {
    console.error('Missing RESEND_API_KEY');
    return;
  }

  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    session.metadata?.customer_email ||
    '';

  const customerName =
    session.customer_details?.name ||
    session.metadata?.customer_name ||
    'Customer';

  const customerPhone = session.customer_details?.phone || 'Not provided';

  const deliveryMethod =
    session.metadata?.delivery_method === 'ship'
      ? 'Ship my order'
      : 'Local pickup';

  const promoCode = session.metadata?.promo_code || '';
  const promoDiscount = session.metadata?.promo_discount || '0';

  const orderType = getOrderType(session);
  const shippingAddress = formatAddress(session.shipping_details?.address);
  const billingAddress = formatAddress(session.customer_details?.address);

  const totalPaid = session.amount_total ? session.amount_total / 100 : 0;
  const lineItemsHtml = buildStripeLineItemsHtml((session as any).line_items);
  const showShippingAddress = session.metadata?.delivery_method === 'ship';

  const rentalCard =
    session.metadata?.type === 'property'
      ? infoCard(
          'Rental Information',
          `
            <p style="margin:6px 0;"><strong>Check-in:</strong> 4:00 PM</p>
            <p style="margin:6px 0;"><strong>Check-out:</strong> 11:00 AM</p>
            <p style="margin:6px 0;"><strong>Primary renter minimum age:</strong> 21</p>
            <p style="margin:6px 0;"><strong>Maximum overnight guests:</strong> 10</p>
            <p style="margin:12px 0 0; color:#475569;">
              Detailed check-in instructions will be provided before arrival.
            </p>
          `
        )
      : '';

  const activityCard =
    session.metadata?.type === 'activity'
      ? infoCard(
          'Adventure Information',
          `
            <p style="margin:6px 0;"><strong>Arrival instructions:</strong> We’ll contact you with event-specific arrival details.</p>
            <p style="margin:6px 0;"><strong>Weather:</strong> Activities are weather permitting.</p>
            <p style="margin:6px 0;"><strong>Reminder:</strong> Please bring valid photo ID and arrive ready for the water.</p>
          `
        )
      : '';

  const deliveryCard = infoCard(
    'Delivery Details',
    `
      <p style="margin:6px 0;"><strong>Method:</strong> ${deliveryMethod}</p>
      ${
        showShippingAddress
          ? `<p style="margin:10px 0 0;"><strong>Shipping Address:</strong><br>${shippingAddress}</p>`
          : `<p style="margin:10px 0 0;"><strong>Pickup:</strong> Local pickup selected. We’ll contact you with pickup details.</p>`
      }
    `
  );

  const promoCard = promoCode
    ? infoCard(
        'Promo Applied',
        `<p style="margin:0;"><strong>${promoCode}</strong> — ${promoDiscount}% off eligible items.</p>`,
        '#f0fdf4'
      )
    : '';

  const customerHtml = buildEmailShell(
    'Your Order Is Confirmed',
    'Thanks for choosing TKAC',
    `
      <p style="font-size:16px; margin-top:0;">Hi ${customerName},</p>

      <p>
        Your payment was received successfully. We’ll review your order and follow up if anything else is needed.
      </p>

      <div style="background:#ecfdf5; border-left:5px solid #10b981; padding:18px; border-radius:14px; margin:22px 0;">
        <div style="font-weight:800; color:#065f46; font-size:18px;">Payment Confirmed</div>
        <p style="margin:8px 0 0; color:#065f46;">Total paid: <strong>${money(totalPaid)}</strong></p>
      </div>

      ${infoCard(
        'Order Summary',
        `
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${lineItemsHtml}
            <tr>
              <td style="padding:16px 12px; text-align:right; font-weight:700;">Total Paid</td>
              <td style="padding:16px 12px; text-align:right; font-weight:800; color:#059669;">${money(totalPaid)}</td>
            </tr>
          </table>
        `
      )}

      ${deliveryCard}
      ${rentalCard}
      ${activityCard}
      ${promoCard}

      <p style="font-size:13px; color:#64748b; margin-top:24px;">
        Order type: ${orderType}<br>
        Order ID: ${session.id}
      </p>
    `
  );

  const adminHtml = buildEmailShell(
    'New TKAC Order Received',
    'Admin fulfillment notification',
    `
      <div style="background:#fef3c7; border-left:5px solid #f59e0b; padding:18px; border-radius:14px; margin-bottom:22px;">
        <div style="font-weight:800; color:#92400e; font-size:18px;">Fulfillment Needed</div>
        <p style="margin:8px 0 0; color:#78350f;">Review the order, customer, and delivery details below.</p>
      </div>

      ${infoCard(
        'Customer',
        `
          <p style="margin:6px 0;"><strong>Name:</strong> ${customerName}</p>
          <p style="margin:6px 0;"><strong>Email:</strong> ${customerEmail}</p>
          <p style="margin:6px 0;"><strong>Phone:</strong> ${customerPhone}</p>
          <p style="margin:6px 0;"><strong>Order Type:</strong> ${orderType}</p>
          <p style="margin:6px 0;"><strong>Stripe Session:</strong> ${session.id}</p>
        `
      )}

      ${infoCard(
        'Order Details',
        `
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${lineItemsHtml}
            <tr>
              <td style="padding:16px 12px; text-align:right; font-weight:700;">Total Paid</td>
              <td style="padding:16px 12px; text-align:right; font-weight:800; color:#059669;">${money(totalPaid)}</td>
            </tr>
          </table>
        `
      )}

      ${deliveryCard}

      ${infoCard(
        'Billing Address',
        `<p style="margin:0;">${billingAddress}</p>`
      )}

      ${promoCard}
    `
  );

  const fromAddress = 'TKAC Vacations <bookings@mail.tkacvacations.com>';

  const customerRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [customerEmail],
      subject: `TKAC ${orderType} Confirmation`,
      html: customerHtml,
      text: `Thank you for your order, ${customerName}. Total paid: ${money(totalPaid)}. Order ID: ${session.id}`,
    }),
  });

  const adminRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: ['tkacvacations@gmail.com'],
      subject: `NEW TKAC ${orderType.toUpperCase()} ORDER`,
      html: adminHtml,
    }),
  });

  const customerText = await customerRes.text();
  const adminText = await adminRes.text();

  console.log('CUSTOMER EMAIL STATUS:', customerRes.status);
  console.log('CUSTOMER EMAIL RESPONSE:', customerText);
  console.log('ADMIN EMAIL STATUS:', adminRes.status);
  console.log('ADMIN EMAIL RESPONSE:', adminText);

  if (!customerRes.ok) console.error('CUSTOMER EMAIL FAILED:', customerText);
  if (!adminRes.ok) console.error('ADMIN EMAIL FAILED:', adminText);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!stripe) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const sessionId = body?.sessionId;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Payment not completed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lineItems = (session as any).line_items?.data || [];

const taxLine = lineItems.find((item: any) =>
  String(item.description || '').toLowerCase().includes('sales tax')
);

const taxAmount =
  taxLine
    ? Number(taxLine.amount_total || 0) / 100
    : 0;

if (taxAmount > 0) {
  const { error: taxError } =
    await supabase
      .from('tax_reports')
      .insert({
        booking_id: null,
        tax_amount: taxAmount,
      });

  if (taxError) {
    console.error(
      'FAILED TO SAVE TAX:',
      taxError
    );
  } else {
    console.log(
      'TAX SAVED:',
      taxAmount
    );
  }
}

await sendEmail(session);

return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('VERIFY PAYMENT ERROR:', error);

    return new Response(
      JSON.stringify({
        error: error?.message || 'Verify payment failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});