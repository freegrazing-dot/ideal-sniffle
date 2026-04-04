import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  try {
    console.info(`Handling webhook event: ${event.type}`);
    const stripeData = event?.data?.object ?? {};

    if (!stripeData) {
      console.warn('No stripe data found in event');
      return;
    }

    // Handle booking payments
    if (event.type === 'checkout.session.completed') {
      const session = stripeData as Stripe.Checkout.Session;
      console.info(`Checkout session completed: ${session.id}`);

      // Increment promo code usage if a promo code was used
      if (session.metadata?.promo_code && session.metadata.promo_code.trim() !== '') {
        try {
          await supabase.rpc('increment_promo_code_usage', {
            code_text: session.metadata.promo_code
          });
          console.info(`Incremented promo code usage: ${session.metadata.promo_code}`);
        } catch (err) {
          console.error(`Failed to increment promo code usage:`, err);
        }
      }

      // Check if this is a booking payment (support both singular and plural)
      const bookingIdsStr = session.metadata?.booking_ids || session.metadata?.booking_id;

      if (bookingIdsStr) {
        try {
          const bookingIds = bookingIdsStr.split(',');
          console.info(`Processing booking payment for ${bookingIds.length} booking(s): ${bookingIdsStr}`);

        // Check which bookings exist in which tables
        const { data: activityBookings } = await supabase
          .from('bookings')
          .select('id')
          .in('id', bookingIds);

        const { data: rentalBookings } = await supabase
          .from('rental_bookings')
          .select('id')
          .in('id', bookingIds);

        const activityBookingIds = activityBookings?.map(b => b.id) || [];
        const rentalBookingIds = rentalBookings?.map(b => b.id) || [];

        // Update activity bookings
        if (activityBookingIds.length > 0) {
          const { data: bookingsToUpdate, error: fetchError } = await supabase
            .from('bookings')
            .select('*')
            .in('id', activityBookingIds);

          if (fetchError) {
            console.error('Error fetching bookings for update:', fetchError);
          } else if (bookingsToUpdate) {
            for (const booking of bookingsToUpdate) {
              const updateData: any = {
                payment_status: 'paid',
                status: 'confirmed',
                stripe_session_id: session.id,
              };

              if (booking.damage_protection_type === 'hold' && session.payment_intent) {
                try {
                  console.info(`Creating $500 damage hold for booking ${booking.id}`);
                  const paymentIntentId = typeof session.payment_intent === 'string'
                    ? session.payment_intent
                    : session.payment_intent.id;

                  const holdIntent = await stripe.paymentIntents.create({
                    amount: 50000,
                    currency: 'usd',
                    customer: session.customer as string,
                    payment_method: (await stripe.paymentIntents.retrieve(paymentIntentId)).payment_method as string,
                    off_session: true,
                    confirm: true,
                    capture_method: 'manual',
                    description: `Security deposit hold for booking ${booking.id}`,
                    metadata: {
                      booking_id: booking.id,
                      type: 'damage_hold',
                    },
                  });

                  updateData.damage_hold_authorization_id = holdIntent.id;
                  console.info(`Successfully created damage hold ${holdIntent.id} for booking ${booking.id}`);
                } catch (holdError: any) {
                  console.error(`Failed to create damage hold for booking ${booking.id}:`, holdError.message);
                }
              }

              const { error: updateError } = await supabase
                .from('bookings')
                .update(updateData)
                .eq('id', booking.id);

              if (updateError) {
                console.error(`Error updating booking ${booking.id}:`, updateError);
              }
            }
            console.info(`Successfully updated ${activityBookingIds.length} activity booking(s)`);
          }
        }

        // Update rental bookings
        if (rentalBookingIds.length > 0) {
          const { error: rentalError } = await supabase
            .from('rental_bookings')
            .update({
              payment_status: 'paid',
              status: 'confirmed',
              stripe_session_id: session.id,
            })
            .in('id', rentalBookingIds);

          if (rentalError) {
            console.error('Error updating rental booking payment status:', rentalError);
          } else {
            console.info(`Successfully updated ${rentalBookingIds.length} rental booking(s)`);
          }
        }

        // Send notifications for activity bookings
        if (activityBookingIds.length > 0) {
          const { data: activityBookings, error: activityFetchError } = await supabase
            .from('bookings')
            .select('*, activities(*)')
            .in('id', activityBookingIds);

          if (!activityFetchError && activityBookings && activityBookings.length > 0) {
            const { data: adminEmailSetting } = await supabase
              .from('site_settings')
              .select('setting_value')
              .eq('setting_key', 'admin_email')
              .maybeSingle();
            const adminEmail = adminEmailSetting?.setting_value || Deno.env.get('ADMIN_EMAIL') || 'tkacadventures@gmail.com';

            for (const booking of activityBookings) {
              try {
                console.info(`Processing activity notification for booking ${booking.id}`);
                console.info('Activity:', booking.activities?.name);
                console.info('Boating card URL:', booking.boating_safety_card_url || 'None');
                console.info('Customer:', booking.customer_name, booking.customer_email);

                const notificationPayload = {
                  booking_id: booking.id,
                  booking_type: 'activity',
                  customer_name: booking.customer_name,
                  customer_email: booking.customer_email,
                  customer_phone: booking.customer_phone || '',
                  activity_name: booking.activities.name,
                  booking_date: booking.booking_date,
                  booking_time: booking.booking_time,
                  num_people: booking.num_people,
                  total_price: booking.total_price,
                  special_requests: booking.special_requests || '',
                  boating_safety_card_url: booking.boating_safety_card_url || '',
                  admin_email: adminEmail,
                };

                console.info('Sending notification with payload:', JSON.stringify(notificationPayload, null, 2));

                const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-booking-notification`;
                const notificationResponse = await fetch(notificationUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  },
                  body: JSON.stringify(notificationPayload),
                });

                if (!notificationResponse.ok) {
                  const errorText = await notificationResponse.text();
                  console.error(`Failed to send activity notification for booking ${booking.id}:`, errorText);
                } else {
                  const responseData = await notificationResponse.json();
                  console.info(`Activity notification sent successfully for booking ${booking.id}:`, responseData);
                }
              } catch (notificationError) {
                console.error(`Error sending activity notification for booking ${booking.id}:`, notificationError);
              }
            }
          }
        }

        // Send notifications for rental bookings
        if (rentalBookingIds.length > 0) {
          console.info(`Fetching ${rentalBookingIds.length} rental booking(s) for notification`);
          const { data: rentalBookings, error: rentalFetchError } = await supabase
            .from('rental_bookings')
            .select('*, properties(*)')
            .in('id', rentalBookingIds);

          if (rentalFetchError) {
            console.error('Error fetching rental bookings for notifications:', rentalFetchError);
          } else if (!rentalBookings || rentalBookings.length === 0) {
            console.error('No rental bookings found for IDs:', rentalBookingIds);
          } else {
            console.info(`Successfully fetched ${rentalBookings.length} rental booking(s)`);
            const { data: adminEmailSetting } = await supabase
              .from('site_settings')
              .select('setting_value')
              .eq('setting_key', 'admin_email')
              .maybeSingle();
            const adminEmail = adminEmailSetting?.setting_value || Deno.env.get('ADMIN_EMAIL') || 'tkacadventures@gmail.com';

            for (const booking of rentalBookings) {
              try {
                console.info(`Processing rental notification for booking ${booking.id}`);
                console.info('Booking data:', JSON.stringify({
                  id: booking.id,
                  customer_name: booking.customer_name,
                  has_properties: !!booking.properties,
                  properties: booking.properties
                }));

                if (!booking.properties || !booking.properties.name) {
                  console.error(`Missing property data for booking ${booking.id}`);
                  continue;
                }

                const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-booking-notification`;
                const notificationResponse = await fetch(notificationUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  },
                  body: JSON.stringify({
                    booking_id: booking.id,
                    booking_type: 'rental',
                    customer_name: booking.customer_name,
                    customer_email: booking.customer_email,
                    customer_phone: booking.customer_phone || '',
                    property_name: booking.properties.name,
                    check_in: booking.check_in_date,
                    check_out: booking.check_out_date,
                    guests: booking.guests,
                    total_price: booking.total_price,
                    special_requests: booking.special_requests || '',
                    admin_email: adminEmail,
                  }),
                });

                if (!notificationResponse.ok) {
                  const errorText = await notificationResponse.text();
                  console.error(`Failed to send rental notification for booking ${booking.id}:`, errorText);
                } else {
                  console.info(`Rental notification sent successfully for booking ${booking.id}`);
                }
              } catch (notificationError) {
                console.error(`Error sending rental notification for booking ${booking.id}:`, notificationError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing booking payment:', error);
      }
      return;
    }
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
  } catch (error) {
    console.error('Error in handleEvent:', error);
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}