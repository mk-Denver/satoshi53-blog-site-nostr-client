export const SITE = {
  name: "Satoshi53",
  description:
    "An internal blog platform for the Satoshi53 team — exploring Bitcoin, culture, and African creativity.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://satoshi53-blog.netlify.app",
} as const;

// Nostr relays to read from / publish to. Comma-separated in env.
export const RELAYS: string[] = (process.env.NEXT_PUBLIC_RELAYS || "")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

// Allowed writer npubs (hex). Only articles from these are displayed.
// Set via NEXT_PUBLIC_ALLOWED_NPUBS (comma-separated).
export const ALLOWED_NPUBS: string[] = (process.env.NEXT_PUBLIC_ALLOWED_NPUBS || "")
  .split(",")
  .map((n) => n.trim().toLowerCase())
  .filter(Boolean);

// Nostr event kinds
export const KIND_ARTICLE = 30023; // NIP-23 long-form article (parameterized replaceable)
export const KIND_DRAFT = 30024; // NIP-23 draft long-form content (unpublished)
export const KIND_COMMENT = 1111; // NIP-22 structured comment on non-note content
export const KIND_NOTE = 1; // kind 1 = short text note (legacy comment fallback)
export const KIND_REACTION = 7; // NIP-25 reactions (kind 7 with content emoji)
export const KIND_PROFILE = 0; // kind 0 = profile metadata (setMetadata)

// Netlify build hook to trigger a rebuild after a new article is published.
export const REBUILD_WEBHOOK = process.env.NETLIFY_REBUILD_WEBHOOK || "";
