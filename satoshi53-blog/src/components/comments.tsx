"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import {
  publishComment,
  triggerRebuild,
} from "@/lib/nostr";
import { ReaderLogin, useReaderKey } from "@/components/reader-login";
import { formatRelative, shortNpub } from "@/lib/utils";
import type { CommentItem } from "@/lib/types";

export function Comments({
  articleD,
  articlePubkey,
  articleId,
  initialComments,
}: {
  articleD: string;
  articlePubkey: string;
  articleId: string;
  initialComments: CommentItem[];
}) {
  const [comments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { sk } = useReaderKey();

  function submit() {
    if (!sk) {
      setError("Please log in to comment.");
      return;
    }
    if (!body.trim()) {
      setError("Comment cannot be empty.");
      return;
    }
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await publishComment({
        sk,
        content: body.trim(),
        article: { pubkey: articlePubkey, d: articleD, id: articleId },
      });
      if (!res.ok) {
        setError(res.error || "Could not publish to relay.");
        return;
      }
      setInfo("Comment published. It will appear here after the next site rebuild.");
      setBody("");
      const rebuilt = await triggerRebuild();
      if (!rebuilt) {
        setInfo(
          "Comment published. It will appear on the next scheduled build.",
        );
      }
    });
  }

  return (
    <section className="mt-12">
      <h3 className="font-serif text-lg text-cream mb-4">
        Discussion ({comments.length})
      </h3>

      {sk ? (
        <div className="mb-6">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Add to the discussion…"
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          {info && <p className="mt-2 text-sm text-warm-orange">{info}</p>}
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
              {pending ? "Publishing…" : "Publish comment"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <ReaderLogin />
        </div>
      )}

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar src={c.authorPicture} alt={c.authorName || shortNpub(c.npub)} size={32} />
            <div className="flex-1 rounded-[var(--radius)] border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {c.authorName || shortNpub(c.npub)}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {formatRelative(c.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
        )}
      </div>
    </section>
  );
}
