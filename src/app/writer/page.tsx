"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  nsecToSecret,
  secretToNpub,
  isWriterNpub,
  generateNsec,
} from "@/lib/nostr";
import { SITE } from "@/lib/constants";
import { useLocalStorage } from "@/lib/hooks";
import { shortNpub } from "@/lib/utils";

const WRITER_KEY = "s53_writer_nsec";
const NSEC_KEY = "s53_nsec";

export default function WriterPage() {
  const router = useRouter();
  const [nsec, setNsec] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ nsec: string; npub: string } | null>(null);

  const unlocked = useLocalStorage(WRITER_KEY);

  function unlock() {
    setError(null);
    const sk = nsecToSecret(nsec);
    if (!sk) {
      setError("That doesn't look like a valid nsec.");
      return;
    }
    const npub = secretToNpub(sk);
    if (!isWriterNpub(npub)) {
      setError("This nsec is not on the allowed writers list.");
      return;
    }
    localStorage.setItem(WRITER_KEY, npub);
    localStorage.setItem(NSEC_KEY, nsec.trim());
    router.push("/post/new/");
  }

  function lock() {
    localStorage.removeItem(WRITER_KEY);
    localStorage.removeItem(NSEC_KEY);
    setNsec("");
    window.location.reload();
  }

  function newKey() {
    const k = generateNsec();
    setGenerated(k);
    navigator.clipboard?.writeText(k.nsec).catch(() => {});
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="hero-gradient flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center">
            <Logo />
            <h1 className="mt-4 font-serif text-2xl text-cream">Writer access</h1>
            <p className="mt-1 text-sm text-muted-foreground text-center">
              Unlock the editor with your Nostr secret key (nsec). It stays in your
              browser — {SITE.name} never sees or stores it.
            </p>
          </div>

          {unlocked ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-foreground">
                Unlocked as <span className="font-mono text-warm-orange">{shortNpub(unlocked)}</span>
              </p>
              <Button className="w-full" onClick={() => router.push("/post/new/")}>
                Open editor
              </Button>
              <Button variant="outline" className="w-full" onClick={lock}>
                Lock & sign out
              </Button>
            </div>
          ) : (
            <>
              <Label htmlFor="nsec">Your nsec (secret key)</Label>
              <Input
                id="nsec"
                type="password"
                value={nsec}
                onChange={(e) => setNsec(e.target.value)}
                placeholder="nsec1…"
                className="mb-3"
              />
              {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={unlock} disabled={!nsec.trim()}>
                Unlock editor
              </Button>

              <div className="mt-6 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground text-center">
                  Don&apos;t have a writer key yet?
                </p>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={newKey}>
                  Generate a new keypair
                </Button>
                {generated && (
                  <div className="mt-3 rounded-[var(--radius)] border border-warm-orange/40 bg-warm-orange/10 p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Your nsec (save this — it can&apos;t be recovered):
                    </p>
                    <p className="font-mono text-xs text-warm-orange break-all">{generated.nsec}</p>
                    <p className="text-xs text-muted-foreground mt-2 mb-1">Your npub (public):</p>
                    <p className="font-mono text-xs text-foreground break-all">{generated.npub}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Add this npub to <code>NEXT_PUBLIC_ALLOWED_NPUBS</code> to grant write access.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
