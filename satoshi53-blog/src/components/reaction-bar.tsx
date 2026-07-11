"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  publishReaction,
  nsecToSecret,
  triggerRebuild,
} from "@/lib/nostr";
import type { ReactionSummary } from "@/lib/types";

const NSEC_KEY = "s53_nsec";

const QUICK_EMOJIS = ["❤️", "🦄", "🔥", "⚡", "👏"];

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
  const [nsec, setNsec] = useState("");
  const [showNsec, setShowNsec] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function react(emoji: string) {
    if (!nsec.trim()) {
      setShowNsec(true);
      setError("Paste your nsec to sign the reaction.");
      return;
    }
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const sk = nsecToSecret(nsec);
      if (!sk) {
        setError("Invalid nsec.");
        return;
      }
      localStorage.setItem(NSEC_KEY, nsec.trim());
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
      <div className="flex flex-wrap items-center gap-2">
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

      <div className="mt-3 flex flex-wrap gap-2">
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

      {showNsec && (
        <div className="mt-3">
          <Label htmlFor="rxn-nsec">Your nsec (signing key — stays in browser)</Label>
          <Input
            id="rxn-nsec"
            type="password"
            value={nsec}
            onChange={(e) => setNsec(e.target.value)}
            placeholder="nsec1…"
            className="max-w-sm"
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {info && <p className="mt-2 text-sm text-warm-orange">{info}</p>}
    </div>
  );
}
