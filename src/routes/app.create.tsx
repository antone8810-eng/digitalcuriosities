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

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function CreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [price, setPrice] = useState("1");
  const [currency, setCurrency] = useState<"DGC" | "PI">("DGC");
  const [submitting, setSubmitting] = useState(false);

  function onFile(f: File | null) {
    if (!f) { setFile(null); setPreview(""); return; }
    if (!ALLOWED.includes(f.type)) return toast.error("Use JPG, PNG, or WebP");
    if (f.size > MAX_BYTES) return toast.error("Max file size is 5MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setImageUrl("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      let finalUrl = imageUrl || null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${u.user.id}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("curio-images").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("curio-images").getPublicUrl(path);
        finalUrl = pub.publicUrl;
      }

      const { error } = await supabase.from("curiosities").insert({
        owner_id: u.user.id, name, description: description || null,
        image_url: finalUrl, price: Number(price) || 0, currency,
      });
      if (error) throw error;
      toast.success("Curio minted!");
      navigate({ to: "/app/gallery" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mint");
    } finally {
      setSubmitting(false);
    }
  }

  const previewSrc = preview || imageUrl;

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
            {previewSrc ? (
              <img src={previewSrc} alt="preview" className="aspect-square w-full max-w-[200px] rounded-xl object-cover" />
            ) : (
              <Gem className="size-16 text-primary-foreground" />
            )}
          </div>

          <Field label="Name">
            <Input required maxLength={80} placeholder="Cosmic Badge #001" value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl" />
          </Field>
          <Field label="Description">
            <Textarea maxLength={500} placeholder="A rare achievement from the Pi frontier…" value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl" />
          </Field>

          <Field label="Upload image (JPG/PNG/WebP, ≤5MB)">
            <label className="glass flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-medium hover:neon-glow">
              <Upload className="size-4" />
              <span>{file ? file.name : "Choose file"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
            </label>
          </Field>

          <Field label="…or paste an Image URL">
            <Input placeholder="https://…" value={imageUrl} disabled={!!file} onChange={e => setImageUrl(e.target.value)} className="h-11 rounded-xl" />
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
