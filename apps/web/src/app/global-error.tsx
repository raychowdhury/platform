"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <h1 className="font-display text-4xl">Critical error</h1>
        <button onClick={reset} className="text-sm px-4 py-2 bg-foreground text-background">
          Reload
        </button>
      </body>
    </html>
  );
}
