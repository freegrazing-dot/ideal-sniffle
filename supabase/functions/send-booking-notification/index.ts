import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://tkacvacations.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ActivityBookingNotification {
  booking_id: string;
  booking_type: 'activity';
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  activity_name: string;
  booking_date: string;
  booking_time: string;
  num_people: number;
  total_price: number;
  special_requests?: string;
  boating_safety_card_url?: string;
  admin_email: string;
}

interface RentalBookingNotification {
  booking_id: string;
  booking_type: 'rental';
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  property_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  special_requests?: string;
  admin_email: string;
}

type BookingNotification = ActivityBookingNotification | RentalBookingNotification;

function getEmailTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TKAC Adventures</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 1px;">
                    TKAC ADVENTURES
                  </h1>
                  <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px; letter-spacing: 0.5px;">
                    Your Gateway to Unforgettable Experiences
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  ${content}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">
                    <strong>TKAC Adventures</strong>
                  </p>
                  <p style="margin: 0 0 15px; color: #64748b; font-size: 13px;">
                    Creating memories, one adventure at a time
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                    This email was sent to you regarding your booking. If you have any questions, please don't hesitate to contact us.
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

function generateAdminEmailContent(booking: BookingNotification): string {
  if (booking.booking_type === 'rental') {
    return `
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="margin: 0 0 5px; color: #92400e; font-size: 20px;">🏠 New Vacation Rental Booking</h2>
        <p style="margin: 0; color: #78350f; font-size: 14px;">You have received a new rental reservation</p>
      </div>

      <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
          📋 Booking Details
        </h3>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color: #64748b; font-size: 14px; width: 40%;">Booking ID:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${booking.booking_id}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Property:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${booking.property_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Check-in:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${new Date(booking.check_in).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Check-out:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${new Date(booking.check_out).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Guests:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${booking.guests}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Total:</td>
            <td style="color: #059669; font-size: 16px; font-weight: 700;">$${booking.total_price.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f1f5f9; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
          👤 Guest Information
        </h3>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color: #64748b; font-size: 14px; width: 40%;">Name:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${booking.customer_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Email:</td>
            <td style="color: #1e293b; font-size: 14px;"><a href="mailto:${booking.customer_email}" style="color: #2563eb; text-decoration: none;">${booking.customer_email}</a></td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Phone:</td>
            <td style="color: #1e293b; font-size: 14px;"><a href="tel:${booking.customer_phone}" style="color: #2563eb; text-decoration: none;">${booking.customer_phone}</a></td>
          </tr>
        </table>
      </div>

      ${booking.special_requests ? `
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px; color: #92400e; font-size: 15px;">📝 Special Requests</h3>
          <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${booking.special_requests}</p>
        </div>
      ` : ''}
    `;
  } else {
    return `
      <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="margin: 0 0 5px; color: #1e40af; font-size: 20px;">🎉 New Activity Booking</h2>
        <p style="margin: 0; color: #1e3a8a; font-size: 14px;">You have received a new activity reservation</p>
      </div>

      <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
          📋 Booking Details
        </h3>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color: #64748b; font-size: 14px; width: 40%;">Booking ID:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${booking.booking_id}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Activity:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${booking.activity_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Date:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Time:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${booking.booking_time}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Participants:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${booking.num_people}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Total:</td>
            <td style="color: #059669; font-size: 16px; font-weight: 700;">$${booking.total_price.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f1f5f9; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
          👤 Customer Information
        </h3>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color: #64748b; font-size: 14px; width: 40%;">Name:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600;">${booking.customer_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Email:</td>
            <td style="color: #1e293b; font-size: 14px;"><a href="mailto:${booking.customer_email}" style="color: #2563eb; text-decoration: none;">${booking.customer_email}</a></td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Phone:</td>
            <td style="color: #1e293b; font-size: 14px;"><a href="tel:${booking.customer_phone}" style="color: #2563eb; text-decoration: none;">${booking.customer_phone}</a></td>
          </tr>
        </table>
      </div>

      ${booking.special_requests ? `
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px; color: #92400e; font-size: 15px;">📝 Special Requests</h3>
          <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${booking.special_requests}</p>
        </div>
      ` : ''}

      ${booking.boating_safety_card_url ? `
        <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <h3 style="margin: 0 0 10px; color: #1e40af; font-size: 15px;">🎫 Boating Safety Education Card</h3>
          <p style="margin: 0 0 15px; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
            The customer has uploaded their Boating Safety Education Card:
          </p>
          <a href="${booking.boating_safety_card_url}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
            View Boating Card →
          </a>
        </div>
      ` : ''}
    `;
  }
}

