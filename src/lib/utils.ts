import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a Nostr timestamp (Unix seconds) or other date input to a Date.
 * Nostr events use `created_at` in seconds; JavaScript Date uses milliseconds.
 * If the number is small enough to be seconds (< 10^12), multiply by 1000.
 */
function toDate(date: string | Date | number): Date {
  if (typeof date === "number" && date < 1e12) {
    return new Date(date * 1000);
  }
  return new Date(date);
}

export function formatDate(date: string | Date | number): string {
  const d = toDate(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelative(date: string | Date | number): string {
  const d = toDate(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

export function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function truncate(text: string, max = 140): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "\u2026";
}

export function shortNpub(npub: string): string {
  if (!npub || npub.length < 16) return npub;
  return `${npub.slice(0, 8)}\u2026${npub.slice(-4)}`;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || `post-${Math.random().toString(36).slice(2, 8)}`
  );
}
