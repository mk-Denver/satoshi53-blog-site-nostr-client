"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PostEditor } from "@/components/post-editor";
import { nsecToSecret, isWriterNpub } from "@/lib/nostr";

const WRITER_KEY = "s53_writer_nsec";
const NSEC_KEY = "s53_nsec";

export default function NewPostPage() {
  const router = useRouter();

  const sk = useState<Uint8Array | null>(() => {
    if (typeof window === "undefined") return null;
    const writerNpub = localStorage.getItem(WRITER_KEY);
    const nsec = localStorage.getItem(NSEC_KEY);
    if (!writerNpub || !nsec || !isWriterNpub(writerNpub)) return null;
    return nsecToSecret(nsec);
  })[0];

  useEffect(() => {
    if (!sk) router.replace("/writer/");
  }, [sk, router]);

  if (!sk) {
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
