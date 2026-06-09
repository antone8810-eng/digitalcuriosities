// Approves a Pi payment server-side before the user confirms it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PI_API_KEY = Deno.env.get("PI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!PI_API_KEY) throw new Error("PI_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    const { paymentId } = await req.json();
    if (!paymentId || typeof paymentId !== "string") throw new Error("paymentId required");

    // Fetch payment details from Pi
    const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      headers: { Authorization: `Key ${PI_API_KEY}` },
    });
    if (!piRes.ok) throw new Error(`Pi GET failed: ${piRes.status} ${await piRes.text()}`);
    const payment = await piRes.json();

    // Persist a pending row
    await supabase.from("pi_payments").upsert({
      payment_id: paymentId,
      user_id: userId,
      amount: payment.amount,
      memo: payment.memo,
      metadata: payment,
      status: "pending",
    }, { onConflict: "payment_id" });

    // Approve with Pi
    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: { Authorization: `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
    });
    if (!approveRes.ok) throw new Error(`Pi approve failed: ${approveRes.status} ${await approveRes.text()}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-pi-payment error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
