"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/Layout";

const PAGE_LABELS: Record<string, string> = {
  "/dashboard/overview":    "Overview",
  "/dashboard/markets":     "Markets",
  "/dashboard/charts":      "Charts",
  "/dashboard/screener":    "Screener",
  "/dashboard/portfolio":   "Positions",
  "/dashboard/allocations": "Allocations",
  "/dashboard/alerts":      "Alerts",
  "/dashboard/journal":     "Journal",
  "/dashboard/signals":     "Signals",
  "/dashboard/traders":     "AI Traders",
  "/dashboard/strategies":  "Strategies",
  "/dashboard/leaderboard": "Leaderboard",
  "/dashboard/community":   "Community",
  "/dashboard/academy":     "Academy",
  "/dashboard/billing":     "Billing",
  "/dashboard/profile":    "Profile",
  "/dashboard/settings":   "Settings",
  "/dashboard/help":       "Help & Support",
};

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = PAGE_LABELS[pathname] ?? "Overview";
  // SSR-skip the entire dashboard subtree. Most pages use locale formatters
  // (toLocaleString), Recharts (window dim), and canvas charts that all
  // diverge between server-rendered HTML and client first paint, tripping
  // React #418. Cleaner to let the client own the whole tree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return (
    <DashboardLayout breadcrumb={[{ label: "Workspace" }, { label: section }]}>
      {mounted ? children : null}
    </DashboardLayout>
  );
}
