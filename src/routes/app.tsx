import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <>
      <AnimatedBackground />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        <Sidebar />
        <main className="flex-1 pb-28 md:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </>
  );
}
