"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { fetchArticles, fetchAuthors, fetchComments, fetchReactions } from "@/lib/nostr";
import type { ArticleWithMeta } from "@/lib/types";

function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [posts, setPosts] = useState<ArticleWithMeta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const query = q.trim().toLowerCase();
      const all = await fetchArticles();
      if (cancelled) return;
      const filtered = all.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          (a.summary || "").toLowerCase().includes(query) ||
          a.bodyMarkdown.toLowerCase().includes(query) ||
          a.tags.some((t) => t.toLowerCase().includes(query)),
      );
      const pubkeys = [...new Set(filtered.map((a) => a.pubkey))];
      const authorMap = await fetchAuthors(pubkeys);
      const withMeta: ArticleWithMeta[] = await Promise.all(
        filtered.map(async (a) => {
          const [comments, reactions] = await Promise.all([
            fetchComments(a),
            fetchReactions(a),
          ]);
          return {
            ...a,
            author:
              authorMap.get(a.pubkey) || {
                pubkey: a.pubkey,
                npub: a.npub,
                name: null,
                about: null,
                picture: null,
                nip05: null,
                website: null,
              },
            commentCount: comments.length,
            reactions,
          };
        }),
      );
      if (!cancelled) {
        setPosts(withMeta);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q]);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-cream">Search</h1>
        <form action="/search" method="get" className="mt-3 max-w-lg">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search posts…"
            autoFocus
            className="flex h-10 w-full rounded-[var(--radius)] border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
      </div>

      {loading && <p className="text-muted-foreground">Searching relays…</p>}

      {!loading && q.trim() && (
        <p className="mb-4 text-sm text-muted-foreground">
          {posts.length} result{posts.length === 1 ? "" : "s"} for “{q}”
        </p>
      )}

      {!loading && posts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : !loading && q.trim() ? (
        <p className="text-muted-foreground">No posts found. Try a different query.</p>
      ) : null}
    </AppShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<AppShell><p className="text-muted-foreground">Loading…</p></AppShell>}>
      <SearchResults />
    </Suspense>
  );
}
