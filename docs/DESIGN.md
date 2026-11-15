# YT Bot — Design Specification

Derived from a measured study of `https://monitoryt.com` — the public home page and the authenticated app shell (`/app/feed`, `/app/channels`) — 2026-11-14.

Measurements were taken at **1440×900** and **390×844** via Chrome DevTools computed styles, plus full dumps of the marketing stylesheet (109 rules) and the app's Tailwind component layer. No text, logo, illustration, og-image, thumbnail, avatar or icon file was copied. All class names below are our own (`yb-` prefix); the site's original CSS is preserved only as evidence in `assets/site.css` and `assets/app.css`.

## Reference screenshots

| View | File |
| --- | --- |
| Hero — desktop 1440 | [`./reference/hero-1440.png`](./reference/hero-1440.png) |
| Hero — mobile 390 | [`./reference/hero-390.png`](./reference/hero-390.png) |
| Primary button — hover | [`./reference/button-hover.png`](./reference/button-hover.png) |
| Feature card — hover | [`./reference/card-hover.png`](./reference/card-hover.png) |
| App feed — desktop 1440 | [`./reference/app-feed-1440.png`](./reference/app-feed-1440.png) |
| App feed — mobile 390 | [`./reference/app-feed-390.png`](./reference/app-feed-390.png) |
| App channels — desktop 1440 | [`./reference/app-channels-1440.png`](./reference/app-channels-1440.png) |
| App channels — mobile 390 | [`./reference/app-channels-390.png`](./reference/app-channels-390.png) |

## What the design is

Warm cream “paper” with a faint dot grid and grain, near-black ink, 2.5 px outlines, hard offset shadows with **no blur**, pill controls, oversized display type, emoji tiles and a pinned-note collage. It reads as neo-brutalist editorial: confident, physical, slightly hand-made. There are **no photographic images on the marketing page at all** — the whole look is type, colour, border and shadow. The app keeps the same language at a denser scale and adds only real video thumbnails and avatars as data.

---

## 1. Colour

Measured from `:root` and computed values on the home page.

| Token | Hex | Usage (measured) |
| --- | --- | --- |
| `--paper` | `#fbf3e4` | Page background, ghost button fill, tag fill, body text on dark sections |
| `--paper-deep` | `#f3e4c6` | Footer background, pin-board surface |
| `--ink` | `#1b1712` | Text, all 2.5 px borders, hard shadows, ticker background, dark section background |
| `--ink-soft` | `#5a5044` | Lede and body copy, footer links, card body text |
| `--ink-mute` | `#8a7d6a` | App only: section labels, channel handles, footer meta, timestamps in filters |
| `--red` | `#ff3b2f` | Primary button, ticker dots, highlighted word, step 1 badge |
| `--red-deep` | `#d52817` | Handwritten kicker, footer tag, link decoration |
| `--yellow` | `#ffce4a` | Note card, final CTA panel, inline code highlight, squiggle stroke |
| `--teal` | `#36c2ad` | Note card, step 2 badge |
| `--sky` | `#74a7ff` | Step 3 badge |
| `--coral` | `#ff9e86` | Note card |
| `--lilac` | `#c8a8ff` | Declared in `:root`; no usage observed on the home page (reserved) |

Card tints (measured, 1st/2nd/3rd child): `#fff7e0`, `#e6fbf6`, `#fff0ec`.

Opacity variants observed: header `rgba(251,243,228,.82)`; dark-section body `rgba(251,243,228,.70–.72)`; persona fill `rgba(251,243,228,.04)` → hover `.08`; dot grid `rgba(27,23,18,.07)`; board grid `.12`; tape `rgba(255,255,255,.55)`; dashed footer divider `rgba(27,23,18,.30)`; note meta `rgba(27,23,18,.70)`.

```css
:root {
  --paper: #fbf3e4;
  --paper-deep: #f3e4c6;
  --ink: #1b1712;
  --ink-soft: #5a5044;
  --ink-mute: #8a7d6a;
  --red: #ff3b2f;
  --red-deep: #d52817;
  --yellow: #ffce4a;
  --teal: #36c2ad;
  --sky: #74a7ff;
  --coral: #ff9e86;
  --lilac: #c8a8ff;
}
```

**Contrast (computed, not guessed):** ink-soft on paper ≈ **7.1:1** (AA pass); ink on yellow ≈ **12.0:1**; white on red `#ff3b2f` ≈ **3.5:1** (fails AA for 15 px text); white on red-deep `#d52817` ≈ **5.5:1**. For our build, use ink or red-deep for text-bearing red surfaces, or keep white only on large/bold display text.

---

## 2. Typography

### Google Fonts link (confirmed — three woff2 requests)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Shantell+Sans:ital,wght@0,500;0,600;0,700;1,600&display=swap"
  rel="stylesheet"
