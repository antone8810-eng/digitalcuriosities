import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, User as UserIcon, Wallet, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const [profile, setProfile] = useState<{ display_name: string | null; pi_username: string | null; pi_wallet_address: string | null; dgc_balance: number } | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => { (async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setEmail(u.user.email ?? null);
    const { data } = await supabase.from("profiles").select("display_name,pi_username,pi_wallet_address,dgc_balance").eq("id", u.user.id).single();
    setProfile(data as never);
    const { count: c } = await supabase.from("curiosities").select("*", { count: "exact", head: true }).eq("owner_id", u.user.id);
    setCount(c ?? 0);
  })(); }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <>
      <TopBar balance={profile?.dgc_balance ?? null} />
      <div className="space-y-4 px-4 py-5">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass neon-glow rounded-3xl p-6 text-center">
          <div className="bg-gradient-primary mx-auto mb-3 grid size-20 place-items-center rounded-3xl">
            <UserIcon className="size-9 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">{profile?.pi_username || profile?.display_name || "Pioneer"}</h1>
          {email && <p className="text-xs text-muted-foreground">{email}</p>}
        </motion.section>

        <Row icon={Wallet} label="Pi Wallet" value={profile?.pi_wallet_address || "Not linked"} mono />
        <Row icon={Mail} label="Email" value={email || "—"} />
        <Row icon={UserIcon} label="Curios minted" value={String(count)} />

        <Button onClick={signOut} variant="destructive" className="h-12 w-full rounded-2xl">
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </>
  );
}

function Row({ icon: Icon, label, value, mono }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean }) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-4">
      <div className="grid size-10 place-items-center rounded-xl bg-muted"><Icon className="size-4" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`truncate text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
