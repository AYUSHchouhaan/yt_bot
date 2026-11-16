# yt_bot — Frontend Design System

> **What this file is.** The build-facing design spec for the yt_bot frontend: palette, typography, buttons, inputs, cards, navigation, motion, and a per-screen blueprint. It is derived from the measured study of `monitoryt.com` in [`DESIGN.md`](./DESIGN.md) (the evidence file: computed styles, exact measurements, screenshot analysis).
>
> **The rule.** `DESIGN.md` records what the reference *measures*. This file records what we *build* — our own component names, our own states, and the handful of deliberate deviations (all marked ⚠️). Light theme only. No dark mode.
>
> **Reference screenshots:** [`reference/hero-1440.png`](./reference/hero-1440.png) · [`reference/hero-390.png`](./reference/hero-390.png) · [`reference/button-hover.png`](./reference/button-hover.png) · [`reference/card-hover.png`](./reference/card-hover.png) · [`reference/app-feed-1440.png`](./reference/app-feed-1440.png) · [`reference/app-feed-390.png`](./reference/app-feed-390.png) · [`reference/app-channels-1440.png`](./reference/app-channels-1440.png) · [`reference/app-channels-390.png`](./reference/app-channels-390.png)
>
> **Status:** spec only. Nothing in `frontend/` has been changed yet.

---

## 1. Brand & personality

Warm cream "paper" with a faint dot grid and grain, near-black ink, 2.5 px outlines, and hard offset shadows with **no blur**. Pill controls, oversized display type, and emoji tiles. It reads as **neo-brutalist editorial**: confident, physical, slightly hand-made.

Principles:

1. **Every surface is a physical object.** A card is a piece of paper on a desk — bordered, shadowed, slightly rotated. Hover lifts it; press pushes it down.
2. **No soft edges, no gradients, no blur.** Borders are 2–3 px solid ink. Shadows are solid offset slabs. The only blur in the whole system is the sticky header's backdrop filter.
3. **Type does the work.** The marketing page has **zero photographs** — all visuals are type, colour, border, and shadow. Icons are emoji on marketing, lucide SVGs (2 px stroke, round caps) in the app.
4. **Colour is punctuation.** Paper and ink carry 90% of the interface. Red, yellow, teal, sky, and coral appear in small doses: a button, a badge, a stat pill, a note card.
5. **Motion is short and mechanical.** 100–180 ms. Things lift, straighten, and fill. Nothing floats, fades in slowly, or scroll-reveals in the app.

Our own brand mark: a wordmark in Bricolage Grotesque 800 with two CSS eyes (26 px, bordered, 9 px pupils that track the cursor). Do not reuse the reference's logo or copy.

---

## 2. Colour

### 2.1 Tokens

| Token | Hex | Role | Where it goes |
|---|---|---|---|
| `--red` | `#ff3b2f` | **Primary (decorative)** | ticker dots, step badges, focus accents, active indicators, icon highlights |
| `--red-deep` | `#d52817` | **Primary (text-safe)** | primary button **fill** with paper text, handwritten kicker, links, "remove" hover text |
| `--yellow` | `#ffce4a` | **Secondary / highlight** | final CTA panel, pro/filters panel, likes stat pill, active filter chip, selection |
| `--teal` | `#36c2ad` | Accent 3 | views stat pill, step badge 2, success status chip |
| `--sky` | `#74a7ff` | Accent 4 | comments stat pill, step badge 3, info chip |
| `--coral` | `#ff9e86` | Accent 5 | pinned note, danger button, failed status chip |
| `--lilac` | `#c8a8ff` | Reserved | declared, unused (matches reference) |
| `--paper` | `#fbf3e4` | **Base surface** | page background, ghost button fill, tag fill, text on ink |
| `--paper-deep` | `#f3e4c6` | Elevated surface | footer, aside panels, thumbnails placeholders, timestamp pills |
| `--ink` | `#1b1712` | **Base ink** | text, all borders, all shadows, dark-section background |
| `--ink-soft` | `#5a5044` | Body copy | ledes, card body text, footer links |
| `--ink-mute` | `#8a7d6a` | Meta | labels, handles, timestamps, helper text |

### 2.2 Tints and fills

