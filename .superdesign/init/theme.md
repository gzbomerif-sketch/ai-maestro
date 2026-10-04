# Theme / Design Tokens

Active theme: **ink** (`<body class="theme-ink ...">` in `app/layout.tsx`) — flat near-black, T3-style, dark only (no `.dark` class, no light mode, no ThemeProvider). Tailwind 3.4 with colours as `rgb(var(--channel) / <alpha-value>)`, so `bg-surface/60`, `border-hairline/70` opacity modifiers work. Components must use semantic roles, never hex.
Gotcha: `text-white` means "foreground", not pure white — it resolves to `--fg-white` (ink theme: `236 236 239`) and is used in ~278 places. A new theme that inverts the ground must also set `--fg-white`. Only `--primary-foreground` (shadcn) is a literal `255 255 255`.

## Part 1 — Compact token summary

### Semantic colour roles (use these)
RGB channel triples. `.theme-ink` value is what renders; `:root` is the stock-Tailwind default fallback (also dark).

| Tailwind token | CSS var | `.theme-ink` (active) | `:root` default | Role |
|---|---|---|---|---|
| `bg-sunken` | `--c-sunken` | 10 10 11 (#0a0a0b) | 3 7 18 | app/page background, input bg, terminal bg |
| `bg-surface` | `--c-surface` | 15 15 17 (#0f0f11) | 17 24 39 | sidebar, cards, windows, dialogs |
| `bg-raised` | `--c-raised` | 28 28 32 (#1c1c20) | 31 41 55 | selected row, hover, title bars, segmented bg |
| `border-hairline` | `--c-hairline` | 31 31 35 (#1f1f23) | 55 65 81 | all dividers/borders (often `/70`) |
| `text-ink` | `--c-ink` | 236 236 239 (#ececef) | 243 244 246 | primary text |
| `text-ink-muted` | `--c-ink-muted` | 133 133 141 (#85858d) | 156 163 175 | secondary text, inactive icons |
| `text-accent` | `--c-accent` | 154 166 255 (#9aa6ff) | 96 165 250 | accent text / focus tint ("working") |
| `bg-accent-fill` | `--c-accent-fill` | 47 75 255 (#2f4bff) | 37 99 235 | primary fill, toggle-on, unread Badge, focus outline |
| `text-ok` | `--c-ok` | 34 197 94 (default) | 34 197 94 | success |
| `text-warn` | `--c-warn` | 214 162 67 (#d6a243) | 245 158 11 | needs-you, warnings |
| `text-danger` | `--c-danger` | 239 68 68 (default) | 239 68 68 | errors, destructive |
| `border-control-border` | `--c-control-border` | 42 42 47 | 75 85 99 | outline button / input border |
| `bg-control-off` | `--c-control-off` | 38 38 43 | 55 65 81 | toggle-off track, shadcn hover bg |
| `bg-warn-surface` | `--c-warn-surface` | 22 19 13 | 69 26 3 | needs-you card bg |
| `border-warn-border` | `--c-warn-border` | 42 35 20 | 120 53 15 | needs-you card border |

Status dot colours (StatusDot): needs-you `bg-warn`; working `bg-accent-fill ring-[3px] ring-accent-fill/20`; idle `bg-gray-600`; asleep/offline `bg-gray-700`.
Dark-only fixed surfaces: `room-bg` 26 27 38, `room-raised` 33 30 25, `room-deep` 10 10 10; `terminal-*` follow sunken/ink/accent-fill; legacy `sidebar-*` hex (#252526, #2a2d2e, #37373d, #3e3e42).

### Themed neutral ramps (`gray`, `slate`, `blue` are remapped to CSS vars)
`.theme-ink` gray/slate: 50 `246 246 248` · 100 `236 236 239` · 200 `220 220 224` · 300 `196 196 202` · 400 `133 133 141` · 500 `94 94 102` · 600 `58 58 64` · 700 `31 31 35` · 800 `28 28 32` · 900 `10 10 11` · 950 `7 7 8`.
Accent `blue` ramp (`--a-*`): 50 `238 241 255` · 100 `222 227 255` · 200 `191 200 255` · 300 `154 166 255` · 400 `108 126 255` · 500 `47 75 255` (#2f4bff) · 600 `34 54 255` (brand #2236ff) · 700 `26 42 214` · 800 `22 35 170` · 900 `20 30 130` · 950 `13 18 80`.
Common usage in shell: `text-gray-300` (nav items), `text-gray-400` (group labels), `text-gray-500` (meta/timestamps, placeholder), `bg-gray-600/700` (idle dots). `:root` defaults are stock Tailwind gray/slate/blue.
`--fg-white`: ink theme `236 236 239`; default `255 255 255`.

### shadcn/ui bridge (derived from roles, declared on `:root, .theme-ink`)
`--background`=surface · `--foreground`=ink · `--card`/`--popover`=raised · `--primary`=accent-fill (foreground literal `255 255 255`) · `--secondary`=control-off · `--muted`=sunken / `--muted-foreground`=ink-muted · `--border`=hairline · `--input`=control-border · `--ring`=accent · `--destructive`=danger · `--radius: 0.5rem`. Tailwind: `bg-background text-foreground bg-card bg-popover bg-primary text-primary-foreground bg-secondary bg-muted border-border border-input ring-ring bg-destructive`. shadcn `accent` intentionally absent.

### Category identity colours (agent group colours, `:root`)
`--cat-0..7-{primary,icon,text}`: 0 blue (59 130 246 / 96 165 250 / 147 197 253), 1 purple (168 85 247 / 192 132 252 / 216 180 254), 2 green (34 197 94 / 74 222 128 / 134 239 172), 3 yellow (234 179 8 / 250 204 21 / 253 224 71), 4 pink (236 72 153 / 244 114 182 / 251 207 232), 5 teal (20 184 166 / 45 212 191 / 94 234 212), 6 orange (249 115 22 / 251 146 60 / 253 186 116), 7 red (239 68 68 / 248 113 113 / 252 165 165).

### Typography
- Sans: `Stack Sans Text` (400, 500; Google Fonts `<link>`), set by `.theme-ink { --font-sans }`, fallback system-ui, -apple-system, Helvetica Neue, Arial. Tailwind `font-sans` = `var(--font-sans), Helvetica Neue, Arial, sans-serif`.
- Mono: `JetBrains Mono` (next/font, `--font-mono`) fallback Consolas, Monaco. Use `font-mono` for code, terminal, ids, URLs, numbers.
- Scale is explicit px, not Tailwind steps: 16px breadcrumbs/top bar title · 15px body/nav rows/titles (`font-medium` for titles) · 14px secondary/buttons/inputs · 13px meta/menus/window titles/notices · 12px counters/timestamps/segmented tabs · 11px badge. Weights used: 400 normal, 500 medium only. No tracking/uppercase conventions; labels are sentence case.

### Spacing, radius, shadow, breakpoints
- Tailwind default spacing scale (no overrides) plus arbitrary px: page gutters `px-6` (top bars), `px-10 py-14` (home), card rows `px-[22px] py-4`, sidebar `px-3 pt-4 pb-3`, nav row `px-2.5 py-2`, section label `mx-2.5 mt-[18px] mb-1.5`.
- Control height 34px (`h-[34px]`), icon button 34x34, top bar 60px, window title bar 40px (`h-10`), dialog header 56px, minimized pill 32px.
- Radius: 10px controls/rows (`rounded-[10px]`), 12px menus/windows/cards-in-windows (`rounded-xl`/`[12px]`), 14px Card/tiles, 8px menu items, full for dots/pills/badges; shadcn uses `rounded-md` (--radius 0.5rem).
- Shadows are nearly absent (flat): only `shadow-lg` on FloatingWindow, `shadow` on minimized pills. Elevation is expressed with surface/raised + hairline borders, and `bg-black/60` dialog scrim.
- Breakpoints: Tailwind defaults (sm 640, md 768, lg 1024, xl 1280, 2xl 1536); globals.css adds a `max-width: 768px` rule (44px min tap targets, `overflow:hidden`). The command-center shell is desktop-only; mobile/tablet use separate dashboards.
- Focus: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill` (shell) / `ring-2 ring-ring ring-offset-2` (shadcn).
- Icons: `lucide-react`, `strokeWidth={1.5}`, `w-4 h-4` (sizes 15–16 in window chrome).
- Motion: minimal; `transition-colors`; `tailwindcss-animate` plugin; `.animate-fadeIn`; living-avatar keyframes (`live-avatar-*`) with reduced-motion guard.
- Global utility classes in globals.css: `.custom-scrollbar`, `.scrollbar-thin`, `.no-select`, `.is-resizing`, xterm overrides (padding 12px 14px, quiet thin scrollbar).


---

# Part 2 — Raw source

## `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // Shared class maps live here too (lib/agent-presence.ts)
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Themeable ramps ──────────────────────────────────────────────
        // Neutrals, the accent and `white` resolve from CSS channel variables
        // (app/globals.css). The DEFAULT theme reproduces stock Tailwind
        // exactly, so this layer is a no-op visually — it only makes a theme
        // possible. A new theme is one block of variables; no component edits.
        //
        // `text-white` means "foreground" in ~278 places here, so it is themed
        // too: a theme that forgets --fg-white blanks its own text.
        gray: {
          50: 'rgb(var(--g-50) / <alpha-value>)',
          100: 'rgb(var(--g-100) / <alpha-value>)',
          200: 'rgb(var(--g-200) / <alpha-value>)',
          300: 'rgb(var(--g-300) / <alpha-value>)',
          400: 'rgb(var(--g-400) / <alpha-value>)',
          500: 'rgb(var(--g-500) / <alpha-value>)',
          600: 'rgb(var(--g-600) / <alpha-value>)',
          700: 'rgb(var(--g-700) / <alpha-value>)',
          800: 'rgb(var(--g-800) / <alpha-value>)',
          900: 'rgb(var(--g-900) / <alpha-value>)',
          950: 'rgb(var(--g-950) / <alpha-value>)',
        },
        slate: {
          50: 'rgb(var(--s-50) / <alpha-value>)',
          100: 'rgb(var(--s-100) / <alpha-value>)',
          200: 'rgb(var(--s-200) / <alpha-value>)',
          300: 'rgb(var(--s-300) / <alpha-value>)',
          400: 'rgb(var(--s-400) / <alpha-value>)',
          500: 'rgb(var(--s-500) / <alpha-value>)',
          600: 'rgb(var(--s-600) / <alpha-value>)',
          700: 'rgb(var(--s-700) / <alpha-value>)',
          800: 'rgb(var(--s-800) / <alpha-value>)',
          900: 'rgb(var(--s-900) / <alpha-value>)',
          950: 'rgb(var(--s-950) / <alpha-value>)',
        },
        blue: {
          50: 'rgb(var(--a-50) / <alpha-value>)',
          100: 'rgb(var(--a-100) / <alpha-value>)',
          200: 'rgb(var(--a-200) / <alpha-value>)',
          300: 'rgb(var(--a-300) / <alpha-value>)',
          400: 'rgb(var(--a-400) / <alpha-value>)',
          500: 'rgb(var(--a-500) / <alpha-value>)',
          600: 'rgb(var(--a-600) / <alpha-value>)',
          700: 'rgb(var(--a-700) / <alpha-value>)',
          800: 'rgb(var(--a-800) / <alpha-value>)',
          900: 'rgb(var(--a-900) / <alpha-value>)',
          950: 'rgb(var(--a-950) / <alpha-value>)',
        },
        white: 'rgb(var(--fg-white) / <alpha-value>)',

        // ── Semantic roles ───────────────────────────────────────────────
        // What NEW code should reference: a role, never a ramp step or a hex.
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        sunken: 'rgb(var(--c-sunken) / <alpha-value>)',
        hairline: 'rgb(var(--c-hairline) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--c-ink-muted) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-fill': 'rgb(var(--c-accent-fill) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'control-border': 'rgb(var(--c-control-border) / <alpha-value>)',
        'control-off': 'rgb(var(--c-control-off) / <alpha-value>)',
        'warn-surface': 'rgb(var(--c-warn-surface) / <alpha-value>)',
        'warn-border': 'rgb(var(--c-warn-border) / <alpha-value>)',

        // ── shadcn/ui semantic variables ─────────────────────────────────
        // Derived from the roles above (app/globals.css maps --background etc.
        // onto --c-* channels), so the tokens stay the single source of truth.
        // NOTE: shadcn's own `accent` (hover highlight) is NOT mapped — `accent`
        // above is the brand accent. Vendored components in components/ui use
        // bg-control-off / text-ink for that role instead. After any
        // `shadcn add <x> --overwrite`, repair with:
        //   sed -i '' -E "s/text-accent-foreground/text-ink/g; s/bg-accent/bg-control-off/g" components/ui/*.tsx
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',

        // Deliberately dark surfaces (terminal chrome, immersive rooms), named
        // so no component needs an arbitrary hex.
        room: {
          bg: 'rgb(var(--room-bg) / <alpha-value>)',
          raised: 'rgb(var(--room-raised) / <alpha-value>)',
          deep: 'rgb(var(--room-deep) / <alpha-value>)',
        },
        // Terminal surfaces follow the theme tokens (see lib/terminal-theme.ts)
        terminal: {
          bg: 'rgb(var(--c-sunken) / <alpha-value>)',
          fg: 'rgb(var(--c-ink) / <alpha-value>)',
          selection: 'rgb(var(--c-accent-fill) / <alpha-value>)',
          cursor: 'rgb(var(--c-ink) / <alpha-value>)',
        },
        sidebar: {
          bg: '#252526',
          hover: '#2a2d2e',
          active: '#37373d',
          border: '#3e3e42',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['var(--font-mono)', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [animate],
}
export default config
```

## `app/globals.css`

```css
@import '@xterm/xterm/css/xterm.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ══ DESIGN SYSTEM ═══════════════════════════════════════════════════════════
   Colour lives here and nowhere else. Components reference a semantic role
   (bg-surface, text-ink, border-hairline) or a themed ramp step (bg-gray-800) —
   never a hex literal.

   ADDING A THEME is one block of variables; no component edits, no sweeps. Put
   the class on the app shell to switch. Worked example, complete and usable:

     .theme-paper {
       --g-900: 255 255 255; --g-800: 243 244 246; --g-700: 229 231 235;
       --g-400: 107 114 128; --g-300: 55 65 81;    --g-100: 17 24 39;
       --fg-white: 17 24 39;
       --c-surface: 255 255 255; --c-raised: 249 250 251;
       --c-hairline: 229 231 235; --c-ink: 17 24 39; --c-ink-muted: 107 114 128;
     }

   THE ONE TRAP: `text-white` does not mean white in this codebase — it means
   "foreground", in roughly 278 places. A theme that inverts the ground without
   setting --fg-white makes its own text invisible. That mistake cost an
   afternoon; it is why --fg-white exists.

   The DEFAULT theme below reproduces stock Tailwind exactly, so this layer
   changed nothing visually when it was introduced.
   ═══════════════════════════════════════════════════════════════════════════ */
:root {
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;

  /* Neutrals — stock Tailwind gray */
  --g-50: 249 250 251;  --g-100: 243 244 246; --g-200: 229 231 235;
  --g-300: 209 213 219; --g-400: 156 163 175; --g-500: 107 114 128;
  --g-600: 75 85 99;    --g-700: 55 65 81;    --g-800: 31 41 55;
  --g-900: 17 24 39;    --g-950: 3 7 18;

  /* Neutrals — stock Tailwind slate */
  --s-50: 248 250 252;  --s-100: 241 245 249; --s-200: 226 232 240;
  --s-300: 203 213 225; --s-400: 148 163 184; --s-500: 100 116 139;
  --s-600: 71 85 105;   --s-700: 51 65 85;    --s-800: 30 41 59;
  --s-900: 15 23 42;    --s-950: 2 6 23;

  /* Accent — stock Tailwind blue */
  --a-50: 239 246 255;  --a-100: 219 234 254; --a-200: 191 219 254;
  --a-300: 147 197 253; --a-400: 96 165 250;  --a-500: 59 130 246;
  --a-600: 37 99 235;   --a-700: 29 78 216;   --a-800: 30 64 175;
  --a-900: 30 58 138;   --a-950: 23 37 84;

  /* Foreground. See THE ONE TRAP above. */
  --fg-white: 255 255 255;

  /* Semantic roles */
  --c-surface: 17 24 39;   --c-raised: 31 41 55;  --c-sunken: 3 7 18;
  --c-hairline: 55 65 81;  --c-ink: 243 244 246;  --c-ink-muted: 156 163 175;
  --c-accent: 96 165 250;  --c-accent-fill: 37 99 235;
  --c-ok: 34 197 94;       --c-warn: 245 158 11;  --c-danger: 239 68 68;
  --c-control-border: 75 85 99; --c-control-off: 55 65 81;
  --c-warn-surface: 69 26 3;    --c-warn-border: 120 53 15;

  /* Deliberately dark surfaces */
  --room-bg: 26 27 38;     --room-raised: 33 30 25;  --room-deep: 10 10 10;

  /* Category identity — the agent board's group colours, one source of truth.
     Values are the originals, moved out of component code. */
  --cat-0-primary: 59 130 246;
  --cat-0-icon: 96 165 250;
  --cat-0-text: 147 197 253;
  --cat-1-primary: 168 85 247;
  --cat-1-icon: 192 132 252;
  --cat-1-text: 216 180 254;
  --cat-2-primary: 34 197 94;
  --cat-2-icon: 74 222 128;
  --cat-2-text: 134 239 172;
  --cat-3-primary: 234 179 8;
  --cat-3-icon: 250 204 21;
  --cat-3-text: 253 224 71;
  --cat-4-primary: 236 72 153;
  --cat-4-icon: 244 114 182;
  --cat-4-text: 251 207 232;
  --cat-5-primary: 20 184 166;
  --cat-5-icon: 45 212 191;
  --cat-5-text: 94 234 212;
  --cat-6-primary: 249 115 22;
  --cat-6-icon: 251 146 60;
  --cat-6-text: 253 186 116;
  --cat-7-primary: 239 68 68;
  --cat-7-icon: 248 113 113;
  --cat-7-text: 252 165 165;
}

/* ══ INK THEME ═══════════════════════════════════════════════════════════════
   Flat near-black, T3-style. Spec: docs/superpowers/specs/2026-10-03-command-
   center-redesign-design.md. Accent is only for toggles-on, Send, focus,
   unread badges and "working". */
.theme-ink {
  --font-sans: 'Stack Sans Text', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif;

  /* Neutrals: 900 = page, 800 = selected, 700 = border, 500 = dim, 400 = muted */
  --g-50: 246 246 248;  --g-100: 236 236 239; --g-200: 220 220 224;
  --g-300: 196 196 202; --g-400: 133 133 141; --g-500: 94 94 102;
  --g-600: 58 58 64;    --g-700: 31 31 35;    --g-800: 28 28 32;
  --g-900: 10 10 11;    --g-950: 7 7 8;

  --s-50: 246 246 248;  --s-100: 236 236 239; --s-200: 220 220 224;
  --s-300: 196 196 202; --s-400: 133 133 141; --s-500: 94 94 102;
  --s-600: 58 58 64;    --s-700: 31 31 35;    --s-800: 28 28 32;
  --s-900: 10 10 11;    --s-950: 7 7 8;

  /* Accent ramp around #2f4bff (500) / brand #2236ff (600) */
  --a-50: 238 241 255;  --a-100: 222 227 255; --a-200: 191 200 255;
  --a-300: 154 166 255; --a-400: 108 126 255; --a-500: 47 75 255;
  --a-600: 34 54 255;   --a-700: 26 42 214;   --a-800: 22 35 170;
  --a-900: 20 30 130;   --a-950: 13 18 80;

  --fg-white: 236 236 239;

  --c-surface: 15 15 17;   --c-raised: 28 28 32;   --c-sunken: 10 10 11;
  --c-hairline: 31 31 35;  --c-ink: 236 236 239;   --c-ink-muted: 133 133 141;
  --c-accent: 154 166 255; --c-accent-fill: 47 75 255;
  --c-warn: 214 162 67;
  /* Controls: outline-button/input border, toggle-off track; needs-you card */
  --c-control-border: 42 42 47; --c-control-off: 38 38 43;
  --c-warn-surface: 22 19 13;   --c-warn-border: 42 35 20;
}

/* ══ SHADCN/UI BRIDGE ════════════════════════════════════════════════════════
   shadcn's variables are DERIVED from the semantic channels above (one source
   of truth). Each holds an RGB channel triple, consumed in tailwind.config.ts
   as rgb(var(--x) / <alpha-value>). Declared on `:root, .theme-ink` so a theme
   class re-resolves them against its own --c-* values (var() substitutes at the
   element that declares it, so a :root-only copy would never follow a theme).
   shadcn's `accent`/`accent-foreground` are deliberately absent: `accent` is
   already the brand accent here. */
:root,
.theme-ink {
  --background: var(--c-surface);
  --foreground: var(--c-ink);
  --card: var(--c-raised);
  --card-foreground: var(--c-ink);
  --popover: var(--c-raised);
  --popover-foreground: var(--c-ink);
  /* Primary = the solid brand fill with white text (~5:1). The light --c-accent is
     a text/focus tint, too pale to carry a filled button. White is literal, not
     --fg-white, so it stays white on the blue fill under any theme. */
  --primary: var(--c-accent-fill);
  --primary-foreground: 255 255 255;
  --secondary: var(--c-control-off);
  --secondary-foreground: var(--c-ink);
  --muted: var(--c-sunken);
  --muted-foreground: var(--c-ink-muted);
  --border: var(--c-hairline);
  --input: var(--c-control-border);
  --ring: var(--c-accent);
  --destructive: var(--c-danger);
  --destructive-foreground: var(--fg-white);
  --radius: 0.5rem;
}

html {
  /* Prevent ALL scroll navigation gestures at root level */
  overscroll-behavior: none;
}

body {
  @apply bg-gray-900 text-gray-100;
  /* Prevent ALL overscroll behaviors - no pull-to-refresh, no swipe navigation */
  overscroll-behavior: none;
  overscroll-behavior-x: none;
  overscroll-behavior-y: none;
}

/* Mobile-specific improvements */
@media (max-width: 768px) {
  /* Ensure full height on mobile */
  html, body {
    height: 100%;
    overflow: hidden;
  }

  /* Better tap targets on mobile */
  button, a {
    min-height: 44px;
    min-width: 44px;
  }
}

/* Custom scrollbar for terminal and sidebar */
.custom-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #4e4e4e;
}

/* xterm.js container styles */
.xterm {
  height: 100%;
  width: 100%;
  /* FitAddon subtracts this padding when sizing columns */
  padding: 12px 14px;
  /* Prevent browser native text selection on ALL terminal DOM elements.
     xterm.js selection is canvas-based and works independently of user-select.
     Without this, during the first mount (uncached module imports), the browser
     can paint the terminal DOM before WebGL loads, allowing native selection
     (yellow highlights) on viewport/accessibility elements during the gap. */
  user-select: none !important;
  -webkit-user-select: none !important;
}

/* Mobile: reduce padding for more screen space */
@media (max-width: 768px) {
  .xterm {
    padding: 8px 10px;
  }
}

.xterm .xterm-viewport {
  overflow-y: scroll !important;
  /* Same surface as the terminal; xterm paints it inline, this keeps the CSS in step */
  background-color: rgb(var(--c-sunken)) !important;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

/* Quiet scrollbar: no track, thin thumb that appears while hovering the terminal */
.xterm:hover .xterm-viewport {
  scrollbar-color: rgb(var(--g-600) / 0.7) transparent;
}

.xterm .xterm-viewport::-webkit-scrollbar {
  width: 6px;
}

.xterm .xterm-viewport::-webkit-scrollbar-track {
  background: transparent;
}

.xterm .xterm-viewport::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
}

.xterm:hover .xterm-viewport::-webkit-scrollbar-thumb {
  background: rgb(var(--g-600) / 0.7);
}

.xterm .xterm-viewport::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--g-500));
}

/* xterm.js selection styling */
.xterm-screen {
  cursor: text;
}

/* Neutralize xterm accessibility tree to prevent browser native text selection (yellow highlights).
   Using pointer-events:none + opacity:0 instead of display:none so xterm.js's internal DOM
   structure remains intact. display:none causes xterm.js to lose track of its elements and
   breaks the canvas-based selection system on subsequent writes. */
.xterm .xterm-accessibility,
.xterm .xterm-accessibility-tree {
  pointer-events: none !important;
  opacity: 0 !important;
  position: absolute !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  height: 1px !important;
  width: 1px !important;
  margin: -1px !important;
  padding: 0 !important;
  border: 0 !important;
  white-space: nowrap !important;
}

/* Prevent text selection on UI elements */
.no-select {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Help panel animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}

/* Thin scrollbar for panels */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #4b5563;
}

/* ── Living avatars (components/LiveAvatar.tsx) ─────────────────────────────
   A still portrait kept alive while it has no video loop: a slow breath when
   idle, a quicker one while working, still and dimmed when asleep. */
@keyframes live-avatar-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.035); } }
@keyframes live-avatar-work { 0%, 100% { transform: scale(1) translateY(0); } 50% { transform: scale(1.03) translateY(1.5%); } }
@keyframes live-avatar-ring { 0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.35); } 50% { box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); } }
@keyframes live-avatar-ring-orange { 0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.45); } 50% { box-shadow: 0 0 0 5px rgba(249, 115, 22, 0); } }
@keyframes live-avatar-in { from { opacity: 0; } to { opacity: 1; } }
.live-avatar-breathe { animation: live-avatar-breathe 5s ease-in-out infinite; transform-origin: 50% 70%; }
.live-avatar-work { animation: live-avatar-work 1.8s ease-in-out infinite; transform-origin: 50% 70%; }
.live-avatar-sleep { filter: grayscale(0.7) brightness(0.8); animation: live-avatar-breathe 7s ease-in-out infinite; transform-origin: 50% 70%; }
.live-avatar-ring-pulse { animation: live-avatar-ring 1.8s ease-out infinite; }
.live-avatar-ring-pulse-orange { animation: live-avatar-ring-orange 1.4s ease-out infinite; }
.live-avatar-fade { animation: live-avatar-in 0.4s ease-out; }
@media (prefers-reduced-motion: reduce) {
  .live-avatar-breathe, .live-avatar-work, .live-avatar-sleep, .live-avatar-ring-pulse, .live-avatar-ring-pulse-orange { animation: none; }
}

/* While a ResizeHandle is dragged: no text selection, and terminals/iframes
   must not swallow pointer events (the drag would stall over them). */
.is-resizing, .is-resizing * { user-select: none !important; }
.is-resizing iframe, .is-resizing .xterm { pointer-events: none; }
```

## `app/layout.tsx` (font wiring)

See layouts.md. JetBrains Mono → `--font-mono` (next/font); Stack Sans Text → Google Fonts link, applied through `.theme-ink { --font-sans }`. There is no ThemeProvider; the theme is the `theme-ink` class on `<body>`.

## `components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```
