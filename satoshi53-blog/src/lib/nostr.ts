import { finalizeEvent, verifyEvent } from "nostr-tools/pure";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { SimplePool, useWebSocketImplementation as setWebSocketImpl } from "nostr-tools/pool";
import { nip19 } from "nostr-tools";
import type { Event } from "nostr-tools";
import {
  RELAYS,
  ALLOWED_NPUBS,
  KIND_ARTICLE,
  KIND_DRAFT,
  KIND_COMMENT,
  KIND_NOTE,
  KIND_REACTION,
  KIND_PROFILE,
  KIND_DELETION,
  REBUILD_WEBHOOK,
} from "@/lib/constants";
import type {
  NostrEvent,
  Article,
  Author,
  CommentItem,
  ReactionSummary,
  ArticleWithMeta,
} from "@/lib/types";
import { readingTime } from "@/lib/utils";

// Use the Node WebSocket implementation when running in a build environment.
let relayReady = false;
async function ensureRelayImpl() {
  if (relayReady) return;
  if (typeof window === "undefined") {
    const ws = await import("ws");
    setWebSocketImpl(ws.WebSocket);
  }
  relayReady = true;
}

function toHexNpub(pubkey: string): string {
  try {
    return nip19.npubEncode(pubkey);
  } catch {
    return pubkey;
  }
}

function eventToNostr(e: Event): NostrEvent {
  return {
    id: e.id,
    pubkey: e.pubkey,
    created_at: e.created_at,
    kind: e.kind,
    tags: e.tags,
    content: e.content,
    sig: e.sig,
  };
}

function tagValue(tags: string[][], name: string): string | null {
  for (const t of tags) {
    if (t[0] === name && t[1]) return t[1];
  }
  return null;
}

function tagAll(tags: string[][], name: string): string[] {
  return tags.filter((t) => t[0] === name && t[1]).map((t) => t[1]);
}

function slugifyD(d: string): string {
  return d
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    || `post-${Math.random().toString(36).slice(2, 8)}`;
}

function isAllowed(pubkey: string): boolean {
  if (ALLOWED_NPUBS.length === 0) return false;
  const npub = toHexNpub(pubkey).toLowerCase();
  const hex = pubkey.toLowerCase();
  return ALLOWED_NPUBS.some((a) => a === hex || a === npub);
}

export function parseArticle(e: NostrEvent): Article | null {
  if (e.kind !== KIND_ARTICLE) return null;
  const d = tagValue(e.tags, "d") || e.id.slice(0, 16);
  const title = tagValue(e.tags, "title") || "Untitled";
  const summary = tagValue(e.tags, "summary");
  const coverImage = tagValue(e.tags, "image");
  const tags = tagAll(e.tags, "t");
  const publishedAtRaw = tagValue(e.tags, "published_at");
  const publishedAt = publishedAtRaw
    ? parseInt(publishedAtRaw, 10)
    : e.created_at;
  const body = e.content || "";
  return {
    id: e.id,
    pubkey: e.pubkey,
    npub: toHexNpub(e.pubkey),
    d,
    slug: slugifyD(d),
    title,
    summary,
    coverImage,
    bodyMarkdown: body,
    tags,
    publishedAt: publishedAt || e.created_at,
    createdAt: e.created_at,
    readingTime: readingTime(body),
  };
}

export function parseProfile(e: NostrEvent): Author | null {
  if (e.kind !== KIND_PROFILE) return null;
  try {
    const meta = JSON.parse(e.content || "{}");
    return {
      pubkey: e.pubkey,
      npub: toHexNpub(e.pubkey),
      name: meta.name || null,
      about: meta.about || null,
      picture: meta.picture || null,
      nip05: meta.nip05 || null,
      website: meta.website || null,
    };
  } catch {
    return null;
  }
}

