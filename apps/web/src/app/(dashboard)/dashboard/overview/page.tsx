"use client";
import { PortfolioOverview } from "@/components/dashboard/PortfolioOverview";
import { MarketChart } from "@/components/dashboard/MarketChart";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { Allocation } from "@/components/dashboard/Allocation";
import { AIAlerts } from "@/components/dashboard/AIAlerts";
import { AITraders } from "@/components/dashboard/AITraders";
import { Positions } from "@/components/dashboard/Positions";
import { BreakingNews } from "@/components/dashboard/BreakingNews";
import { QuickTrade } from "@/components/dashboard/QuickTrade";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { CommunityChat } from "@/components/dashboard/CommunityChat";


export default function Dashboard() {
  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Friday · May 8</div>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-[0.95]">
            Good morning, <em className="not-italic text-accent italic">Angelina</em>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Markets are open. Your book is up <span className="text-bull font-mono">+1.5%</span> today.
            3 new AI signals waiting in queue.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <button className="px-3 py-2 hover:bg-white/5 border hairline text-muted-foreground hover:text-foreground">Export</button>
          <button className="px-3 py-2 hover:bg-white/5 border hairline text-muted-foreground hover:text-foreground">Customize</button>
          <button className="px-3 py-2 bg-accent/15 border border-accent/30 text-accent">Run AI scan</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2"><PortfolioOverview /></div>
        <Allocation />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2"><MarketChart /></div>
        <QuickTrade />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Watchlist />
        <PerformanceMetrics />
      </div>
      <AITraders />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2"><AIAlerts /></div>
        <BreakingNews />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2"><Positions /></div>
        <CommunityChat />
      </div>
    </>
  );
}

