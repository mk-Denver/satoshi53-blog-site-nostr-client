import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { fetchArticles, fetchAuthors, fetchComments, fetchReactions } from "@/lib/nostr";
import type { ArticleWithMeta } from "@/lib/types";


export async function generateStaticParams() {
  const articles = await fetchArticles();
  const tags = new Set<string>();
  articles.forEach((a) => a.tags.forEach((t) => tags.add(t)));
  // Ensure at least one param so static export doesn't choke on empty.
  if (tags.size === 0) tags.add("bitcoin");
  return [...tags].map((slug) => ({ slug }));
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const all = await fetchArticles();
  const tagged = all.filter((a) =>
    a.tags.some((t) => t.toLowerCase() === slug.toLowerCase()),
  );
  if (tagged.length === 0 && slug) notFound();

  const pubkeys = [...new Set(tagged.map((a) => a.pubkey))];
  const authorMap = await fetchAuthors(pubkeys);

  const posts: ArticleWithMeta[] = await Promise.all(
    tagged.map(async (a) => {
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
        <h1 className="font-serif text-3xl text-cream">
          <span className="text-warm-orange">#{slug}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {posts.length} post{posts.length === 1 ? "" : "s"}
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts tagged yet.</p>
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
