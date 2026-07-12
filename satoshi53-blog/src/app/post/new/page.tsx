"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PostEditor } from "@/components/post-editor";
import { nsecToSecret, isWriterNpub } from "@/lib/nostr";
import { useLocalStorage, useMounted } from "@/lib/hooks";

const WRITER_KEY = "s53_writer_nsec";
const NSEC_KEY = "s53_nsec";

export default function NewPostPage() {
  const router = useRouter();
  const mounted = useMounted();
  const writerNpub = useLocalStorage(WRITER_KEY);
  const nsec = useLocalStorage(NSEC_KEY);
  const [sk, setSk] = useState<Uint8Array | null>(null);

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

  if (!mounted || !sk) {
    return (
      <AppShell>
        <p className="text-muted-foreground">
          Redirecting to writer unlock…{" "}
          <Link href="/writer/" className="text-warm-orange underline">
            go now
          </Link>
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-2xl text-cream mb-6">Write a new post</h1>
        <PostEditor sk={sk} />
      </div>
    </AppShell>
  );
}
