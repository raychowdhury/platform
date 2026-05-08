import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">404</div>
      <h1 className="font-display text-4xl">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Link href="/" className="mt-4 text-sm px-4 py-2 bg-foreground text-background hover:bg-muted">
        Back to home
      </Link>
    </div>
  );
}
