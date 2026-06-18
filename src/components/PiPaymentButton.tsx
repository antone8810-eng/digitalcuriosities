import { useEffect, useState } from "react";
import { Loader2, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isPiBrowser, piAuthenticate } from "@/lib/pi";

type Props = {
  amount?: number;
  memo?: string;
  onSuccess?: (vipUntil: string) => void;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callEdge(fn: "create-pi-payment" | "complete-pi-payment", body: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) throw new Error(json?.error || `${fn} failed (${res.status})`);
  return json;
}

export function PiPaymentButton({
  amount = 1,
  memo = "VIP Subscription - 30 days",
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  async function pay() {
    if (!isPiBrowser() || !window.Pi?.createPayment) {
      toast.error("Open this app in the Pi Browser to pay with Pi.");
      return;
    }
    if (!userId) {
      toast.error("You must be signed in.");
      return;
    }
    setLoading(true);

    try {
      await piAuthenticate();
    } catch (e) {
      console.error("Pi payments authorization failed", e);
      toast.error(e instanceof Error ? e.message : "Please authorize Pi payments and try again.");
      setLoading(false);
      return;
    }

    const paymentData = {
      amount,
      memo,
      metadata: { type: "VIP_30_DAYS", userId },
    };

    const callbacks = {
      onReadyForServerApproval: async (paymentId: string) => {
        try {
          await callEdge("create-pi-payment", { paymentId });
        } catch (e) {
          console.error("create-pi-payment failed", e);
          toast.error((e as Error).message || "Approval failed");
          setLoading(false);
        }
      },
      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        try {
          const res = (await callEdge("complete-pi-payment", { paymentId, txid, userId })) as {
            vip_until?: string;
          };
          toast.success("🎉 VIP activated for 30 days");
          onSuccess?.(res.vip_until ?? "");
        } catch (e) {
          console.error("complete-payment failed", e);
          toast.error((e as Error).message || "Payment completion failed");
        } finally {
          setLoading(false);
        }
      },
      onCancel: (paymentId: string) => {
        console.log("Pi payment cancelled", paymentId);
        toast.message("Payment cancelled");
        setLoading(false);
      },
      onError: (error: Error, payment?: unknown) => {
        console.error("Pi payment error", error, payment);
        const msg = error?.message || "";
        if (msg.toLowerCase().includes("payments") && msg.toLowerCase().includes("scope")) {
          toast.error("Pi payments scope missing. Please sign out and sign back in to grant payment permission.");
        } else {
          toast.error(msg || "Pi payment error");
        }
        setLoading(false);
      },
    };

    try {
      await window.Pi.createPayment(paymentData, callbacks);
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={pay}
      disabled={loading || !userId}
      className="bg-gradient-primary h-12 w-full rounded-2xl font-semibold"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
      {loading ? "Processing…" : `Pay ${amount} π · Unlock VIP`}
    </Button>
  );
}
