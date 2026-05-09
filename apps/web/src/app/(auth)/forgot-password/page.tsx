"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { Field } from "@/components/auth/shared";

export default function Forgot() {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground grid place-items-center p-6">
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[700px] rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.22_280/0.25),transparent)] blur-3xl" />
      </div>
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-6 h-6 bg-accent grid place-items-center shrink-0">
            <span className="font-mono text-[11px] font-bold text-accent-foreground">T</span>
          </div>
          <span className="font-display text-[13px] tracking-tight">TREVISE</span>
          <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] ml-1">TERMINAL · v4.2</span>
        </Link>

        {!sent ? (
          <>
            <h1 className="font-display text-3xl">Forgot your password?</h1>
            <p className="text-foreground/60 text-sm mt-2">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="mt-7 space-y-3">
              <Field label="Email"><input type="email" required placeholder="you@trevise.app" className="w-full bg-muted border hairline px-3 py-2.5 text-sm outline-none focus:border-accent" /></Field>
              <button type="submit" className="w-full bg-foreground text-background py-2.5 text-sm hover:bg-muted inline-flex items-center justify-center gap-2">
                Send reset link <ArrowRight className="size-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="size-14 rounded-full bg-bull/15 grid place-items-center mx-auto"><MailCheck className="size-6 text-bull" /></div>
            <h1 className="font-display text-3xl mt-5">Check your inbox</h1>
            <p className="text-foreground/60 text-sm mt-2">We sent a reset link. It expires in 1 hour.</p>
            <button onClick={() => setSent(false)} className="text-[12px] text-foreground/60 hover:text-foreground mt-6">Try a different email</button>
          </div>
        )}

        <div className="mt-8 text-[12px] text-foreground/60 text-center">
          Remember it? <Link href="/login" className="text-foreground hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
