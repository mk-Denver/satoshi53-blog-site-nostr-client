import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { nip19 } from "nostr-tools";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { Avatar } from "@/components/ui/avatar";
import { fetchArticles, fetchAuthor, fetchComments, fetchReactions } from "@/lib/nostr";
import { ALLOWED_NPUBS, SITE } from "@/lib/constants";
import { shortNpub } from "@/lib/utils";
import type { ArticleWithMeta } from "@/lib/types";


export async function generateStaticParams() {
  const articles = await fetchArticles();
  const npubs = new Set<string>();
  articles.forEach((a) => npubs.add(a.npub));
  ALLOWED_NPUBS.forEach((n) => npubs.add(n));
  // Ensure at least one param so static export doesn't choke on empty.
  if (npubs.size === 0) npubs.add("npub1placeholder");
  return [...npubs].map((npub) => ({ npub }));
}

function toHex(npub: string): string | null {
  try {
    const d = nip19.decode(npub);
    if (d.type === "npub") return d.data as string;
  } catch {
    // maybe already hex
  }
  if (/^[0-9a-f]{64}$/.test(npub)) return npub;
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ npub: string }>;
}): Promise<Metadata> {
  const { npub } = await params;
  const pubkey = toHex(npub);
  if (!pubkey) return { title: "Not found" };

  const isAllowedNpub = ALLOWED_NPUBS.includes(npub.toLowerCase());
  if (!isAllowedNpub) {
    const articles = await fetchArticles();
    const hasPosts = articles.some((a) => a.pubkey === pubkey);
    if (!hasPosts) return { title: "Not found" };
  }

  const author = await fetchAuthor(pubkey);
  const name = author?.name || shortNpub(npub);
  const title = `${name} · Satoshi53 Research`;
  const description =
    author?.about ||
    `Research publications by ${name} on Satoshi53, published on Nostr.`;
  const url = `${SITE.url}/u/${npub}/`;

  return {
    title,
    description,
    openGraph: {
      type: "profile",
      url,
      title,
      description,
      ...(author?.picture ? { images: [author.picture] } : {}),
    },
    twitter: {
      card: author?.picture ? "summary_large_image" : "summary",
      title,
      description,
      ...(author?.picture ? { images: [author.picture] } : {}),
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ npub: string }>;
}) {
  const { npub } = await params;
  const pubkey = toHex(npub);
  if (!pubkey) notFound();

  const all = await fetchArticles();
  const posts = all.filter((a) => a.pubkey === pubkey);
  if (posts.length === 0 && !ALLOWED_NPUBS.includes(npub.toLowerCase())) notFound();

  const author = await fetchAuthor(pubkey);

  const withMeta: ArticleWithMeta[] = await Promise.all(
    posts.map(async (a) => {
      const [comments, reactions] = await Promise.all([
        fetchComments(a),
        fetchReactions(a),
      ]);
      return {
        ...a,
        author: author!,
        commentCount: comments.length,
        reactions,
      };
    }),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Avatar
            src={author?.picture}
            alt={author?.name || shortNpub(npub)}
            size={80}
          />
          <div>
            <h1 className="font-serif text-2xl text-cream">
              {author?.name || shortNpub(npub)}
            </h1>
            <p className="text-sm text-muted-foreground">{shortNpub(npub)}</p>
            {author?.about && (
              <p className="mt-2 text-sm text-foreground">{author.about}</p>
            )}
          </div>
        </div>

        <h2 className="font-serif text-xl text-cream mb-4">Posts</h2>
        {withMeta.length === 0 ? (
          <p className="text-muted-foreground">No published posts yet.</p>
        ) : (
          <div className="grid gap-4">
            {withMeta.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
