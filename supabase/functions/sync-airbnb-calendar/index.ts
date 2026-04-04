import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://tkacvacations.com",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ICalEvent {
  uid: string;
  summary: string;
  description: string;
  dtstart: string;
  dtend: string;
  status: string;
}

function parseICalDate(dateStr: string): string {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function parseICalFeed(icalText: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalText.split(/\r?\n/);

  let currentEvent: Partial<ICalEvent> | null = null;
  let currentField = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
      continue;
    }

    if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.uid && currentEvent.dtstart && currentEvent.dtend) {
        events.push(currentEvent as ICalEvent);
      }
      currentEvent = null;
      continue;
    }

    if (!currentEvent) continue;

    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (currentField && currentEvent) {
        currentEvent[currentField as keyof ICalEvent] += line.trim();
      }
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    let field = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);

    if (field.includes(';')) {
      field = field.split(';')[0];
    }

    currentField = field.toLowerCase();

    switch (currentField) {
      case 'uid':
        currentEvent.uid = value;
        break;
      case 'summary':
        currentEvent.summary = value;
        break;
      case 'description':
        currentEvent.description = value;
        break;
      case 'dtstart':
        currentEvent.dtstart = value.includes('T') ? value.split('T')[0] : value;
        break;
      case 'dtend':
        currentEvent.dtend = value.includes('T') ? value.split('T')[0] : value;
        break;
      case 'status':
        currentEvent.status = value.toLowerCase();
        break;
    }
  }

  return events;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "POST") {
      const { property_id } = await req.json();

      if (!property_id) {
        return new Response(
          JSON.stringify({ error: "property_id is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: calendarUrls, error: urlsError } = await supabase
        .from("external_calendar_urls")
        .select("*")
        .eq("property_id", property_id)
        .eq("is_active", true);

      if (urlsError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch calendar URLs" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!calendarUrls || calendarUrls.length === 0) {
        return new Response(
          JSON.stringify({ error: "No active calendar URLs configured for this property" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let totalEventsSynced = 0;
      const syncResults: any[] = [];

      for (const calendarUrl of calendarUrls) {
        try {
          const icalResponse = await fetch(calendarUrl.ical_url);
          if (!icalResponse.ok) {
            syncResults.push({
              source: calendarUrl.source,
              success: false,
              error: "Failed to fetch iCal feed"
            });
            continue;
          }

          const icalText = await icalResponse.text();
          const events = parseICalFeed(icalText);

          await supabase
            .from("external_calendar_events")
            .delete()
            .eq("property_id", property_id)
            .eq("source", calendarUrl.source);

          const eventsToInsert = events.map(event => ({
            property_id,
            source: calendarUrl.source,
            external_id: event.uid || `${calendarUrl.source}-${Date.now()}-${Math.random()}`,
            start_date: parseICalDate(event.dtstart),
            end_date: parseICalDate(event.dtend),
            summary: event.summary || `${calendarUrl.source} Reservation`,
            description: event.description || "",
            status: "blocked",
          }));

          if (eventsToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from("external_calendar_events")
              .insert(eventsToInsert);

            if (insertError) {
              console.error(`Insert error for ${calendarUrl.source}:`, insertError);
              syncResults.push({
                source: calendarUrl.source,
                success: false,
                error: "Failed to save calendar events"
              });
              continue;
            }
          }

          await supabase
            .from("external_calendar_urls")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", calendarUrl.id);

          await supabase
            .from("properties")
            .update({ last_sync_at: new Date().toISOString() })
            .eq("id", property_id);

          totalEventsSynced += eventsToInsert.length;
          syncResults.push({
            source: calendarUrl.source,
            success: true,
            events_synced: eventsToInsert.length
          });

        } catch (error) {
          console.error(`Sync error for ${calendarUrl.source}:`, error);
          syncResults.push({
            source: calendarUrl.source,
            success: false,
            error: error.message
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          total_events_synced: totalEventsSynced,
          results: syncResults,
          message: `Successfully synced ${totalEventsSynced} events from ${syncResults.filter(r => r.success).length} sources`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
