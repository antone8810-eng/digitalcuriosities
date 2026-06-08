import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { piAuthenticate } from "@/lib/pi";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading("signin");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/app" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading("signup");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/app", data: { display_name: displayName } },
    });
    setLoading(null);
    if (error) return toast.error(error.message);
    toast.success("Account created — signing you in…");
    navigate({ to: "/app" });
  }

  async function handleGoogle() {
    setLoading("google");
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (res.error) { setLoading(null); toast.error("Google sign-in failed"); return; }
    if (!res.redirected) navigate({ to: "/app" });
  }

  async function handlePi() {
    setLoading("pi");
    try {
      const pi = await piAuthenticate();
      // Link Pi identity to a Supabase user via deterministic email
      const piEmail = `${pi.username}@pi.local`;
      const piPwd = `pi_${pi.accessToken.slice(0, 24)}`;
      let { error } = await supabase.auth.signInWithPassword({ email: piEmail, password: piPwd });
      if (error) {
        const su = await supabase.auth.signUp({
          email: piEmail, password: piPwd,
          options: { data: { display_name: pi.username, pi_username: pi.username } },
        });
        if (su.error) throw su.error;
      }
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("profiles").update({
          pi_username: pi.username, pi_wallet_address: pi.walletAddress, display_name: pi.username,
        }).eq("id", u.user.id);
      }
      toast.success(`Signed in as ${pi.username}`);
      navigate({ to: "/app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pi sign-in failed");
    } finally { setLoading(null); }
  }

  return (
    <>
      <AnimatedBackground />
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass neon-glow w-full max-w-md rounded-3xl p-6 sm:p-8"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="bg-gradient-primary mb-3 grid size-16 place-items-center rounded-2xl neon-glow"
            >
              <Sparkles className="size-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold">Digital <span className="gradient-text">Curiosities</span></h1>
            <p className="mt-1 text-sm text-muted-foreground">A Pi Network collectibles ecosystem</p>
          </div>

          <Button onClick={handlePi} disabled={!!loading} className="bg-gradient-primary mb-3 h-12 w-full rounded-xl text-base font-semibold neon-glow">
            {loading === "pi" ? <Loader2 className="size-5 animate-spin" /> : <>π · Continue with Pi</>}
          </Button>

          <div className="flex items-center gap-3 py-3 text-xs uppercase text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3 pt-3">
                <Field icon={Mail}><Input type="email" required placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} /></Field>
                <Field icon={Lock}><Input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
                <Button disabled={!!loading} className="bg-gradient-accent h-11 w-full rounded-xl font-semibold">
                  {loading === "signin" ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3 pt-3">
                <Field icon={Sparkles}><Input required placeholder="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} /></Field>
                <Field icon={Mail}><Input type="email" required placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} /></Field>
                <Field icon={Lock}><Input type="password" required minLength={6} placeholder="Password (min 6)" value={password} onChange={e => setPassword(e.target.value)} /></Field>
                <Button disabled={!!loading} className="bg-gradient-accent h-11 w-full rounded-xl font-semibold">
                  {loading === "signup" ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <Button onClick={handleGoogle} disabled={!!loading} variant="outline" className="mt-4 h-11 w-full rounded-xl">
            {loading === "google" ? <Loader2 className="size-4 animate-spin" /> : "Continue with Google"}
          </Button>
        </motion.div>
      </div>
    </>
  );
}

function Field({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <div className="[&_input]:h-11 [&_input]:rounded-xl [&_input]:pl-9">{children}</div>
    </div>
  );
}