/>
```

### Stacks (measured, exact strings)

```css
--font-display: "Bricolage Grotesque", sans-serif;
--font-sans:    "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;
--font-hand:    "Shantell Sans", cursive;
```

### Role assignment

| Role | Family | Weight |
| --- | --- | --- |
| Headlines h1–h3 | Bricolage Grotesque | 800 |
| Body, nav, footer | Hanken Grotesk | 400–700 |
| Handwritten accents (kicker, reassurance, note meta, footer tag) | Shantell Sans | 400 / 600 |
| Buttons, ticker, tags, footer headings | Bricolage Grotesque | 600–800 |

### Type scale

Desktop values at 1440; mobile at 390.

| Level | Family | Size (1440 / 390) | Weight | Line-height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Display XL (h1) | display | `clamp(42px, 6.4vw, 78px)` → 78 / 42 | 800 | `0.98` | `-0.02em` (−1.56 px at 78) |
| Display L (h2) | display | `clamp(30px, 4.4vw, 50px)` → 50 / 30 | 800 | `1.02` | `-0.02em` |
| Card title (h3) | display | 22 | 800 | 1.55 inherited | `-0.02em` |
| Step title (h3) | display | 20 | 800 | inherited | `-0.02em` |
| Persona title (h3) | display | 18 | 800 | inherited | `-0.02em` |
| Hero lede | sans | `clamp(17px, 1.7vw, 20px)` → 20 / 17 | 400 | 1.55 | normal |
| Section intro | sans | 17 | 400 | 1.55 | normal |
| Body | sans | 16 | 400 | 1.55 | normal |
| Card body | sans | 15 | 400 | 1.55 | normal |
| Button / nav link | display | 15 | 700 | 1.55 (23.25 px) | normal |
| Ticker | display | 14 | 600 | 1.55 | `0.01em` |
| Tag | display | 11 | 700 | normal | `0.06em` |
| Footer heading | display | 12.5 | 800 | 1.55 | `0.09em`, uppercase |
| Footer link | sans | 14.5 | 400 | 1.55 | normal |
| Footer meta | sans | 13.5 | 400 | 1.55 | normal |
| Kicker | hand | 17 | 600 | 1.55 | normal, rotated −2° |
| Reassurance | hand | 15 | 400 | 1.55 | normal |
| Note meta | hand | 13 | 400 | 1.55 | normal |
| Wordmark | display | 21 | 800 | 1.55 | `-0.03em` |

Only h1 (`0.98`) and h2 (`1.02`) override the global `1.55` line-height. There is no uppercase body text and no italic on the home page (italic 500/600 are loaded but not used there).

```css
h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}
```

---

## 3. Spacing and layout

- **Container:** `max-width: 1140px`, side padding `24px`, centred.
- **Section rhythm:** `86px` top/bottom desktop; `64px` at ≤520 px. Hero `72px 0 40px`. Final CTA `90px 0 110px`.
- **Section head:** `max-width: 640px`, centred, `margin-bottom: 52px`; kicker → h2 `10px`; h2 → intro `14px`.
- **Grids:** hero `1.05fr .95fr` gap `48px`; feature/FAQ `repeat(3, 1fr)` gap `26px`; personas `repeat(4, 1fr)` gap `20px`; steps `repeat(3, 1fr)` gap `24px`; footer `1.4fr 1fr 1fr 1fr 1fr 1.1fr` gap `28px`.
- **Small gaps:** nav links `8px`, brand `12px`, CTA buttons `14px`, ticker items `28px`.

Measured spacing values (not a strict 4 px scale): `4, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 40, 46, 48, 52, 56, 60, 64, 72, 86, 90, 110`.

**Breakpoints (measured):**
- `880px` — hero stacks, 3-col grids → 1, personas 4 → 2, steps → 1, board rotation `0.8deg`, max-width 460.
- `860px` — footer → 2 columns.
- `520px` — personas → 1, nav text links hidden, section padding 64.
- Above 520 the desktop nav shows text links; **no hamburger/menu control was found**. Our build should add one.

---

## 4. Radius and shadows

**Radius:** `6px` tag · `12px` note/input · `14px` emoji tile · `16px` cards and board · `26px` CTA panel · `999px` pills/buttons · `50%` eyes and step badge.

**Shadows** — hard, zero blur, bottom-right offset:

| Token | Value | Used on |
| --- | --- | --- |
| `--shadow-xs` | `3px 3px 0 var(--ink)` | Ghost button, step number |
| `--shadow-sm` | `4px 4px 0 var(--ink)` | Pinned note |
| `--shadow` | `5px 5px 0 var(--ink)` | Primary button, feature cards, steps |
| `--shadow-lg` | `9px 9px 0 var(--ink)` | Pin-board, final CTA |
| hover | `7px 7px 0` / `8px 8px 0` | Primary button / cards |
| active | `2px 2px 0` | Primary button |

The hover motion moves the element up-left by the same amount the shadow grows, so the object appears to lift while staying anchored.

---

## 5. Surfaces and texture

- **Dot grid:** `radial-gradient(circle at 1px 1px, rgba(27,23,18,.07) 1px, transparent 0)`, size `22px 22px`. Pin-board uses `.12` at `16px`.
- **Grain:** fixed full-page pseudo-element with an inline `feTurbulence` SVG, `opacity: .5`, `mix-blend-mode: multiply`, `pointer-events: none`. Recreate with our own texture SVG.
- **Rules:** `2px solid ink` (header bottom, ticker bottom); `2.5px solid ink` (dark section top/bottom, footer top); `2px dashed rgba(27,23,18,.30)` (footer bottom divider).
- **Sticky header:** translucent paper `rgba(251,243,228,.82)` + `backdrop-filter: saturate(140%) blur(8px)`.

---

## 6. Components (own class names)

### Shell and header

```css
.yb-shell {
  max-width: 1140px;
  margin-inline: auto;
  padding-inline: 24px;
  position: relative;
  z-index: 1;
}

