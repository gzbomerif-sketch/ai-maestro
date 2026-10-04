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
      boxShadow: {
        window: '0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.45)',
        'window-titlebar': 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [animate],
}
export default config