async function fetchEvents(
  filters: Record<string, unknown>,
  relayUrls = RELAYS,
): Promise<NostrEvent[]> {
  if (relayUrls.length === 0) return [];
  await ensureRelayImpl();
  const pool = new SimplePool();
  const events = await pool.querySync(relayUrls, filters as unknown as Parameters<typeof pool.querySync>[1]);
  pool.destroy();
  const results: NostrEvent[] = [];
  for (const e of events) {
    if (verifyEvent(e)) results.push(eventToNostr(e));
  }
  // dedupe by id, keep latest per id (created_at)
  const byId = new Map<string, NostrEvent>();
  for (const e of results) {
    const existing = byId.get(e.id);
    if (!existing || e.created_at > existing.created_at) byId.set(e.id, e);
  }
  return [...byId.values()];
}

// ── Articles (only from allowed npubs) ──────────────────────────
export async function fetchArticles(): Promise<Article[]> {
  // Allow empty ALLOWED_NPUBS to mean "fetch nothing" (no public content leak).
  const authors = ALLOWED_NPUBS.map((a) =>
    a.startsWith("npub1") ? (nip19.decode(a).data as string) : a,
  );
  if (authors.length === 0) return [];
  const events = await fetchEvents({
    kinds: [KIND_ARTICLE],
    authors,
  });
  const articles = events
    .map(parseArticle)
    .filter((a): a is Article => !!a)
    .filter((a) => isAllowed(a.pubkey)); // double-filter by npub
  // For parameterized replaceable kind 30023, keep latest per (pubkey, d)
  const latest = new Map<string, Article>();
  for (const a of articles) {
    const key = `${a.pubkey}:${a.d}`;
    const ex = latest.get(key);
    if (!ex || a.createdAt > ex.createdAt) latest.set(key, a);
  }
  return [...latest.values()].sort((x, y) => y.publishedAt - x.publishedAt);
}

export async function fetchArticleBySlug(
  slug: string,
): Promise<Article | null> {
  const all = await fetchArticles();
  return all.find((a) => a.slug === slug) || null;
}

// ── Profiles ─────────────────────────────────────────────────────
export async function fetchAuthors(pubkeys: string[]): Promise<Map<string, Author>> {
  const map = new Map<string, { author: Author; created_at: number }>();
  if (pubkeys.length === 0) return new Map();
  const events = await fetchEvents({ kinds: [KIND_PROFILE], authors: pubkeys });
  for (const e of events) {
    const p = parseProfile(e);
    if (!p) continue;
    const existing = map.get(p.pubkey);
    if (!existing || e.created_at > existing.created_at) {
      map.set(p.pubkey, { author: p, created_at: e.created_at });
    }
  }
  const result = new Map<string, Author>();
  for (const [k, v] of map) result.set(k, v.author);
  return result;
}

export async function fetchAuthor(pubkey: string): Promise<Author | null> {
  const map = await fetchAuthors([pubkey]);
  return (
    map.get(pubkey) || {
      pubkey,
      npub: toHexNpub(pubkey),
      name: null,
      about: null,
      picture: null,
      nip05: null,
      website: null,
    }
  );
}

// ── Comments (kind 1111 per NIP-22) ──────────────────────────────
// NIP-22 comments use uppercase tags (A, K, P) for root scope and
// lowercase tags (a, e, k, p) for parent scope. We query both #A
// (root) and #a (parent) and also fall back to kind 1 with #e for
// legacy clients that still use notes as comments.
export async function fetchComments(article: Article): Promise<CommentItem[]> {
  const aTag = `${KIND_ARTICLE}:${article.pubkey}:${article.d}`;
  const eTag = article.id;
  const [byA, bya, byE, byLegacyE] = await Promise.all([
    fetchEvents({ kinds: [KIND_COMMENT], "#A": [aTag] }),
    fetchEvents({ kinds: [KIND_COMMENT], "#a": [aTag] }),
    fetchEvents({ kinds: [KIND_COMMENT], "#e": [eTag] }),
    fetchEvents({ kinds: [KIND_NOTE], "#e": [eTag] }),
  ]);
  const seen = new Set<string>();
  const all = [...byA, ...bya, ...byE, ...byLegacyE]
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .sort((x, y) => x.created_at - y.created_at);
  const pubkeys = [...new Set(all.map((e) => e.pubkey))];
  const authors = await fetchAuthors(pubkeys);
  return all.map((e) => {
    const a = authors.get(e.pubkey);
    return {
      id: e.id,
      pubkey: e.pubkey,
      npub: toHexNpub(e.pubkey),
      authorName: a?.name || null,
      authorPicture: a?.picture || null,
      content: e.content,
      createdAt: e.created_at,
    };
  });
}