.yb-header {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 16px 0;
  background: rgba(251, 243, 228, 0.82);
  backdrop-filter: saturate(140%) blur(8px);
  border-bottom: 2px solid var(--ink);
}

.yb-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.yb-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 21px;
  letter-spacing: -0.03em;
}

.yb-navlinks {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
```

Tailwind: `sticky top-0 z-50 border-b-2 border-ink bg-paper/80 py-4 backdrop-blur-md backdrop-saturate-150`.

### Buttons

Resting → hover → pressed (all values measured):

| Variant | Resting | Hover | Active |
| --- | --- | --- | --- |
| Primary | red fill, white text, `5px` shadow | `translate(-2px,-2px)`, `7px` shadow | `translate(2px,2px)`, `2px` shadow |
| Ghost | paper fill, ink text, `3px` shadow | `translate(-1px,-1px)`, white fill | — (none declared) |
| Link | transparent, no border/shadow, `12px` padding | wavy red 2 px underline, offset 4 px | — |

```css
.yb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2.5px solid var(--ink);
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.yb-btn--primary {
  background: var(--red);
  color: #fff;
  box-shadow: 5px 5px 0 var(--ink);
}
.yb-btn--primary:hover {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0 var(--ink);
}
.yb-btn--primary:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--ink);
}

.yb-btn--ghost {
  background: var(--paper);
  color: var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
}
.yb-btn--ghost:hover {
  transform: translate(-1px, -1px);
  background: #fff;
}

.yb-btn--link {
  padding: 12px;
  border: 0;
  background: transparent;
  box-shadow: none;
}
.yb-btn--link:hover {
  text-decoration: underline wavy var(--red) 2px;
  text-underline-offset: 4px;
}
```

Tailwind (primary): `inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-red px-5 py-3 font-display text-[15px] font-bold text-white shadow-[5px_5px_0_var(--ink)] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--ink)]`.

### Ticker (marquee)

Black strip directly under the header. The track contains **two identical groups** and translates by `-50%`, which makes the loop seamless.

```css
.yb-ticker {
  overflow: hidden;
  white-space: nowrap;
  background: var(--ink);
  color: var(--paper);
  border-bottom: 2px solid var(--ink);
}

.yb-ticker__track {
  display: inline-flex;
  gap: 28px;
  padding: 10px 0;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  will-change: transform;
  animation: yb-marquee 32s linear infinite;
}

.yb-ticker__group {
  display: inline-flex;
  align-items: center;
  gap: 28px;
}

.yb-ticker__dot { color: var(--red); }

@keyframes yb-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

Mark the duplicate group `aria-hidden="true"` so screen readers do not announce the strip twice.

### Kicker (handwritten eyebrow)

```css
.yb-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  font-family: var(--font-hand);
  font-size: 17px;
  font-weight: 600;
  color: var(--red-deep);
  transform: rotate(-2deg);
}
.yb-section-head .yb-kicker {
  justify-content: center;
  margin-bottom: 10px;
}
/* On dark sections */
.yb-section--ink .yb-kicker { color: var(--yellow); }
```

### Section and section head

```css
.yb-section { padding: 86px 0; position: relative; }
.yb-section--ink {
  background: var(--ink);
  color: var(--paper);
  border-block: 2.5px solid var(--ink);
}
.yb-section-head { max-width: 640px; margin: 0 auto 52px; text-align: center; }
.yb-section-head h2 {
  font-size: clamp(30px, 4.4vw, 50px);
  line-height: 1.02;
}
.yb-section-head p {
  margin: 14px 0 0;
  font-size: 17px;
  color: var(--ink-soft);
}
.yb-section--ink .yb-section-head p { color: rgba(251, 243, 228, 0.7); }
```

### Card (feature / FAQ / guide)

```css
.yb-card {
  border: 2.5px solid var(--ink);
  border-radius: 16px;
  background: #fff;
  box-shadow: 5px 5px 0 var(--ink);
  padding: 28px 24px 26px;
}
.yb-card--interactive {
  transition: transform 0.14s, box-shadow 0.14s;
}
.yb-card--interactive:hover {
  transform: translate(-3px, -3px);
  box-shadow: 8px 8px 0 var(--ink);
}
.yb-card--warm  { background: #fff7e0; }
.yb-card--cool  { background: #e6fbf6; }
.yb-card--blush { background: #fff0ec; }

.yb-card__emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  margin-bottom: 16px;
  border: 2.5px solid var(--ink);
  border-radius: 14px;
  background: var(--paper);
  font-size: 34px;
}

.yb-card h3 { font-size: 22px; margin-bottom: 8px; }
.yb-card p  { margin: 0; font-size: 15px; color: var(--ink-soft); }

.yb-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; }
```

`yb-grid-3` is the shared 3-column grid for features, FAQ and guides. On the reference, FAQ is **not** an accordion — it is this card grid, open by default.

### Pin-board and note cards

