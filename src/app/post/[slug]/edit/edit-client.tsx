"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PostEditor, type PostEditorValues } from "@/components/post-editor";
import { Button } from "@/components/ui/button";
import {
  nsecToSecret,
  isWriterNpub,
  fetchArticles,
  publishDeletion,
  triggerRebuild,
} from "@/lib/nostr";
import type { Article } from "@/lib/types";
import { useLocalStorage, useMounted } from "@/lib/hooks";

const WRITER_KEY = "s53_writer_nsec";
const NSEC_KEY = "s53_nsec";

export default function EditPostClient({ slug }: { slug: string }) {
  const router = useRouter();
  const mounted = useMounted();
  const writerNpub = useLocalStorage(WRITER_KEY);
  const nsec = useLocalStorage(NSEC_KEY);
  const [sk, setSk] = useState<Uint8Array | null>(null);

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
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
      const articles = await fetchArticles();
      if (cancelled) return;
      const found = articles.find((a) => a.slug === slug);
      if (!found) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { getPublicKey } = await import("nostr-tools/pure");
      const myPubkey = getPublicKey(sk);
      if (found.pubkey !== myPubkey) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setArticle(found);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, sk]);

  function handleDelete() {
    if (!sk || !article) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await publishDeletion({
        sk,
        article: { id: article.id, pubkey: article.pubkey, d: article.d },
        reason: deleteReason.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error || "Deletion failed.");
        return;
      }
      setInfo("Article deleted. Triggering rebuild…");
      await triggerRebuild();
      setTimeout(() => router.push("/dashboard/"), 2000);
    });
  }

  if (!mounted || !sk) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading article…</p>
      </AppShell>
    );
  }

  if (notFound || !article) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">
          <p className="text-muted-foreground">
            Article not found, or you don&apos;t have permission to edit it.
          </p>
          <Link href="/dashboard/" className="mt-2 inline-block text-warm-orange hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const initialValues: PostEditorValues = {
    d: article.d,
    title: article.title,
    subtitle: article.summary || "",
    slug: article.slug,
    coverImage: article.coverImage || "",
    tagsInput: article.tags.join(", "),
    body: article.bodyMarkdown,
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl text-cream">Edit post</h1>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDelete((s) => !s)}
          >
            Delete
          </Button>
        </div>

        {showDelete && (
          <div className="mb-6 rounded-[var(--radius)] border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-foreground mb-2">
              This publishes a NIP-09 deletion request (kind 5) to your relays.
              Relays should remove the article, but this is not guaranteed.
            </p>
            <input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mb-2"
            />
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
                {pending ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <PostEditor sk={sk} initialValues={initialValues} isEdit />

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {info && <p className="mt-4 text-sm text-warm-orange">{info}</p>}
      </div>
    </AppShell>
  );
}