| Use | Value |
|---|---|
| Card tint warm | `#fff7e0` |
| Card tint cool | `#e6fbf6` |
| Card tint blush | `#fff0ec` |
| Ghost button hover fill | `#ffffff` |
| Header background | `rgba(251,243,228,.82)` + `backdrop-filter: saturate(140%) blur(8px)` |
| Dot grid (page) | `radial-gradient(circle at 1px 1px, rgba(27,23,18,.07) 1px, transparent 0)` / 22 px |
| Dot grid (pin-board) | same, `.12` opacity / 16 px |
| Tape strip | `rgba(255,255,255,.55)` with `1px solid rgba(27,23,18,.25)` |
| Dashed divider | `2px dashed rgba(27,23,18,.30)` |
| Body text on ink sections | `rgba(251,243,228,.70–.72)` |
| Dark persona card fill | `rgba(251,243,228,.04)` → hover `.08` |

### 2.3 Contrast rules

| Pair | Ratio | Verdict |
|---|---|---|
| ink-soft on paper | ~7.1:1 | ✅ AA |
| ink on yellow | ~12.0:1 | ✅ AAA |
| white on `--red` `#ff3b2f` | ~3.5:1 | ❌ fails AA at 15 px |
| white on `--red-deep` `#d52817` | ~5.5:1 | ✅ AA |
| ink-mute `#8a7d6a` on paper | ~3.4:1 | ⚠️ only for ≥14 px meta, never body copy |

> ⚠️ **Deviation 1 — primary button fill.** The reference uses `#ff3b2f` with white text. At our 15 px button size that fails AA (3.5:1). We use **`--red-deep` `#d52817` with paper text** for primary buttons (5.5:1). Bright `--red` stays for decorative dots, badges, and indicators where no text sits on it. This is the single intentional colour departure from the reference.

---

## 3. Typography

### 3.1 Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Shantell+Sans:ital,wght@0,500;0,600;0,700;1,600&display=swap"
  rel="stylesheet"
