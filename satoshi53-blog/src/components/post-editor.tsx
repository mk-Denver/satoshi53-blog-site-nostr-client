"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { ImageUpload } from "@/components/image-upload";
import {
  publishArticle,
  publishDraft,
  triggerRebuild,
} from "@/lib/nostr";
import { readingTime, slugify } from "@/lib/utils";

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

  const existingD = initialValues?.d;

  function publish() {
    setError(null);
    setInfo(null);
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }
    const finalSlug = slug || slugify(title);
    const d = existingD || finalSlug;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
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
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
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

      <div className="flex gap-2">
        <Button onClick={publish} disabled={pending}>
          {pending ? "Publishing..." : isEdit ? "Update & Publish" : "Publish to Nostr"}
        </Button>
        <Button variant="outline" onClick={saveDraft} disabled={pending}>
          Save draft
        </Button>
      </div>
    </div>
  );
}
