export function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] uppercase tracking-[0.2em] text-foreground/50">{label}</label>
        {right}
      </div>
      {children}
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.2 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l5.7-5.7C33.6 6.9 29 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.3 1 7.3 2.7l5.7-5.7C33.6 6.9 29 5 24 5 16.3 5 9.7 9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43c5 0 9.5-1.9 12.9-5l-6-5.1C28.9 34.6 26.6 35.5 24 35.5c-5.2 0-9.6-3.4-11.2-8.1l-6.5 5C9.5 38.9 16.2 43 24 43z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4.1 5.2l6 5.1C40.9 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-white">
      <path d="M16.365 1.43c0 1.14-.46 2.18-1.21 2.93-.78.78-1.95 1.36-3.05 1.27-.13-1.13.42-2.27 1.18-3.04.83-.85 2.21-1.45 3.08-1.16zM20.5 17.42c-.55 1.27-.81 1.83-1.52 2.95-.99 1.55-2.39 3.49-4.13 3.51-1.55.02-1.95-1.01-4.06-1-2.11.01-2.55 1.02-4.1 1-1.74-.02-3.06-1.77-4.05-3.32C-.18 17.78-.6 13.05 1.65 10.5c1.6-1.81 4.13-2.87 6.51-2.87 2.42 0 3.94 1.06 5.94 1.06 1.94 0 3.13-1.06 5.93-1.06 2.11 0 4.34 1.15 5.93 3.13-5.21 2.85-4.36 10.3.04 11.66z"/>
    </svg>
  );
}
