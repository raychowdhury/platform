import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Globe2, Sun, MoonStar } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function MarketingNav() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-6 rounded-[6px] bg-gradient-to-br from-accent to-violet grid place-items-center text-[10px] font-bold">T</div>
          <span className="font-display text-lg tracking-tight">Trevise</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-[13px] text-foreground/70">
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/status" className="hover:text-foreground">Status</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            className="p-1.5 border border-border text-foreground/70 hover:text-foreground hover:bg-muted"
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <MoonStar className="size-3.5" />}
          </button>
          <Link href="/login" className="text-[13px] px-3 py-1.5 text-foreground/80 hover:text-foreground">Sign in</Link>
          <Link href="/signup" className="text-[13px] px-3 py-1.5 bg-foreground text-background hover:bg-muted inline-flex items-center gap-1">
            Get started <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const cols = [
    { t: "Product", l: [{ label: "Overview", to: "/dashboard" }, { label: "Markets", to: "/markets" }, { label: "Signals", to: "/signals" }] },
    { t: "Company", l: [{ label: "About", to: "/about" }, { label: "Status", to: "/status" }, { label: "Academy", to: "/academy" }] },
    { t: "Legal", l: [{ label: "Privacy", to: "/privacy" }, { label: "Terms", to: "/terms" }] },
  ] as const;
  return (
    <footer className="border-t border-border mt-20">
      <div className="max-w-[1280px] mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-[6px] bg-gradient-to-br from-accent to-violet grid place-items-center text-[10px] font-bold">T</div>
            <span className="font-display text-lg">Trevise</span>
          </div>
          <p className="mt-4 text-[13px] text-foreground/50 max-w-xs">The trading operating system for the AI era.</p>
          <div className="mt-4 flex items-center gap-3 text-[11px] text-foreground/40">
            <ShieldCheck className="size-3.5" /> SOC2 Type II · GDPR
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.t}>
            <div className="text-[11px] uppercase tracking-[0.25em] text-foreground/50">{c.t}</div>
            <ul className="mt-3 space-y-2 text-[13px] text-foreground/75">
              {c.l.map((item) => (
                <li key={item.label} className="hover:text-foreground"><Link href={item.to}>{item.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-6 py-5 flex items-center justify-between text-[11px] text-foreground/40">
          <div>© 2026 Trevise Labs, Inc.</div>
          <div className="flex items-center gap-2"><Globe2 className="size-3.5" /> EN · USD</div>
        </div>
      </div>
    </footer>
  );
}

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[900px] rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.22_280/0.25),transparent)] blur-3xl" />
        <div className="absolute top-40 -left-20 size-[500px] rounded-full bg-[radial-gradient(closest-side,oklch(0.65_0.2_200/0.18),transparent)] blur-3xl" />
      </div>
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

export function Glass({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`relative rounded-[14px] border hairline bg-muted backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_30px_80px_-30px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="max-w-[1280px] mx-auto px-6 pt-20 pb-10">
      <div className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">{eyebrow}</div>
      <h1 className="font-display text-5xl md:text-6xl mt-4 leading-[0.95] tracking-tight">{title}</h1>
      {sub && <p className="mt-5 text-foreground/60 max-w-2xl">{sub}</p>}
    </div>
  );
}
