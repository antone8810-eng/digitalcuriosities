import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Gem, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/app/gallery")({ component: GalleryPage });

type Curio = {
  id: string; name: string; description: string | null; image_url: string | null;
  price: number; currency: "DGC" | "PI"; owner_id: string; created_at: string;
};
type Owner = { id: string; display_name: string | null; pi_username: string | null };

function GalleryPage() {
  const [items, setItems] = useState<Curio[]>([]);
  const [owners, setOwners] = useState<Record<string, Owner>>({});
  const [balance, setBalance] = useState<number | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [selected, setSelected] = useState<Curio | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const fetchOwners = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const { data: profs } = await supabase.from("public_profiles").select("id,display_name,pi_username").in("id", ids);
    setOwners(prev => {
      const next = { ...prev };
      (profs ?? []).forEach((p) => { if (p.id) next[p.id] = p as Owner; });
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? null);
    if (u.user) {
      const { data: prof } = await supabase.from("users").select("dgc_balance").eq("auth_user_id", u.user.id).maybeSingle();
      setBalance(Number(prof?.dgc_balance ?? 0));
    }
    const { data } = await supabase.from("curiosities").select("*").order("created_at", { ascending: false });
    const curios = (data ?? []) as Curio[];
    setItems(curios);
    await fetchOwners([...new Set(curios.map(c => c.owner_id))]);
    setLoading(false);
  }, [fetchOwners]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh when curiosities change
  useEffect(() => {
    const channel = supabase
      .channel("curiosities-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "curiosities" }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function buy() {
    if (!selected || !me) return;
    setBuying(true);
    const { data, error } = await supabase.rpc("purchase_curio", { _curio_id: selected.id });
    setBuying(false);
    if (error) return toast.error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    setBalance(Number(row?.new_balance ?? balance ?? 0));
    toast.success(`Purchased "${selected.name}" for ${selected.price} DGC`);
    setSelected(null);
    load();
  }

  return (
    <>
      <TopBar balance={balance} />
      <div className="px-4 py-5">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Curio <span className="gradient-text">Gallery</span></h1>
          <p className="text-sm text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"} in the bazaar</p>
        </div>

        {loading ? (
          <GallerySkeleton />
        ) : items.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <p className="text-sm text-muted-foreground">No curios yet. Be the first to mint one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelected(c)}
                className="glass overflow-hidden rounded-2xl text-left transition-shadow hover:neon-glow"
              >
                <div className="aspect-square w-full overflow-hidden bg-gradient-primary">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-primary-foreground">
                      <Gem className="size-10" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground truncate">
                      @{owners[c.owner_id]?.pi_username || owners[c.owner_id]?.display_name || "owner"}
                    </span>
                    <Badge variant="secondary" className="rounded-lg px-2 text-[10px]">
                      {c.price} {c.currency}
                    </Badge>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="glass max-w-md rounded-3xl">
          {selected && (() => {
            const isOwner = selected.owner_id === me;
            const isPi = selected.currency === "PI";
            return (
              <>
                <div className="aspect-square w-full overflow-hidden rounded-2xl bg-gradient-primary">
                  {selected.image_url ? <img src={selected.image_url} alt={selected.name} className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Gem className="size-16 text-primary-foreground" /></div>}
                </div>
                <DialogHeader>
                  <DialogTitle className="text-xl">{selected.name}</DialogTitle>
                  <DialogDescription>{selected.description || "A mysterious digital curiosity."}</DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Owner</p>
                    <p className="text-sm font-semibold">@{owners[selected.owner_id]?.pi_username || owners[selected.owner_id]?.display_name || "unknown"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-muted-foreground">Price</p>
                    <p className="gradient-text text-xl font-bold">{selected.price} {selected.currency}</p>
                  </div>
                </div>
                {isPi ? (
                  <Button className="h-11 w-full rounded-xl" disabled>π Pi payments coming soon</Button>
                ) : isOwner ? (
                  <Button className="h-11 w-full rounded-xl" disabled>You own this curio</Button>
                ) : (
                  <Button onClick={buy} disabled={buying || (balance ?? 0) < selected.price}
                    className="bg-gradient-primary h-11 w-full rounded-xl font-semibold neon-glow">
                    {buying ? <Loader2 className="size-4 animate-spin" /> : (balance ?? 0) < selected.price ? "Insufficient DGC" : `Buy for ${selected.price} DGC`}
                  </Button>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass aspect-[3/4] animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}