```css
.yb-board {
  position: relative;
  padding: 26px 22px 30px;
  border: 2.5px solid var(--ink);
  border-radius: 16px;
  background-color: var(--paper-deep);
  background-image: radial-gradient(circle at 1px 1px, rgba(27, 23, 18, 0.12) 1px, transparent 0);
  background-size: 16px 16px;
  box-shadow: 9px 9px 0 var(--ink);
  transform: rotate(1.6deg);
}

.yb-board__label {
  position: absolute;
  top: -16px;
  left: 22px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  transform: rotate(-2deg);
}

.yb-note {
  position: relative;
  margin: 18px 6px;
  padding: 16px 16px 14px;
  border: 2.5px solid var(--ink);
  border-radius: 12px;
  box-shadow: 4px 4px 0 var(--ink);
  transition: transform 0.18s;
}
.yb-note:hover { transform: rotate(0) scale(1.015); }
.yb-note--1 { background: var(--yellow); transform: rotate(-1.6deg); }
.yb-note--2 { background: var(--teal);   transform: rotate(1.4deg); }
.yb-note--3 { background: var(--coral);  transform: rotate(-0.8deg); }

.yb-tape {
  position: absolute;
  top: -12px;
  left: 50%;
  width: 78px;
  height: 22px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(27, 23, 18, 0.25);
  transform: translateX(-50%) rotate(-3deg);
}

.yb-note__headline { font-size: 15px; font-weight: 700; line-height: 1.3; }
.yb-note__meta {
  margin-top: 6px;
  font-family: var(--font-hand);
  font-size: 13px;
  color: rgba(27, 23, 18, 0.7);
}
```

### Tag / pill label

```css
.yb-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border: 2px solid var(--ink);
  border-radius: 6px;
  background: var(--paper);
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
```

### Persona card (dark section)

```css
.yb-persona {
  padding: 24px 20px;
  border: 2.5px solid var(--paper);
  border-radius: 16px;
  background: rgba(251, 243, 228, 0.04);
  transition: transform 0.14s;
}
.yb-persona:hover {
  transform: rotate(-1.5deg);
  background: rgba(251, 243, 228, 0.08);
}
.yb-persona h3 { font-size: 18px; color: var(--paper); margin-bottom: 6px; }
.yb-persona p  { margin: 0; font-size: 14.5px; color: rgba(251, 243, 228, 0.72); }
.yb-persona__emoji { font-size: 30px; margin-bottom: 12px; }
```

### Step card with numbered badge

```css
.yb-step {
  position: relative;
  padding: 34px 24px 26px;
  border: 2.5px solid var(--ink);
  border-radius: 16px;
  background: #fff;
  box-shadow: 5px 5px 0 var(--ink);
}
.yb-step__num {
  position: absolute;
  top: -20px;
  left: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 2.5px solid var(--ink);
  border-radius: 50%;
  background: var(--red);
  color: #fff;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  box-shadow: 3px 3px 0 var(--ink);
}
.yb-step:nth-child(2) .yb-step__num { background: var(--teal); }
.yb-step:nth-child(3) .yb-step__num { background: var(--sky); }
```

### Final CTA panel

```css
.yb-cta {
  position: relative;
  max-width: 760px;
  margin-inline: auto;
  padding: 60px 32px 56px;
  border: 3px solid var(--ink);
  border-radius: 26px;
  background: var(--yellow);
  box-shadow: 9px 9px 0 var(--ink);
  overflow: hidden;
  text-align: center;
}
.yb-cta h2 { font-size: clamp(30px, 5vw, 50px); line-height: 1.02; position: relative; }
.yb-cta p  { max-width: 440px; margin: 16px auto 28px; font-size: 17px; color: var(--ink-soft); position: relative; }
```

The reference places a large emoji watermark in the corner at 12% opacity, rotated −10°. Use our own decoration.

### Footer

```css
.yb-footer {
  margin-top: 56px;
  padding: 46px 0 26px;
  background: var(--paper-deep);
  border-top: 2.5px solid var(--ink);
}
.yb-footer__grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr 1.1fr;
  gap: 28px;
  align-items: start;
}
.yb-footer__head {
  margin-bottom: 12px;
  font-family: var(--font-display);
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.yb-footer__col {
  display: flex;
  flex-direction: column;
  gap: 9px;
  font-size: 14.5px;
  color: var(--ink-soft);
}
.yb-footer__col a:hover,
.yb-footer__bottom a:hover {
  color: var(--ink);
  text-decoration: underline wavy var(--red) 2px;
  text-underline-offset: 4px;
}
.yb-footer__tag {
  margin: 12px 0 0;
  font-family: var(--font-hand);
  font-size: 15px;
  font-weight: 600;
  color: var(--red-deep);
  transform: rotate(-1.5deg);
}
.yb-footer__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 36px;
  padding-top: 20px;
  border-top: 2px dashed rgba(27, 23, 18, 0.3);
  font-size: 13.5px;
  color: var(--ink-soft);
}
```

Footer collapses to 2 columns at 860 px, with the brand spanning both.

---

## 6A. App shell and product UI (feed + channels)

The product screens reuse the marketing tokens and type faces, but switch to a denser scale, inline SVG icons, a 4 px card shadow and Tailwind's 150 ms transitions. Screens: [`app-feed-1440`](./reference/app-feed-1440.png) · [`app-feed-390`](./reference/app-feed-390.png) · [`app-channels-1440`](./reference/app-channels-1440.png) · [`app-channels-390`](./reference/app-channels-390.png).

