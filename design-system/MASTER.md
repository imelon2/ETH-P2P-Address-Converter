# Design System — ETH P2P Address Converter
> Source of truth: `DESIGN.md` (Supabase-inspired dark-mode developer aesthetic)
> Apply to: `web/` (Vite + TypeScript single-page tool)

## Identity

Dark-mode-native developer tool. Near-black surfaces with emerald green identity accent
used **sparingly**. Source Code Pro for technical labels in UPPERCASE with 1.2px tracking.
Geometric sans (Inter) for body. **Depth comes from border hierarchy, never shadows.**

---

## Tokens

### Color

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-page` | `#171717` | page canvas |
| `--bg-surface` | `#171717` | cards (border defines edge) |
| `--bg-deep` | `#0f0f0f` | code wells, primary button background |
| `--border-subtle` | `#242424` | dividers, table separators |
| `--border` | `#2e2e2e` | card edges (default) |
| `--border-strong` | `#363636` | hover, interactive |
| `--border-strongest` | `#393939` | secondary borders |
| `--border-accent` | `rgba(62,207,142,0.3)` | brand-marked elements |
| `--text` | `#fafafa` | primary text — 16:1 on `--bg-page` (AAA) |
| `--text-secondary` | `#b4b4b4` | secondary copy — 7.5:1 (AAA) |
| `--text-muted` | `#898989` | labels, captions — 5:1 (AA) |
| `--text-dim` | `#4d4d4d` | **decorative only** — fails AA, never use for informative text |
| `--brand` | `#3ecf8e` | identity marker (logo, format pill detected, focus ring) |
| `--brand-link` | `#00c573` | active link state |
| `--danger` | `#ef4444` | semantic error |

### Typography

| Token | Family |
|-------|--------|
| `--font-sans` | `Inter`, `DM Sans`, system-ui |
| `--font-mono` | `Source Code Pro`, ui-monospace, Menlo |

**Hierarchy:**

| Role | Family | Size | Weight | Tracking | Notes |
|------|--------|------|--------|----------|-------|
| App title | sans | 32px | 400 | -0.02em | line-height 1.05 (tight, near-Circular signature) |
| Body | sans | 16px | 400 | normal | 1.5 line-height |
| Section label | mono | 12px | 400 | 1.2px | UPPERCASE |
| Code block | mono | 13px | 400 | normal | 1.55 line-height |
| Button | sans | 14px | 500 | normal | only weight 500 allowed |
| Mini pill button | mono | 11px | 500 | 1.2px | UPPERCASE |
| Caption / pill | mono | 11px | 400 | 1.2px | UPPERCASE |

**Weight rule:** Only `400` and `500`. No `700`/bold anywhere.

### Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-pill` | 9999px | primary CTA, format pill, copy chip |
| `--radius-sm` | 6px | ghost / mini buttons |
| `--radius-md` | 8px | code wells, textarea, error banner |
| `--radius-lg` | 12px | mid panels |
| `--radius-xl` | 16px | result cards, input panel |

### Spacing

8px base. Scale: `8 / 12 / 16 / 24 / 40 / 64 / 96`.

---

## Components

### Primary button (Decode)
- Pill 9999px, padding `10px 32px`, min-height 40px
- Background `--bg-deep` (#0f0f0f), text `--text`, border `1px solid --text`
- Hover: invert (background `--text`, text `--bg-deep`)
- Disabled: opacity 0.55

### Ghost button (Sample / Clear)
- Radius 6px, padding `8px 14px`
- Transparent bg, text `--text-secondary`, border `1px solid --border`
- Hover: text `--text`, border `--border-strong`

### Mini ghost button
- Same as ghost but Source Code Pro 11px UPPERCASE 1.2px tracking

### Card (result-card)
- Background `--bg-surface`, border `1px solid --border`, radius `--radius-xl`
- Padding 20px, hover border `--border-strong`
- **No box-shadow.** Depth comes from border alone.

### Code well (result-body)
- Background `--bg-deep`, border `1px solid --border-subtle`, radius `--radius-md`
- Padding `14px 16px`, Source Code Pro 13px line-height 1.55
- `word-break: break-all` for ENR/enode strings; reset to `normal` for note text

### Format pill (input metadata)
- Pill 9999px, Source Code Pro 11px UPPERCASE 1.2px tracking
- Default: text `--text-muted`, border `--border`
- Detected: text `--brand`, border `--border-accent`
- Unknown: text `--danger`, border `rgba(239,68,68,0.3)`

### Input textarea
- Background `--bg-deep`, border `1px solid --border`, radius `--radius-md`
- Source Code Pro 13px, focus border `--brand`

### Logo chip
- 36×36, radius 8px, background `--bg-deep`, border `1px solid --border-accent`
- "P2P" text in Source Code Pro 11px 500 UPPERCASE 1.2px, color `--brand`

---

## Do

- Use **green sparingly**: logo accent, format pill (active), status bar markers, focus ring
- Border hierarchy for depth: `#242424` → `#2e2e2e` → `#363636`
- Pill (9999px) for primary CTA exclusively; 6px for secondary
- Source Code Pro UPPERCASE 1.2px tracking for ALL technical labels
- Weight 400 default; 500 only for nav and buttons
- App title at 32px weight 400 with -0.02em tracking and tight line-height (Circular signature)

## Don't

- ❌ box-shadows (invisible on dark, breaks border-defined depth)
- ❌ bold (700) — system uses 400 and 500 only
- ❌ green on backgrounds or large surfaces (identity marker, not decoration)
- ❌ radial decorative gradients on background (depth from borders, not glow)
- ❌ `--text-dim` for any informative text (fails WCAG AA)
- ❌ Border radius between 6px and 9999px on buttons (use one or the other)

---

## Accessibility floor

- Body text uses `--text` (16:1) or `--text-secondary` (7.5:1) — AAA on `--bg-page`
- Captions/labels use `--text-muted` (5:1) — AA pass
- Focus visible ring: `2px solid var(--brand)` with `outline-offset: 2px`
- `prefers-reduced-motion`: disable all transitions globally
- Touch targets: primary 40px+, ghost 36px+
