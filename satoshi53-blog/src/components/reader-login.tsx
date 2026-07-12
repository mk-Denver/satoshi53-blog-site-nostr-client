"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { nsecToSecret, generateNsec, secretToNpub } from "@/lib/nostr";
import { useLocalStorage, useMounted } from "@/lib/hooks";
import { shortNpub } from "@/lib/utils";

const NSEC_KEY = "s53_nsec";

/**
 * Inline login prompt for readers who want to comment or react.
 * Uses the same s53_nsec localStorage key as the writer flow.
 * If the reader is already logged in (nsec in localStorage),
 * shows their npub with a log out button instead.
 */
export function ReaderLogin({
  onLoggedIn,
}: {
  onLoggedIn?: () => void;
}) {
  const mounted = useMounted();
  const storedNsec = useLocalStorage(NSEC_KEY);
  const [nsec, setNsec] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ nsec: string; npub: string } | null>(null);

  if (!mounted) return null;

  // Already logged in — show identity + logout
  if (storedNsec) {
    const sk = nsecToSecret(storedNsec);
    const npub = sk ? secretToNpub(sk) : storedNsec;

    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Signed in as</span>
        <span className="font-mono text-warm-orange">{shortNpub(npub)}</span>
        <button
          onClick={() => {
            localStorage.removeItem(NSEC_KEY);
            window.location.reload();
          }}
          className="text-xs text-muted-foreground hover:text-destructive underline"
        >
          Log out
        </button>
      </div>
    );
  }

  // Not logged in — show login form
  function login() {
    setError(null);
    const sk = nsecToSecret(nsec);
    if (!sk) {
      setError("That doesn&apos;t look like a valid nsec.");
      return;
    }
    localStorage.setItem(NSEC_KEY, nsec.trim());
    onLoggedIn?.();
    window.location.reload();
  }

  function newKey() {
    const k = generateNsec();
    setGenerated(k);
    navigator.clipboard?.writeText(k.nsec).catch(() => {});
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4">
      <p className="mb-3 text-xs text-muted-foreground">
        Log in with your Nostr key to comment and react. Your nsec stays in your
        browser and is never sent to a server.
      </p>
      <Label htmlFor="reader-nsec">Your nsec (signing key)</Label>
      <Input
        id="reader-nsec"
        type="password"
        value={nsec}
        onChange={(e) => setNsec(e.target.value)}
        placeholder="nsec1…"
        className="mb-2"
      />
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={login} disabled={!nsec.trim()}>
          Log in
        </Button>
        <Button size="sm" variant="ghost" onClick={newKey}>
          Generate a key
        </Button>
      </div>
      {generated && (
        <div className="mt-3 rounded-[var(--radius)] border border-warm-orange/40 bg-warm-orange/10 p-3">
          <p className="text-xs text-muted-foreground mb-1">
            Your nsec (save this — it can&apos;t be recovered):
          </p>
          <p className="font-mono text-xs text-warm-orange break-all">{generated.nsec}</p>
          <p className="mt-2 text-xs text-muted-foreground">Copied to clipboard. Paste it above to log in.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Hook that returns the signing key from localStorage, or null if not logged in.
 * Use this in comment/reaction components to check auth state.
 */
export function useReaderKey(): { sk: Uint8Array | null; nsec: string | null } {
  const mounted = useMounted();
  const storedNsec = useLocalStorage(NSEC_KEY);

  if (!mounted || !storedNsec) return { sk: null, nsec: null };
  const sk = nsecToSecret(storedNsec);
  return { sk, nsec: storedNsec };
}
