"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const VALID = new Set([
  "/dashboard/overview",
  "/dashboard/markets",
  "/dashboard/charts",
  "/dashboard/screener",
  "/dashboard/portfolio",
  "/dashboard/allocations",
  "/dashboard/alerts",
  "/dashboard/journal",
  "/dashboard/signals",
  "/dashboard/traders",
  "/dashboard/strategies",
  "/dashboard/leaderboard",
  "/dashboard/community",
  "/dashboard/academy",
  "/dashboard/billing",
]);

export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    let target = "/dashboard/overview";
    try {
      const last = localStorage.getItem("ui:dashboard-last-section");
      if (last && VALID.has(last)) target = last;
    } catch {}
    router.replace(target);
  }, [router]);

  return null;
}
