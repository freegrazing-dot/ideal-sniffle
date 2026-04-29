import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');

const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      appInfo: {
        name: 'TKAC Checkout',
        version: '1.0.0',
      },
    })
  : null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CartItem {
  type: 'activity' | 'property' | 'merchandise' | 'security_deposit';
  activity?: { id: string; name?: string };
  property?: { id: string; name?: string };
  merchandise?: { id: string; name?: string };
  name?: string;
  bookingDate?: string;
  bookingTime?: string;
  checkInDate?: string;
  checkOutDate?: string;
  checkIn?: string;
  checkOut?: string;
  price?: number;
  quantity?: number;
}

function safePrice(value: unknown, index: number) {
  const price = Number(value);
  if (!price || isNaN(price) || price <= 0) {
    throw new Error(`Invalid price for item ${index + 1}`);
  }
  return price;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const {
      items,
      customerEmail,
      lodgingTax = 0,
      salesTax = 0,
      promoCode,
      promoDiscount,
    } = await req.json();

    if (!items || !Array.isArray(items)) {
      throw new Error('Invalid items');
    }

    const lineItems = (items as CartItem[]).map((item, index) => {
      let name = '';
      let description = '';

      if (item.type === 'activity') {
        name = item.activity?.name || item.name || 'Activity Booking';
        description = `${item.bookingDate || 'Date TBD'} ${item.bookingTime || ''}`;
      }

      if (item.type === 'property') {
        name = item.property?.name || item.name || 'Property Rental';
        description = `${item.checkInDate || item.checkIn || 'Check-in TBD'} to ${item.checkOutDate || item.checkOut || 'Check-out TBD'}`;
      }

      if (item.type === 'merchandise') {
        name = item.merchandise?.name || item.name || 'Merchandise Item';
        description = 'Merchandise purchase';
      }

      if (item.type === 'security_deposit') {
        name = item.name || 'Security Deposit';
        description = 'Security deposit hold';
      }

      if (!name || name.trim() === '') {
        name = `TKAC Item ${index + 1}`;
      }

    const safeName =
  name && name.trim() !== ''
    ? name
    : `TKAC Item ${index + 1}`;

// 🔴 DEBUG — shows bad item if it happens again
if (!safeName || safeName.trim() === '') {
  console.log('EMPTY NAME ITEM:', JSON.stringify(item));
}

return {
  price_data: {
    currency: 'usd',
    product_data: {
      name: safeName || `TKAC ITEM ${index + 1}`,
      description: description || 'TKAC purchase',
    },
    unit_amount: Math.round(price * 100),
  },
  quantity: item.quantity || 1,
};
    },
    unit_amount: Math.round(price * 100),
  },
  quantity: item.quantity || 1,
};
    });

    if (salesTax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Sales Tax', description: 'Sales tax' },
          unit_amount: Math.round(salesTax * 100),
        },
        quantity: 1,
      });
    }

    if (lodgingTax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Lodging Tax', description: 'Lodging tax' },
          unit_amount: Math.round(lodgingTax * 100),
        },
        quantity: 1,
      });
    }

    // Promo
    let finalPromoDiscount = Number(promoDiscount || 0);
    const normalizedPromoCode = String(promoCode || '').trim().toUpperCase();

    if (normalizedPromoCode === 'TKAC20') finalPromoDiscount = 20;
    if (normalizedPromoCode === 'VVH2026') finalPromoDiscount = 10;

    let stripeCoupon = null;

    if (normalizedPromoCode && finalPromoDiscount > 0) {
      stripeCoupon = await stripe.coupons.create({
        percent_off: finalPromoDiscount,
        duration: 'once',
        name: `${normalizedPromoCode} - ${finalPromoDiscount}% off`,
      });
    }

    const origin =
      Deno.env.get('VITE_SITE_URL') ||
      req.headers.get('origin') ||
      'http://localhost:5173';

    const sessionConfig: any = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: origin,
    };

    if (stripeCoupon) {
      sessionConfig.discounts = [{ coupon: stripeCoupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Checkout error:', error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});