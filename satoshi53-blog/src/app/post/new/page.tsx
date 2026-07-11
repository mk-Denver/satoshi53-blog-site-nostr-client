"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import {
  nsecToSecret,
  isWriterNpub,
  publishArticle,
  publishDraft,
  triggerRebuild,
} from "@/lib/nostr";
import { readingTime, slugify } from "@/lib/utils";

const WRITER_KEY = "s53_writer_nsec";
const NSEC_KEY = "s53_nsec";

export default function NewPostPage() {
  const router = useRouter();

  // Read signing key from localStorage once (client-only).
  const sk = useState<Uint8Array | null>(() => {
    if (typeof window === "undefined") return null;
    const writerNpub = localStorage.getItem(WRITER_KEY);
    const nsec = localStorage.getItem(NSEC_KEY);
    if (!writerNpub || !nsec || !isWriterNpub(writerNpub)) return null;
    return nsecToSecret(nsec);
  })[0];

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!sk) router.replace("/writer/");
  }, [sk, router]);

  function publish() {
    setError(null);
    setInfo(null);
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }
    if (!sk) {
      setError("No signing key. Unlock at /writer/.");
      return;
    }
    const finalSlug = slug || slugify(title);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    startTransition(async () => {
      const res = await publishArticle({
        sk,
        d: finalSlug,
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
      setInfo("Published to relays. Triggering a site rebuild…");
      const rebuilt = await triggerRebuild();
      if (!rebuilt) {
        setInfo(
          "Published to relays. Ask an admin to rebuild, or it will appear on the next scheduled build.",
        );
      } else {
        setInfo("Published and rebuild triggered. Your post will be live shortly.");
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
    if (!sk) {
      setError("No signing key. Unlock at /writer/.");
      return;
    }
    const finalSlug = slug || slugify(title);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    startTransition(async () => {
      const res = await publishDraft({
        sk,
        d: finalSlug,
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

  if (!sk) {
    return (
      <AppShell>
        <p className="text-muted-foreground">
          Redirecting to writer unlock…{" "}
          <Link href="/writer/" className="text-warm-orange underline">
            go now
          </Link>
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-2xl text-cream mb-6">Write a new post</h1>
        <div className="space-y-5">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
              placeholder="An interesting post title…"
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
              />
            </div>
            <div>
              <Label htmlFor="cover">Cover image URL (optional)</Label>
              <Input
                id="cover"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…"
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
              placeholder={"# Heading\n\nWrite your post in **Markdown**…"}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {readingTime(body)} min read · {body.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-warm-orange">{info}</p>}

          <div className="flex gap-2">
            <Button onClick={publish} disabled={pending}>
              {pending ? "Publishing…" : "Publish to Nostr"}
            </Button>
            <Button variant="outline" onClick={saveDraft} disabled={pending}>
              Save draft
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