### Layout

| Area | Spec |
| --- | --- |
| Shell | `min-height: 100vh`, `bg-paper-grid` (1 px dot / 22 px, `rgba(27,23,18,.08)`) |
| Header | Sticky `top: 0; z-index: 10`; `64px` inner + `2.5px` bottom border = **66 px**; `rgba(251,243,228,.85)` + `backdrop-filter: blur`; inner `max-width: 1024px`, `padding-inline: 16px` (`24px` ≥640) |
| Main | `max-width: 1024px`, `padding: 32px 16px 96px` (`40px` top ≥640; 96 px bottom clears the mobile bar) |
| Feed grid | Stacked below 1024; at ≥1024: aside **288 px** (`sticky top: 80px`) + content `flex: 1` (**664 px** at 1440), `gap: 24px` |
| Channels | Single column, `max-width: 1024px`; sections `gap: 28px`; rows `gap: 12px` |
| Footer | `border-top: 2px rgba(27,23,18,.2)`, `rgba(251,243,228,.8)`, 12 px ink-mute, `padding: 20px 16px` |
| Mobile bar | Fixed bottom, **61 px**, `border-top: 2.5px`, `rgba(251,243,228,.95)` + blur, 4 equal items |

**Breakpoints:** `md` 768 px switches the header nav ↔ bottom bar; `lg` 1024 px switches the feed to two columns; `sm` 640 px widens padding and the thumbnail.

### App type scale

| Role | Family | Size / line-height | Weight | Notes |
| --- | --- | --- | --- | --- |
| Page title (h1) | display | 30 / 36 | 800 | `-0.02em`, `margin-bottom: 4px` |
| Page eyebrow | hand | 16 / 24 | 400 | red-deep, rotated −1° |
| Page sub | sans | 14 / 20 | 400 | ink-soft |
| Nav pill | display | 14 / 20 | 700 | `padding: 6px 14px` |
| Card header | display | 16 / 24 | 800 | `padding: 12px 16px` |
| Event actor / title | display | 16 / 24 | 700 | `leading-snug` (1.375) |
| Event timestamp | sans | 12 / 18 | 700 | in a bordered pill |
| Stat value | display | 14 / 14 | 800 | `leading-none` |
| Stat label | sans | 11.2 / 11.2 | 600 | ink-soft, `0.7rem` |
| Filter summary | sans | 12 / 16 | 700 | uppercase, `letter-spacing: .3px`, ink-mute |
| Filter row | sans | 12 / 16 | 600 | `padding: 6px 10px` |
| Channel name | display | 16 / 24 | 700 | truncates |
| Channel meta | sans | 12 / 16 | 400 | ink-mute, truncates |
| Notice heading | display | 18 / 28 | 800 | |
| App footer | sans | 12 / 16 | 400 | ink-mute |

### App primitives

```css
.yb-app-card {
  border: 2.5px solid var(--ink);
  border-radius: 16px;
  background: #fff;
  box-shadow: 4px 4px 0 var(--ink);   /* app uses 4px; marketing uses 5px */
}

.yb-app-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.yb-app-chip--yellow { background: var(--yellow); }
.yb-app-chip--paper  { background: var(--paper); }

.yb-app-input {
  width: 100%;
  padding: 0 16px;
  border: 2.5px solid var(--ink);
  border-radius: 12px;
  background: #fff;
  box-shadow: 3px 3px 0 var(--ink);
  font-size: 15px;
}
.yb-app-input:focus {
  outline: none;
  box-shadow: 4px 4px 0 var(--ink);   /* deeper shadow instead of a ring */
}

.yb-app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 18px;
  border: 2.5px solid var(--ink);
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  transition: transform 0.1s, box-shadow 0.1s, background 0.12s;
}
.yb-app-btn--primary {
  background: var(--red);
  color: #fff;
  box-shadow: 4px 4px 0 var(--ink);
}
.yb-app-btn--primary:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--ink);
}
.yb-app-btn--primary:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--ink);
}
.yb-app-btn--ghost {
  background: var(--paper);
  color: var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
}
.yb-app-btn--ghost:hover {
  background: #fff;
  transform: translate(-1px, -1px);
}
```

### App header and navigation

- Nav is a row of **pills**, not text links: `14px` display bold, `6px 14px`, `border: 2px`, `radius: 999px`, `gap: 4px`.
- Active pill: ink background, paper text, ink border.
- Inactive: ink-soft text, transparent border; hover → ink border + white fill.
- Everything transitions in **150 ms `cubic-bezier(.4,0,.2,1)`** (Tailwind default).
- Right side: plan chip (`FREE`, paper) + a `32px` circular settings button (`border: 2px`, white, hover → paper-deep).
- The wordmark is hidden below 640 px; only the eyes remain.
- Mobile bar items: `0.7rem` display bold, icon above label, active gets `border-top: 4px` ink + white background + ink text; inactive is ink-soft with a transparent 4 px border.

