 Satoshi53 — Nostr Blog

A static, Bitcoin-native blog for the **Satoshi53** team. Content lives on **Nostr relays** (kind 30023 long-form articles) and the site is statically generated and deployed on **Netlify** for free. Write/edit access is restricted to a allow-list of Nostr public keys (`npub`); anyone with a Nostr keypair can comment (kind 1) and react (kind 7).
A static, Bitcoin-native blog for the **Satoshi53** team. Content lives on **Nostr relays** (kind 30023 long-form articles) and the site is statically generated and deployed on **Netlify** for free. Write/edit access is restricted to an allow-list of Nostr public keys (`npub`); anyone with a Nostr keypair can comment (kind 1111) and react (kind 7).

Brand colors and typography are taken from [satoshi53.org](https://satoshi53.org/) — a dark-teal palette with warm gold accents, `DM Serif Display` headings, and `Fira Sans` body text.

## Architecture

```
Nostr relays  ──(kind 30023 from allowed npubs)──▶  Next.js static build  ──▶  Netlify (free)
                        ▲                                        │
                        │                                        │
        writer publishes via /post/new (client-side nsec sign)     └─ comments/reactions baked in at build time
                         ▲                                        │
                         │                                        │
   writer publishes/edits/deletes via /post/new or /post/[slug]/edit    └─ comments/reactions baked in at build time
   (client-side nsec sign)                                              profile (kind 0) baked in at build time
```

- **No database to run.** Articles, comments, and reactions are Nostr events on public/private relays.
- **No database to run.** Articles, comments, reactions, and profiles are Nostr events on public/private relays.
- **Only org-published content is shown.** The build fetches kind 30023 events filtered to `NEXT_PUBLIC_ALLOWED_NPUBS` — nothing else from the relays is rendered.
- **Write access is cryptographic.** Writers sign events with their `nsec` (secret key) in the browser. The site never sees or stores the secret. Only `npub`s on the allow-list are displayed.
- **Fully static.** `output: "export"` — no server, no middleware. Deploy on Netlify's free tier.

## Nostr event model

| Concept   | Kind | Notes                                         |
| --------- | ---- | --------------------------------------------- |
| Article   | 30023 | NIP-23 long-form; `d` tag = slug, `title`, `summary`, `image`, `t` tags, `published_at` |
| Comment   | 1    | `a` or `e` tag references the article address/id |
| Reaction  | 7    | `a` or `e` tag; content = emoji                |
| Profile   | 0    | NIP-01 setMetadata (name, about, picture)      |
All event types follow the official NIP specifications as documented on [nostrbook.dev](https://nostrbook.dev).

| Concept   | Kind   | NIP     | Notes                                                                                     |
| --------- | ------ | ------- | ----------------------------------------------------------------------------------------- |
| Article   | 30023  | NIP-23  | Long-form; `d` tag = slug, `title`, `summary`, `image`, `t` tags, `published_at`        |
| Draft     | 30024  | NIP-23  | Unpublished draft (same structure as 30023); not displayed publicly                      |
| Comment   | 1111   | NIP-22  | Uppercase tags (`A`, `K`, `P`) for root scope; lowercase (`a`, `e`, `k`, `p`) for parent |
| Reaction  | 7      | NIP-25  | `e`, `p`, `k`, `a` tags; content = emoji                                                  |
| Profile   | 0      | NIP-01  | setMetadata (name, about, picture, nip05, website)                                        |
| Deletion  | 5      | NIP-09  | `e` and `a` tags referencing the article; requests relay removal                          |
| Note      | 1      | NIP-01  | Legacy comment fallback (kind 1 with `#e` tag)                                            |

## Features

- **Public read** — anyone can browse published articles, tag pages, and author pages (no login).
- **Writer-only editor** — `/post/new` requires an `nsec` whose derived `npub` is on the allow-list. Generate a fresh keypair at `/writer/`.
- **Markdown articles** with live reading-time estimate, cover images, tags, and subtitles.
- **Build-time comments & reactions** — kind 1 and kind 7 events are fetched at build time and baked into the HTML. New ones appear after the next rebuild.
- **Client-side comment composer** — anyone with a Nostr keypair can sign a kind 1 note referencing an article and publish it to relays, then optionally trigger a Netlify rebuild.
- **Netlify rebuild webhook** — publishing an article or comment can trigger an instant rebuild so content appears without waiting for the schedule.
- **Tag pages**, **author profile pages** (`/u/<npub>`), and **full-text search**.
### Reading (public, no login required)
- **Home feed** — latest articles sorted by `published_at`
- **Article pages** (`/post/<slug>/`) — full markdown rendering with syntax highlighting, cover images, reading time
- **Tag pages** (`/tag/<slug>/`) — filter posts by topic
- **Author profile pages** (`/u/<npub>/`) — bio, avatar, and all posts by a writer
- **Search** (`/search/?q=…`) — client-side full-text search across titles, summaries, body, and tags

### Writing (restricted to allowed npubs)
- **Writer unlock** (`/writer/`) — paste your `nsec` to unlock the editor; keys stay in the browser only. New writers can generate a fresh keypair here.
- **New post editor** (`/post/new/`) — markdown editor with live reading-time estimate, cover image, tags, subtitle. Publish as kind 30023 or save as a draft (kind 30024).
- **Edit posts** (`/post/<slug>/edit/`) — loads the existing article, re-publishes with the same `d` tag so relays replace the old version (NIP-33 parameterized replaceable). Only the original author can edit.
- **Delete posts** — publishes a NIP-09 kind 5 deletion request with `e`, `a`, and `k` tags. Deleted articles are filtered from the dashboard and feed.
- **Writer dashboard** (`/dashboard/`) — lists all of the current writer's published posts with view and edit buttons, plus profile summary and a link to settings.
- **Profile settings** (`/settings/`) — set or edit your Nostr profile (name, about, avatar, NIP-05, website) as a kind 0 event. Pre-fills existing profile from relays.

### Interactions (anyone with a Nostr keypair)
- **Comments** — sign NIP-22 kind 1111 events with proper uppercase/lowercase root/parent tags. Comment composer on each article page; publishes to relays and triggers a rebuild.
- **Reactions** — quick emoji buttons (❤️ 🦄 🔥 ⚡ 👏) that publish NIP-25 kind 7 events with `e`, `p`, `k`, `a` tags.

### Infrastructure
- **Build-time data** — comments (kind 1111), reactions (kind 7), and profiles (kind 0) are fetched at build time and baked into static HTML.
- **Netlify rebuild webhook** — publishing, editing, deleting, or commenting can trigger an instant rebuild so content appears without waiting for the schedule.
- **Bitcoin-native identity** — no email/password, no server-side accounts.

## Tech stack

| Concern        | Choice                         |
| -------------- | ------------------------------ |
| Concern        | Choice                              |
| -------------- | ----------------------------------- |
| Framework      | Next.js 16 (App Router, static export) |
| Styling        | Tailwind CSS v4                |
| Data           | Nostr relays (kind 30023/1/7/0)  |
| Nostr lib      | `nostr-tools` + `@noble/*`     |
| Hosting        | Netlify (free tier)            |
| Styling        | Tailwind CSS v4                     |
| Data           | Nostr relays (kinds 30023/30024/1111/7/5/0) |
| Nostr lib      | `nostr-tools` + `@noble/*`          |
| Hosting        | Netlify (free tier)                 |

## Project structure

```
src/
  app/
    post/[slug]/page.tsx   # article detail (static)
    post/new/page.tsx      # client-side editor (nsec sign)
    tag/[slug]/page.tsx    # posts by tag
    u/[npub]/page.tsx     # author profile
    writer/page.tsx       # nsec unlock + keypair generation
    search/page.tsx       # build-time search
    post/[slug]/page.tsx        # article detail (static, SSG)
    post/[slug]/edit/           # edit article (server wrapper + client editor)
    post/new/page.tsx           # new post editor (client, nsec sign)
    tag/[slug]/page.tsx         # posts by tag (SSG)
    u/[npub]/page.tsx           # author profile (SSG)
    writer/page.tsx             # nsec unlock + keypair generation
    dashboard/page.tsx          # writer's own posts list
    settings/page.tsx           # profile editor (kind 0)
    search/page.tsx             # client-side search
    layout.tsx, page.tsx, globals.css
  components/              # header, footer, post-card, markdown-renderer, comments, etc.
  components/
    post-editor.tsx             # reusable editor (new + edit)
    post-card.tsx               # feed card
    markdown-renderer.tsx       # react-markdown + remark + rehype-highlight
    comments.tsx                # NIP-22 comment list + composer
    reaction-bar.tsx            # NIP-25 reaction buttons
    edit-button.tsx             # shows edit link if viewer is author
    header.tsx, footer.tsx, logo.tsx
    app-shell.tsx, tag-pill.tsx
    ui/                         # button, input, avatar primitives
  lib/
    nostr.ts              # relay fetch/parse, publish, nsec helpers
    types.ts, utils.ts, constants.ts
    nostr.ts                    # relay fetch/parse, publish, delete, profile, nsec helpers
    types.ts                    # Article, Author, CommentItem, ReactionSummary
    constants.ts                # relays, allowed npubs, event kinds
    utils.ts                    # cn, formatDate, readingTime, slugify, shortNpub
.env.local / .env.example
netlify.toml
```
@@ -92,40 +127,49 @@ netlify.toml

   Fill in `.env.local`:

   | Variable                       | Description                          |
   | ------------------------------ | ------------------------------------ |
   | `NEXT_PUBLIC_RELAYS`           | Comma-separated `wss://` relay URLs  |
   | Variable                       | Description                                |
   | ------------------------------ | ------------------------------------------ |
   | `NEXT_PUBLIC_RELAYS`           | Comma-separated `wss://` relay URLs        |
   | `NEXT_PUBLIC_ALLOWED_NPUBS`    | Comma-separated `npub1…` of allowed writers |
   | `NEXT_PUBLIC_SITE_URL`         | Your site URL                        |
   | `NETLIFY_REBUILD_WEBHOOK`      | Netlify build hook URL (optional)    |
   | `NEXT_PUBLIC_SITE_URL`         | Your site URL                              |
   | `NETLIFY_REBUILD_WEBHOOK`      | Netlify build hook URL (optional)          |

   Put your generated `npub` into `NEXT_PUBLIC_ALLOWED_NPUBS`.

4. **Publish your first article**
4. **Set up your profile**

   Go to `/writer/`, paste your `nsec`, unlock, then visit `/settings/` to set your display name, bio, and avatar. This publishes a kind 0 profile event to your relays.

5. **Publish your first article**

   Visit `/post/new/` to write in markdown. Publishing signs a kind 30023 event and broadcasts it to the configured relays. Trigger a rebuild (or restart `npm run dev`) to see it on the feed.

6. **Manage your posts**

   Go to `/writer/`, paste your `nsec`, unlock, then write at `/post/new/`. Publishing signs a kind 30023 event and broadcasts it to the configured relays. Trigger a rebuild (or restart `npm run dev`) to see it.
   Visit `/dashboard/` to see all your published posts. Use the edit button to update an article (re-publishes with the same `d` tag) or the delete button to publish a NIP-09 deletion request.

## Deploy to Netlify

1. Push this repo to GitHub.
2. In [Netlify](https://app.netlify.com), **Add new site → Import from Git** and select this repo.
3. Build command `npm run build`, publish directory `out` (already set in `netlify.toml`).
4. Add the env vars from `.env.local` under **Site settings → Environment variables**. Set `NEXT_PUBLIC_SITE_URL` to your Netlify domain.
5. (Optional) Create a **Build hook** (Site settings → Build & deploy → Build hooks) and paste its URL into `NETLIFY_REBUILD_WEBHOOK` so the editor can trigger instant rebuilds.
5. (Optional) Create a **Build hook** (Site settings → Build & deploy → Build hooks) and paste its URL into `NETLIFY_REBUILD_WEBHOOK` so the editor and comment composer can trigger instant rebuilds.
6. Deploy.

## How write access is enforced

There is no server-side auth. Enforcement is by **npub allow-list**:
- At build time, `fetchArticles()` only requests kind 30023 events with `authors: [allowedPubkeys]` and additionally filters by `isAllowed(pubkey)`. Articles from any other npub are never rendered.
- At the editor (`/post/new`), the client checks that the derived `npub` of the pasted `nsec` is on the allow-list before allowing publishing.
- Nostr's signature verification guarantees the article was actually signed by the claimed key.
- At the editor (`/post/new` and `/post/[slug]/edit`), the client checks that the derived `npub` of the pasted `nsec` is on the allow-list before allowing publishing.
- Edit pages verify that the current writer's pubkey matches the article's author pubkey before loading the editor.
- Nostr's signature verification guarantees every event was actually signed by the claimed key.

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start dev server         |
| `npm run build`   | Static production build (`out/`) |
| `npm run start`   | Serve the production build |
| `npm run lint`    | Lint                     |
| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start dev server                   |
| `npm run build`   | Static production build (`out/`)   |
| `npm run start`   | Serve the production build         |
| `npm run lint`    | Lint                               |
