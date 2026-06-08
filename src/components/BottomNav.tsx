import { Link, useRouterState } from "@tanstack/react-router";
import { Gem, LayoutGrid, PlusCircle, User } from "lucide-react";

const items = [
  { to: "/app", icon: Gem, label: "Mine" },
  { to: "/app/gallery", icon: LayoutGrid, label: "Gallery" },
  { to: "/app/create", icon: PlusCircle, label: "Create" },
  { to: "/app/profile", icon: User, label: "Profile" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 md:hidden">
      <div className="glass mx-auto flex max-w-md items-center justify-around rounded-2xl px-2 py-2 shadow-lg">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-all ${
                active ? "bg-gradient-primary text-primary-foreground neon-glow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
