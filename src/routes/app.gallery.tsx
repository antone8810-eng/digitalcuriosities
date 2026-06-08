import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gem } from "lucide-react";
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
  const [selected, setSelected] = useState<Curio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: prof } = await supabase.from("profiles").select("dgc_balance").eq("id", u.user.id).single();
      setBalance(prof?.dgc_balance ?? 0);
    }
    const { data } = await supabase.from("curiosities").select("*").order("created_at", { ascending: false });
    const curios = (data ?? []) as Curio[];
    setItems(curios);
    const ids = [...new Set(curios.map(c => c.owner_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,display_name,pi_username").in("id", ids);
      const map: Record<string, Owner> = {};
      (profs ?? []).forEach((p) => { map[p.id] = p as Owner; });
      setOwners(map);
    }
    setLoading(false);
  })(); }, []);

  return (
    <>
      <TopBar balance={balance} />
      <div className="px-4 py-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Curio <span className="gradient-text">Gallery</span></h1>
            <p className="text-sm text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"} in the bazaar</p>
          </div>
        </div>

        {loading ? (
          <GallerySkeleton />
        ) : items.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <p className="text-sm text-muted-foreground">No curios yet. Be the first to mint one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
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
          {selected && (
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
              <Button className="bg-gradient-primary h-11 w-full rounded-xl font-semibold neon-glow" disabled>
                Purchase (coming soon)
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass aspect-[3/4] animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}
