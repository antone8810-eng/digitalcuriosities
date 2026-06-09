import { useState } from "react";
import { Loader2, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isPiBrowser } from "@/lib/pi";

type Props = {
  amount?: number;
  memo?: string;
  onSuccess?: (vipUntil: string) => void;
};

// Wraps window.Pi.createPayment + our edge functions to grant VIP for 30 days.
export function PiPaymentButton({ amount = 1, memo = "Digital Curiosities — VIP 30 days", onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  async function callFn(name: "create-pi-payment" | "complete-pi-payment", body: unknown) {
    const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data;
  }

  async function pay() {
    if (!isPiBrowser() || !window.Pi?.createPayment) {
      toast.error("Open this app in the Pi Browser to pay with Pi.");
      return;
    }
    setLoading(true);

    const paymentData = {
      amount,
      memo,
      metadata: { product: "vip_30d" },
    };

    const callbacks = {
      onReadyForServerApproval: async (paymentId: string) => {
        try { await callFn("create-pi-payment", { paymentId }); }
        catch (e) { console.error("approve failed", e); toast.error("Approval failed"); setLoading(false); }
      },
      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        try {
          const res = (await callFn("complete-pi-payment", { paymentId, txid })) as { vip_until: string };
          toast.success("🎉 VIP activated for 30 days!");
          onSuccess?.(res.vip_until);
        } catch (e) {
          console.error("complete failed", e);
          toast.error("Payment completion failed");
        } finally { setLoading(false); }
      },
      onCancel: (paymentId: string) => {
        console.log("Pi payment cancelled", paymentId);
        toast.message("Payment cancelled");
        setLoading(false);
      },
      onError: (error: Error, payment?: unknown) => {
        console.error("Pi payment error", error, payment);
        toast.error(error?.message || "Pi payment error");
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
    <Button onClick={pay} disabled={loading} className="bg-gradient-primary h-12 w-full rounded-2xl font-semibold">
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
      {loading ? "Processing…" : `Pay ${amount} π · Unlock VIP`}
    </Button>
  );
}
