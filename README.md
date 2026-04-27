# Blue Collar Labs — Website

The marketing site and content hub for [bluecollarlabs.org](https://bluecollarlabs.org).

Built with **Astro 5** + **Tailwind CSS 3** + **TypeScript (strict)**. Static output, deployed to Netlify.

---

## What's in here

- `src/pages/` — top-level pages (`index`, `about`, `programs`, `donate`, `contact`, `thanks`, `404`)
- `src/pages/blog/` — blog index + dynamic post pages (Markdown content collection)
- `src/pages/prompts/` — prompt library index + dynamic prompt pages (with copy-to-clipboard)
- `src/content/blog/` — blog posts in Markdown
- `src/content/prompts/` — prompt entries in Markdown (the prompt text lives in frontmatter so it can power both the copy button and the page body)
- `src/content.config.ts` — Zod schemas for both collections
- `src/components/` — `Header.astro`, `Footer.astro`
- `src/layouts/Layout.astro` — shared HTML shell with OG/Twitter meta
- `src/styles/global.css` — Tailwind base + custom utility classes (`.btn-primary`, `.card`, `.eyebrow`, `.container-wide`)
- `tailwind.config.mjs` — custom palette: `steel` (zinc), `volt` (safety orange `#ff9800`), `tradeblue` (sky)
- `public/` — static assets: `logos/`, `og-image.png`, `robots.txt`
- `netlify.toml` — build config + security headers

## Local dev

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # type-check + static build to ./dist
npm run preview  # preview the built site
```

## Adding a prompt

Create a Markdown file in `src/content/prompts/`. Frontmatter:

```yaml
---
title: "..."
summary: "One-line hook for the index card."
category: estimating | customer | safety | admin | marketing | general
tags: [...]
model: "ChatGPT, Claude"
pubDate: 2026-04-27
prompt: |
  The actual prompt text goes here in a YAML block scalar.
  Use [BRACKETS] for fields the user fills in.
---

## Markdown body

Explain what the prompt is for, how to use it, pro tips. The body renders below the copy block.
```

The `prompt` field is what the **Copy prompt** button copies — keep it clean and ready to paste into any AI tool.

## Adding a blog post

Drop a Markdown file in `src/content/blog/`. Frontmatter:

```yaml
---
title: "..."
description: "Subhead under the title."
pubDate: 2026-04-27
author: "Paul Mantello"
tags: [launch, mission]
---
```

## Deploy

### Connect to Netlify (one-time)

1. Push this repo to GitHub.
2. In Netlify → **Add new site → Import from Git**.
3. Pick this repo. Netlify auto-detects `netlify.toml`:
   - Build command: `npm run build`
   - Publish dir: `dist`
   - Node 22.
4. Add the custom domain `bluecollarlabs.org` under **Domain settings**.

### Forms

Both `/contact` and the homepage newsletter use **Netlify Forms** (`data-netlify="true"`). Submissions show up in Netlify → **Forms**. Honeypot field is `bot-field`. Both redirect to `/thanks` on success.

### After every push to `main`

Netlify rebuilds and deploys automatically. No CI step required.

## Brand

- **Volt 500** `#ff9800` — primary action color (safety orange, the visual signature)
- **Steel 900** `#0b0f17` — page background
- **Steel 700/800** — card and panel backgrounds
- **Inter Variable** — single typeface for everything
- Voice: confident, plain English, no corporate-speak. Talk to a journeyman, not a board.

## License

Source code: MIT (see `LICENSE` if added).
Logos and brand assets: © Blue Collar Labs. Do not use without permission.
