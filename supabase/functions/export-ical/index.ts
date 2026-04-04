import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://tkacvacations.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);

    // Support both query parameter and path-based formats
    // /export-ical?property_id=xxx or /export-ical/xxx.ics
    let propertyId = url.searchParams.get('property_id');

    if (!propertyId) {
      // Try to extract from path (e.g., /xxx.ics)
      const pathMatch = url.pathname.match(/([a-f0-9-]+)\.ics$/i);
      if (pathMatch) {
        propertyId = pathMatch[1];
      }
    }

    if (!propertyId) {
      return new Response('Missing property_id parameter or .ics file', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get property details
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('name')
      .eq('id', propertyId)
      .single();

    if (propError) {
      throw new Error(`Property not found: ${propError.message}`);
    }

    // Get all bookings for this property
    const { data: bookings, error: bookingsError } = await supabase
      .from('rental_bookings')
      .select('*')
      .eq('property_id', propertyId)
      .in('status', ['confirmed', 'pending']);

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }

    // Generate iCal format
    const ical = generateICalendar(property.name, bookings || []);

    return new Response(ical, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="calendar-${propertyId}.ics"`,
      },
    });
  } catch (error) {
    console.error('Error exporting calendar:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});

function generateICalendar(propertyName: string, bookings: any[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Beach Rentals//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${propertyName}`,
    'X-WR-TIMEZONE:UTC',
  ].join('\r\n');

  for (const booking of bookings) {
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);

    // Format dates as YYYYMMDD
    const startDate = formatDate(checkIn);
    const endDate = formatDate(checkOut);

    // Create a unique UID for each booking
    const uid = `booking-${booking.id}@beachrentals.com`;

    ical += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${startDate}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:Booked - ${propertyName}`,
      `DESCRIPTION:Reservation`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    ].join('\r\n');
  }

  ical += '\r\nEND:VCALENDAR';

  return ical;
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}
