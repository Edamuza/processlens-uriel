import { Link } from "@tanstack/react-router";
import { ScanSearch } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const linkCls = "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted";
  const active = { className: "rounded-md px-3 py-1.5 text-sm bg-secondary text-foreground font-medium" };
  return (
    <div className="min-h-screen flex flex-col">
      <div className="no-print bg-banner text-banner-foreground text-center text-xs py-1.5 px-4">
        Demo app — all sample data is fictional.
      </div>
      <header className="no-print border-b bg-card/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
            <ScanSearch className="h-5 w-5" /> ProcessLens
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/" className={linkCls} activeProps={active} activeOptions={{ exact: true }}>Audits</Link>
            <Link to="/audits/new" className={linkCls} activeProps={active}>New audit</Link>
            <Link to="/about" className={linkCls} activeProps={active}>About</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      <footer className="no-print border-t py-6 text-center text-xs text-muted-foreground">
        ProcessLens · a portfolio project by Uriel Papa
      </footer>
    </div>
  );
}
