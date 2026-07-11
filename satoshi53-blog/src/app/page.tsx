import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { fetchArticles, fetchAuthors, fetchReactions, fetchComments } from "@/lib/nostr";
import type { ArticleWithMeta } from "@/lib/types";

export default async function HomePage() {
  const articles = await fetchArticles();
  const pubkeys = [...new Set(articles.map((a) => a.pubkey))];
  const authorMap = await fetchAuthors(pubkeys);

  const posts: ArticleWithMeta[] = await Promise.all(
    articles.map(async (a) => {
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

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-cream">Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest posts from the Satoshi53 team
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No posts found from configured relays.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Make sure <code>NEXT_PUBLIC_RELAYS</code> and{" "}
            <code>NEXT_PUBLIC_ALLOWED_NPUBS</code> are set.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