function generateCustomerEmailContent(booking: BookingNotification): string {
  if (booking.booking_type === 'rental') {
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    return `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; border-radius: 50px; font-size: 16px; font-weight: 600;">
          ✓ Booking Confirmed
        </div>
      </div>

      <h2 style="margin: 0 0 10px; color: #1e293b; font-size: 24px; text-align: center;">Thank You, ${booking.customer_name}!</h2>
      <p style="margin: 0 0 30px; color: #64748b; font-size: 15px; text-align: center; line-height: 1.6;">
        Your vacation rental reservation has been confirmed. We're excited to host you!
      </p>

      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 20px; color: #92400e; font-size: 18px; text-align: center;">🏠 ${booking.property_name}</h3>

        <table width="100%" cellpadding="12" cellspacing="0">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div style="background-color: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px;">
                <p style="margin: 0 0 5px; color: #78350f; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Check-in</p>
                <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600;">${checkIn.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
              </div>
            </td>
            <td style="width: 50%; vertical-align: top;">
              <div style="background-color: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px;">
                <p style="margin: 0 0 5px; color: #78350f; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Check-out</p>
                <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600;">${checkOut.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
              </div>
            </td>
          </tr>
        </table>

        <div style="background-color: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px; margin-top: 12px; text-align: center;">
          <p style="margin: 0; color: #78350f; font-size: 14px;"><strong>${nights} ${nights === 1 ? 'night' : 'nights'}</strong> • <strong>${booking.guests} ${booking.guests === 1 ? 'guest' : 'guests'}</strong></p>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px;">Booking Summary</h3>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color: #64748b; font-size: 14px;">Booking ID:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${booking.booking_id}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Total Paid:</td>
            <td style="color: #059669; font-size: 18px; font-weight: 700; text-align: right;">$${booking.total_price.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      ${booking.special_requests ? `
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 10px; color: #92400e; font-size: 15px;">📝 Your Special Requests</h3>
          <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${booking.special_requests}</p>
        </div>
      ` : ''}

      <div style="background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
        <h3 style="margin: 0 0 15px; color: #ffffff; font-size: 18px;">📖 Your Complete Welcome Guide</h3>
        <p style="margin: 0 0 20px; color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6;">
          Everything you need to know about your stay: door codes, Wi-Fi, amenities, local tips, and more!
        </p>
        <a href="${Deno.env.get('SITE_URL')}/welcome-guide" style="display: inline-block; background-color: #ffffff; color: #0891b2; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          View Welcome Guide →
        </a>
      </div>

      <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #0284c7;">
        <h3 style="margin: 0 0 10px; color: #075985; font-size: 15px;">ℹ️ Important Information</h3>
        <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
          <li>Standard check-in time is 4:00 PM</li>
          <li>Standard check-out time is 11:00 AM</li>
          <li>A $500 security deposit hold has been authorized (not charged)</li>
          <li>Please bring a valid ID for check-in</li>
        </ul>
      </div>

      <div style="text-align: center; padding: 20px 0;">
        <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">Need to contact us?</p>
        <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">
          <a href="tel:${booking.customer_phone}" style="color: #2563eb; text-decoration: none;">${booking.customer_phone}</a>
        </p>
      </div>
    `;
  } else {
    const bookingDate = new Date(booking.booking_date);

    return `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; border-radius: 50px; font-size: 16px; font-weight: 600;">
          ✓ Booking Confirmed
        </div>
      </div>

      <h2 style="margin: 0 0 10px; color: #1e293b; font-size: 24px; text-align: center;">Thank You, ${booking.customer_name}!</h2>
      <p style="margin: 0 0 30px; color: #64748b; font-size: 15px; text-align: center; line-height: 1.6;">
        Your adventure is confirmed. Get ready for an unforgettable experience!
      </p>

      <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 20px; color: #1e40af; font-size: 18px; text-align: center;">🎉 ${booking.activity_name}</h3>

        <table width="100%" cellpadding="12" cellspacing="0">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div style="background-color: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px;">
                <p style="margin: 0 0 5px; color: #1e40af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                <p style="margin: 0; color: #1e3a8a; font-size: 16px; font-weight: 600;">${bookingDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </td>
            <td style="width: 50%; vertical-align: top;">
              <div style="background-color: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px;">
                <p style="margin: 0 0 5px; color: #1e40af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Time</p>
                <p style="margin: 0; color: #1e3a8a; font-size: 16px; font-weight: 600;">${booking.booking_time}</p>
              </div>
            </td>
          </tr>
        </table>

        <div style="background-color: rgba(255,255,255,0.7); padding: 15px; border-radius: 8px; margin-top: 12px; text-align: center;">
          <p style="margin: 0; color: #1e3a8a; font-size: 14px;"><strong>${booking.num_people} ${booking.num_people === 1 ? 'participant' : 'participants'}</strong></p>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px;">Booking Summary</h3>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color: #64748b; font-size: 14px;">Booking ID:</td>
            <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${booking.booking_id}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 14px;">Total Paid:</td>
            <td style="color: #059669; font-size: 18px; font-weight: 700; text-align: right;">$${booking.total_price.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      ${booking.special_requests ? `
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 10px; color: #92400e; font-size: 15px;">📝 Your Special Requests</h3>
          <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${booking.special_requests}</p>
        </div>
      ` : ''}

      <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #0284c7;">
        <h3 style="margin: 0 0 10px; color: #075985; font-size: 15px;">ℹ️ What to Bring</h3>
        <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
          <li>Please arrive 15 minutes before your scheduled time</li>
          <li>Bring comfortable clothing suitable for the activity</li>
          <li>Don't forget sunscreen and water</li>
          <li>Photo ID may be required</li>
        </ul>
      </div>

      <div style="text-align: center; padding: 20px 0;">
        <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">Questions? Contact us:</p>
        <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">
          <a href="tel:${booking.customer_phone}" style="color: #2563eb; text-decoration: none;">${booking.customer_phone}</a>
        </p>
      </div>
    `;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const booking: BookingNotification = await req.json();

    console.log('Processing booking notification:', {
      booking_id: booking.booking_id,
      booking_type: booking.booking_type,
      customer_email: booking.customer_email,
      admin_email: booking.admin_email
    });

    const adminEmailHtml = getEmailTemplate(generateAdminEmailContent(booking));
    const customerEmailHtml = getEmailTemplate(generateCustomerEmailContent(booking));

    const emailSubject = booking.booking_type === 'rental'
      ? `New Rental: ${booking.property_name}`
      : `New Booking: ${booking.activity_name}`;

    const customerSubject = booking.booking_type === 'rental'
      ? `Vacation Rental Confirmed - ${booking.property_name}`
      : `Adventure Confirmed - ${booking.activity_name}`;

    console.log('Sending admin email to:', booking.admin_email);
    const adminRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'TKAC Vacations <bookings@tkacvacations.com>',
        to: [booking.admin_email],
        subject: emailSubject,
        html: adminEmailHtml,
      }),
    });

    console.log('Sending customer email to:', booking.customer_email);
    const customerRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'TKAC Vacations <bookings@tkacvacations.com>',
        to: [booking.customer_email],
        subject: customerSubject,
        html: customerEmailHtml,
      }),
    });

    const results = {
      admin: { success: adminRes.ok, status: adminRes.status },
      customer: { success: customerRes.ok, status: customerRes.status }
    };

    if (!adminRes.ok) {
      const errorText = await adminRes.text();
      console.error('Admin email failed:', {
        status: adminRes.status,
        response: errorText,
        recipient: booking.admin_email
      });
      try {
        const error = JSON.parse(errorText);
        results.admin = { ...results.admin, error };
      } catch {
        results.admin = { ...results.admin, error: errorText };
      }
    } else {
      const successData = await adminRes.json();
      console.log('Admin email sent successfully:', successData);
    }

    if (!customerRes.ok) {
      const errorText = await customerRes.text();
      console.error('Customer email failed:', {
        status: customerRes.status,
        response: errorText,
        recipient: booking.customer_email
      });
      try {
        const error = JSON.parse(errorText);
        results.customer = { ...results.customer, error };
      } catch {
        results.customer = { ...results.customer, error: errorText };
      }
    } else {
      const successData = await customerRes.json();
      console.log('Customer email sent successfully:', successData);
    }

    if (!adminRes.ok && !customerRes.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send both emails',
          details: results
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: adminRes.ok && customerRes.ok
          ? 'Both emails sent successfully'
          : 'Some emails failed to send'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending booking notification:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
