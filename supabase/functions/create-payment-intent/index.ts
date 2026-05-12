import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(
  Deno.env.get('STRIPE_SECRET_KEY') || '',
  {
    apiVersion: '2024-06-20',
  }
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
};

const MERCH_SHIPPING_FEE = 8.95;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    const {
      items = [],
      customerEmail = '',
      customerName = '',
      promoCode = '',
      promoDiscount = 0,
      deliveryMethod = '',
fulfillmentMethod = 'pickup',
shippingFee: incomingShippingFee = 0,
    } = body;

    const origin =
      req.headers.get('origin') ||
      'https://www.tkacvacations.com';

    const hasMerchandise = items.some(
      (item: any) =>
        item.type === 'merchandise'
    );

    const selectedDeliveryMethod =
  fulfillmentMethod || deliveryMethod || 'pickup';

const shippingFee =
  hasMerchandise && selectedDeliveryMethod === 'shipping'
    ? Number(incomingShippingFee || MERCH_SHIPPING_FEE)
    : 0;

    const subtotal = items.reduce(
      (sum: number, item: any) =>
        sum + Number(item.price || 0),
      0
    );

    const discountAmount =
      subtotal *
      (Number(promoDiscount || 0) /
        100);

    const discountedSubtotal =
      subtotal - discountAmount;

   const salesTax =
  (discountedSubtotal + shippingFee) *
  0.065;

    const total =
      discountedSubtotal +
      shippingFee +
      salesTax;

    const line_items: any[] = [];

    items.forEach((item: any) => {
      const basePrice = Number(
        item.price || 0
      );

      const discountedPrice =
        promoDiscount > 0
          ? basePrice *
            (1 -
              Number(
                promoDiscount
              ) /
                100)
          : basePrice;

      line_items.push({
        price_data: {
          currency: 'usd',

          product_data: {
            name:
              item.name ||
              item.merchandiseName ||
              item.property?.name ||
              item.activity?.name ||
              'TKAC Item',
          },

          unit_amount: Math.round(
            discountedPrice * 100
          ),
        },

        quantity:
          Number(item.quantity || 1),
      });
    });

    if (shippingFee > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',

          product_data: {
            name:
              'Standard Merchandise Shipping',
          },

          unit_amount: Math.round(
            shippingFee * 100
          ),
        },

        quantity: 1,
      });
    }

    if (salesTax > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',

          product_data: {
            name: 'Sales Tax',
          },

          unit_amount: Math.round(
            salesTax * 100
          ),
        },

        quantity: 1,
      });
    }

    const session =
      await stripe.checkout.sessions.create(
        {
          payment_method_types: [
            'card',
          ],

          mode: 'payment',

          billing_address_collection:
            'required',

         shipping_address_collection: undefined,

          phone_number_collection:
            {
              enabled: true,
            },

          customer_email:
            customerEmail,

          line_items,

          success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,

          cancel_url: origin,

          metadata: {
            customer_name:
              customerName,

            customer_email:
              customerEmail,

            delivery_method:
  selectedDeliveryMethod,

            promo_code:
              promoCode || '',

            promo_discount:
              String(
                promoDiscount || 0
              ),
          },
        }
      );

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error(err);

    return new Response(
      JSON.stringify({
        error:
          err?.message ||
          'Checkout failed',
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