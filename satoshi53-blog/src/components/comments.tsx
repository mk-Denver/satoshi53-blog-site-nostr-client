"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";
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
  const [showLogin, setShowLogin] = useState(false);
  const { sk } = useReaderKey();

  function submit() {
    if (!sk) {
      setShowLogin(true);
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
        setInfo("Comment published. It will appear on the next scheduled build.");
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
            placeholder="Add to the discussion\u2026"
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          {info && <p className="mt-2 text-sm text-warm-orange">{info}</p>}
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
              {pending ? "Publishing\u2026" : "Publish comment"}
            </Button>
          </div>
        </div>
      ) : showLogin ? (
        <div className="mb-6">
          <ReaderLogin onLoggedIn={() => setShowLogin(false)} />
          <button
            onClick={() => setShowLogin(false)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogin(true)}
          >
            <MessageCircle className="h-4 w-4" /> Sign in to comment
          </Button>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
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
                  \u00b7 {formatRelative(c.createdAt)}
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
