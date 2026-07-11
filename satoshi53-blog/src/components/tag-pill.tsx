import Link from "next/link";
import { cn } from "@/lib/utils";

type TagLike = {
  name: string;
  slug: string;
  id?: string;
};

export function TagPill({
  tag,
  size = "md",
}: {
  tag: TagLike;
  size?: "sm" | "md";
}) {
  return (
    <Link
      href={`/tag/${tag.slug}/`}
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-colors",
        "bg-secondary text-muted-foreground hover:bg-warm-orange hover:text-primary-foreground hover:border-warm-orange border border-transparent",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
    >
      #{tag.name}
    </Link>
  );
}

export function TagPills({ tags }: { tags: TagLike[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <TagPill key={t.slug} tag={t} />
      ))}
    </div>
  );
}
