import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gem, Pickaxe, Sparkles, Clock, Megaphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { useAd } from "@/hooks/use-ad";
import { useUser, useRefreshUser } from "@/hooks/use-user";
import dgcCoin from "@/assets/dgc-coin.jpg.asset.json";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const { data: profile } = useUser();
  const refreshUser = useRefreshUser();
  const { canShowAd } = useAd();
  const [mining, setMining] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const nextAt = profile?.last_mined_at ? new Date(profile.last_mined_at).getTime() + 24 * 3600_000 : 0;
  const remaining = Math.max(0, nextAt - now);
  const canMine = !profile?.last_mined_at || remaining === 0;

  async function showInterstitialAd() {
    if (!canShowAd) return;
    const Pi = (window as unknown as { Pi?: { Ads?: { showAd: (t: string) => Promise<{ result: string }> } } }).Pi;
    if (!Pi?.Ads?.showAd) return;
    try {
      await Pi.Ads.showAd("interstitial");
    } catch {
      // ignore ad errors; mining proceeds
    }
  }

  async function mine() {
    setMining(true);
    await showInterstitialAd();
    const { data, error } = await supabase.rpc("mine_dgc");
    setMining(false);
    if (error) {
      const m = error.message.match(/COOLDOWN:(\d+)/);
      if (m) toast.error(`Come back in ${formatDuration(Number(m[1]) * 1000)}`);
      else toast.error(error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    toast.success(`⛏ Mined ${Number(row.reward).toFixed(0)} DGC!`);
    setNow(Date.now());
    await refreshUser();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <>
      <TopBar balance={profile?.dgc_balance ?? null} />
      <div className="space-y-5 px-4 py-5">
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass neon-glow relative overflow-hidden rounded-3xl p-6"
        >
          <div className="bg-gradient-primary absolute -right-10 -top-10 size-40 rounded-full opacity-40 blur-2xl" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Pi Pioneer</p>
          <h2 className="mt-1 text-2xl font-bold">
            {profile?.pi_username ? `@${profile.pi_username}` : profile?.display_name || "Welcome"}
          </h2>
          {profile?.pi_wallet_address && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{profile.pi_wallet_address}</p>
          )}
          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">DGC Balance</p>
              <p className="gradient-text text-4xl font-extrabold">{(profile?.dgc_balance ?? 0).toFixed(2)}</p>
            </div>
            <img src={dgcCoin.url} alt="DGC" className="size-14 rounded-2xl object-cover neon-glow" />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass rounded-3xl p-6 text-center"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Daily Mining</p>
          <h3 className="mt-1 text-lg font-semibold">Claim your free DGC</h3>

          <motion.button
            onClick={mine} disabled={!canMine || mining}
            whileTap={{ scale: 0.95 }}
            className={`mx-auto my-6 grid size-32 place-items-center rounded-full text-primary-foreground transition-all ${
              canMine ? "bg-gradient-primary animate-pulse-glow" : "bg-muted text-muted-foreground"
            }`}
          >
            {mining ? <Loader2 className="size-10 animate-spin" /> : <Pickaxe className="size-12" />}
          </motion.button>

          {canMine ? (
            <p className="text-sm font-medium gradient-text">Ready to mine! Earn 1–5 DGC</p>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              <span>Next mine in <span className="font-mono font-semibold text-foreground">{formatDuration(remaining)}</span></span>
            </div>
          )}
          <Button onClick={mine} disabled={!canMine || mining} className="bg-gradient-primary mt-5 h-11 w-full rounded-xl font-semibold">
            {mining ? "Mining…" : canMine ? "⛏ Mine DGC now" : "On cooldown"}
          </Button>
        </motion.section>

        <RewardedAdCard />



        <div className="grid grid-cols-2 gap-3">
          <QuickCard icon={Sparkles} label="Explore" to="/app/gallery" />
          <Button onClick={signOut} variant="ghost" className="text-muted-foreground">Sign out</Button>
        </div>
      </div>
    </>
  );
}

function QuickCard({ icon: Icon, label, to }: { icon: React.ComponentType<{ className?: string }>; label: string; to: string }) {
  return (
    <a href={to} className="glass flex items-center gap-2 rounded-2xl p-4 hover:neon-glow">
      <Icon className="size-5" />
      <span className="text-sm font-semibold">{label}</span>
    </a>
  );
}

function RewardedAdCard() {
  const { canShowAd } = useAd();
  if (!canShowAd) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="glass flex items-center gap-3 rounded-3xl p-4"
    >
      <div className="grid size-11 place-items-center rounded-xl bg-gradient-accent">
        <Megaphone className="size-5 text-accent-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">Rewarded Pi Ads</p>
        <p className="text-xs text-muted-foreground">Watch a short ad for bonus DGC (coming soon)</p>
      </div>
      <Button variant="outline" size="sm" className="rounded-xl"
        onClick={() => toast.message("Pi Ad integration", { description: "Pi.Ads.showAd('rewarded') will be wired here." })}>
        Watch Ad
      </Button>
    </motion.section>
  );
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
