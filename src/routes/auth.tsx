import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { piAuthenticate, isPiBrowser } from "@/lib/pi";
import { verifyPiAuth } from "@/lib/pi-auth.functions";
import { useRefreshUser } from "@/hooks/use-user";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const verify = useServerFn(verifyPiAuth);
  const refreshUser = useRefreshUser();
  const [loading, setLoading] = useState(false);
  const [inPiBrowser, setInPiBrowser] = useState(true);

  useEffect(() => { setInPiBrowser(isPiBrowser()); }, []);

  async function handlePi() {
    if (!isPiBrowser()) {
      toast.error("Open this app inside the Pi Browser to sign in.");
      return;
    }
    setLoading(true);
    try {
      const pi = await piAuthenticate();
      // Server-side verification against Pi Platform /me + session minting
      const { email, tokenHash, user } = await verify({
        data: { accessToken: pi.accessToken },
      });
      void email;
      const { error } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: tokenHash,
      });
      if (error) throw error;
      await refreshUser();
      toast.success(`Welcome, ${user.username}`);
      navigate({ to: "/app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pi sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AnimatedBackground />
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass neon-glow w-full max-w-md rounded-3xl p-6 sm:p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="bg-gradient-primary mx-auto mb-4 grid size-16 place-items-center rounded-2xl neon-glow"
          >
            <Sparkles className="size-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-2xl font-bold">Digital <span className="gradient-text">Curiosities</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">A Pi Network collectibles ecosystem</p>

          {!inPiBrowser ? (
            <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-200">Pi Browser required</p>
                  <p className="mt-1 text-sm text-amber-100/80">
                    This app is designed to be used within the Pi Browser. Please open it from there to continue.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={handlePi}
              disabled={loading}
              className="bg-gradient-primary mt-6 h-12 w-full rounded-xl text-base font-semibold neon-glow"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : <>π · Continue with Pi</>}
            </Button>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            By continuing you authorize the app to read your Pi username.
          </p>
        </motion.div>
      </div>
    </>
  );
}
