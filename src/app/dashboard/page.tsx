"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PenSquare, ExternalLink, Pencil } from "lucide-react";
import {
  nsecToSecret,
  isWriterNpub,
  fetchArticlesByAuthor,
  fetchAuthor,
  fetchDeletions,
} from "@/lib/nostr";
import type { Article, Author } from "@/lib/types";
import { formatDate, shortNpub } from "@/lib/utils";
import { useLocalStorage, useMounted } from "@/lib/hooks";

const WRITER_KEY = "s53_writer_nsec";
const NSEC_KEY = "s53_nsec";

export default function DashboardPage() {
  const router = useRouter();
  const mounted = useMounted();
  const writerNpub = useLocalStorage(WRITER_KEY);
  const nsec = useLocalStorage(NSEC_KEY);
  const [sk, setSk] = useState<Uint8Array | null>(null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until mounted so useLocalStorage has returned real values
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
      const [mine, profile, deleted] = await Promise.all([
        fetchArticlesByAuthor(pubkey),
        fetchAuthor(pubkey),
        fetchDeletions(pubkey),
      ]);
      if (cancelled) return;
      const visible = mine.filter(
        (a) =>
          !deleted.has(a.id) &&
          !deleted.has(`${30023}:${a.pubkey}:${a.d}`),
      );
      setArticles(visible);
      setAuthor(profile);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sk]);

  if (!mounted || !sk) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        {/* Profile summary */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar
            src={author?.picture}
            alt={author?.name || "Your profile"}
            size={64}
          />
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-cream">
              {author?.name || "Unnamed writer"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {shortNpub(writerNpub || "")}
            </p>
          </div>
          <Link href="/settings/">
            <Button variant="outline" size="sm">
              Edit profile
            </Button>
          </Link>
        </div>

        {/* Posts */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-cream">
            My posts ({articles.length})
          </h2>
          <Link href="/post/new/">
            <Button size="sm">
              <PenSquare className="h-4 w-4" /> New post
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading your posts…</p>
        ) : articles.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">You haven&apos;t published any posts yet.</p>
            <Link href="/post/new/" className="mt-2 inline-block text-warm-orange hover:underline">
              Write your first post →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-card p-4 hover:border-warm-orange/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <Link href={`/post/${a.slug}/`} className="block">
                    <h3 className="font-serif text-lg text-cream truncate hover:text-warm-orange transition-colors">
                      {a.title}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(a.publishedAt)} · {a.readingTime} min read
                    {a.tags.length > 0 && ` · ${a.tags.map((t) => "#" + t).join(" ")}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <Link href={`/post/${a.slug}/`}>
                    <button
                      aria-label="View post"
                      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:text-warm-orange hover:bg-secondary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </Link>
                  <Link href={`/post/${a.slug}/edit/`}>
                    <button
                      aria-label="Edit post"
                      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:text-warm-orange hover:bg-secondary transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
