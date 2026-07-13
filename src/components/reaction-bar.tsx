"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  publishReaction,
  triggerRebuild,
} from "@/lib/nostr";
import { ReaderLogin, useReaderKey } from "@/components/reader-login";
import type { ReactionSummary } from "@/lib/types";

const QUICK_EMOJIS = ["\u2764\ufe0f", "\ud83e\udd84", "\ud83d\udd25", "\u26a1", "\ud83d\udc4f"];

export function ReactionBar({
  articleId,
  articlePubkey,
  articleD,
  initialReactions,
}: {
  articleId: string;
  articlePubkey: string;
  articleD: string;
  initialReactions: ReactionSummary[];
}) {
  const [reactions, setReactions] = useState(initialReactions);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showLogin, setShowLogin] = useState(false);
  const { sk } = useReaderKey();

  function react(emoji: string) {
    if (!sk) {
      setShowLogin(true);
      return;
    }
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await publishReaction({
        sk,
        emoji,
        article: { pubkey: articlePubkey, d: articleD, id: articleId },
      });
      if (!res.ok) {
        setError(res.error || "Could not publish reaction.");
        return;
      }
      setReactions((prev) => {
        const existing = prev.find((r) => r.emoji === emoji);
        if (existing) {
          return prev.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1 } : r,
          );
        }
        return [...prev, { emoji, count: 1 }];
      });
      setInfo("Reaction published. Visible after the next site rebuild.");
      await triggerRebuild();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {reactions.map((r) => (
          <span
            key={r.emoji}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm"
          >
            <span className="text-base leading-none">{r.emoji}</span>
            {r.count}
          </span>
        ))}
        {reactions.length === 0 && (
          <span className="text-sm text-muted-foreground">No reactions yet</span>
        )}
      </div>

      {showLogin && !sk ? (
        <div>
          <ReaderLogin onLoggedIn={() => setShowLogin(false)} compact />
          <button
            onClick={() => setShowLogin(false)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {QUICK_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              size="sm"
              variant="outline"
              onClick={() => react(emoji)}
              disabled={pending}
            >
              {emoji}
            </Button>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {info && <p className="mt-2 text-sm text-warm-orange">{info}</p>}
    </div>
  );
}
