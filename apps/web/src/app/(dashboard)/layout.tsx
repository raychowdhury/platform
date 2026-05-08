"use client";
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
};

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = PAGE_LABELS[pathname] ?? "Overview";
  return (
    <DashboardLayout breadcrumb={[{ label: "Workspace" }, { label: section }]}>
      {children}
    </DashboardLayout>
  );
}
