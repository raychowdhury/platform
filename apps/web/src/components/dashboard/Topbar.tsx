"use client";
import { Bell, ChevronDown, Menu, MoonStar, Sun, Activity, Wifi, User, Settings, LogOut, CreditCard, LifeBuoy } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tickers = [
  { s: "SPX",     p: "5,214.08",  c: "+0.42%", up: true },
  { s: "NDX",     p: "18,237.54", c: "+0.61%", up: true },
  { s: "DJI",     p: "39,512.13", c: "+0.18%", up: true },
  { s: "ES1!",  p: "63,719.90", c: "+1.24%", up: true },
  { s: "NQ1!",  p: "3,077.93",  c: "+0.42%", up: true },
  { s: "NVDA",    p: "1,128.34",  c: "+3.22%", up: true },
  { s: "TSLA",    p: "194.22",    c: "-4.14%", up: false },
  { s: "AAPL",    p: "182.94",    c: "+0.31%", up: true },
  { s: "XAUUSD",  p: "2,318.50",  c: "+0.18%", up: true },
  { s: "EURUSD",  p: "1.0784",    c: "-0.06%", up: false },
  { s: "DXY",     p: "104.62",    c: "+0.14%", up: true },
  { s: "VIX",     p: "13.42",     c: "-2.18%", up: false },
];

function useClock() {
  const [t, setT] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      const ss = String(d.getUTCSeconds()).padStart(2, "0");
      setT(`${hh}:${mm}:${ss}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export function Topbar({ onMenu, breadcrumb }: { onMenu: () => void; breadcrumb?: { label: string; to?: string }[] }) {
  const crumbs = breadcrumb ?? [{ label: "Workspace" }, { label: "Overview" }];
  const { theme, toggle } = useTheme();
  const utc = useClock();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 bg-background border-b hairline">
      {/* Row 1 — main bar */}
      <div className="h-14 px-3 lg:px-4 flex items-center gap-3 border-b hairline">
        <button onClick={onMenu} className="lg:hidden p-1.5 hover:bg-white/5 border hairline">
          <Menu className="w-4 h-4" />
        </button>

        <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em]">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/40">/</span>}
              <span className={i === crumbs.length - 1 ? "text-foreground" : "text-muted-foreground/70"}>{c.label}</span>
            </span>
          ))}
        </div>


        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em]">
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 border hairline">
            <span className="live-dot" />
            <span className="text-bull">LIVE</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground">UTC {utc}</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 border hairline text-muted-foreground" title="Latency">
            <Wifi className="w-3 h-3 text-bull" /> 12<span className="text-muted-foreground/50">ms</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 border hairline text-muted-foreground" title="Throughput">
            <Activity className="w-3 h-3" /> 4.2K<span className="text-muted-foreground/50">/s</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-1.5 hover:bg-white/5 border hairline text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <MoonStar className="w-3.5 h-3.5" />}
          </button>
          <button className="relative p-1.5 hover:bg-white/5 border hairline text-muted-foreground hover:text-foreground">
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full" />
          </button>
          <div className="w-px h-5 bg-white/10 mx-0.5 hidden md:block" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-white/5 border hairline ml-1 focus:outline-none focus:ring-1 focus:ring-accent/50">
                <div className="w-6 h-6 bg-accent grid place-items-center font-mono text-[11px] font-bold text-accent-foreground">A</div>
                <div className="hidden md:block text-left">
                  <div className="text-[11px] font-mono leading-none">A.KRAFT</div>
                  <div className="text-[9px] font-mono text-muted-foreground mt-0.5 uppercase tracking-[0.2em]">PRO · L4</div>
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 font-mono text-[12px]">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile"><User className="w-3.5 h-3.5 mr-2" />Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing"><CreditCard className="w-3.5 h-3.5 mr-2" />Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings"><Settings className="w-3.5 h-3.5 mr-2" />Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/help"><LifeBuoy className="w-3.5 h-3.5 mr-2" />Help & Support</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-bear focus:text-bear cursor-pointer"
                onClick={() => router.push("/login")}
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 2 — ticker tape (auto-scrolling marquee) */}
      <div className="h-7 flex items-center text-[10px] font-mono overflow-hidden relative group">
        <span className="text-accent uppercase tracking-[0.2em] shrink-0 px-3 lg:px-4 border-r hairline h-full flex items-center bg-background z-10">MKT/</span>
        <div className="flex-1 overflow-hidden">
          <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
            {[...tickers, ...tickers].map((t, i) => (
              <div key={`${t.s}-${i}`} className="flex items-center gap-1.5 whitespace-nowrap shrink-0 px-5">
                <span className="text-muted-foreground uppercase">{t.s}</span>
                <span>{t.p}</span>
                <span className={t.up ? "text-bull" : "text-bear"}>{t.c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