```css
.yb-app-nav       { display: flex; align-items: center; gap: 4px; }
.yb-app-nav__item {
  padding: 6px 14px;
  border: 2px solid transparent;
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-soft);
  transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
.yb-app-nav__item:hover { border-color: var(--ink); background: #fff; }
.yb-app-nav__item[aria-current="page"] {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
```

### Feed page

Header row: handwritten eyebrow, `h1` 30 px, one-line sub, with the **Refresh feed** button (`.nb-card` + `padding: 8px 16px`, 14 px display bold, hover → paper-deep) pinned to the right.

Two columns at ≥1024:

**Left / aside (288 px, sticky):**
1. **Quick add channel** card — 50 px header (`border-bottom: 2px`, display 800), body on paper: 40 px input + 40×40 red add button (`radius: 8px`, 3 px shadow, hover `translateY(-0.5px)`), helper `0.7rem` ink-mute, paused-tracking link in red-deep underline.
2. **Filters** card — sticky card header, then `<details>` sections (open by default). Summary is 12 px uppercase ink-mute. The Pro block is a yellow panel (`radius: 8px`, `border: 2px`, `padding: 12px`). Each row is a 12 px semibold button with a 12 px checkbox (`radius: 4px`) and hover → ink border + paper-deep fill.

**Right / event list (664 px at 1440):**

```css
.yb-event {
  border: 2.5px solid var(--ink);
  border-radius: 16px;
  background: #fff;
  box-shadow: 4px 4px 0 var(--ink);
  padding: 16px;
}
.yb-event__head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.yb-event__actor { font-family: var(--font-display); font-weight: 700; line-height: 1.375; }
.yb-event__time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: var(--paper-deep);
  font-size: 12px;
  font-weight: 700;
}
.yb-event__body { display: flex; align-items: flex-start; gap: 16px; margin-top: 12px; }
.yb-event__thumb {
  flex-shrink: 0;
  width: 112px;                       /* 160px at ≥640 */
  aspect-ratio: 16 / 9;
  border: 2px solid var(--ink);
  border-radius: 8px;
  background: var(--paper-deep);
  overflow: hidden;
}
.yb-event__title { font-family: var(--font-display); font-weight: 700; line-height: 1.375; }
.yb-event__title:hover { text-decoration: underline; }
```

Stat pills sit under the title in a wrap row, `gap: 8px`, `margin-top: 12px`:

```css
.yb-stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  box-shadow: 3px 3px 0 var(--ink);
}
.yb-stat--views    { background: color-mix(in srgb, var(--teal) 30%, transparent); }
.yb-stat--likes    { background: color-mix(in srgb, var(--yellow) 40%, transparent); }
.yb-stat--comments { background: color-mix(in srgb, var(--sky) 30%, transparent); }
.yb-stat__value { font-family: var(--font-display); font-size: 14px; font-weight: 800; line-height: 1; }
.yb-stat__label { font-size: 0.7rem; font-weight: 600; color: var(--ink-soft); line-height: 1; }
```

A/B events omit the thumbnail row’s stats and instead show a label (`14px` ink-mute) with the rotating titles as a bulleted list in display bold. The card is a static surface — no lift on hover; only links underline and the buttons move.

### Channels page

- Head: eyebrow + `h1` + sub, with a **tracked-count chip** on the right (`0 / 5 tracked`, yellow).
- Add form: `.nb-card` with `16px` padding, `48px` input (`radius: 12px`, 3 px shadow) and a `48px` primary button.
- Paused notice: `.nb-card` on paper-deep, `20px` padding, 18 px heading, 14 px body.
- Channel row: `.nb-card`, `16px` padding, `flex-wrap`, `gap: 16px`; 44 px circular avatar (`border: 2px`, paper-deep fill); name 16 px display bold truncating; meta 12 px ink-mute truncating; yellow status chip; primary **Activate**; **Remove** as a text button (14 px display bold, ink-soft, transparent 2 px border, hover → red-deep text + ink border + white fill).

```css
.yb-channel-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2.5px solid var(--ink);
  border-radius: 16px;
  background: #fff;
  box-shadow: 4px 4px 0 var(--ink);
}
.yb-channel-row__avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 2px solid var(--ink);
  border-radius: 50%;
  background: var(--paper-deep);
  overflow: hidden;
}
```

### App motion

| Effect | Trigger | Duration / easing |
| --- | --- | --- |
| Nav pill, filter row, remove button, links | Hover/focus | 150 ms `cubic-bezier(.4,0,.2,1)` |
| Primary / ghost button lift | Hover | 100 ms transform + shadow (default `ease`) |
| Button background change | Hover | 120 ms |
| Button press | Active | 100 ms |
| Skeleton shimmer | Loading | 1.3 s `linear`, infinite (`background-position: 200% → -200%`) |
| Page/card entrance | — | **None** — no entrance or scroll animations in the app |

No library runs here either; it is all Tailwind transitions and one CSS shimmer keyframe. The app also has no scroll-triggered reveals to copy.

## 7. The cursor-tracking eyes

This is the one piece of JavaScript on the page. It is tiny and library-free.

