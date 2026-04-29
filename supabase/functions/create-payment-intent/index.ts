import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function safePrice(value: any, index: number) {
  const num = Number(value);
  if (!num || isNaN(num)) throw new Error(`Invalid price at item ${index}`);
  return num;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
  items = [],
  customerEmail,
  customerName = '',
  salesTax = 0,
  lodgingTax = 0
} = body;

    if (!items.length) {
      throw new Error('No items provided');
    }

    const lineItems = items.map((item: any, index: number) => {
      let name = '';
      let description = '';

      if (item.type === 'activity') {
        name = item.activity?.name || item.name || 'Activity';
        description = `${item.bookingDate || ''} ${item.bookingTime || ''}`;
      }

      if (item.type === 'property') {
        name = item.property?.name || item.name || 'Property Rental';
        description = `${item.checkInDate || ''} to ${item.checkOutDate || ''}`;
      }

      if (item.type === 'merchandise') {
        name = item.merchandise?.name || item.name || 'Merch Item';
        description = 'Merchandise purchase';
      }

      if (item.type === 'security_deposit') {
        name = item.name || 'Security Deposit';
        description = 'Deposit';
      }

      const safeName =
        name && name.trim() !== ''
          ? name
          : `TKAC ITEM ${index + 1}`;

      if (!safeName || safeName.trim() === '') {
        console.log('BAD ITEM:', item);
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: safeName,
            description: description || 'TKAC purchase',
          },
          unit_amount: Math.round(safePrice(item.price, index) * 100),
        },
        quantity: item.quantity || 1,
      };
    });

    if (salesTax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Sales Tax' },
          unit_amount: Math.round(salesTax * 100),
        },
        quantity: 1,
      });
    }

    if (lodgingTax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Lodging Tax' },
          unit_amount: Math.round(lodgingTax * 100),
        },
        quantity: 1,
      });
    }
const normalizedPromoCode = String(body.promoCode || '').trim().toUpperCase();
let finalPromoDiscount = Number(body.promoDiscount || 0);

if (normalizedPromoCode === 'TKAC20') finalPromoDiscount = 20;
if (normalizedPromoCode === 'VVH2026') finalPromoDiscount = 10;
if (normalizedPromoCode === 'TEST100') finalPromoDiscount = 100;
let discounts = undefined;

if (normalizedPromoCode && finalPromoDiscount > 0) {
  const coupon = await stripe.coupons.create({
    percent_off: finalPromoDiscount,
    duration: 'once',
    name: `${normalizedPromoCode} - ${finalPromoDiscount}% off`,
  });

  discounts = [{ coupon: coupon.id }];
}const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: lineItems,
  mode: 'payment',
  customer_email: customerEmail,
  discounts,
  success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${req.headers.get('origin')}`,
  metadata: {
    type: items[0]?.type || '',
    property_id: items[0]?.property?.id || '',
    activity_id: items[0]?.activity?.id || '',
    check_in: items[0]?.checkInDate || '',
    check_out: items[0]?.checkOutDate || '',
    booking_date: items[0]?.bookingDate || '',
    booking_time: items[0]?.bookingTime || '',
    guests: String(items[0]?.guests || ''),
    customer_email: customerEmail || '',
    customer_name: customerName || '',
  },
});

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('ERROR:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});