/>
```

```css
--font-display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
--font-sans:    "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;
--font-hand:    "Shantell Sans", ui-rounded, cursive;
```

### 3.2 Role assignment

| Role | Family | Weight |
|---|---|---|
| Headlines h1–h3 | display | 800 |
| Body, lede, inputs, nav body | sans | 400–700 |
| Handwritten accents (kicker, reassurance, note meta, footer tag) | hand | 400 / 600 |
| Buttons, ticker, tags, footer headings, stat values | display | 600–800 |

### 3.3 Scale

| Level | Family | Size (1440 / 390) | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| Display XL (h1) | display | `clamp(42px, 6.4vw, 78px)` | 800 | `0.98` | `-0.02em` |
| Display L (h2) | display | `clamp(30px, 4.4vw, 50px)` | 800 | `1.02` | `-0.02em` |
| Card title (h3) | display | 22 px | 800 | 1.55 | `-0.02em` |
| Step title (h3) | display | 20 px | 800 | 1.55 | `-0.02em` |
| Hero lede | sans | `clamp(17px, 1.7vw, 20px)` | 400 | 1.55 | normal |
| Section intro | sans | 17 px | 400 | 1.55 | normal |
| Body | sans | 16 px | 400 | 1.55 | normal |
| Card body | sans | 15 px | 400 | 1.55 | normal |
| Button / nav link | display | 15 px | 700 | 1.55 | normal |
| Ticker | display | 14 px | 600 | 1.55 | `0.01em` |
| Tag | display | 11 px | 700 | normal | `0.06em` |
| Footer heading | display | 12.5 px | 800 | 1.55 | `0.09em`, uppercase |
| Kicker | hand | 17 px | 600 | 1.55 | normal, `rotate(-2deg)` |
| Reassurance / note meta | hand | 13–15 px | 400 | 1.55 | normal |
| Wordmark | display | 21 px | 800 | 1.55 | `-0.03em` |

**App scale is denser** (from `DESIGN.md` §6A): page title 30/36 display 800; eyebrow hand 16; nav pill 14 display 700; card header 16 display 800; event title 16 display 700; stat value 14 display 800; stat label 11.2 sans 600; filter row 12 sans 600; channel meta 12 sans 400.

Only h1 (`0.98`) and h2 (`1.02`) override the global `1.55` line-height. No uppercase body text. No italics in product UI.

```css
h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}
```

---

## 4. Spacing, layout & breakpoints

- **Container:** `max-width: 1140px`, side padding `24px`, centred.
- **Section rhythm:** `86px` block padding desktop → `64px` at ≤520 px. Hero `72px 0 40px`; final CTA `90px 0 110px`.
- **Section head:** `max-width: 640px`, centred, `margin-bottom: 52px`; kicker → h2 `10px`; h2 → intro `14px`.
- **Spacing values in use:** 4, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 40, 46, 48, 52, 56, 60, 64, 72, 86, 90, 110 (not a strict 4 px scale — don't force one).
- **Grids:** hero `1.05fr .95fr` / gap 48; feature+FAQ `repeat(3,1fr)` / 26; personas `repeat(4,1fr)` / 20; steps `repeat(3,1fr)` / 24; footer `1.4fr 1fr 1fr 1fr 1fr 1.1fr` / 28.
- **Small gaps:** nav links 8, brand 12, CTA buttons 14, ticker items 28.

### Breakpoints

| Width | What changes |
|---|---|
| **1024 px** | app: feed switches to aside 288 px + content; canvas `max-width: 1024px` |
| **880 px** | marketing: hero stacks, 3-col grids → 1, personas → 2, steps → 1, pin-board rotation `0.8deg`, max-width 460 |
| **860 px** | footer → 2 columns (brand spans both) |
| **768 px** | app: header text nav ↔ mobile bottom bar |
| **640 px** | padding widens 16 → 24; thumbnails 112 → 160 |
| **520 px** | personas → 1, nav text links hidden (we add a disclosure menu — the reference has none) |

---

## 5. Radius, borders & shadows

### 5.1 Radius

| Value | Applied to |
|---|---|
| `6px` | tag, small label |
| `8px` | stat pill inner, thumbnail, small button |
| `12px` | input, note card, app input |
| `14px` | emoji tile |
| `16px` | cards, panels, board, app cards, chat bubble |
| `26px` | final CTA panel |
| `999px` | pills, buttons, chips, badges |
| `50%` | avatars, eyes, step numbers |

### 5.2 Borders

| Weight | Use |
|---|---|
| `2px solid ink` | header bottom, ticker bottom, tag, chip, nav pill |
| `2.5px solid ink` | buttons, cards, inputs, dark-section block borders, footer top |
| `3px solid ink` | final CTA panel |
| `2px dashed rgba(27,23,18,.30)` | footer bottom divider |

### 5.3 Shadows — hard, zero blur, bottom-right offset

| Token | Value | Use |
|---|---|---|
| `xs` | `3px 3px 0 var(--ink)` | ghost button, step number, input, small trigger |
| `sm` | `4px 4px 0 var(--ink)` | pinned note, app cards |
| `md` | `5px 5px 0 var(--ink)` | primary button, marketing cards, steps |
| `lg` | `9px 9px 0 var(--ink)` | pin-board, final CTA panel |
| hover | `7px 7px 0` (button) / `8px 8px 0` (card) | grows as the element lifts |
| active | `2px 2px 0` | collapses as the element presses down |

**The lift rule:** hovering moves the element **up-left by the same amount the shadow grows**, so it stays visually anchored. Pressing moves it **down-right** and collapses the shadow.

| Element | Rest | Hover | Active |
|---|---|---|---|
| Primary button | `translate(0,0)` + 5 px | `translate(-2px,-2px)` + 7 px | `translate(2px,2px)` + 2 px |
| Ghost button | `translate(0,0)` + 3 px | `translate(-1px,-1px)` + 3 px, white fill | same as hover |
| Feature card | `translate(0,0)` + 5 px | `translate(-3px,-3px)` + 8 px | — |
| App card | `translate(0,0)` + 4 px | — (static) | — |
| Pinned note | rotation + 4 px | `rotate(0) scale(1.015)` | — |

---

## 6. Surfaces & texture

- **Page:** `--paper` + dot grid 1 px / 22 px at `rgba(27,23,18,.07)`.
- **Grain:** fixed full-page pseudo-element with an inline `feTurbulence` SVG data URI, `opacity: .5`, `mix-blend-mode: multiply`, `pointer-events: none`. Recreate with our own seed.
- **Sticky header:** `rgba(251,243,228,.82)` + `backdrop-filter: saturate(140%) blur(8px)` + `2px solid ink` bottom border.
- **Dark section:** `background: var(--ink); color: var(--paper); border-block: 2.5px solid var(--ink)`.
- **Pin-board:** `--paper-deep` + 16 px dot grid at `.12`, `2.5px` border, 16 px radius, `9px` shadow, `rotate(1.6deg)`; tape strip at the top of each note.

---

## 7. Components

All examples use `--font-display` = display, `--font-sans` = sans.

### 7.1 Buttons

Base (all variants):

```css
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
transition: transform .1s, box-shadow .1s, background-color .12s;
```

| Variant | Resting | Hover | Active | Disabled |
|---|---|---|---|---|
| **Primary** | `bg --red-deep`, `color --paper`, `shadow 5px` | `translate(-2,-2)`, `shadow 7px` | `translate(2,2)`, `shadow 2px` | `opacity .4`, `cursor: not-allowed` |
| **Ghost** | `bg --paper`, `color --ink`, `shadow 3px` | `translate(-1,-1)`, `bg #fff` | same as hover | `opacity .4` |
| **Link** | transparent, no border/shadow, `padding 12px`, `color --ink` | `underline wavy --red 2px`, `underline-offset: 4px` | — | `opacity .4` |
| **Danger** | `bg --coral`, `color --ink`, `shadow 3px` | `translate(-1,-1)`, `shadow 4px` | `translate(1,1)`, `shadow 2px` | `opacity .4` |

