"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-bear">Error</div>
      <h1 className="font-display text-4xl">Something went wrong</h1>
      <p className="text-sm text-muted-foreground max-w-sm text-center">{error.message}</p>
      <button onClick={reset} className="mt-4 text-sm px-4 py-2 bg-foreground text-background hover:bg-muted">
        Try again
      </button>
    </div>
  );
}
