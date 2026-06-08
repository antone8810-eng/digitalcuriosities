import { Moon, Sun, Coins } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

export function TopBar({ balance }: { balance: number | null }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 px-4 pt-4">
      <div className="glass mx-auto flex max-w-3xl items-center justify-between rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-primary grid size-8 place-items-center rounded-lg neon-glow">
            <Coins className="size-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</p>
            <p className="text-sm font-bold gradient-text">{balance?.toFixed(2) ?? "—"} DGC</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={toggle} className="rounded-full">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
    </header>
  );
}
