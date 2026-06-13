import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import dgcCoin from "@/assets/dgc-coin.jpg.asset.json";

export function TopBar({ balance }: { balance?: number | null }) {
  const { theme, toggle } = useTheme();
  const { data: user } = useUser();
  const shown = balance ?? user?.dgc_balance ?? null;
  return (
    <header className="sticky top-0 z-30 px-4 pt-4">
      <div className="glass mx-auto flex max-w-3xl items-center justify-between rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <img src={dgcCoin.url} alt="DGC token" className="size-8 rounded-full object-cover neon-glow" />
        
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {user?.pi_username ? `@${user.pi_username}` : "Balance"}
            </p>
            <p className="text-sm font-bold gradient-text">{shown?.toFixed(2) ?? "—"} DGC</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={toggle} className="rounded-full">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
    </header>
  );
}
