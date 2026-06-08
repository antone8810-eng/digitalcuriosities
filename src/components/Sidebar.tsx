import { Link, useRouterState } from "@tanstack/react-router";
import { Gem, LayoutGrid, PlusCircle, User, Sparkles } from "lucide-react";

const items = [
  { to: "/app", icon: Gem, label: "Mine" },
  { to: "/app/gallery", icon: LayoutGrid, label: "Gallery" },
  { to: "/app/create", icon: PlusCircle, label: "Create" },
  { to: "/app/profile", icon: User, label: "Profile" },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-64 shrink-0 flex-col gap-2 p-4">
      <div className="glass mb-3 flex items-center gap-2 rounded-2xl p-4">
        <div className="bg-gradient-primary grid size-10 place-items-center rounded-xl neon-glow">
          <Sparkles className="size-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Digital</p>
          <p className="gradient-text text-sm font-bold leading-tight">Curiosities</p>
        </div>
      </div>
      <nav className="glass flex flex-1 flex-col gap-1 rounded-2xl p-2">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active ? "bg-gradient-primary text-primary-foreground neon-glow" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
