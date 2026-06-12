import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { LogOut, User as UserIcon, Wallet, Mail, Pencil, Trash2, Loader2, Gem, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { PiPaymentButton } from "@/components/PiPaymentButton";
import { useUser, useRefreshUser } from "@/hooks/use-user";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

type Curio = { id: string; name: string; description: string | null; image_url: string | null; price: number; currency: "DGC" | "PI" };

function ProfilePage() {
  const { data: profile } = useUser();
  const refreshUser = useRefreshUser();
  const [vipOpen, setVipOpen] = useState(false);
  const email = profile?.email ?? null;
  const [mine, setMine] = useState<Curio[]>([]);
  const [editing, setEditing] = useState<Curio | null>(null);
  const [confirmDel, setConfirmDel] = useState<Curio | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: c } = await supabase.from("curiosities").select("id,name,description,image_url,price,currency").eq("owner_id", u.user.id).order("created_at", { ascending: false });
    setMine((c ?? []) as Curio[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from("curiosities").update({
      name: editing.name,
      description: editing.description,
      price: Number(editing.price) || 0,
      currency: editing.currency,
    }).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Curio updated");
    setEditing(null);
    load();
  }

  async function doDelete() {
    if (!confirmDel) return;
    const { error } = await supabase.from("curiosities").delete().eq("id", confirmDel.id);
    if (error) return toast.error(error.message);
    toast.success("Curio deleted");
    setConfirmDel(null);
    load();
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
          <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">DGC Balance</p>
          <p className="gradient-text text-3xl font-extrabold">{(profile?.dgc_balance ?? 0).toFixed(2)}</p>
        </motion.section>

        <Row icon={Wallet} label="Pi Wallet" value={profile?.pi_wallet_address || "Not linked"} mono />
        <Row icon={Mail} label="Email" value={email || "—"} />

        {(() => {
          const isVip = !!profile?.vip_until && new Date(profile.vip_until).getTime() > Date.now();
          return (
            <Button
              onClick={() => setVipOpen(true)}
              className="bg-gradient-accent h-12 w-full rounded-2xl font-semibold text-accent-foreground"
            >
              <Crown className="size-4" />
              {isVip ? `VIP active · until ${new Date(profile!.vip_until!).toLocaleDateString()}` : "Upgrade to VIP"}
            </Button>
          );
        })()}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">My Curios ({mine.length})</h2>
          {mine.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">No curios yet</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {mine.map(c => (
                <div key={c.id} className="glass overflow-hidden rounded-2xl">
                  <div className="aspect-square w-full overflow-hidden bg-gradient-primary">
                    {c.image_url ? <img src={c.image_url} alt={c.name} className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Gem className="size-8 text-primary-foreground" /></div>}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-semibold">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.price} {c.currency}</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 flex-1 rounded-lg text-[11px]" onClick={() => setEditing({ ...c })}>
                        <Pencil className="size-3" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 rounded-lg" onClick={() => setConfirmDel(c)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <Button onClick={signOut} variant="destructive" className="h-12 w-full rounded-2xl">
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass rounded-3xl">
          <DialogHeader><DialogTitle>Edit Curio</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground">Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground">Description</Label>
                <Textarea value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Price</Label>
                  <Input type="number" min="0" step="0.01" value={editing.price} onChange={e => setEditing({ ...editing, price: Number(e.target.value) })} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Currency</Label>
                  <select value={editing.currency} onChange={e => setEditing({ ...editing, currency: e.target.value as "DGC" | "PI" })}
                    className="h-11 w-full rounded-xl border bg-background px-3 text-sm">
                    <option value="DGC">DGC</option>
                    <option value="PI">PI</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-gradient-primary">
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vipOpen} onOpenChange={setVipOpen}>
        <DialogContent className="glass rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crown className="size-5 text-accent" /> Upgrade to VIP</DialogTitle>
            <DialogDescription>Pay with Pi and enjoy 30 days of premium perks.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">✨ <span>No ads for 30 days</span></li>
            <li className="flex items-center gap-2">⛏ <span>Priority mining boosts (coming soon)</span></li>
            <li className="flex items-center gap-2">💎 <span>VIP badge on your profile</span></li>
          </ul>
          <PiPaymentButton amount={1} memo="Digital Curiosities — VIP 30 days" onSuccess={() => { setVipOpen(false); load(); }} />
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="glass rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirmDel?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
