"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { nsecToSecret } from "@/lib/nostr";
import { useLocalStorage } from "@/lib/hooks";

const NSEC_KEY = "s53_nsec";

export function EditButton({
  slug,
  authorPubkey,
}: {
  slug: string;
  authorPubkey: string;
}) {
  const nsec = useLocalStorage(NSEC_KEY);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (!nsec) return;
    const sk = nsecToSecret(nsec);
    if (!sk) return;
    import("nostr-tools/pure").then(({ getPublicKey }) => {
      setCanEdit(getPublicKey(sk) === authorPubkey);
    });
  }, [nsec, authorPubkey]);

  if (!canEdit) return null;

  return (
    <Link href={`/post/${slug}/edit/`}>
      <Button variant="outline" size="sm">
        <Pencil className="h-4 w-4" /> Edit
      </Button>
    </Link>
  );
}