Sizes: `md` = `padding 12px 20px / 15px`; `sm` = `padding 8px 16px / 13px`.

Focus (all variants — we add this, the reference has none):

```css
:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
```

```css
.btn--primary { background: var(--red-deep); color: var(--paper); box-shadow: 5px 5px 0 var(--ink); }
.btn--primary:hover  { transform: translate(-2px, -2px); box-shadow: 7px 7px 0 var(--ink); }
.btn--primary:active { transform: translate(2px, 2px);  box-shadow: 2px 2px 0 var(--ink); }

.btn--ghost { background: var(--paper); color: var(--ink); box-shadow: 3px 3px 0 var(--ink); }
.btn--ghost:hover { transform: translate(-1px,-1px); background: #fff; }

.btn--link { padding: 12px; border: 0; background: transparent; box-shadow: none; }
.btn--link:hover { text-decoration: underline wavy var(--red) 2px; text-underline-offset: 4px; }
```

**App-scale button** uses a 4 px resting shadow: rest 4 px → hover `translate(-2,-2)` + 6 px → active `translate(2,2)` + 2 px.

### 7.2 Cards

| Tone | Background | Use |
|---|---|---|
| white | `#fff` | default feature, step, app card |
| warm | `#fff7e0` | first card in a trio |
| cool | `#e6fbf6` | second card in a trio |
| blush | `#fff0ec` | third card in a trio |
| paper | `--paper` | nested surfaces |

```css
.card {
  border: 2.5px solid var(--ink);
  border-radius: 16px;
  background: #fff;
  box-shadow: 5px 5px 0 var(--ink);
  padding: 28px 24px 26px;
}
.card--interactive { transition: transform .14s, box-shadow .14s; }
.card--interactive:hover { transform: translate(-3px, -3px); box-shadow: 8px 8px 0 var(--ink); }
```

App cards use a `4px` resting shadow and **do not lift** (static surfaces; only their inner buttons and links move).

### 7.3 Chips, tags, stat pills

| Component | Shape | Recipe |
|---|---|---|
| **Chip** (status) | pill | `border: 2px`, `radius 999px`, `padding 4px 10px`, display 12/700, `letter-spacing .04em`; tones: paper, yellow, teal 30%, sky 30%, coral |
| **Tag** (label) | rect | `border: 2px`, `radius 6px`, `padding 3px 9px`, display 11/700, `letter-spacing .06em`, paper fill |
| **Stat pill** | pill | `border: 2px`, `radius 999px`, `padding 4px 12px`, `shadow 3px`; value display 14/800 + label 11.2/600 ink-soft |
| **Event time** | pill | `border: 2px`, paper-deep fill, 12/700 |

Stat tint recipes (measured): views `color-mix(in srgb, var(--teal) 30%, transparent)`, likes `yellow 40%`, comments `sky 30%`.

### 7.4 Inputs

| State | Style |
|---|---|
| Rest | white fill, `2.5px` ink border, `12px` radius, `3px` shadow, padding `0 16px`, height 44 px (48 app), 15 px sans |
| Focus | **no ring** — shadow deepens to `4px` |
| Keyboard focus | `outline: 3px solid ink; outline-offset: 3px` |
| Placeholder | `--ink-mute` |
| Error | border `--red-deep`, helper text `--red-deep` 13 px |
| Disabled | `opacity .5`, `cursor: not-allowed` |

### 7.5 Eyebrow / kicker

Handwritten eyebrow above every page title and section head:

