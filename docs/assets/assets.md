# Asset inventory — monitoryt.com home page and app

Measured 2026-11-14 at 1440×900 and 390×844. Nothing was downloaded. The logo, og-image, illustrations, copy, thumbnails and avatars were not reused.

## Home page images

The home page renders **zero `<img>` elements** (`document.images.length === 0`). All visuals are CSS, text or emoji.

The authenticated app renders `<img>` only for third-party YouTube thumbnails and channel avatars (see “App pages” below).

| Asset | Type | Size | Where used | Decision |
| --- | --- | --- | --- | --- |
| `/favicon.svg` | SVG favicon | not declared | Browser tab | Not needed — draw our own mark |
| `/favicon.ico` | ICO | 48×48 | Browser tab | Not needed |
| `/favicon-32.png` | PNG | 32×32 | Browser tab | Not needed |
| `/favicon-16.png` | PNG | 16×16 | Browser tab | Not needed |
| `/apple-touch-icon.png` | PNG | not declared | iOS home screen | Not needed |
| `/og-image.png` | PNG (meta only) | 1200×630 per `og:image:width/height` | `og:image`, `twitter:image` — not rendered on the page | Not needed |

## Logo / brand mark

Not a file. It is two CSS-drawn eyes plus a text wordmark:

```html
<a class="brand" href="/" aria-label="…">
  <span class="eyes" aria-hidden="true">
    <span class="eye"></span>
    <span class="eye"></span>
  </span>
  <span>Wordmark</span>
</a>
```

- Eyes: 26×26 px white circles, 2.5 px ink border, 9×9 px ink pupil.
- Pupils track the cursor (see DESIGN.md).
- Decision: **recreate with my own** mark — do not reuse their eyes/wordmark.

## Icons

Icons are **emoji**, not SVG. Each feature card owns one emoji tile (58×58 px, 34 px glyph, 2.5 px border, 14 px radius); persona and FAQ cards use a bare ~30 px emoji.

Observed set: 🔎 🎬 ✏️ 🖼️ 🚀 🧠 🤝 ✍️ 📈 🔁 ⚖️ ⏱️ 🔍 ➕ 🎟️ 💳 🌐 🧪 📡 🎫 👀

| Where | Treatment | Decision |
| --- | --- | --- |
| Hero kicker, ticker, final CTA watermark, footer tag | Inline emoji in text | **Recreate with my own** (choose our own emoji or replace with SVG) |
| Feature/FAQ/guide cards | Emoji inside bordered tile | **Recreate with my own** |
| Persona cards (dark section) | Bare emoji, 30 px | **Recreate with my own** |
| Brand | Two CSS circles | **Recreate with my own** |

## Decorative SVGs / textures

| Asset | Type | Size | Where used | Decision |
| --- | --- | --- | --- | --- |
| Squiggle underline | Inline SVG data URI | 120×10, stroke 3.5 | Under a highlighted word in the h1 | **Recreate with my own** SVG path |
| Paper noise | Inline SVG `feTurbulence` data URI, `mix-blend-mode: multiply`, opacity .5 | 160×160 tile | Fixed overlay over the whole page | **Recreate with my own** (same technique, own seed) |
| Dot grid | `radial-gradient` | 1 px dot / 22 px cell (16 px on the board) | Page background and pin-board | **Recreate with my own** |
| Tape strip | CSS box (no image) | 78×22 px | Top of each pinned note | **Recreate with my own** |
| Eye / pupil | CSS borders + pseudo-element | 26 px / 9 px | Header, pin-board | **Recreate with my own** |

## Fonts

Confirmed from network requests: three `fonts.gstatic.com` woff2 files.

| Family | Axes / weights loaded | Role |
| --- | --- | --- |
| Bricolage Grotesque | `opsz 12..96`, `wght 500..800` | Headlines, buttons, nav, ticker, tags |
| Hanken Grotesk | 400/500/600/700, italic 500 | Body, nav, footer |
| Shantell Sans | 500/600/700, italic 600 | Handwritten kicker, reassurance, note metadata, footer tag |

Decision: load the same open-source families from Google Fonts with our own `<link>`. Do not vendor or copy files from their server.

## Scripts

| Asset | Type | Decision |
| --- | --- | --- |
| Cloudflare Insights beacon | Analytics script | Not needed |
| Inline app scripts | Vite/React bundle, eye-tracking `mousemove` | Not needed — implement our own |

## App pages (feed + channels)

### Images

| Asset | Type | Size | Where used | Decision |
| --- | --- | --- | --- | --- |
| Video thumbnail | JPEG via `<img>` (proxied) | source 160×90; rendered `w-28` = 112×63 on mobile, `w-40` = 160×90 at ≥640 px | Every feed event card | Not needed — use our own video data/thumbnails |
| Channel avatar | JPEG/PNG via `<img>` (proxied) | rendered 44×44, `rounded-full`, source requested at 2× | Channel rows, feed header | Not needed — use our own channel data |

Both are third-party YouTube content fetched through a `wsrv.nl` image proxy (`thumbs.monitoryt.com`, `yt3.ggpht.com`). They are user data, not part of the design system.

### Icons

The app uses **inline SVG icons** (lucide-style: 24×24 viewBox, `stroke-width="2"`, `stroke="currentColor"`, round caps), not emoji. Sizes 12, 16 and 20 px.

Observed: refresh (rotate-cw), plus, sliders-horizontal, chevron-down, clock, eye (views), thumbs-up (likes), message-circle (comments), and the four bottom-nav glyphs.

| Where | Treatment | Decision |
| --- | --- | --- |
| Nav, buttons, stat pills, timestamps, filters | Inline SVG, 12–20 px | **Recreate with my own** icon set (same stroke style) |
| Brand | CSS eyes + text | **Recreate with my own** |

### Structural / decorative

| Asset | Type | Size | Where used | Decision |
| --- | --- | --- | --- | --- |
| Skeleton shimmer | CSS only (`nb-shimmer`) | `background-size: 200% 100%`, 1.3 s linear infinite | Loading placeholders | Recreate in CSS |
| Dot grid | `radial-gradient` | 1 px / 22 px | App background (`bg-paper-grid`) | Recreate in CSS |
| Cards, chips, tags, inputs | CSS borders + hard shadows | — | Whole app | Recreate from the spec in `app.css` |

No illustrations, empty-state art or photographic backgrounds were found in the app shell.

## Fonts / images explicitly not taken

- No logo, og-image, favicon or illustration files were downloaded.
- No page copy was copied into the design spec.
- Only design tokens, measurements and CSS rules were recorded.
