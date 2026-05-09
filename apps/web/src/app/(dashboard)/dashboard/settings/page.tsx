"use client";
import { useState } from "react";
import {
  Settings, Bell, Monitor, Lock, Code2, Check,
  ChevronRight, Smartphone, Mail, MessageSquare, Moon, Sun,
  Globe, Clock, BarChart2, RefreshCw, Copy, Plus, Trash2, Eye, EyeOff,
} from "lucide-react";

type Tab = "general" | "notifications" | "display" | "privacy" | "api";

const TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: "general",       label: "General",       Icon: Settings },
  { id: "notifications", label: "Notifications",  Icon: Bell },
  { id: "display",       label: "Display",        Icon: Monitor },
  { id: "privacy",       label: "Privacy",        Icon: Lock },
  { id: "api",           label: "API Keys",       Icon: Code2 },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 transition-colors shrink-0 ${checked ? "bg-accent" : "bg-white/10"}`}
      style={{ borderRadius: 9999 }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 bg-foreground transition-all"
        style={{ borderRadius: 9999, left: checked ? "calc(100% - 18px)" : "2px" }}
      />
    </button>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b hairline last:border-0">
      <div>
        <div className="text-sm">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white/[0.03] border hairline px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent/40 min-w-[160px]"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [saved, setSaved] = useState(false);

  // General
  const [timezone, setTimezone] = useState("Europe/Berlin (UTC+2)");
  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("USD — US Dollar");
  const [dateFormat, setDateFormat] = useState("DD MMM YYYY");
  const [numberFormat, setNumberFormat] = useState("1,234.56");

  // Notifications
  const [notifs, setNotifs] = useState({
    priceAlerts:  { push: true,  email: true,  sms: false },
    aiSignals:    { push: true,  email: false, sms: false },
    tradeExec:    { push: true,  email: true,  sms: true  },
    news:         { push: false, email: false, sms: false },
    billing:      { push: false, email: true,  sms: false },
    weeklyReport: { push: false, email: true,  sms: false },
  });
  const toggleNotif = (key: keyof typeof notifs, ch: "push" | "email" | "sms") =>
    setNotifs((n) => ({ ...n, [key]: { ...n[key], [ch]: !n[key][ch] } }));

  // Display
  const [compactMode, setCompactMode] = useState(false);
  const [stickyHeader, setStickyHeader] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [defaultChart, setDefaultChart] = useState("Candlestick");
  const [defaultInterval, setDefaultInterval] = useState("1H");
  const [decimals, setDecimals] = useState("2");

  // Privacy
  const [analytics, setAnalytics] = useState(true);
  const [crashReports, setCrashReports] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [showPnl, setShowPnl] = useState(false);

  // API Keys
  const [keys, setKeys] = useState([
    { id: "k1", name: "Trading bot — prod", key: "tvs_live_a8x9...2f4q", created: "Mar 12, 2026", lastUsed: "1 min ago", scope: "read:markets write:orders" },
    { id: "k2", name: "Backtest runner", key: "tvs_live_b2k1...9g3r", created: "Apr 2, 2026", lastUsed: "2d ago", scope: "read:markets read:signals" },
  ]);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyKey = (id: string) => { setCopiedKey(id); setTimeout(() => setCopiedKey(null), 1500); };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Account</div>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-[0.95]">Settings</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Preferences, notifications, display, privacy, and API access.
          </p>
        </div>
        <button
          onClick={save}
          className={`px-4 py-2 text-[11px] flex items-center gap-1.5 transition-colors ${
            saved
              ? "bg-bull/15 border border-bull/30 text-bull"
              : "bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25"
          }`}
        >
          {saved ? <><Check className="w-3 h-3" /> Saved</> : "Save changes"}
        </button>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-5">
        {/* Tab sidebar */}
        <nav className="glass p-2 flex flex-col gap-0.5 h-fit lg:sticky lg:top-20">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-left transition-colors ${
                tab === id
                  ? "bg-white/[0.07] text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              {label}
              {tab === id && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="glass p-5 flex flex-col gap-1">
          {/* ── General ── */}
          {tab === "general" && (
            <>
              <h2 className="font-display text-xl mb-4">General</h2>
              <Row label="Timezone" sub="Used for all time displays and alerts">
                <Select value={timezone} options={["Europe/Berlin (UTC+2)", "America/New_York (UTC−4)", "America/Chicago (UTC−5)", "Asia/Tokyo (UTC+9)", "UTC"]} onChange={setTimezone} />
              </Row>
              <Row label="Language" sub="Interface language">
                <Select value={language} options={["English", "Deutsch", "Français", "日本語", "中文"]} onChange={setLanguage} />
              </Row>
              <Row label="Currency display" sub="Default currency for P&L and prices">
                <Select value={currency} options={["USD — US Dollar", "EUR — Euro", "GBP — British Pound", "JPY — Japanese Yen"]} onChange={setCurrency} />
              </Row>
              <Row label="Date format" sub="How dates appear across the platform">
                <Select value={dateFormat} options={["DD MMM YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD/MM/YYYY"]} onChange={setDateFormat} />
              </Row>
              <Row label="Number format" sub="Decimal and thousands separator">
                <Select value={numberFormat} options={["1,234.56", "1.234,56", "1 234,56"]} onChange={setNumberFormat} />
              </Row>
              <div className="border-t hairline mt-4 pt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Data & sync</div>
                <Row label="Auto-refresh market data" sub="Refresh every 5 seconds while active">
                  <Toggle checked={true} onChange={() => {}} />
                </Row>
                <Row label="Cache historical data locally" sub="Faster chart loads after first visit">
                  <Toggle checked={true} onChange={() => {}} />
                </Row>
              </div>
            </>
          )}

          {/* ── Notifications ── */}
          {tab === "notifications" && (
            <>
              <h2 className="font-display text-xl mb-2">Notifications</h2>
              <div className="text-[11px] text-muted-foreground mb-4">
                Choose how you want to be notified for each category.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b hairline">
                      <th className="text-left py-2 font-medium pr-8">Category</th>
                      {([
                        { ch: "push",  Icon: Smartphone, label: "Push" },
                        { ch: "email", Icon: Mail,        label: "Email" },
                        { ch: "sms",   Icon: MessageSquare, label: "SMS" },
                      ] as const).map(({ label }) => (
                        <th key={label} className="text-center py-2 font-medium w-20">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { key: "priceAlerts",  label: "Price alerts",         sub: "When your set price levels are hit" },
                      { key: "aiSignals",    label: "AI signals",           sub: "New high-confidence signals" },
                      { key: "tradeExec",    label: "Trade execution",      sub: "Order fills, rejections, partial fills" },
                      { key: "news",         label: "Breaking news",        sub: "Market-moving headlines" },
                      { key: "billing",      label: "Billing",              sub: "Invoices, renewals, payment failures" },
                      { key: "weeklyReport", label: "Weekly digest",        sub: "Performance summary every Monday" },
                    ] as const).map(({ key, label, sub }) => (
                      <tr key={key} className="border-b hairline last:border-0">
                        <td className="py-3 pr-8">
                          <div>{label}</div>
                          <div className="text-muted-foreground text-[10px]">{sub}</div>
                        </td>
                        {(["push", "email", "sms"] as const).map((ch) => (
                          <td key={ch} className="py-3 text-center">
                            <div className="flex justify-center">
                              <Toggle checked={notifs[key][ch]} onChange={() => toggleNotif(key, ch)} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Display ── */}
          {tab === "display" && (
            <>
              <h2 className="font-display text-xl mb-4">Display</h2>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Layout</div>
              <Row label="Compact mode" sub="Reduce padding for denser information display">
                <Toggle checked={compactMode} onChange={setCompactMode} />
              </Row>
              <Row label="Sticky topbar" sub="Keep the topbar visible while scrolling">
                <Toggle checked={stickyHeader} onChange={setStickyHeader} />
              </Row>
              <Row label="UI animations" sub="Page transitions and micro-interactions">
                <Toggle checked={animationsEnabled} onChange={setAnimationsEnabled} />
              </Row>
              <div className="border-t hairline mt-4 pt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Charts</div>
                <Row label="Default chart type">
                  <Select value={defaultChart} options={["Candlestick", "Line", "Bar", "Area", "Heikin-Ashi"]} onChange={setDefaultChart} />
                </Row>
                <Row label="Default interval">
                  <Select value={defaultInterval} options={["1m", "5m", "15m", "1H", "4H", "1D", "1W"]} onChange={setDefaultInterval} />
                </Row>
                <Row label="Decimal places" sub="For price display">
                  <Select value={decimals} options={["0", "1", "2", "3", "4", "5"]} onChange={setDecimals} />
                </Row>
                <Row label="Show volume bars" sub="Display volume histogram on charts">
                  <Toggle checked={true} onChange={() => {}} />
                </Row>
                <Row label="Show extended hours" sub="Pre/post-market data on US equities">
                  <Toggle checked={false} onChange={() => {}} />
                </Row>
              </div>
            </>
          )}

          {/* ── Privacy ── */}
          {tab === "privacy" && (
            <>
              <h2 className="font-display text-xl mb-4">Privacy</h2>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Analytics & diagnostics</div>
              <Row label="Usage analytics" sub="Help us improve Trevise with anonymized usage data">
                <Toggle checked={analytics} onChange={setAnalytics} />
              </Row>
              <Row label="Crash reports" sub="Automatically send error reports to our team">
                <Toggle checked={crashReports} onChange={setCrashReports} />
              </Row>
              <Row label="Marketing communications" sub="Product updates, tips, and offers by email">
                <Toggle checked={marketing} onChange={setMarketing} />
              </Row>
              <div className="border-t hairline mt-4 pt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Profile visibility</div>
                <Row label="Public profile" sub="Allow others on Trevise to view your profile">
                  <Toggle checked={publicProfile} onChange={setPublicProfile} />
                </Row>
                <Row label="Show P&L on leaderboard" sub="Display your returns in community rankings">
                  <Toggle checked={showPnl} onChange={setShowPnl} />
                </Row>
              </div>
              <div className="border-t hairline mt-4 pt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Your data</div>
                <Row label="Download my data" sub="Export a full copy of your Trevise data (GDPR Art. 20)">
                  <button className="text-[11px] px-3 py-1.5 border hairline hover:bg-white/5 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" /> Request export
                  </button>
                </Row>
                <Row label="Delete all data" sub="Permanently erase your account and data">
                  <button className="text-[11px] px-3 py-1.5 border border-bear/30 text-bear hover:bg-bear/10">
                    Delete account
                  </button>
                </Row>
              </div>
            </>
          )}

          {/* ── API Keys ── */}
          {tab === "api" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl">API Keys</h2>
                <button
                  onClick={() => setKeys((k) => [...k, {
                    id: `k${Date.now()}`,
                    name: "New key",
                    key: `tvs_live_${Math.random().toString(36).slice(2, 10)}...${Math.random().toString(36).slice(2, 6)}`,
                    created: "Just now",
                    lastUsed: "Never",
                    scope: "read:markets",
                  }])}
                  className="text-[11px] px-3 py-1.5 bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" /> New key
                </button>
              </div>
              <div className="text-[11px] text-muted-foreground mb-4 glass-soft p-3">
                API keys grant programmatic access to your Trevise account. Keep them secret — treat them like passwords.
                Full docs at <span className="text-accent font-mono">trevise.app/api</span>
              </div>
              <div className="flex flex-col gap-3">
                {keys.map((k) => (
                  <div key={k.id} className="border hairline p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{k.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Created {k.created} · Last used {k.lastUsed}
                        </div>
                      </div>
                      <button onClick={() => setKeys((arr) => arr.filter((x) => x.id !== k.id))}
                        className="p-1.5 text-muted-foreground hover:text-bear hover:bg-bear/10 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-[11px] bg-white/[0.03] border hairline px-3 py-2 text-muted-foreground truncate">
                        {showKey === k.id ? k.key : k.key.replace(/(?<=^.{12}).*(?=.{4}$)/, "••••••••••••")}
                      </code>
                      <button onClick={() => setShowKey(showKey === k.id ? null : k.id)}
                        className="p-2 border hairline hover:bg-white/5 text-muted-foreground hover:text-foreground shrink-0">
                        {showKey === k.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => copyKey(k.id)}
                        className="p-2 border hairline hover:bg-white/5 text-muted-foreground hover:text-foreground shrink-0">
                        {copiedKey === k.id ? <Check className="w-3.5 h-3.5 text-bull" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {k.scope.split(" ").map((s) => (
                        <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/25">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