```css
.eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-hand); font-size: 17px; font-weight: 600;
  color: var(--red-deep); transform: rotate(-2deg);
  margin-bottom: 18px;
}
.section--ink .eyebrow { color: var(--yellow); }
```

### 7.6 Brand mark + cursor-tracking eyes

- Wordmark: display 21 px / 800 / `-0.03em`, ink.
- Eyes: two `26px` circles, `2.5px` ink border, white fill, `overflow: hidden`; pupil `9px` ink circle via `::after`, `transform: translate(-50%,-50%) translate(var(--px,1px), var(--py,2px))`, `transition: transform .12s ease-out`.
- Pupils track the cursor, clamped to **±6 px** with falloff over ~140 px. Skip on `pointer: coarse` and `prefers-reduced-motion`. Eyes are `aria-hidden`; the wordmark carries the accessible name.
- Wordmark hidden below 640 px in the app header; eyes remain.

### 7.7 Navigation

**Marketing header** — sticky, 2.5px bottom border, brand left, text links (display 15/700, gap 8), primary CTA right. Hover: wavy red underline. Below 520 px: links hide, disclosure menu appears (⚠️ our addition; reference has none).

**App navbar** — 64 px inner + 2.5 px bottom border = 66 px total; nav is a row of **pills**:

| State | Style |
|---|---|
| Inactive | `color --ink-soft`, transparent 2 px border, `padding 6px 14px`, radius 999px |
| Hover | ink border + white fill |
| Active (`aria-current`) | ink fill, paper text, ink border |

Right side: plan chip (`FREE`, paper) + 32 px circular icon button (white, 2 px border, hover paper-deep). All transitions 150 ms `cubic-bezier(.4,0,.2,1)`.

**Mobile bottom bar** — fixed, 61 px, `rgba(251,243,228,.95)` + blur, 2.5 px top border, 4 equal items, icon above 0.7 rem label. Active: 4 px ink top border + white fill + ink text; inactive: ink-soft with transparent 4 px border.

### 7.8 Sidebar panel (chat)

Floating panel, not a bordered column:

- `fixed top-3 left-3 bottom-3 w-64 z-30`, white card, `2.5px` border, `16px` radius, `5px` shadow.
- Animates `w-64 ↔ w-0` with `transition-all 300ms`, contents fade with the width.
- Trigger: `fixed left-3 top-4 z-50`, 32 px bordered square button, `3px` shadow, always above content.
- Mobile: panel overlays with an `--ink/40` scrim; tapping the scrim or trigger closes it.
- Contents: brand header (2 px bottom border), **New Chat** primary full-width, scrollable chat rows (display 14/700, truncated at 28 chars with `…`, full title in `title`), user chip footer (36 px bordered circular avatar + ghost sign-out icon).

### 7.9 Chat

| Element | Style |
|---|---|
| User bubble | right-aligned, `max-w-[80%]`, ink fill, paper text, `16px` radius, `2.5px` border |
| Assistant | left-aligned, transparent, paper column, ink text, 15–16 px / 1.55 |
| Citation chip | tag-style link, `2px` border, numbered, external icon; hover yellow fill |
| Input dock | white card, `2.5px` border, `16px` radius, `4px` shadow; auto-grow textarea (max 200 px); Enter sends, Shift+Enter newline; circular primary send button 36 px |
| Scroll-to-bottom pill | paper chip, `2px` border, `3px` shadow, appears when >300 px from bottom |
| Empty state | centred icon tile (58 px, bordered), display title, hand-written reassurance in red-deep |
| Column | scroll region and input dock share the same `max-w-3xl` centreline |

### 7.10 Library / event rows

- Row card: white, `2.5px` border, `16px` radius, `4px` shadow, `padding 16px`.
- Icon/thumbnail tile: 44 px circle (channel) or 112×63 / 160×90 bordered `8px`-radius thumbnail (video).
- Title: display 16/700, truncates; meta: sans 12, ink-mute, truncates.
- Actions: primary **Chat/Activate**, ghost **Open**, link/danger **Remove** (ink-soft → red-deep text + ink border + white fill on hover).

### 7.11 Empty, loading, error

| State | Treatment |
|---|---|
| Skeleton | `background-size: 200% 100%`, 1.3 s linear infinite shimmer, paper-deep base |
| Empty | bordered icon tile + display title + hand reassurance (no illustrations — the reference has none) |
| Error | `--red-deep` text; retry as a ghost button; inline, never a toast we don't have |

---

## 8. Motion