**What was observed**
- Two `.eye` circles (26 px, 2.5 px ink border, white fill, `overflow: hidden`).
- A 9 px ink pupil drawn with `::after`, centred at `top/left: 50%`, then offset by custom properties: `translate(var(--px, 1px), var(--py, 2px))`.
- Pupil transition: `transform .12s ease-out`.
- On hover of a point to the right/above, the first eye's inline style was `--px: 6.0px; --py: 0.0px;` and its pupil computed to `translate(1.5px, -4.5px)` — so the offset is clamped to roughly **±6 px** on a 26 px eye.
- The listener is a `mousemove` handler that sets inline custom properties per eye. The exact clamping/falloff curve was not reversed; only the max offset and inline format were measured.

**Rebuild with CSS + one handler**

```css
.yb-eyes { display: inline-flex; gap: 4px; }

.yb-eye {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  border: 2.5px solid var(--ink);
  overflow: hidden;
}

.yb-eye::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ink);
  transform: translate(-50%, -50%) translate(var(--px, 1px), var(--py, 2px));
  transition: transform 0.12s ease-out;
}
```

```js
const eyes = [...document.querySelectorAll(".yb-eye")];
const MAX = 6;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const coarse = matchMedia("(pointer: coarse)");

function trackEyes(e) {
  if (reduced.matches || coarse.matches) return;
  for (const eye of eyes) {
    const r = eye.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const reach = Math.min(d, 140) / 140;
    eye.style.setProperty("--px", `${(dx / d) * MAX * reach}px`);
    eye.style.setProperty("--py", `${(dy / d) * MAX * reach}px`);
  }
}

addEventListener("mousemove", trackEyes, { passive: true });
```

Notes:
- The `.12s ease-out` transition is what produces the slightly delayed, “alive” feel. A rAF throttle is optional; the original sets inline styles per move.
- In React, put the same code in a `useEffect` and attach the listener to `window`.
- Keep the eyes `aria-hidden="true"`; the wordmark carries the accessible name.
- Skip the listener for `pointer: coarse` and `prefers-reduced-motion` (just leave the default 1 px / 1 px offset).

---

## 8. Motion

No animation library ships on the page: `gsap`, `ScrollTrigger`, `Lenis`, `Motion`, `AOS` are all `undefined`, and the only network requests are the three font files plus a Cloudflare analytics beacon. **Every effect below is CSS-only.**

| Effect | Target | Trigger | Duration | Easing | Delay | Iteration | Implementation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marquee | Ticker track (two duplicated groups) | Continuous | 32 s | `linear` | 0 | infinite | CSS `@keyframes` |
| Rise in | 6 hero items (kicker, h1, lede, CTAs, board, reassurance) | Load | 0.7 s | `cubic-bezier(.2,.8,.2,1)` | .05 / .15 / .25 s | 1, `forwards` | CSS `@keyframes` |
| Button lift | Primary | Hover | 0.1 s | default `ease` | 0 | 1 | CSS transition |
| Button press | Primary | Active | 0.1 s | default `ease` | 0 | 1 | CSS transition |
| Ghost lift + white fill | Ghost | Hover | 0.1 s | default `ease` | 0 | 1 | CSS transition |
| Card lift | Feature cards | Hover | 0.14 s | default `ease` | 0 | 1 | CSS transition |
| Persona tilt + fill | Persona cards | Hover | 0.14 s | default `ease` | 0 | 1 | CSS transition |
| Note straighten + scale | Pinned notes | Hover | 0.18 s | default `ease` | 0 | 1 | CSS transition |
| Wavy underline | Nav and footer links | Hover | none declared | — | — | — | CSS, instant |
| Pupil follow | Brand eyes | `mousemove` | 0.12 s | `ease-out` | 0 | n/a | CSS + 1 JS handler |

**Keyframes**

```css
@keyframes yb-rise {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.yb-reveal {
  opacity: 0;
  transform: translateY(16px);
  animation: yb-rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
.yb-reveal--d1 { animation-delay: 0.05s; }
.yb-reveal--d2 { animation-delay: 0.15s; }
.yb-reveal--d3 { animation-delay: 0.25s; }
.yb-reveal--d4 { animation-delay: 0.35s; }
```

**Scroll behaviour:** I scrolled the page and inspected `document.getAnimations()`. The reference has **no scroll-triggered reveals** — the six `rise` animations belong to the hero and run on load, then finish. Below-the-fold sections are static. Do not claim scroll reveals were copied; they were not there.

**Reduced motion:** handled explicitly and verified by emulating `prefers-reduced-motion: reduce` — animation duration becomes `0.001ms`, iteration count `1`, `scroll-behavior: auto`, and reveals are forced visible (`opacity: 1; transform: none`). The ticker effectively stops.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
  .yb-reveal { opacity: 1; transform: none; }
}
```

**Hover easing caveat:** the hover transitions declare durations only, so the timing function is the browser default `ease`. Nothing more specific was authored.

---

## 9. Recommended implementation per effect

| Effect | Recommended tool | Why |
| --- | --- | --- |
| Button hover/press, link underline, card lift, note straighten, persona tilt | **Plain CSS** | One-line transitions; nothing to coordinate |
| Ticker marquee | **Plain CSS** | Keyframes + duplicated group; no JS needed |
| Hero entrance | **Plain CSS** (or Motion with `initial`/`animate` if the hero remounts) | Already a pure CSS load animation |
| Eyes | **Plain CSS + one `mousemove` handler** | Cheapest possible; no library |
| Scroll reveals (our addition) | **Motion (`motion/react`)** | The reference has none, but our app is React and may want below-fold reveals. Use `whileInView` with `viewport={{ once: true }}`: `opacity 0→1`, `y 16→0`, `duration .7`, `ease [0.2, 0.8, 0.2, 1]`, stagger `.08–.1` |
| Pinned/scrubbed timeline (e.g. events + performance chart) | **GSAP + ScrollTrigger** | Only justified if a multi-step timeline must be scrubbed. Not needed for the home page |

Motion example for a scroll reveal:

```tsx
import { motion } from "motion/react";

