"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Download, Copy, Check } from "lucide-react";
import { nsecToSecret, generateNsec, secretToNpub } from "@/lib/nostr";
import { useLocalStorage, useMounted } from "@/lib/hooks";
import { shortNpub } from "@/lib/utils";

const NSEC_KEY = "s53_nsec";

/**
 * Download a .txt file with the generated keypair.
 */
function downloadKey(nsec: string, npub: string) {
  const content = [
    "Satoshi53 - Nostr Key Pair",
    "============================",
    "",
    "IMPORTANT: Keep your nsec private. Anyone with this key can",
    "sign events as you. Store it somewhere safe.",
    "",
    `nsec (secret key - PRIVATE): ${nsec}`,
    `npub (public key - shareable): ${npub}`,
    "",
    `Generated: ${new Date().toISOString()}`,
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `satoshi53-nostr-key-${npub.slice(0, 12)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Inline login prompt for readers who want to comment or react.
 * Uses the same s53_nsec localStorage key as the writer flow.
 * If the reader is already logged in (nsec in localStorage),
 * shows their npub with a log out button instead.
 */
export function ReaderLogin({
  onLoggedIn,
  compact,
}: {
  onLoggedIn?: () => void;
  compact?: boolean;
}) {
  const mounted = useMounted();
  const storedNsec = useLocalStorage(NSEC_KEY);
  const [nsec, setNsec] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ nsec: string; npub: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!mounted) return null;

  // Already logged in
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

  function login() {
    setError(null);
    const sk = nsecToSecret(nsec);
    if (!sk) {
      setError("That doesn’t look like a valid nsec.");
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

  function saveAndLogin() {
    if (!generated) return;
    localStorage.setItem(NSEC_KEY, generated.nsec);
    onLoggedIn?.();
    window.location.reload();
  }

  function copyNsec() {
    if (!generated) return;
    navigator.clipboard?.writeText(generated.nsec).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className={compact ? "" : "rounded-[var(--radius)] border border-border bg-card p-4"}>
      <p className="mb-3 text-xs text-muted-foreground">
        Log in with your Nostr key to comment and react. Your nsec stays in your
        browser and is never sent to a server.
      </p>
      {!generated && (
        <>
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
              Generate a new key
            </Button>
          </div>
        </>
      )}

      {generated && (
        <div>
          <div className="rounded-[var(--radius)] border border-warm-orange/40 bg-warm-orange/10 p-3 mb-3">
            <p className="text-xs text-muted-foreground mb-1">
              Your nsec (secret key — keep this safe, it can’t be recovered):
            </p>
            <p className="font-mono text-xs text-warm-orange break-all mb-2">{generated.nsec}</p>
            <p className="text-xs text-muted-foreground mb-1">Your npub (public key):</p>
            <p className="font-mono text-xs text-foreground break-all">{generated.npub}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={saveAndLogin}>
              Save &amp; Log in
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadKey(generated.nsec, generated.npub)}>
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button size="sm" variant="ghost" onClick={copyNsec}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy nsec"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setGenerated(null)}>
              Cancel
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Press <strong>Download</strong> to save your key as a file, then <strong>Save &amp; Log in</strong> to continue.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Hook that returns the signing key from localStorage, or null if not logged in.
 */
export function useReaderKey(): { sk: Uint8Array | null; nsec: string | null } {
  const mounted = useMounted();
  const storedNsec = useLocalStorage(NSEC_KEY);

  if (!mounted || !storedNsec) return { sk: null, nsec: null };
  const sk = nsecToSecret(storedNsec);
  return { sk, nsec: storedNsec };
}
