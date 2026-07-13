import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 group", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-warm-orange text-primary-foreground font-serif text-xl shadow-sm transition-transform group-hover:scale-105">
        S
      </span>
      <span className="font-serif text-xl text-cream tracking-tight">
        Satoshi<span className="text-warm-orange">53</span>
      </span>
    </Link>
  );
}

export function NavIconLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:text-warm-orange hover:bg-secondary transition-colors"
    >
      <Icon className="h-5 w-5" />
    </Link>
  );
}
