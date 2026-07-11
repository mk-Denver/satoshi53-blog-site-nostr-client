# Satoshi53 — Nostr Blog

A static, Bitcoin-native blog for the **Satoshi53** team. Content lives on **Nostr relays** (kind 30023 long-form articles) and the site is statically generated and deployed on **Netlify** for free. Write/edit access is restricted to a allow-list of Nostr public keys (`npub`); anyone with a Nostr keypair can comment (kind 1) and react (kind 7).

Brand colors and typography are taken from [satoshi53.org](https://satoshi53.org/) — a dark-teal palette with warm gold accents, `DM Serif Display` headings, and `Fira Sans` body text.

## Architecture

```
Nostr relays  ──(kind 30023 from allowed npubs)──▶  Next.js static build  ──▶  Netlify (free)
                        ▲                                        │
                        │                                        │
        writer publishes via /post/new (client-side nsec sign)     └─ comments/reactions baked in at build time
```

- **No database to run.** Articles, comments, and reactions are Nostr events on public/private relays.
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

## Features

- **Public read** — anyone can browse published articles, tag pages, and author pages (no login).
- **Writer-only editor** — `/post/new` requires an `nsec` whose derived `npub` is on the allow-list. Generate a fresh keypair at `/writer/`.
- **Markdown articles** with live reading-time estimate, cover images, tags, and subtitles.
- **Build-time comments & reactions** — kind 1 and kind 7 events are fetched at build time and baked into the HTML. New ones appear after the next rebuild.
- **Client-side comment composer** — anyone with a Nostr keypair can sign a kind 1 note referencing an article and publish it to relays, then optionally trigger a Netlify rebuild.
- **Netlify rebuild webhook** — publishing an article or comment can trigger an instant rebuild so content appears without waiting for the schedule.
- **Tag pages**, **author profile pages** (`/u/<npub>`), and **full-text search**.
- **Bitcoin-native identity** — no email/password, no server-side accounts.

## Tech stack

| Concern        | Choice                         |
| -------------- | ------------------------------ |
| Framework      | Next.js 16 (App Router, static export) |
| Styling        | Tailwind CSS v4                |
| Data           | Nostr relays (kind 30023/1/7/0)  |
| Nostr lib      | `nostr-tools` + `@noble/*`     |
| Hosting        | Netlify (free tier)            |

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
    layout.tsx, page.tsx, globals.css
  components/              # header, footer, post-card, markdown-renderer, comments, etc.
  lib/
    nostr.ts              # relay fetch/parse, publish, nsec helpers
    types.ts, utils.ts, constants.ts
.env.local / .env.example
netlify.toml
```

## Local setup

1. **Install deps**

   ```bash
   npm install
   ```

2. **Generate a writer keypair**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000/writer/](http://localhost:3000/writer/) and click **Generate a new keypair**. Copy the `npub` and `nsec`.

3. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `.env.local`:

   | Variable                       | Description                          |
   | ------------------------------ | ------------------------------------ |
   | `NEXT_PUBLIC_RELAYS`           | Comma-separated `wss://` relay URLs  |
   | `NEXT_PUBLIC_ALLOWED_NPUBS`    | Comma-separated `npub1…` of allowed writers |
   | `NEXT_PUBLIC_SITE_URL`         | Your site URL                        |
   | `NETLIFY_REBUILD_WEBHOOK`      | Netlify build hook URL (optional)    |

   Put your generated `npub` into `NEXT_PUBLIC_ALLOWED_NPUBS`.

4. **Publish your first article**

   Go to `/writer/`, paste your `nsec`, unlock, then write at `/post/new/`. Publishing signs a kind 30023 event and broadcasts it to the configured relays. Trigger a rebuild (or restart `npm run dev`) to see it.

## Deploy to Netlify

1. Push this repo to GitHub.
2. In [Netlify](https://app.netlify.com), **Add new site → Import from Git** and select this repo.
3. Build command `npm run build`, publish directory `out` (already set in `netlify.toml`).
4. Add the env vars from `.env.local` under **Site settings → Environment variables**. Set `NEXT_PUBLIC_SITE_URL` to your Netlify domain.
5. (Optional) Create a **Build hook** (Site settings → Build & deploy → Build hooks) and paste its URL into `NETLIFY_REBUILD_WEBHOOK` so the editor can trigger instant rebuilds.
6. Deploy.

## How write access is enforced

There is no server-side auth. Enforcement is by **npub allow-list**:
- At build time, `fetchArticles()` only requests kind 30023 events with `authors: [allowedPubkeys]` and additionally filters by `isAllowed(pubkey)`. Articles from any other npub are never rendered.
- At the editor (`/post/new`), the client checks that the derived `npub` of the pasted `nsec` is on the allow-list before allowing publishing.
- Nostr's signature verification guarantees the article was actually signed by the claimed key.

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start dev server         |
| `npm run build`   | Static production build (`out/`) |
| `npm run start`   | Serve the production build |
| `npm run lint`    | Lint                     |
