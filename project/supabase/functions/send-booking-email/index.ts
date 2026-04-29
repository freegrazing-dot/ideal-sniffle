import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      customer_name,
      customer_email,
      items,
      total
    } = body;

    const emailHtml = `
      <h2>Booking Confirmation</h2>
      <p>Hi ${customer_name},</p>

      <p>Your booking has been confirmed.</p>

      <h3>Details:</h3>
      <ul>
        ${items.map((i: any) => `<li>${i.type} - ${i.price}</li>`).join("")}
      </ul>

      <h3>Total: $${total}</h3>

      <p>Thank you for booking with TKAC!</p>
    `;

    // 🔥 Using Resend (simple + reliable)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TKAC <onboarding@resend.dev>",
        to: [customer_email],
        subject: "Your TKAC Booking Confirmation",
        html: emailHtml,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
});