import { createServerFn } from "@tanstack/react-start";

/**
 * Verifies a Pi accessToken against the Pi Platform /me endpoint,
 * ensures a matching Supabase auth user exists, syncs the profile,
 * and returns a one-time magic-link token_hash the client can
 * exchange for a session via supabase.auth.verifyOtp().
 */
export const verifyPiAuth = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken: string }) => {
    if (!data?.accessToken || typeof data.accessToken !== "string" || data.accessToken.length > 4096) {
      throw new Error("Invalid accessToken");
    }
    return data;
  })
  .handler(async ({ data }) => {
    // 1. Verify token with Pi Platform
    const res = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!res.ok) {
      throw new Error("Pi token verification failed");
    }
    const me = (await res.json()) as { uid: string; username: string };
    if (!me?.uid || !me?.username) throw new Error("Invalid Pi profile response");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = `${me.uid}@pi.user`;

    // 2. Ensure auth user exists
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({
      page: 1, perPage: 1,
    });
    // listUsers doesn't filter; use getUserByEmail via admin API
    let userId: string | undefined;
    const lookup = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("pi_wallet_address", me.uid)
      .maybeSingle();
    if (lookup.data) userId = lookup.data.id;

    if (!userId) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { pi_username: me.username, display_name: me.username },
      });
      if (created.error && !created.error.message.includes("already")) {
        throw created.error;
      }
      userId = created.data?.user?.id;
      if (!userId) {
        // already exists — look up by email
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        userId = list.users.find(u => u.email === email)?.id;
      }
    }
    if (!userId) throw new Error("Failed to resolve Supabase user");

    // 3. Sync profile fields
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      pi_username: me.username,
      pi_wallet_address: me.uid,
      display_name: me.username,
    }, { onConflict: "id" });

    // 4. Generate magic-link token_hash for client to verifyOtp with
    const link = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (link.error) throw link.error;
    const hashed = link.data?.properties?.hashed_token;
    if (!hashed) throw new Error("Could not generate session token");

    return {
      email,
      tokenHash: hashed,
      user: { uid: me.uid, username: me.username },
    };
  });

void _unused;
const _unused = 0;
