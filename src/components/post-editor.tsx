"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ImageUpload } from "@/components/image-upload";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { TagPill } from "@/components/tag-pill";
import {
  publishArticle,
  publishDraft,
  triggerRebuild,
  fetchAuthor,
  secretToNpub,
} from "@/lib/nostr";
import { readingTime, slugify, formatDate, shortNpub } from "@/lib/utils";
import type { Author } from "@/lib/types";
import { Eye, Pencil } from "lucide-react";

export interface PostEditorValues {
  d: string;
  title: string;
  subtitle: string;
  slug: string;
  coverImage: string;
  tagsInput: string;
  body: string;
}

export function PostEditor({
  sk,
  initialValues,
  isEdit,
}: {
  sk: Uint8Array;
  initialValues?: Partial<PostEditorValues>;
  isEdit?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues?.title || "");
  const [subtitle, setSubtitle] = useState(initialValues?.subtitle || "");
  const [slug, setSlug] = useState(initialValues?.slug || "");
  const [coverImage, setCoverImage] = useState(initialValues?.coverImage || "");
  const [tagsInput, setTagsInput] = useState(initialValues?.tagsInput || "");
  const [body, setBody] = useState(initialValues?.body || "");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);
  const [author, setAuthor] = useState<Author | null>(null);
  const [previewDate] = useState(() => new Date());

  const existingD = initialValues?.d;

  // Fetch the writer's profile once so the preview shows author info
  // exactly as it will appear on the published post.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { getPublicKey } = await import("nostr-tools/pure");
      const pubkey = getPublicKey(sk);
      const profile = await fetchAuthor(pubkey);
      if (cancelled) return;
      setAuthor(profile);
    })();
    return () => {
      cancelled = true;
    };
  }, [sk]);

  const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

  function publish() {
    setError(null);
    setInfo(null);
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }
    const finalSlug = slug || slugify(title);
    const d = existingD || finalSlug;
    startTransition(async () => {
      const res = await publishArticle({
        sk,
        d,
        title: title.trim(),
        summary: subtitle.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        bodyMarkdown: body,
        tags,
      });
      if (!res.ok) {
        setError(res.error || "Publishing failed.");
        return;
      }
      setInfo("Published to relays. Triggering a site rebuild...");
      const rebuilt = await triggerRebuild();
      if (!rebuilt) {
        setInfo("Published to relays. Ask an admin to rebuild, or it will appear on the next scheduled build.");
      } else {
        setInfo("Published and rebuild triggered. Your post will be live shortly.");
        setTimeout(() => router.push(`/post/${finalSlug}/`), 2000);
      }
    });
  }

  function saveDraft() {
    setError(null);
    setInfo(null);
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }
    const finalSlug = slug || slugify(title);
    const d = existingD || finalSlug;
    startTransition(async () => {
      const res = await publishDraft({
        sk,
        d,
        title: title.trim(),
        summary: subtitle.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        bodyMarkdown: body,
        tags,
      });
      if (!res.ok) {
        setError(res.error || "Saving draft failed.");
        return;
      }
      setInfo("Draft saved to relays (kind 30024). It will not appear publicly until you publish.");
    });
  }

  return (
    <div className="space-y-5">
      {preview ? (
        <article className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-warm-orange/40 bg-warm-orange/10 px-3 py-1 text-xs font-medium text-warm-orange">
              <Eye className="h-3.5 w-3.5" /> Preview
            </span>
            <Button variant="outline" size="sm" onClick={() => setPreview(false)}>
              <Pencil className="h-4 w-4" /> Back to editor
            </Button>
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-card p-6 sm:p-8">
            {tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <TagPill key={t} tag={{ name: t, slug: t, id: t }} size="sm" />
                ))}
              </div>
            )}

            <h1 className="font-serif text-4xl leading-tight text-cream">
              {title.trim() || "Untitled post"}
            </h1>
            {subtitle.trim() && (
              <p className="mt-2 text-lg text-muted-foreground">{subtitle.trim()}</p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <Avatar
                src={author?.picture}
                alt={author?.name || "Your profile"}
                size={40}
              />
              <div className="text-sm">
                <span className="font-medium text-foreground">
                  {author?.name || shortNpub(secretToNpub(sk))}
                </span>
                <p className="text-xs text-muted-foreground">
                  {formatDate(previewDate)} - {readingTime(body)} min read
                </p>
              </div>
            </div>

            {coverImage.trim() && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage.trim()}
                alt={title.trim() || "Cover image"}
                className="mt-6 w-full rounded-[var(--radius)] border border-border object-cover"
              />
            )}

            {body.trim() ? (
              <div className="mt-8">
                <MarkdownRenderer content={body} />
              </div>
            ) : (
              <p className="mt-8 text-muted-foreground">
                Nothing to preview yet — write your post body in the editor.
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setPreview(false)}>
              <Pencil className="h-4 w-4" /> Back to editor
            </Button>
          </div>
        </article>
      ) : (
        <>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug || slug === slugify(title)) setSlug(slugify(e.target.value));
              }}
              placeholder="An interesting post title..."
            />
          </div>
          <div>
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="A short summary shown in the feed"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="slug">Slug (d-identifier)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="post-url-slug"
                disabled={!!isEdit}
              />
              {isEdit && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Slug is locked when editing (keeps the same article address).
                </p>
              )}
            </div>
            <div>
              <ImageUpload
                value={coverImage}
                onChange={setCoverImage}
                sk={sk}
                label="Cover image"
                placeholder="Upload or paste a URL..."
              />
            </div>
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="bitcoin, culture, africa"
            />
          </div>
          <div>
            <Label htmlFor="body">Body (Markdown)</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              className="font-mono text-sm"
              placeholder={"# Heading\n\nWrite your post in **Markdown**..."}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {readingTime(body)} min read - {body.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-warm-orange">{info}</p>}

          <div className="flex flex-wrap gap-2">
            <Button onClick={publish} disabled={pending}>
              {pending ? "Publishing..." : isEdit ? "Update & Publish" : "Publish to Nostr"}
            </Button>
            <Button variant="outline" onClick={saveDraft} disabled={pending}>
              Save draft
            </Button>
            <Button variant="outline" onClick={() => setPreview(true)}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