CSS only. **No animation library, no scroll-triggered reveals in the app** (the reference has none; the six `rise` animations are hero-only, on load).

| Effect | Trigger | Duration | Easing |
|---|---|---|---|
| Primary button lift / press | hover / active | 100 ms | default `ease` |
| Ghost button lift + white fill | hover | 100 ms | `ease` |
| Card lift | hover | 140 ms | `ease` |
| Persona tilt + fill | hover | 140 ms | `ease` |
| Pinned note straighten + scale | hover | 180 ms | `ease` |
| Nav pill / filter row / links | hover / focus | 150 ms | `cubic-bezier(.4,0,.2,1)` |
| Ticker marquee | continuous | 32 s | `linear` |
| Hero rise-in | load, staggered .05/.15/.25/.35 s | 700 ms | `cubic-bezier(.2,.8,.2,1)` |
| Eye pupil follow | `mousemove` | 120 ms | `ease-out` |

```css
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

.reveal { opacity: 0; transform: translateY(16px); animation: rise .7s cubic-bezier(.2,.8,.2,1) forwards; }
.reveal--d1 { animation-delay: .05s; }
.reveal--d2 { animation-delay: .15s; }
.reveal--d3 { animation-delay: .25s; }
.reveal--d4 { animation-delay: .35s; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
  .reveal { opacity: 1; transform: none; }
}
```

Ticker: two identical groups, track translates `-50%`; duplicate group is `aria-hidden`. Optionally pause on hover/focus.

---

## 9. Accessibility

- **Focus:** add `:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }` globally. The reference has zero authored focus rules; inputs use a deeper shadow plus this outline for keyboard users.
- **Contrast:** no white-on-`--red` text below 18 px (use `--red-deep`). Keep `--ink-mute` for ≥14 px meta only.
- **Emoji:** always decorative → `aria-hidden="true"`; meaning lives in the heading.
- **Ticker:** duplicate group hidden from AT.
- **Mobile nav:** provide a real disclosure menu (the reference hides links with no replacement).
- **Motion:** honour `prefers-reduced-motion` for CSS animations and the eye tracker.
- **Theme:** light only (`color-scheme: light`).
- **Touch targets:** ≥40 px for buttons and 44 px for row actions on mobile.

---

## 10. Screen blueprints

### 10.1 Landing (`/`)

```
┌ sticky header: [eyes + wordmark]   Home  How it works  Pricing   [Open App ┐
├ ticker: ink strip, marquee, red • separators (duplicated group aria-hidden) ┤
│ HERO  1.05fr / .95fr                                                          │
│  kicker (handwritten)          ┌ pin-board (rotated, dotted, 9px shadow) ┐  │
│  h1 clamp 78 / 42, one         │  ▸ taped note — yellow, rotated -1.6°   │  │
│  word wavy-underlined          │  ▸ taped note — teal,   rotated +1.4°   │  │
│  lede                          │  ▸ taped note — coral,  rotated -0.8°   │  │
│  [Ask your library] [See how]  └─────────────────────────────────────────┘  │
├ feature grid: 3 cards, bordered emoji tiles, warm/cool/blush tints, lift on hover
├ ink section: 4 persona cards, translucent paper, tilt on hover, yellow kicker
├ steps: 3 cards, numbered 44px badges red → teal → sky, 3px shadow
├ final CTA: yellow panel, 26px radius, 3px border, 9px shadow, oversized h2
└ footer: paper-deep, 6-col grid → 2 at 860, dashed divider, handwritten red tag
```

No photographs. All visuals are type, colour, border, shadow. Six hero elements rise in on load.

### 10.2 Sign in (`/signin`)

Paper + dot grid → centred panel (26 px radius, 9 px shadow, 3 px border) with brand eyes, handwritten kicker, 50 px display h2, ink-soft lede, full-width primary "Continue with Google", error as a bordered coral chip. Same panel for `/auth/callback` loading and error states.

### 10.3 App shell

`AppLayout` = paper background + dot grid, navbar 66 px, main `max-w-[1024px] mx-auto px-4 md:px-6 pt-8 pb-24`, footer strip 12 px ink-mute, mobile bottom bar 61 px below `md`.

### 10.4 Chat (`/c/new`, `/c/:chatId`)

