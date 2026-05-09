"use client";
import { useState } from "react";
import {
  User, Camera, Shield, Key, Github, Globe, Clock,
  Check, Pencil, X, Copy, Eye, EyeOff, TrendingUp,
  Zap, Activity, Twitter, LogOut, AlertCircle,
} from "lucide-react";

const ACTIVITY = [
  { action: "Opened long ES1! @ 5,218", time: "2h ago", pnl: "+$340", up: true },
  { action: "Closed NVDA position", time: "5h ago", pnl: "+$1,204", up: true },
  { action: "AI signal triggered TSLA short", time: "Yesterday", pnl: "−$88", up: false },
  { action: "Added to AAPL long", time: "2d ago", pnl: "+$212", up: true },
  { action: "Closed EURUSD short", time: "3d ago", pnl: "−$45", up: false },
  { action: "Opened XAUUSD long", time: "4d ago", pnl: "+$620", up: true },
];

const SESSIONS = [
  { device: 'MacBook Pro 16"', location: "Munich, DE", last: "Active now", current: true },
  { device: "iPhone 15 Pro", location: "Munich, DE", last: "3h ago", current: false },
  { device: "Chrome · Windows", location: "Frankfurt, DE", last: "2d ago", current: false },
];

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: "Angelina Kovacs",
    email: "angelina@trevise.app",
    username: "a.kraft",
    bio: "Equities PM. Systematic strategies. Long volatility.",
    location: "Munich, Germany",
    website: "https://angelinatrades.com",
    timezone: "Europe/Berlin",
  });
  const [draft, setDraft] = useState(form);

  const uid = "USR-20240312-0042";

  const copy = () => {
    navigator.clipboard.writeText(uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Account</div>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-[0.95]">Profile</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your identity, security, and connected accounts.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setDraft(form); }}
                className="px-3 py-2 border hairline hover:bg-white/5 text-muted-foreground flex items-center gap-1.5">
                <X className="w-3 h-3" /> Discard
              </button>
              <button onClick={() => { setForm(draft); setEditing(false); }}
                className="px-3 py-2 bg-accent/15 border border-accent/30 text-accent flex items-center gap-1.5 hover:bg-accent/25">
                <Check className="w-3 h-3" /> Save changes
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="px-3 py-2 border hairline hover:bg-white/5 flex items-center gap-1.5">
              <Pencil className="w-3 h-3" /> Edit profile
            </button>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total P&L", value: "+$18,240", sub: "YTD 2026", Icon: TrendingUp, up: true },
          { label: "Win rate", value: "67.4%", sub: "Last 90 days", Icon: Activity, up: true },
          { label: "Signals used", value: "137", sub: "of 200 this month", Icon: Zap, up: null },
          { label: "Member since", value: "Mar 2024", sub: "Pro · Level 4", Icon: User, up: null },
        ].map(({ label, value, sub, Icon, up }) => (
          <div key={label} className="glass p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
              <Icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.4} />
            </div>
            <div className={`font-display text-2xl tabular-nums ${up === true ? "text-bull" : up === false ? "text-bear" : ""}`}>
              {value}
            </div>
            <span className="text-[11px] text-muted-foreground">{sub}</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left col: avatar + identity */}
        <div className="flex flex-col gap-4">
          {/* Avatar */}
          <div className="glass p-5 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-accent/40 to-violet/40 grid place-items-center text-3xl font-display border hairline">
                AK
              </div>
              {editing && (
                <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-accent grid place-items-center border-2 border-background">
                  <Camera className="w-3.5 h-3.5 text-accent-foreground" />
                </button>
              )}
            </div>
            <div className="text-center">
              <div className="font-display text-xl">{form.name}</div>
              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">@{form.username}</div>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <span className="text-[9px] px-2 py-0.5 bg-accent/10 text-accent border border-accent/25 uppercase tracking-wider">Pro</span>
                <span className="text-[9px] px-2 py-0.5 bg-white/5 text-muted-foreground border hairline uppercase tracking-wider">Level 4</span>
              </div>
            </div>
            <div className="w-full border-t hairline pt-4 flex flex-col gap-2 text-[12px]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-3.5 h-3.5 shrink-0" /> {form.location}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 shrink-0" /> {form.timezone}
              </div>
              {form.website && (
                <div className="flex items-center gap-2 text-accent truncate">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <a href={form.website} target="_blank" rel="noreferrer" className="truncate hover:underline">
                    {form.website.replace("https://", "")}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Account ID */}
          <div className="glass p-4 flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Account ID</div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-muted-foreground truncate">{uid}</span>
              <button onClick={copy} className="shrink-0 p-1.5 border hairline hover:bg-white/5 text-muted-foreground hover:text-foreground">
                {copied ? <Check className="w-3.5 h-3.5 text-bull" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Connected accounts */}
          <div className="glass p-5 flex flex-col gap-3">
            <h3 className="font-display text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" /> Connected
            </h3>
            {[
              { Icon: Github, name: "GitHub", handle: "angelina-k", linked: true },
              { Icon: Twitter, name: "X / Twitter", handle: null, linked: false },
              { Icon: Globe, name: "Google", handle: "angelina@gmail.com", linked: true },
            ].map(({ Icon, name, handle, linked }) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px]">
                  <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.4} />
                  <span>{name}</span>
                  {handle && <span className="text-muted-foreground text-[11px]">· {handle}</span>}
                </div>
                <button className={`text-[10px] px-2 py-1 border hairline ${linked ? "text-muted-foreground hover:text-bear hover:border-bear/30" : "text-accent border-accent/30 hover:bg-accent/10"}`}>
                  {linked ? "Unlink" : "Connect"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right col: editable info + security */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Personal info */}
          <div className="glass p-5 flex flex-col gap-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <User className="w-4 h-4 text-accent" /> Personal information
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: "Full name", key: "name", placeholder: "Angelina Kovacs" },
                { label: "Username", key: "username", placeholder: "a.kraft" },
                { label: "Email address", key: "email", placeholder: "you@trevise.app" },
                { label: "Location", key: "location", placeholder: "City, Country" },
                { label: "Website", key: "website", placeholder: "https://..." },
                { label: "Timezone", key: "timezone", placeholder: "Europe/Berlin" },
              ].map(({ label, key, placeholder }) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                  <input
                    readOnly={!editing}
                    value={draft[key as keyof typeof draft]}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={`bg-white/[0.03] border hairline px-3 py-2 text-sm focus:outline-none transition-colors ${
                      editing ? "focus:border-accent/40" : "cursor-default opacity-80"
                    }`}
                  />
                </label>
              ))}
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Bio</span>
              <textarea
                readOnly={!editing}
                value={draft.bio}
                onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                rows={2}
                className={`bg-white/[0.03] border hairline px-3 py-2 text-sm resize-none focus:outline-none transition-colors ${
                  editing ? "focus:border-accent/40" : "cursor-default opacity-80"
                }`}
              />
            </label>
          </div>

          {/* Security */}
          <div className="glass p-5 flex flex-col gap-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" /> Security
            </h3>

            {/* Password */}
            <div className="border-b hairline pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Password</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Last changed 47 days ago</div>
                </div>
                <button onClick={() => setShowPwForm((v) => !v)}
                  className="text-[11px] px-3 py-1.5 border hairline hover:bg-white/5 flex items-center gap-1.5">
                  <Key className="w-3 h-3" /> Change
                </button>
              </div>
              {showPwForm && (
                <div className="mt-4 flex flex-col gap-3">
                  {[
                    { label: "Current password", show: showCurrentPw, toggle: () => setShowCurrentPw(v => !v) },
                    { label: "New password", show: showNewPw, toggle: () => setShowNewPw(v => !v) },
                  ].map(({ label, show, toggle }) => (
                    <label key={label} className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                      <div className="relative">
                        <input type={show ? "text" : "password"} placeholder="••••••••"
                          className="w-full bg-white/[0.03] border hairline px-3 py-2 text-sm pr-10 focus:outline-none focus:border-accent/40" />
                        <button type="button" onClick={toggle}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </label>
                  ))}
                  <div className="flex gap-2 text-[11px]">
                    <button onClick={() => setShowPwForm(false)} className="flex-1 py-2 border hairline hover:bg-white/5">Cancel</button>
                    <button className="flex-1 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">Update password</button>
                  </div>
                </div>
              )}
            </div>

            {/* 2FA */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm flex items-center gap-2">
                  Two-factor authentication
                  <span className="text-[9px] px-1.5 py-0.5 bg-bull/10 text-bull border border-bull/25 uppercase tracking-wider">Enabled</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">TOTP via authenticator app</div>
              </div>
              <button onClick={() => setShow2FA(true)}
                className="text-[11px] px-3 py-1.5 border hairline hover:bg-white/5">
                Manage
              </button>
            </div>

            {/* Danger zone */}
            <div className="border-t hairline pt-4 flex items-center justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-bear mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm">Delete account</div>
                  <div className="text-[11px] text-muted-foreground">Permanently removes all data. Cannot be undone.</div>
                </div>
              </div>
              <button className="text-[11px] px-3 py-1.5 border border-bear/30 text-bear hover:bg-bear/10">Delete</button>
            </div>
          </div>

          {/* Active sessions */}
          <div className="glass p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg flex items-center gap-2">
                <LogOut className="w-4 h-4 text-accent" /> Active sessions
              </h3>
              <button className="text-[11px] px-3 py-1.5 border hairline hover:bg-white/5 text-muted-foreground hover:text-bear">
                Revoke all others
              </button>
            </div>
            {SESSIONS.map((s) => (
              <div key={s.device} className="flex items-center justify-between py-2 border-b hairline last:border-0">
                <div>
                  <div className="text-sm flex items-center gap-2">
                    {s.device}
                    {s.current && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-bull/10 text-bull border border-bull/25 uppercase tracking-wider">Current</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{s.location} · {s.last}</div>
                </div>
                {!s.current && (
                  <button className="text-[11px] px-2.5 py-1 border hairline text-muted-foreground hover:text-bear hover:border-bear/30">
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div className="glass p-5 flex flex-col gap-3">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" /> Recent activity
            </h3>
            {ACTIVITY.map((a) => (
              <div key={a.action} className="flex items-center justify-between py-2 border-b hairline last:border-0">
                <div>
                  <div className="text-sm">{a.action}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{a.time}</div>
                </div>
                <span className={`font-mono text-sm ${a.up ? "text-bull" : "text-bear"}`}>{a.pnl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2FA modal */}
      {show2FA && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShow2FA(false)}>
          <div className="glass max-w-sm w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Two-factor auth</h3>
              <button onClick={() => setShow2FA(false)} className="p-1 hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-[11px] text-muted-foreground">
              2FA is currently <span className="text-bull">enabled</span> via authenticator app. Disabling it will reduce account security.
            </div>
            <div className="border hairline p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Recovery codes</div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-muted-foreground">
                {["A1B2-C3D4", "E5F6-G7H8", "I9J0-K1L2", "M3N4-O5P6"].map(c => (
                  <div key={c} className="bg-white/[0.03] border hairline px-3 py-1.5">{c}</div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 text-[11px]">
              <button onClick={() => setShow2FA(false)} className="flex-1 py-2.5 border hairline hover:bg-white/5">Close</button>
              <button className="flex-1 py-2.5 border border-bear/30 text-bear hover:bg-bear/10">Disable 2FA</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
