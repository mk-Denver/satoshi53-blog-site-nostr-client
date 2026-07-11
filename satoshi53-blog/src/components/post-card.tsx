import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { TagPill } from "@/components/tag-pill";
import type { ArticleWithMeta } from "@/lib/types";
import { formatRelative, truncate, shortNpub } from "@/lib/utils";

export function PostCard({ post }: { post: ArticleWithMeta }) {
  const author = post.author;
  return (
    <article className="group rounded-[var(--radius)] border border-border bg-card p-5 transition-colors hover:border-warm-orange/50">
      <div className="flex items-center gap-2.5">
        <Link href={`/u/${post.npub}/`}>
          <Avatar src={author.picture} alt={author.name || shortNpub(post.npub)} size={32} />
        </Link>
        <div className="text-sm">
          <Link
            href={`/u/${post.npub}/`}
            className="font-medium text-foreground hover:text-warm-orange"
          >
            {author.name || shortNpub(post.npub)}
          </Link>
          <p className="text-xs text-muted-foreground">
            {formatRelative(post.publishedAt)} · {post.readingTime} min read
          </p>
        </div>
      </div>

      <Link href={`/post/${post.slug}/`} className="mt-3 block">
        <h2 className="font-serif text-xl text-cream group-hover:text-warm-orange transition-colors">
          {post.title}
        </h2>
        {post.summary && (
          <p className="mt-1 text-sm text-muted-foreground">{truncate(post.summary, 160)}</p>
        )}
      </Link>

      <div className="mt-4 flex items-center justify-between">
        {post.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((t) => (
              <TagPill key={t} tag={{ name: t, slug: t, id: t }} size="sm" />
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {post.reactions.length > 0 && (
            <span>
              {post.reactions.reduce((s, r) => s + r.count, 0)} reactions
            </span>
          )}
          <span>·</span>
          <span>{post.commentCount} comments</span>
        </div>
      </div>
    </article>
  );
}
