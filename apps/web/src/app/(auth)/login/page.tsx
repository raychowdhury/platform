"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Glass } from "@/components/marketing/MarketingLayout";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Field, GoogleIcon, AppleIcon } from "@/components/auth/shared";

function AuthShell({ children, side }: { children: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground grid grid-cols-1 lg:grid-cols-2">
      <div className="relative flex items-center justify-center p-8">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.22_280/0.3),transparent)] blur-3xl" />
        </div>
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-6 h-6 bg-accent grid place-items-center shrink-0">
              <span className="font-mono text-[11px] font-bold text-accent-foreground">T</span>
            </div>
            <span className="font-display text-[13px] tracking-tight">TREVISE</span>
            <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] ml-1">TERMINAL · v4.2</span>
          </Link>
          {children}
        </div>
      </div>
      <div className="hidden lg:block relative overflow-hidden border-l border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.2_0.05_280)] via-[oklch(0.18_0.04_260)] to-[oklch(0.16_0.04_220)]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative h-full flex items-center justify-center p-12">{side}</div>
      </div>
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <AuthShell
      side={
        <Glass className="p-8 max-w-md">
          <div className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">Live · NYSE open</div>
          <div className="font-display text-3xl mt-3 leading-tight">"Trevise replaced four tools and a Notion. The AI agents alone earn the subscription back weekly."</div>
          <div className="mt-6 flex items-center gap-3">
            <div className="size-9 rounded-full bg-gradient-to-br from-accent/40 to-violet/40 grid place-items-center text-xs font-bold">MR</div>
            <div>
              <div className="text-sm">Maya Reis</div>
              <div className="text-[11px] text-foreground/50">Equities PM, London</div>
            </div>
          </div>
        </Glass>
      }
    >
      <h1 className="font-display text-3xl">Welcome back</h1>
      <p className="text-foreground/60 text-sm mt-2">Sign in to your Trevise workspace.</p>

      <div className="mt-7 grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-2 border hairline bg-muted hover:bg-muted py-2.5 text-[13px]">
          <GoogleIcon /> Google
        </button>
        <button className="flex items-center justify-center gap-2 border hairline bg-muted hover:bg-muted py-2.5 text-[13px]">
          <AppleIcon /> Apple
        </button>
      </div>

      <div className="my-6 flex items-center gap-3 text-[11px] text-foreground/40">
        <div className="h-px flex-1 bg-muted" /> or continue with email <div className="h-px flex-1 bg-muted" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setTimeout(() => router.push("/dashboard"), 700);
        }}
        className="space-y-3"
      >
        <Field label="Email">
          <input type="email" required defaultValue="" placeholder="you@trevise.app" className="w-full bg-muted border hairline px-3 py-2.5 text-sm placeholder:text-foreground/30 outline-none focus:border-accent" />
        </Field>
        <Field label="Password" right={<Link href="/forgot-password" className="text-[11px] text-foreground/60 hover:text-foreground">Forgot?</Link>}>
          <div className="relative">
            <input type={show ? "text" : "password"} required placeholder="••••••••" className="w-full bg-muted border hairline px-3 py-2.5 text-sm placeholder:text-foreground/30 outline-none focus:border-accent pr-10" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-1">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <label className="flex items-center gap-2 text-[12px] text-foreground/60">
          <input type="checkbox" defaultChecked className="accent-accent" /> Remember me for 30 days
        </label>
        <button type="submit" disabled={loading} className="w-full mt-2 bg-foreground text-background py-2.5 text-sm hover:bg-muted inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? "Signing in…" : <>Sign in <ArrowRight className="size-4" /></>}
        </button>
      </form>

      <div className="mt-6 text-[12px] text-foreground/60 text-center">
        Don't have an account? <Link href="/signup" className="text-foreground hover:underline">Create one</Link>
      </div>
    </AuthShell>
  );
}