// ── Reactions (kind 7 referencing article via 'a' or 'e') ────────
export async function fetchReactions(
  article: Article,
): Promise<ReactionSummary[]> {
  const aTag = `${KIND_ARTICLE}:${article.pubkey}:${article.d}`;
  const eTag = article.id;
  const [byA, byE] = await Promise.all([
    fetchEvents({ kinds: [KIND_REACTION], "#a": [aTag] }),
    fetchEvents({ kinds: [KIND_REACTION], "#e": [eTag] }),
  ]);
  const seen = new Set<string>();
  const all = [...byA, ...byE].filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  const counts = new Map<string, number>();
  for (const e of all) {
    const emoji = e.content?.trim() || "+";
    counts.set(emoji, (counts.get(emoji) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count);
}

// ── Composite for feed ───────────────────────────────────────────
export async function fetchArticleWithMeta(
  article: Article,
): Promise<ArticleWithMeta> {
  const [author, comments, reactions] = await Promise.all([
    fetchAuthor(article.pubkey),
    fetchComments(article),
    fetchReactions(article),
  ]);
  return {
    ...article,
    author: author!,
    commentCount: comments.length,
    reactions,
  };
}

// ── Publishing (client-side, nsec in browser only) ───────────────
export function nsecToSecret(nsec: string): Uint8Array | null {
  try {
    const decoded = nip19.decode(nsec.trim());
    if (decoded.type === "nsec") return decoded.data as Uint8Array;
  } catch {
    // not a valid nsec
  }
  return null;
}

export function secretToNpub(sk: Uint8Array): string {
  return nip19.npubEncode(getPublicKey(sk));
}

export function isWriterNpub(npub: string): boolean {
  return ALLOWED_NPUBS.some((a) => a === npub.toLowerCase());
}

export async function publishArticle(params: {
  sk: Uint8Array;
  d: string;
  title: string;
  summary?: string;
  coverImage?: string;
  bodyMarkdown: string;
  tags: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const {
    sk,
    d,
    title,
    summary,
    coverImage,
    bodyMarkdown,
    tags,
  } = params;
  const pubkey = getPublicKey(sk);
  const t: string[][] = [["d", d], ["title", title]];
  if (summary) t.push(["summary", summary]);
  if (coverImage) t.push(["image", coverImage]);
  t.push(["published_at", String(Math.floor(Date.now() / 1000))]);
  for (const tag of tags) {
    const clean = tag.trim().toLowerCase().replace(/^#/, "");
    if (clean) t.push(["t", clean]);
  }
  const unsigned = {
    kind: KIND_ARTICLE,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: t,
    content: bodyMarkdown,
  };
  const event = finalizeEvent(unsigned, sk);
  if (!verifyEvent(event)) return { ok: false, error: "Invalid signature" };
  await ensureRelayImpl();
  const pool = new SimplePool();
  let published = 0;
  await Promise.all(
    RELAYS.map(async (url) => {
      try {
        await pool.publish([url], event as unknown as Event);
        published++;
      } catch {
        // skip
      }
    }),
  );
  pool.destroy();
  if (published === 0) return { ok: false, error: "Could not reach any relay" };
  return { ok: true };
}

// Publish a NIP-22 kind 1111 comment on an article.
// Uses uppercase tags (A, K, P) for root scope and lowercase (a, e, k, p)
// for parent scope, as specified in NIP-22.
export async function publishComment(params: {
  sk: Uint8Array;
  content: string;
  article: { pubkey: string; d: string; id: string };
}): Promise<{ ok: boolean; error?: string }> {
  const { sk, content, article } = params;
  const pubkey = getPublicKey(sk);
  const aTag = `${KIND_ARTICLE}:${article.pubkey}:${article.d}`;
  const tags: string[][] = [
    // Root scope (uppercase) — NIP-22
    ["A", aTag],
    ["K", String(KIND_ARTICLE)],
    ["P", article.pubkey],
    // Parent scope (lowercase) — for a top-level comment, parent = root
    ["a", aTag],
    ["e", article.id],
    ["k", String(KIND_ARTICLE)],
    ["p", article.pubkey],
  ];
  const unsigned = {
    kind: KIND_COMMENT,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
  };
  const event = finalizeEvent(unsigned, sk);
  if (!verifyEvent(event)) return { ok: false, error: "Invalid signature" };
  await ensureRelayImpl();
  const pool = new SimplePool();
  let published = 0;
  await Promise.all(
    RELAYS.map(async (url) => {
      try {
        await pool.publish([url], event as unknown as Event);
        published++;
      } catch {
        // skip
      }
    }),
  );
  pool.destroy();
  return published > 0 ? { ok: true } : { ok: false, error: "No relay reachable" };
}

// Publish a NIP-25 kind 7 reaction (like/emoji) on an article.
// Includes e, p, k, and a tags per the spec.
export async function publishReaction(params: {
  sk: Uint8Array;
  emoji: string;
  article: { pubkey: string; d: string; id: string };
}): Promise<{ ok: boolean; error?: string }> {
  const { sk, emoji, article } = params;
  const pubkey = getPublicKey(sk);
  const aTag = `${KIND_ARTICLE}:${article.pubkey}:${article.d}`;
  const tags: string[][] = [
    ["e", article.id],
    ["p", article.pubkey],
    ["k", String(KIND_ARTICLE)],
    ["a", aTag],
  ];
  const unsigned = {
    kind: KIND_REACTION,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: emoji,
  };
  const event = finalizeEvent(unsigned, sk);
  if (!verifyEvent(event)) return { ok: false, error: "Invalid signature" };
  await ensureRelayImpl();
  const pool = new SimplePool();
  let published = 0;
  await Promise.all(
    RELAYS.map(async (url) => {
      try {
        await pool.publish([url], event as unknown as Event);
        published++;
      } catch {
        // skip
      }
    }),
  );
  pool.destroy();
  return published > 0 ? { ok: true } : { ok: false, error: "No relay reachable" };
}

// Publish a kind 30024 draft (unpublished article, same structure as 30023).
export async function publishDraft(params: {
  sk: Uint8Array;
  d: string;
  title: string;
  summary?: string;
  coverImage?: string;
  bodyMarkdown: string;
  tags: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const { sk, d, title, summary, coverImage, bodyMarkdown, tags } = params;
  const pubkey = getPublicKey(sk);
  const t: string[][] = [["d", d], ["title", title]];
  if (summary) t.push(["summary", summary]);
  if (coverImage) t.push(["image", coverImage]);
  for (const tag of tags) {
    const clean = tag.trim().toLowerCase().replace(/^#/, "");
    if (clean) t.push(["t", clean]);
  }
  const unsigned = {
    kind: KIND_DRAFT,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: t,
    content: bodyMarkdown,
  };
  const event = finalizeEvent(unsigned, sk);
  if (!verifyEvent(event)) return { ok: false, error: "Invalid signature" };
  await ensureRelayImpl();
  const pool = new SimplePool();
  let published = 0;
  await Promise.all(
    RELAYS.map(async (url) => {
      try {
        await pool.publish([url], event as unknown as Event);
        published++;
      } catch {
        // skip
      }
    }),
  );
  pool.destroy();
  return published > 0 ? { ok: true } : { ok: false, error: "No relay reachable" };
}

export function generateNsec(): { nsec: string; npub: string } {
  const sk = generateSecretKey();
  return {
    nsec: nip19.nsecEncode(sk),
    npub: nip19.npubEncode(getPublicKey(sk)),
  };
}

// Trigger Netlify rebuild after publishing
export async function triggerRebuild(): Promise<boolean> {
  const hook = REBUILD_WEBHOOK;
  if (!hook) return false;
  try {
    const res = await fetch(hook, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Profile (kind 0, NIP-01 setMetadata) ─────────────────────────
export async function publishProfile(params: {
  sk: Uint8Array;
  name: string;
  about?: string;
  picture?: string;
  nip05?: string;
  website?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { sk, name, about, picture, nip05, website } = params;
  const pubkey = getPublicKey(sk);
  const content = JSON.stringify({
    name: name.trim(),
    about: about?.trim() || undefined,
    picture: picture?.trim() || undefined,
    nip05: nip05?.trim() || undefined,
    website: website?.trim() || undefined,
  });
  const unsigned = {
    kind: KIND_PROFILE,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content,
  };
  const event = finalizeEvent(unsigned, sk);
  if (!verifyEvent(event)) return { ok: false, error: "Invalid signature" };
  await ensureRelayImpl();
  const pool = new SimplePool();
  let published = 0;
  await Promise.all(
    RELAYS.map(async (url) => {
      try {
        await pool.publish([url], event as unknown as Event);
        published++;
      } catch {
        // skip
      }
    }),
  );
  pool.destroy();
  return published > 0 ? { ok: true } : { ok: false, error: "No relay reachable" };
}

// ── Deletion (kind 5, NIP-09) ────────────────────────────────────
export async function publishDeletion(params: {
  sk: Uint8Array;
  article: { id: string; pubkey: string; d: string };
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { sk, article, reason } = params;
  const pubkey = getPublicKey(sk);
  const aTag = `${KIND_ARTICLE}:${article.pubkey}:${article.d}`;
  const tags: string[][] = [
    ["e", article.id],
    ["a", aTag],
    ["k", String(KIND_ARTICLE)],
  ];
  const unsigned = {
    kind: KIND_DELETION,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: reason || "",
  };
  const event = finalizeEvent(unsigned, sk);
  if (!verifyEvent(event)) return { ok: false, error: "Invalid signature" };
  await ensureRelayImpl();
  const pool = new SimplePool();
  let published = 0;
  await Promise.all(
    RELAYS.map(async (url) => {
      try {
        await pool.publish([url], event as unknown as Event);
        published++;
      } catch {
        // skip
      }
    }),
  );
  pool.destroy();
  return published > 0 ? { ok: true } : { ok: false, error: "No relay reachable" };
}

// ── Fetch articles by a specific pubkey (for dashboard) ──────────
export async function fetchArticlesByAuthor(pubkey: string): Promise<Article[]> {
  const events = await fetchEvents({
    kinds: [KIND_ARTICLE],
    authors: [pubkey],
  });
  const articles = events
    .map(parseArticle)
    .filter((a): a is Article => !!a);
  // Keep latest per (pubkey, d)
  const latest = new Map<string, Article>();
  for (const a of articles) {
    const key = `${a.pubkey}:${a.d}`;
    const ex = latest.get(key);
    if (!ex || a.createdAt > ex.createdAt) latest.set(key, a);
  }
  return [...latest.values()].sort((x, y) => y.publishedAt - x.publishedAt);
}

// ── Fetch deletion requests by a pubkey ──────────────────────────
export async function fetchDeletions(pubkey: string): Promise<Set<string>> {
  const events = await fetchEvents({
    kinds: [KIND_DELETION],
    authors: [pubkey],
  });
  const deleted = new Set<string>();
  for (const e of events) {
    for (const t of e.tags) {
      if (t[0] === "e" && t[1]) deleted.add(t[1]);
      if (t[0] === "a" && t[1]) deleted.add(t[1]);
    }
  }
  return deleted;
}