```
┌ navbar ────────────────────────────────────────────────────────┐
│ ┌ floating sidebar (w-64 card) ┐ ┌ chat column ──────────────┐ │
│ │ brand                        │ │  scroll region (max-w-3xl)│ │
│ │ [New chat]                   │ │   user bubble ▸ right     │ │
│ │ chat rows …                  │ │   assistant ▸ left        │ │
│ │ user chip        [sign out]  │ │  ─────────────────────    │ │
│ └──────────────────────────────┘ │  [scope selector]         │ │
│        ▣ trigger (floating)      │  [ input card        ( → )]│ │
│                                  └───────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

Sidebar and input dock share the paper aesthetic; the input dock background fades `from-paper` to transparent.

### 10.5 Ingest (`/ingest`)

```
eyebrow · h1 · sub
[ Video | Playlist ]  segmented pill group
┌ card: [ URL input.............................. ] [ Ingest ] ┐
┌ card: progress — counters + ink track/red fill + spinner     ┐
Library
  Videos    — bordered rows, 44px tile, status chip, [Chat]
  Playlists — bordered rows, item count, status chip, [Chat]
```

---

## 11. Implementation notes

### 11.1 Styling architecture — hybrid Tailwind + CSS layer

**Decision:** keep Tailwind v4 as the engine, but do **not** express the visual identity in utility classes. Tokens live in `@theme`; anything with a state matrix lives in a small CSS component layer; Tailwind handles structure.

**Why not pure Tailwind.** This design is mostly state matrices and awkward values. A primary button in utilities is:

```html
class="border-[2.5px] border-ink bg-red-deep text-paper shadow-[5px_5px_0_#1b1712]
hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#1b1712]
active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#1b1712]"
```

Repeated per element, that is unreadable, drifts silently from this spec, and cannot be audited. The same problem hits dotted backgrounds, `rotate(1.6deg)`, `color-mix()` stat pills, tape strips, the marquee keyframes, and the grain pseudo-element.

**Why not pure CSS.** Layout, spacing, and responsive behaviour would all be hand-written, losing the iteration speed Tailwind already gives the existing components for no visual gain.

#### What lives where

| Location | Contents |
|---|---|
| `src/styles/tokens.css` | The `@theme` block: colours, fonts, radii, shadows. Produces `bg-paper`, `text-ink`, `font-display`, `shadow-nb`, `rounded-nb-md`, and the same values as CSS variables. |
| `src/styles/base.css` | `body` paper + dot grid, grain overlay, `h1–h3`, `::selection`, `:focus-visible`, reduced-motion block. |
| `src/styles/components.css` (`@layer components`) | Every component with ≥2 states: `.btn--primary/ghost/link/danger`, `.card`, `.chip`, `.tag`, `.stat`, `.input`, `.nav-pill`, `.note`, `.board`, `.ticker`, `.eyes`, `.eyebrow`. |
| JSX utilities | Layout, flex/grid, spacing, responsive prefixes (`md:`, `lg:`), one-off positioning, truncation. |

`src/index.css` becomes a pure entry point:

```css
@import "tailwindcss";
@import "./styles/tokens.css";
@import "./styles/base.css";
@import "./styles/components.css";
```

#### Component layer shape

```css
@layer components {
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 20px;
    border: 2.5px solid var(--color-ink);
    border-radius: 999px;
    font-family: var(--font-display); font-size: 15px; font-weight: 700;
    white-space: nowrap; cursor: pointer;
    transition: transform .1s, box-shadow .1s, background-color .12s;
  }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn:focus-visible { outline: 3px solid var(--color-ink); outline-offset: 3px; }

  .btn--primary {
    background: var(--color-red-deep); color: var(--color-paper);
    box-shadow: var(--shadow-nb);
  }
  .btn--primary:hover  { transform: translate(-2px, -2px); box-shadow: var(--shadow-nb-hover); }
  .btn--primary:active { transform: translate(2px, 2px);   box-shadow: var(--shadow-nb-press); }
}
```

```tsx
// components/ui/Button.tsx — the only place the class stack is assembled
<button className={cn('btn', `btn--${variant}`, size === 'sm' && 'btn--sm', className)} />
```

#### Rules that keep it one system

1. **Class names are copied verbatim from this document** (`.btn--primary`, `.card`, `.eyebrow`, `.nav-pill`). If a component isn't listed here, add it here before adding the class.
2. **React primitives own the classes.** Pages compose `<Button variant="primary" />`, never the raw class string. A page may pass utilities for layout only (`className="w-full"`).
3. **No hex codes in `.tsx`.** Every colour, radius, and shadow comes from a token or a component class. Audit: `grep -rn "#[0-9a-f]\{6\}" frontend/src --include=*.tsx` must return nothing.
4. **No utility escape hatch for identity values.** `shadow-[5px_5px_0_#1b1712]` and `border-[2.5px]` are forbidden in JSX; they belong in `components.css`.
5. **`@apply` stays rare** — at most one or two declarations to bridge a utility into a component class. If it grows, the rule belongs in plain CSS.
6. **Arbitrary values are allowed for layout only** — grids, `max-w-[664px]`, `top-[80px]` — never for colour, border, shadow, or motion.

#### Resulting file layout

```
frontend/src/
├── index.css                  ← imports only
├── styles/
│   ├── tokens.css             ← @theme
│   ├── base.css               ← body, grain, headings, focus, reduced-motion
│   └── components.css         ← .btn, .card, .chip, .input, .nav-pill, .ticker, .eyes …
├── lib/cn.ts                  ← 6-line class joiner
└── components/ui/             ← Button, Card, Chip, Input, Eyebrow, Brand, StatPill, EmptyState
```

### 11.2 Tailwind v4 theme block

```css
@import "tailwindcss";

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

  --radius-nb-sm: 12px;
  --radius-nb-md: 16px;
  --radius-nb-lg: 26px;

  --shadow-nb-xs: 3px 3px 0 #1b1712;
  --shadow-nb-sm: 4px 4px 0 #1b1712;
  --shadow-nb: 5px 5px 0 #1b1712;
  --shadow-nb-lg: 9px 9px 0 #1b1712;
  --shadow-nb-hover: 7px 7px 0 #1b1712;
  --shadow-nb-press: 2px 2px 0 #1b1712;
}
```

### 11.3 Proposed primitives

| File | Exports |
|---|---|
| `src/lib/cn.ts` | `cn(...classes)` — 6-line joiner, no dependency |
| `src/hooks/useEyes.ts` | cursor-tracking eye offsets, motion/pointer guarded |
| `src/components/ui/Button.tsx` | `primary \| ghost \| link \| danger`, `md \| sm` |
| `src/components/ui/Card.tsx` | tone `white \| warm \| cool \| blush \| paper`, `interactive` |
| `src/components/ui/Chip.tsx` | chip + tag, tones |
| `src/components/ui/Input.tsx` | 44/48 px bordered input, error prop |
| `src/components/ui/Eyebrow.tsx` | handwritten kicker |
| `src/components/ui/Brand.tsx` | eyes + wordmark |
| `src/components/ui/StatPill.tsx` | views / likes / comments tones |
| `src/components/ui/EmptyState.tsx` | icon tile + title + reassurance |
| `src/components/layout/MobileBar.tsx` | 4-item bottom bar |

### 11.4 Build rules

- No `zinc-*`, `neutral-*`, `bg-black` classes anywhere in `frontend/src`.
- Every interactive element is bordered + hard-shadowed + has a hover state, or is a documented static surface.
- Every primitive ships with its focus ring and reduced-motion behaviour.
- Light only — no `dark:` variants.

---

## 12. Deliberate deviations from the reference

| # | Deviation | Why |
|---|---|---|
| ⚠️ 1 | Primary button fill is `--red-deep`, not `--red` | White on `#ff3b2f` is 3.5:1 at 15 px; `#d52817` gives 5.5:1 |
| ⚠️ 2 | Add a mobile disclosure menu on marketing pages | Reference hides nav links below 520 px with no replacement |
| ⚠️ 3 | Add `:focus-visible` rings everywhere | Reference has zero authored focus rules |
| ⚠️ 4 | Eyebrow/meta text uses `--red-deep` or `--ink-soft` where `--ink-mute` is under 4.5:1 | Contrast |
| ⚠️ 5 | Bottom nav is implemented on the app shell | Reference shows it; our app currently lacks it |

---

## 13. Open questions (not yet designed)

- `/settings`, `/billing` screens.
- `/video/:id`, `/channel/:id` detail routes (charts, timelines, history).
- Modals, toasts, destructive confirmations, dropdown menus beyond the scope selector.
- Dark mode (explicitly out of scope for now).
- Loading skeletons per screen (shimmer primitive defined, layouts not laid out yet).

---

## 14. File map

```
docs/
├── DESIGN.md                  ← measured evidence of monitoryt.com
├── DESIGN_SYSTEM.md           ← this file: what we build
├── reference/                 ← 8 screenshots (hero, app feed/channels, hovers)
└── assets/                    ← original CSS dumps, asset inventory
```
