import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Gem, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/app/create")({ component: CreatePage });

function CreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("1");
  const [currency, setCurrency] = useState<"DGC" | "PI">("DGC");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSubmitting(false); return; }
    const { error } = await supabase.from("curiosities").insert({
      owner_id: u.user.id, name, description: description || null,
      image_url: imageUrl || null, price: Number(price) || 0, currency,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Curio minted!");
    navigate({ to: "/app/gallery" });
  }

  return (
    <>
      <TopBar balance={null} />
      <div className="px-4 py-5">
        <h1 className="mb-4 text-2xl font-bold">Mint a <span className="gradient-text">Curio</span></h1>
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass space-y-4 rounded-3xl p-5"
        >
          <div className="grid place-items-center rounded-2xl bg-gradient-primary p-6 neon-glow">
            {imageUrl ? (
              <img src={imageUrl} alt="preview" className="aspect-square w-full max-w-[200px] rounded-xl object-cover" onError={() => {}} />
            ) : (
              <Gem className="size-16 text-primary-foreground" />
            )}
          </div>

          <Field label="Name">
            <Input required placeholder="Cosmic Badge #001" value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl" />
          </Field>
          <Field label="Description">
            <Textarea placeholder="A rare achievement from the Pi frontier…" value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl" />
          </Field>
          <Field label="Image URL">
            <div className="flex gap-2">
              <Input placeholder="https://…" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="h-11 rounded-xl" />
              <Button type="button" variant="outline" size="icon" className="size-11 shrink-0 rounded-xl" disabled title="Upload coming soon">
                <Upload className="size-4" />
              </Button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price">
              <Input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="h-11 rounded-xl" />
            </Field>
            <Field label="Currency">
              <Select value={currency} onValueChange={(v) => setCurrency(v as "DGC" | "PI")}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DGC">DGC</SelectItem>
                  <SelectItem value="PI">π Pi</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Button disabled={submitting} className="bg-gradient-primary h-12 w-full rounded-xl text-base font-semibold neon-glow">
            {submitting ? <Loader2 className="size-5 animate-spin" /> : "✨ Mint Curio"}
          </Button>
        </motion.form>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
