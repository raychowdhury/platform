"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Glass } from "@/components/marketing/MarketingLayout";
import { ArrowRight, Check, Eye, EyeOff, Sparkles, Bot, Trophy } from "lucide-react";
import { Field, GoogleIcon, AppleIcon } from "@/components/auth/shared";

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

export default function Signup() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const s = useMemo(() => strength(pw), [pw]);
  const labels = ["Too weak", "Weak", "Okay", "Strong", "Excellent"];
  const colors = ["bg-bear", "bg-bear", "bg-[oklch(0.78_0.16_85)]", "bg-bull", "bg-bull"];

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

          <h1 className="font-display text-3xl">Create your account</h1>
          <p className="text-foreground/60 text-sm mt-2">Free for 14 days. No card required.</p>

          <div className="mt-7 grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-2 border hairline bg-muted hover:bg-muted py-2.5 text-[13px]"><GoogleIcon /> Google</button>
            <button className="flex items-center justify-center gap-2 border hairline bg-muted hover:bg-muted py-2.5 text-[13px]"><AppleIcon /> Apple</button>
          </div>

          <div className="my-6 flex items-center gap-3 text-[11px] text-foreground/40">
            <div className="h-px flex-1 bg-muted" /> or sign up with email <div className="h-px flex-1 bg-muted" />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); setLoading(true); setTimeout(() => router.push("/dashboard"), 700); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name"><input required placeholder="Angelina" className="w-full bg-muted border hairline px-3 py-2.5 text-sm outline-none focus:border-accent" /></Field>
              <Field label="Last name"><input required placeholder="Park" className="w-full bg-muted border hairline px-3 py-2.5 text-sm outline-none focus:border-accent" /></Field>
            </div>
            <Field label="Work email"><input type="email" required placeholder="you@company.com" className="w-full bg-muted border hairline px-3 py-2.5 text-sm outline-none focus:border-accent" /></Field>
            <Field label="Password">
              <div className="relative">
                <input type={show ? "text" : "password"} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" className="w-full bg-muted border hairline px-3 py-2.5 text-sm outline-none focus:border-accent pr-10" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-1">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <div className="mt-2 flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i < s ? colors[s - 1] : "bg-muted"}`} />
                ))}
              </div>
              <div className="mt-1.5 text-[11px] text-foreground/50">{pw ? labels[s] : "Use 8+ chars, a number, and a symbol"}</div>
            </Field>

            <label className="flex items-start gap-2 text-[12px] text-foreground/60">
              <input type="checkbox" required className="accent-accent mt-0.5" />
              <span>I agree to the <Link href="/terms" className="text-foreground hover:underline">Terms</Link> and <Link href="/privacy" className="text-foreground hover:underline">Privacy Policy</Link>.</span>
            </label>

            <button type="submit" disabled={loading} className="w-full mt-2 bg-foreground text-background py-2.5 text-sm hover:bg-muted inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? "Creating account…" : <>Create account <ArrowRight className="size-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-[12px] text-foreground/60 text-center">
            Already have an account? <Link href="/login" className="text-foreground hover:underline">Sign in</Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:block relative overflow-hidden border-l border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.2_0.05_280)] via-[oklch(0.18_0.04_260)] to-[oklch(0.16_0.04_220)]" />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="relative h-full flex items-center justify-center p-12">
          <Glass className="p-8 max-w-md">
            <div className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">Your free 14 days include</div>
            <ul className="mt-5 space-y-4">
              {[
                { Icon: Sparkles, t: "Unlimited AI signals", d: "Across futures, equities, FX, and futures." },
                { Icon: Bot, t: "5 autonomous AI traders", d: "Run, pause, or copy in one click." },
                { Icon: Trophy, t: "Leaderboard & community", d: "Copy top risk-adjusted traders." },
              ].map((p) => (
                <li key={p.t} className="flex gap-3">
                  <div className="size-9 rounded-[8px] bg-muted grid place-items-center"><p.Icon className="size-4 text-accent" /></div>
                  <div>
                    <div className="text-sm">{p.t}</div>
                    <div className="text-[12px] text-foreground/50">{p.d}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-border flex items-center gap-2 text-[12px] text-foreground/60">
              <Check className="size-4 text-bull" /> No card required · Cancel anytime
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}
