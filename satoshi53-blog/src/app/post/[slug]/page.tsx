import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { TagPill } from "@/components/tag-pill";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ReactionBar } from "@/components/reaction-bar";
import { EditButton } from "@/components/edit-button";
import { Comments } from "@/components/comments";
import {
  fetchArticles,
  fetchAuthor,
  fetchComments,
  fetchReactions,
} from "@/lib/nostr";
import { formatDate, shortNpub } from "@/lib/utils";


export async function generateStaticParams() {
  const articles = await fetchArticles();
  if (articles.length === 0) return [{ slug: "placeholder" }];
  return articles.map((a) => ({ slug: a.slug }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const articles = await fetchArticles();
  const post = articles.find((a) => a.slug === slug);
  if (!post) notFound();

  const [author, comments, reactions] = await Promise.all([
    fetchAuthor(post.pubkey),
    fetchComments(post),
    fetchReactions(post),
  ]);

  return (
    <AppShell>
      <article className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {post.tags.map((t) => (
            <TagPill key={t} tag={{ name: t, slug: t, id: t }} size="sm" />
          ))}
        </div>

        <h1 className="font-serif text-4xl leading-tight text-cream">{post.title}</h1>
        {post.summary && (
          <p className="mt-2 text-lg text-muted-foreground">{post.summary}</p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Link href={`/u/${post.npub}/`}>
            <Avatar
              src={author?.picture}
              alt={author?.name || shortNpub(post.npub)}
              size={40}
            />
          </Link>
          <div className="text-sm">
            <Link
              href={`/u/${post.npub}/`}
              className="font-medium text-foreground hover:text-warm-orange"
            >
              {author?.name || shortNpub(post.npub)}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatDate(post.publishedAt)} Â· {post.readingTime} min read
            </p>
          </div>
          <div className="ml-auto">
            <EditButton slug={post.slug} authorPubkey={post.pubkey} />
          </div>
        </div>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt={post.title}
            className="mt-6 w-full rounded-[var(--radius)] border border-border object-cover"
          />
        )}

        <div className="mt-8">
          <MarkdownRenderer content={post.bodyMarkdown} />
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <ReactionBar
            articleId={post.id}
            articleD={post.d}
            articlePubkey={post.pubkey}
            initialReactions={reactions}
          />
        </div>

        <Comments
          articleId={post.id}
          articleD={post.d}
          articlePubkey={post.pubkey}
          initialComments={comments as unknown as React.ComponentProps<typeof Comments>["initialComments"]}
        />
      </article>
    </AppShell>
  );
}
