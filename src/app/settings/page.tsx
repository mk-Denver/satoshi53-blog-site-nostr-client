"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { ImageUpload } from "@/components/image-upload";
import {
  nsecToSecret,
  isWriterNpub,
  fetchAuthor,
  publishProfile,
  triggerRebuild,
} from "@/lib/nostr";
import type { Author } from "@/lib/types";
import { useLocalStorage, useMounted } from "@/lib/hooks";

const WRITER_KEY = "s53_writer_nsec";
const NSEC_KEY = "s53_nsec";

export default function SettingsPage() {
  const router = useRouter();
  const mounted = useMounted();
  const writerNpub = useLocalStorage(WRITER_KEY);
  const nsec = useLocalStorage(NSEC_KEY);
  const [sk, setSk] = useState<Uint8Array | null>(null);

  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [picture, setPicture] = useState("");
  const [nip05, setNip05] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!mounted) return;
    if (!writerNpub || !nsec || !isWriterNpub(writerNpub)) {
      router.replace("/writer/");
      return;
    }
    const secret = nsecToSecret(nsec);
    if (!secret) {
      router.replace("/writer/");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSk(secret);
  }, [mounted, writerNpub, nsec, router]);

  useEffect(() => {
    if (!sk) return;
    let cancelled = false;
    (async () => {
      const { getPublicKey } = await import("nostr-tools/pure");
      const pubkey = getPublicKey(sk);
      const profile = await fetchAuthor(pubkey);
      if (cancelled) return;
      setAuthor(profile);
      setName(profile?.name || "");
      setAbout(profile?.about || "");
      setPicture(profile?.picture || "");
      setNip05(profile?.nip05 || "");
      setWebsite(profile?.website || "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sk]);

  function save() {
    if (!sk) return;
    setError(null);
    setInfo(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      const res = await publishProfile({
        sk,
        name: name.trim(),
        about: about.trim() || undefined,
        picture: picture.trim() || undefined,
        nip05: nip05.trim() || undefined,
        website: website.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error || "Failed to save profile.");
        return;
      }
      setInfo("Profile saved to relays (kind 0). Triggering rebuild...");
      await triggerRebuild();
    });
  }

  if (!mounted || !sk) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading...</p>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading your profile...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl text-cream">Profile settings</h1>
          <Link href="/dashboard/">
            <Button variant="outline" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Avatar src={picture || author?.picture} alt={name || "Profile"} size={72} />
          <div>
            <p className="font-serif text-lg text-cream">
              {name || "Unnamed writer"}
            </p>
            <p className="text-sm text-muted-foreground">
              This profile is stored on Nostr relays as a kind 0 event.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Satoshi Nakamoto"
            />
          </div>

          <div>
            <Label htmlFor="about">About / bio</Label>
            <Textarea
              id="about"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
              placeholder="Writer, thinker, Bitcoiner..."
            />
          </div>

          <ImageUpload
            value={picture}
            onChange={setPicture}
            sk={sk}
            label="Avatar image"
            placeholder="Upload or paste a URL..."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nip05">NIP-05 identifier (optional)</Label>
              <Input
                id="nip05"
                value={nip05}
                onChange={(e) => setNip05(e.target.value)}
                placeholder="name@satoshi53.org"
              />
            </div>
            <div>
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://satoshi53.org"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-warm-orange">{info}</p>}

          <Button onClick={save} disabled={pending}>
            {pending ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
