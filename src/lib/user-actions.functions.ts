import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const mineDgc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("mine_dgc", {
      _auth_user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return Array.isArray(data) ? data[0] : data;
  });

export const purchaseCurio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { curioId: string }) => {
    if (!data?.curioId || typeof data.curioId !== "string") {
      throw new Error("Invalid curio");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: purchase, error } = await supabaseAdmin.rpc("purchase_curio", {
      _auth_user_id: context.userId,
      _curio_id: data.curioId,
    });
    if (error) throw new Error(error.message);
    return Array.isArray(purchase) ? purchase[0] : purchase;
  });