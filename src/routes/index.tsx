import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({ component: IndexRedirect });

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      navigate({ to: data.session ? "/app" : "/auth", replace: true });
    }).catch(() => {
      if (!cancelled) navigate({ to: "/auth", replace: true });
    });
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="bg-app flex min-h-screen items-center justify-center">
      <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
