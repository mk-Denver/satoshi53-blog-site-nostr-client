"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, PenSquare, LogIn, LogOut } from "lucide-react";
import { Logo, NavIconLink } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { shortNpub } from "@/lib/utils";

const WRITER_KEY = "s53_writer_nsec";
const NSEC_KEY = "s53_nsec";

export function Header() {
  const [npub, setNpub] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(WRITER_KEY);
  });

  function signOut() {
    localStorage.removeItem(WRITER_KEY);
    localStorage.removeItem(NSEC_KEY);
    setNpub(null);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Logo />

        <div className="relative hidden md:block ml-2 flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search posts…"
            className="h-10 w-full rounded-[var(--radius)] border border-border bg-secondary pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const q = (e.target as HTMLInputElement).value.trim();
                if (q) window.location.href = `/search/?q=${encodeURIComponent(q)}`;
              }
            }}
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <NavIconLink href="/search/" icon={Search} label="Search" />
          {npub && (
            <>
              <Link href="/post/new/">
                <Button size="sm" className="hidden sm:inline-flex">
                  <PenSquare className="h-4 w-4" /> Write
                </Button>
              </Link>
              <span className="ml-1 text-xs text-muted-foreground hidden sm:inline">
                {shortNpub(npub)}
              </span>
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          )}
          {typeof window !== "undefined" && !npub && (
            <Link href="/writer/">
              <Button size="sm" variant="outline">
                <LogIn className="h-4 w-4" /> Writer
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
