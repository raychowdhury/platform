"use client";
import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { usePersistentState } from "@/hooks/use-persistent-state";

export function DashboardLayout({
  children,
  breadcrumb,
}: {
  children: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
}) {
  const [collapsed, setCollapsed] = usePersistentState<boolean>("ui:sidebar-collapsed", false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/dashboard/")) {
      try { localStorage.setItem("ui:dashboard-last-section", pathname); } catch {}
    }
  }, [pathname]);

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={() => setCollapsed((c) => !c)} breadcrumb={breadcrumb} />
        <main className="flex-1 p-4 lg:p-6 flex flex-col gap-5 w-full">
          {children}
          <footer className="text-[11px] text-muted-foreground flex items-center justify-between py-6 border-t hairline mt-auto">
            <span>© Trevise — Trading OS</span>
            <span>Markets data simulated for demo. Not investment advice.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
