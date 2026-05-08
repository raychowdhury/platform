"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Field } from "@/components/auth/shared";

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

export default function Reset() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  const [c, setC] = useState("");
  const s = useMemo(() => strength(pw), [pw]);
  const ok = pw.length >= 8 && pw === c;
  const labels = ["Too weak", "Weak", "Okay", "Strong", "Excellent"];
  const colors = ["bg-bear", "bg-bear", "bg-[oklch(0.78_0.16_85)]", "bg-bull", "bg-bull"];

  return (
    <div className="min-h-screen bg-background text-foreground grid place-items-center p-6">
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[700px] rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.22_280/0.25),transparent)] blur-3xl" />
      </div>
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 mb-10 justify-center">
          <div className="size-7 rounded-[6px] bg-gradient-to-br from-accent to-violet grid place-items-center text-[11px] font-bold">T</div>
          <span className="font-display text-xl">Trevise</span>
        </Link>

        <div className="size-12 rounded-full bg-muted grid place-items-center"><ShieldCheck className="size-5 text-accent" /></div>
        <h1 className="font-display text-3xl mt-4">Set a new password</h1>
        <p className="text-foreground/60 text-sm mt-2">Choose something you haven't used before.</p>

        <form onSubmit={(e) => { e.preventDefault(); if (ok) router.push("/login"); }} className="mt-7 space-y-3">
          <Field label="New password">
            <div className="relative">
              <input type={show ? "text" : "password"} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" className="w-full bg-muted border hairline px-3 py-2.5 text-sm outline-none focus:border-accent pr-10" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-1">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            </div>
            <div className="mt-2 flex gap-1">
              {[0, 1, 2, 3].map((i) => <div key={i} className={`h-1 flex-1 rounded-full ${i < s ? colors[s - 1] : "bg-muted"}`} />)}
            </div>
            <div className="mt-1.5 text-[11px] text-foreground/50">{pw ? labels[s] : "Use 8+ chars, a number, and a symbol"}</div>
          </Field>
          <Field label="Confirm new password">
            <input type={show ? "text" : "password"} required value={c} onChange={(e) => setC(e.target.value)} placeholder="Repeat password" className="w-full bg-muted border hairline px-3 py-2.5 text-sm outline-none focus:border-accent" />
            {c && c !== pw && <div className="mt-1.5 text-[11px] text-bear">Passwords don't match</div>}
          </Field>
          <button type="submit" disabled={!ok} className="w-full bg-foreground text-background py-2.5 text-sm hover:bg-muted inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            Update password <ArrowRight className="size-4" />
          </button>
        </form>

        <div className="mt-8 text-[12px] text-foreground/60 text-center">
          <Link href="/login" className="text-foreground hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