<motion.section
  initial={{ opacity: 0, y: 16 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.2 }}
  transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
/>
```

All measured marketing and app effects are CSS-only. GSAP is not a requirement for any screen measured here.

---

## 10. Accessibility notes and gaps

- **Focus styles:** the home stylesheet contains **zero** `:focus`/`:focus-visible` rules. Only the UA default exists. Add our own, e.g. `.yb-btn:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }`.
- **Contrast:** white on `#ff3b2f` is ~3.5:1 at 15 px. Use ink or `--red-deep` for red surfaces that carry small text.
- **Ticker:** duplicate group should be `aria-hidden`; optionally pause the animation on hover/focus.
- **Mobile nav:** text links are simply hidden below 520 px; there is no menu control. Our build should provide a proper disclosure menu.
- **Emoji:** decorative; wrap in `aria-hidden="true"` and keep meaning in the heading.
- **Motion:** honour `prefers-reduced-motion` on the eyes as well as CSS animations.
- **Theme:** light only (`color-scheme: light`, no dark-mode rules).
- **App focus:** `.nb-input:focus` removes the outline and only deepens the shadow to 4 px; the range thumb has a `:focus-visible` style, but buttons and nav pills have no authored focus ring. Add a visible ring for keyboard users in our build.
- **App labels:** filter groups and channel handles use `--ink-mute` (`#8a7d6a`) at 12 px on paper — verify contrast for our palette before shipping.

---

## 11. What could not be measured

Do not infer these:

- **Scroll reveals** — none exist on the home page, so there are no values to copy.
- **Dark mode** — none.
- **`--lilac` usage** — declared but unused on the home page.
- **Exact hover timing function** — not authored; browser default `ease`.
- **Exact eye-tracking falloff formula** — only the inline `--px/--py` format, the `0.12s ease-out` transition and the ~6 px maximum offset were observed.
- **Desktop nav menu/dropdown states** — no dropdown exists.
- **Content images / icon SVGs** — none on the home page; icons are emoji.
- **Font files** — families confirmed via Google Fonts requests; the woff2 files were not downloaded.
- **`/app/billing` and `/app/settings`** — not inspected. The app shell reachable from feed/channels is covered, but these screens are not.
- **`/app/video/:id` and `/app/channel/:id`** — not inspected. Chart, timeline and history components on those routes are unknown.
- **Empty, loading and error states** — not captured. A skeleton primitive (`nb-skel`, 1.3 s shimmer) exists in the CSS, but its live layout was not seen.
- **Modals, toasts and destructive confirmations** — not triggered.
- **App keyboard focus ring** — no authored rule found for buttons/nav; only the UA default.
- **Cross-browser rendering** — measured in Chrome only.
- **Focus screenshots** — none captured.

---

## 12. File map

```
docs/
├── DESIGN.md                  ← this file
├── reference/
│   ├── hero-1440.png
│   ├── hero-390.png
│   ├── button-hover.png
│   ├── card-hover.png
│   ├── app-feed-1440.png
│   ├── app-feed-390.png
│   ├── app-channels-1440.png
│   └── app-channels-390.png
└── assets/
    ├── site.css               ← full 109-rule marketing stylesheet dump
    ├── app.css                ← app theme tokens + nb-* component layer
    ├── hover-rules.css        ← all :hover rules (8) + pressed state
    ├── keyframes.css          ← marquee + rise
    └── assets.md              ← image/SVG/icon/font inventory
```

**Tailwind theme starting point**

```css
@theme {
  --color-paper: #fbf3e4;
  --color-paper-deep: #f3e4c6;
  --color-ink: #1b1712;
  --color-ink-soft: #5a5044;
  --color-ink-mute: #8a7d6a;
  --color-red: #ff3b2f;
  --color-red-deep: #d52817;
  --color-yellow: #ffce4a;
  --color-teal: #36c2ad;
  --color-sky: #74a7ff;
  --color-coral: #ff9e86;
  --color-lilac: #c8a8ff;

  --font-display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-hand: "Shantell Sans", ui-rounded, cursive;

  --radius-nb: 16px;
  --shadow-nb-xs: 3px 3px 0 var(--color-ink);
  --shadow-nb-sm: 4px 4px 0 var(--color-ink);
  --shadow-nb: 5px 5px 0 var(--color-ink);
  --shadow-nb-lg: 9px 9px 0 var(--color-ink);

  /* app surfaces use a 4 px base, 6 px on hover, 2 px pressed */
  --shadow-nb-app: 4px 4px 0 var(--color-ink);
  --shadow-nb-app-hover: 6px 6px 0 var(--color-ink);
  --shadow-nb-app-active: 2px 2px 0 var(--color-ink);
}
```
