import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="bg-app flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-3xl p-10 text-center">
        <h1 className="gradient-text text-7xl font-bold">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">This curio doesn't exist.</p>
        <a href="/" className="bg-gradient-primary mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground neon-glow">Go home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="bg-app flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="bg-gradient-primary mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { title: "Digital Curiosities — Pi dApp" },
      { name: "description", content: "Mine DGC, collect and trade unique digital curiosities on the Pi Network." },
      { name: "theme-color", content: "#1a1030" },
      { property: "og:title", content: "Digital Curiosities — Pi dApp" },
      { property: "og:description", content: "Mine DGC, collect and trade unique digital curiosities on the Pi Network." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Digital Curiosities — Pi dApp" },
      { name: "twitter:description", content: "Mine DGC, collect and trade unique digital curiosities on the Pi Network." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d49c2950-3344-4b0a-bfa8-000907783b4b/id-preview-33297279--34d632c3-ae81-4ec4-b0ad-d7f6acc5d3e2.lovable.app-1780959890633.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d49c2950-3344-4b0a-bfa8-000907783b4b/id-preview-33297279--34d632c3-ae81-4ec4-b0ad-d7f6acc5d3e2.lovable.app-1780959890633.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [{ src: "https://sdk.minepi.com/pi-sdk.js", defer: true }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.Pi) {
      window.Pi.init({ version: "2.0", sandbox: true });
      console.log("Pi SDK initialized in sandbox mode");
    } else {
      console.warn("Pi SDK not available - not in Pi Browser");
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
