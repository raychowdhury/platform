"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid, TrendingUp, CandlestickChart, Wallet, Sparkles,
  Bot, Bell, GraduationCap, Users, Settings, ChevronsLeft,
  Activity, PieChart, Trophy, ArrowUpRight, LifeBuoy, BookOpen, Zap, CreditCard
} from "lucide-react";

const sections = [
  {
    code: "01",
    label: "Market",
    items: [
      { code: "OVR", label: "Overview", icon: LayoutGrid, to: "/dashboard/overview" },
      { code: "MKT", label: "Markets", icon: TrendingUp, to: "/dashboard/markets" },
      { code: "CHT", label: "Charts", icon: CandlestickChart, to: "/dashboard/charts" },
      { code: "SCR", label: "Screener", icon: Activity, to: "/dashboard/screener" },
    ],
  },
  {
    code: "02",
    label: "Portfolio",
    items: [
      { code: "PRT", label: "Positions", icon: Wallet, to: "/dashboard/portfolio" },
      { code: "ALC", label: "Allocations", icon: PieChart, to: "/dashboard/allocations" },
      { code: "ALT", label: "Alerts", icon: Bell, to: "/dashboard/alerts", badge: "9" },
      { code: "JRN", label: "Journal", icon: BookOpen, to: "/dashboard/journal" },
    ],
  },
  {
    code: "03",
    label: "Intelligence",
    items: [
      { code: "SIG", label: "Signals", icon: Sparkles, to: "/dashboard/signals", badge: "12" },
      { code: "BOT", label: "AI Traders", icon: Bot, to: "/dashboard/traders" },
      { code: "STR", label: "Strategies", icon: Zap, to: "/dashboard/strategies" },
      { code: "LBD", label: "Leaderboard", icon: Trophy, to: "/dashboard/leaderboard" },
    ],
  },
  {
    code: "04",
    label: "Network",
    items: [
      { code: "COM", label: "Community", icon: Users, to: "/dashboard/community" },
      { code: "EDU", label: "Academy", icon: GraduationCap, to: "/dashboard/academy" },
    ],
  },
  {
    code: "05",
    label: "Account",
    items: [
      { code: "BIL", label: "Billing", icon: CreditCard, to: "/dashboard/billing" },
    ],
  },
] as const;

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <aside
      className={`hidden lg:flex shrink-0 flex-col border-r hairline bg-[var(--sidebar)] sticky top-0 h-screen z-30
        ${ready ? "transition-[width] duration-200" : ""}
        ${collapsed ? "w-[64px]" : "w-[224px]"}`}
    >
      <div className={`flex items-center gap-2.5 h-14 px-3 border-b hairline ${collapsed ? "justify-center" : ""}`}>
        <div className="w-7 h-7 bg-accent grid place-items-center shrink-0">
          <span className="font-mono text-[12px] font-bold text-accent-foreground">T</span>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-display text-[13px] leading-none tracking-tight">TREVISE</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground mt-1">TERMINAL · v4.2</div>
          </div>
        )}
        {!collapsed && (
          <span className="live-dot" title="Live" />
        )}
      </div>


      <nav className="flex-1 overflow-y-auto py-3 px-1.5 flex flex-col gap-4">
        {sections.map((sec) => (
          <div key={sec.label}>
            {!collapsed && (
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <span className="text-[9px] font-mono text-accent">{sec.code}</span>
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground">{sec.label}</span>
                <span className="flex-1 h-px bg-[var(--hairline)]" />
              </div>
            )}
            <div className="flex flex-col">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.to;
                const badge = (item as any).badge as string | undefined;
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex items-center ${collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"} py-1.5 text-[12px] transition-colors group
                      ${isActive
                        ? "text-foreground bg-white/[0.05]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.025]"}`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent" />
                    )}
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        <span className="text-[9px] font-mono text-muted-foreground/60 group-hover:text-muted-foreground">{(item as any).code}</span>
                        {badge && (
                          <span className="text-[9px] font-mono px-1 py-0.5 bg-accent/10 text-accent border border-accent/25">
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap bg-popover text-popover-foreground border hairline px-2 py-1 text-[11px] font-mono uppercase tracking-[0.15em] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        {item.label}
                        {badge && <span className="ml-2 text-accent">{badge}</span>}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t hairline p-3 flex flex-col gap-2">
        {!collapsed && (
          <div className="border hairline p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="w-3 h-3 text-accent" /> SYS · QUOTA
              </div>
              <span className="text-[9px] font-mono text-accent">68%</span>
            </div>
            <div className="h-[3px] bg-white/5 overflow-hidden">
              <div className="h-full bg-accent" style={{ width: "68%" }} />
            </div>
            <button className="text-[10px] font-mono uppercase tracking-wider mt-0.5 text-accent flex items-center gap-1 hover:gap-1.5 transition-all">
              Upgrade plan <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className={`flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}>
          <button title="Support" className="flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border hairline">
            <LifeBuoy className="w-3.5 h-3.5" />
            {!collapsed && <span>Help</span>}
          </button>
          <button title="Settings" className="flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border hairline">
            <Settings className="w-3.5 h-3.5" />
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
        <button
          onClick={onToggle}
          className="flex items-center justify-center gap-1.5 text-[10px] py-1.5 text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
        >
          <ChevronsLeft className={`w-3.5 h-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
