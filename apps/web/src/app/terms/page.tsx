"use client";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { ArrowRight, FileText, Scale, Gavel } from "lucide-react";

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
  { id: "acceptance", n: "01", t: "Acceptance of terms", b: "By accessing or using Trevise (\"Service\"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. We may update these terms from time to time; continued use after changes constitutes acceptance." },
  { id: "accounts", n: "02", t: "Accounts & eligibility", b: "You must be at least 18 years old and legally capable of entering into binding contracts. You're responsible for safeguarding your credentials and for all activity under your account. Notify us immediately of any unauthorized access." },
  { id: "use", n: "03", t: "Acceptable use", b: "You agree not to (a) reverse engineer the Service, (b) use it to violate any law or third-party right, (c) probe, scan, or test the vulnerability of the Service, (d) interfere with other users, or (e) use automated systems beyond documented APIs." },
  { id: "ai", n: "04", t: "AI signals & no investment advice", b: "Signals, agents, strategies, and analytics are informational only. Trevise is not a registered broker-dealer or investment adviser. Nothing in the Service constitutes investment, legal, or tax advice. Trading involves substantial risk; past performance is not indicative of future results." },
  { id: "subscriptions", n: "05", t: "Subscriptions & billing", b: "Paid plans renew automatically until cancelled. You authorize us to charge your payment method. Fees are non-refundable except where required by law. We may change pricing with 30 days' notice." },
  { id: "ip", n: "06", t: "Intellectual property", b: "Trevise and its licensors own all rights, title, and interest in the Service. We grant you a limited, non-exclusive, non-transferable license to use the Service in accordance with these terms. You retain ownership of content you upload." },
  { id: "termination", n: "07", t: "Termination", b: "We may suspend or terminate your access at any time for breach of these terms or to protect the Service. You may cancel anytime from your account settings. Upon termination, your right to use the Service ends immediately." },
  { id: "warranty", n: "08", t: "Disclaimer of warranties", b: "The Service is provided \"as is\" and \"as available\" without warranties of any kind, express or implied. We disclaim all warranties of merchantability, fitness for a particular purpose, and non-infringement." },
  { id: "liability", n: "09", t: "Limitation of liability", b: "To the maximum extent permitted by law, Trevise shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits or trading losses, arising from your use of the Service." },
  { id: "law", n: "10", t: "Governing law", b: "These terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles. Disputes shall be resolved exclusively in the state or federal courts located in Wilmington, Delaware." },
  { id: "contact", n: "11", t: "Contact", b: "For questions about these terms, contact us at legal@trevise.app." },
];

const PILLARS = [
  { Icon: FileText, k: "Version", v: "v4.2 · May 2026" },
  { Icon: Scale, k: "Jurisdiction", v: "Delaware, USA" },
  { Icon: Gavel, k: "Disputes", v: "Wilmington courts" },
];

export default function Terms() {
  return (
    <MarketingLayout>
      <div className="bg-background text-foreground">
        {/* Hero */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 pt-20 pb-14">
            <Eyebrow code="00">Legal · Terms</Eyebrow>
            <h1 className="mt-6 font-display text-[44px] md:text-[64px] leading-[0.98] tracking-[-0.03em] max-w-3xl">
              Terms of service.
            </h1>
            <p className="mt-6 text-[14px] text-muted-foreground max-w-xl">
              Last updated May 1, 2026. These terms govern your access to and use of Trevise — the institutional trading terminal.
            </p>
          </div>
        </section>

        {/* Pillars */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--hairline)] border hairline">
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
                      <span className="text-muted-foreground">Clause</span>
                    </div>
                    <h2 className="mt-4 font-display text-[24px] tracking-tight">{s.t}</h2>
                    <p className="mt-3 text-[13.5px] text-muted-foreground leading-relaxed">{s.b}</p>
                  </article>
                ))}
              </div>

              <div className="mt-6 border hairline p-5 text-[12px] text-muted-foreground font-mono leading-relaxed">
                DISCLAIMER · Trading securities, futures, and derivatives carries substantial risk of loss and is not suitable for every investor. Trevise does not provide investment advice. Past performance is not indicative of future results.
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-b hairline">
          <div className="max-w-[1320px] mx-auto px-5 lg:px-8 py-16 grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <Eyebrow code="12">Questions</Eyebrow>
              <h2 className="mt-6 font-display text-[34px] md:text-[44px] leading-[1.02] tracking-[-0.025em]">
                Talk to legal.<br/>Read the privacy policy.
              </h2>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3">
              <a href="mailto:legal@trevise.app" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 bg-accent text-accent-foreground hover:brightness-110 inline-flex items-center justify-between">
                Contact legal <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/privacy" className="text-[12px] font-mono uppercase tracking-[0.2em] px-5 py-4 border hairline hover:bg-muted inline-flex items-center justify-between">
                Privacy policy <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
