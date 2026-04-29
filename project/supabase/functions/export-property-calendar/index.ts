import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatDate(date: string) {
  // expects YYYY-MM-DD → converts to YYYYMMDD
  return date.replaceAll("-", "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const propertyId = url.searchParams.get("property_id");

    if (!propertyId) {
      return new Response("Missing property_id", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🔹 Pull internal bookings (your site)
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("property_id", propertyId);

    // 🔹 Pull external blocked dates (Airbnb/VRBO/etc)
    const { data: external } = await supabase
      .from("external_calendar_events")
      .select("*")
      .eq("property_id", propertyId);

    let events: string[] = [];

    const buildEvent = (start: string, end: string, summary: string) => {
      return `
BEGIN:VEVENT
DTSTART;VALUE=DATE:${formatDate(start)}
DTEND;VALUE=DATE:${formatDate(end)}
SUMMARY:${summary}
END:VEVENT`;
    };

    bookings?.forEach((b: any) => {
      events.push(
        buildEvent(
          b.start_date,
          b.end_date,
          "TKAC Booking"
        )
      );
    });

    external?.forEach((e: any) => {
      events.push(
        buildEvent(
          e.start_date,
          e.end_date,
          e.summary || "Blocked"
        )
      );
    });

    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TKAC//Calendar//EN
${events.join("\n")}
END:VCALENDAR`;

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar",
        ...corsHeaders,
      },
    });

  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
});