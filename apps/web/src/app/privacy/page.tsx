"use client";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { ShieldCheck, Lock, Database, Eye, ArrowRight } from "lucide-react";

function Eyebrow({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
      <span className="text-accent">{code}</span>
      <span className="h-px w-6 bg-[var(--hairline)]" />
      <span>{children}</span>
    </div>
  );
}

const SECTIONS = [
  { id: "collect", n: "01", t: "Information we collect", b: "Account information (name, email, credentials), profile data, content you create, payment data (handled by our PCI-compliant processor), and usage data including IP, device, browser, and interaction events." },
  { id: "use", n: "02", t: "How we use information", b: "To provide and improve the Service, personalize your experience, deliver AI signals and analytics, communicate with you, prevent fraud, enforce our terms, and comply with legal obligations." },
  { id: "sharing", n: "03", t: "Sharing & disclosure", b: "We do not sell personal information. We share data only with: (a) service providers under strict contracts (hosting, analytics, payments), (b) if required by law or to protect rights, (c) in connection with a merger or acquisition, with notice to you." },
  { id: "ai-data", n: "04", t: "AI & machine learning", b: "We may use anonymized, aggregated trading data to improve our models. You can opt out of model training in your settings. Your individual orders, positions, and PnL are never used as training data without explicit consent." },
  { id: "cookies", n: "05", t: "Cookies & tracking", b: "We use essential cookies for authentication and preferences, and analytics cookies to understand product usage. You can control cookies through browser settings. We honor Global Privacy Control (GPC) signals." },
  { id: "security", n: "06", t: "Security", b: "Encryption in transit (TLS 1.3) and at rest (AES-256). SOC 2 Type II audited. MFA, role-based access, hardware security keys for staff. Bug bounty program. Annual third-party penetration testing." },
  { id: "rights", n: "07", t: "Your rights", b: "Subject to applicable law, you may access, correct, delete, port, or restrict processing of your data. EU/UK residents have rights under GDPR. California residents have rights under CCPA/CPRA. Contact privacy@trevise.app to exercise these rights." },
  { id: "retention", n: "08", t: "Data retention", b: "We retain account data while your account is active and as required to comply with legal obligations. You may request deletion at any time; we'll fulfill within 30 days, except where retention is required by law." },
  { id: "international", n: "09", t: "International transfers", b: "We host data primarily in the US and EU. Cross-border transfers rely on Standard Contractual Clauses and supplementary measures. EEA users: our EU representative is reachable at eu-rep@trevise.app." },
  { id: "children", n: "10", t: "Children's privacy", b: "Trevise is not intended for users under 18. We do not knowingly collect personal information from children. If you believe a child has provided us data, contact privacy@trevise.app." },
  { id: "changes", n: "11", t: "Changes to this policy", b: "We will notify you of material changes by email or in-product notice at least 30 days before they take effect." },
  { id: "contact", n: "12", t: "Contact", b: "Questions? Email privacy@trevise.app or write to: Trevise Labs, Inc., 228 Park Ave S, PMB 41281, New York, NY 10003." },
];

const PILLARS = [
  { Icon: ShieldCheck, k: "Audit", v: "SOC 2 Type II" },
  { Icon: Lock, k: "Encryption", v: "AES-256 / TLS 1.3" },
  { Icon: Database, k: "Hosting", v: "US & EU regions" },
  { Icon: Eye, k: "Promise", v: "We never sell data" },
];

export default function Privacy() {
  return (
    <MarketingLayout>
      <div className="bg-background text-foreground">
        {/* Hero */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 pt-20 pb-14">
            <Eyebrow code="00">Legal · Privacy</Eyebrow>
            <h1 className="mt-6 font-display text-[44px] md:text-[64px] leading-[0.98] tracking-[-0.03em] max-w-3xl">
              Privacy policy.
            </h1>
            <p className="mt-6 text-[14px] text-muted-foreground max-w-xl">
              Last updated May 1, 2026. We treat your data the way we'd want ours treated — encrypted, minimized, and never sold.
            </p>
          </div>
        </section>

        {/* Pillars */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--hairline)] border hairline">
              {PILLARS.map((p) => (
                <div key={p.k} className="bg-background p-6">
                  <p.Icon className="w-4 h-4 text-accent" />
                  <div className="mt-4 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">{p.k}</div>
                  <div className="mt-1 font-display text-[18px] tracking-tight">{p.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-20">
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-4">On this page</div>
                <ul className="space-y-2.5 border-l hairline pl-4">
                  {SECTIONS.map((s) => (
                    <li key={s.id} className="text-[12.5px]">
                      <a href={`#${s.id}`} className="text-foreground/70 hover:text-foreground inline-flex items-baseline gap-2">
                        <span className="font-mono text-[10px] text-accent">{s.n}</span>
                        <span>{s.t}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="lg:col-span-9">
              <div className="border hairline divide-y divide-[var(--hairline)]">
                {SECTIONS.map((s) => (
                  <article id={s.id} key={s.id} className="p-7 scroll-mt-24">
                    <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.2em]">
                      <span className="text-accent">{s.n}</span>
                      <span className="h-px w-6 bg-[var(--hairline)]" />
                      <span className="text-muted-foreground">Section</span>
                    </div>
                    <h2 className="mt-4 font-display text-[24px] tracking-tight">{s.t}</h2>
                    <p className="mt-3 text-[13.5px] text-muted-foreground leading-relaxed">{s.b}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-16 grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <Eyebrow code="13">Data requests</Eyebrow>
              <h2 className="mt-6 font-display text-[34px] md:text-[44px] leading-[1.02] tracking-[-0.025em]">
                Request, export, or delete<br/>your data anytime.
              </h2>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3">
              <a href="mailto:privacy@trevise.app" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 bg-accent text-accent-foreground hover:brightness-110 inline-flex items-center justify-between">
                Contact privacy desk <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/terms" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 border hairline hover:bg-muted inline-flex items-center justify-between">
                Read terms of service <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
