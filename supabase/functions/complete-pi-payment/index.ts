// Completes a Pi payment using the txid, then grants 30 days of VIP.
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
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    const { paymentId, txid } = await req.json();
    if (!paymentId || !txid) throw new Error("paymentId and txid required");

    // Tell Pi to complete
    const completeRes = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      {
        method: "POST",
        headers: { Authorization: `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ txid }),
      },
    );
    if (!completeRes.ok) {
      throw new Error(`Pi complete failed: ${completeRes.status} ${await completeRes.text()}`);
    }

    // Mark payment row complete
    await supabase
      .from("pi_payments")
      .update({ txid, status: "completed" })
      .eq("payment_id", paymentId)
      .eq("user_id", userId);

    // Grant / extend VIP by 30 days from the later of (now, current vip_until)
    const { data: userRow } = await supabase
      .from("users")
      .select("vip_until")
      .eq("auth_user_id", userId)
      .single();

    const base = userRow?.vip_until && new Date(userRow.vip_until) > new Date()
      ? new Date(userRow.vip_until)
      : new Date();
    const newVipUntil = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("users").update({ vip_until: newVipUntil }).eq("auth_user_id", userId);

    return new Response(JSON.stringify({ ok: true, vip_until: newVipUntil }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("complete-pi-payment error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
