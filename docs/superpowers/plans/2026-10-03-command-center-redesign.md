# Command Center Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AI Maestro desktop dashboard shell with a flat near-black "command center" (status-grouped sidebar, breadcrumb top bar, underline tabs, inbox panel, Home, ⌘K). Keep every existing panel working, and keep the classic layout one switch away.

**Architecture:**
- Pure logic goes in `lib/` and is unit-tested with Vitest: status grouping, ages, command ranking, safe preferences and unread merging.
- New presentational components go in `components/shell/`. They read only from props and the existing hooks.
- `app/page.tsx` keeps all state and handlers. Its desktop branch renders `AppShell` or the untouched classic JSX, depending on a stored preference. The shared tab-content block is extracted once into `AgentTabContent` so both layouts use it.

**Tech Stack:** Next.js 14 (app router), React 18, TypeScript, Tailwind 3 with the repo's CSS-variable colour ramps, `lucide-react`, Vitest (node environment), Yarn.

**Spec:** `docs/superpowers/specs/2026-10-03-command-center-redesign-design.md`

## Global Constraints

- Work only on branch `redesign/command-center` in `/Users/obre/Downloads/ai-maestro`. Never commit to `main`.
- Package manager: `yarn` (a `yarn.lock` exists). Never use npm or pnpm here.
- No API or server changes. Reuse `useAgents`, `useSessionActivity`, the existing hibernate, wake and messages endpoints.
- **Colours:**
  - Colour lives only in `app/globals.css` variables.
  - Components use Tailwind role or ramp classes, never hex literals.
  - The theme must set `--fg-white`.
- **Palette (verbatim):**

  | Role | Value |
  |---|---|
  | Page | `#0a0a0b` |
  | Sidebar/card | `#0f0f11` |
  | Selected/hover | `#1c1c20` |
  | Border | `#1f1f23` |
  | Divider | `#1a1a1d` |
  | Text | `#ececef` |
  | Muted | `#85858d` |
  | Dim | `#5e5e66` |
  | Accent | `#2f4bff` |
  | Needs-you | `#d6a243`, card bg `#16130d`, border `#2a2314` |

- **Accent use:** only for toggles that are on, Send, focus rings, unread badges and "working".
- **Fonts:**
  - Stack Sans Text, loaded via a Google Fonts `<link>`, weights 400 and 500 only.
  - JetBrains Mono for code, paths and the terminal.
- **Type scale:**

  | Use | Size |
  |---|---|
  | Breadcrumb | 16px |
  | Body, titles, nav | 15px |
  | Descriptions | 14px |
  | Meta | 12px |
  | Mono | 13px |

- **Radius:** cards 14px; inputs, buttons and nav items 10px. No shadows.
- **Rows:** 16px vertical × 22px horizontal padding.
- **Focus:** a 2px accent outline.
- **Icons:** `lucide-react`, 16px, `strokeWidth={1.5}`.
- **localStorage:**
  - Every access goes through `lib/safe-storage.ts`.
  - Keys: `aimaestro-shell` (`'command-center'` | `'classic'`, default `'command-center'`), `aimaestro-inbox-collapsed`, `aimaestro-sidebar-mode` (`'status'` | `'project'`).
  - Existing keys: `sidebar-width`, `aimaestro-active-tab`.
- **Scope:** desktop only. `MobileDashboard`, `TabletDashboard` and `AgentList` must not change.
- **Done means:** `yarn lint`, `yarn test` and `yarn build` all pass, with their output pasted.

## Review Focus

1. **An online agent with no activity entry** (the `/status` socket hasn't reported yet) must land in **Idle**, never crash or vanish. Covered by the `groupByStatus` test "online with no activity is idle" in Task 2.
2. **Bad or future timestamps.** `formatAge` gets `undefined`, an invalid string, or a time slightly in the future because of clock skew between hosts. Expect `''` for missing or invalid input and `'now'` for future times. Covered by the boundary tests in Task 2.
3. **localStorage unavailable or throwing** (private mode, blocked storage). The shell must render with defaults, and corrupt values must fall back. Covered by the `readPref`/`writePref` tests with a throwing stub in Task 3.
4. **⌘K while typing in the Search tab, the chat box or the terminal.** The palette must not steal ⌘K from `AgentSearch` (`[data-agent-search]`), but must open from the chat textarea and the body. Covered by the `shouldOpenPalette` tests in Task 4.
5. **One remote host unreachable.** Its unread fetches reject, but the other agents' counts still update and the failed agent keeps its last known count. Covered by the `mergeUnreadCounts` tests in Task 5.

---

## File map

| File | Responsibility |
|---|---|
| `app/globals.css` (modify) | Add the `.theme-ink` variable block |
| `app/layout.tsx` (modify) | Font `<link>`; `theme-ink` on `<body>`; drop Archivo |
| `lib/agent-status.ts` (create) | `isOnline`, `isHibernated`, `displayName`, `formatAge`, `groupByStatus` |
| `lib/safe-storage.ts` (create) | `readPref`, `writePref` (try/catch around localStorage) |
| `lib/command-palette.ts` (create) | `CommandItem`, `rankCommandResults`, `shouldOpenPalette` |
| `hooks/useUnreadCounts.ts` (create) | Poll unread counts for all agents; `mergeUnreadCounts` pure helper |
| `components/shell/ui.tsx` (create) | Primitives: `Button`, `IconButton`, `Badge`, `StatusDot`, `Card`, `Row`, `Toggle`, `SectionLabel` |
| `components/shell/AgentTabContent.tsx` (create) | Tab-content block moved out of `page.tsx`, shared by both layouts |
| `components/shell/StatusSidebar.tsx` (create) | Sidebar: search row, Home, Needs-you, groups, mode switch, footer |
| `components/shell/ProjectTree.tsx` (create) | Tag tree for project mode |
| `components/shell/AgentTopBar.tsx` (create) | Breadcrumb, status line, Sleep/Wake, Pop-out, ⋯ menu |
| `components/shell/TabBar.tsx` (create) | Underline tabs plus a More menu |
| `components/shell/InboxPanel.tsx` (create) | Right column wrapping `MessageCenter` |
| `components/shell/HomeScreen.tsx` (create) | Needs-you card and agent tiles, or the empty state |
| `components/shell/CommandPalette.tsx` (create) | ⌘K overlay |
| `components/shell/AppShell.tsx` (create) | Frame composing the pieces above |
| `components/ChatView.tsx` (modify) | `hideHeader` and `variant` props; ink classes |
| `components/StreamingChatView.tsx` (modify) | `hideHeader` prop |
| `components/Header.tsx` (modify) | Optional "Try new layout" button |
| `app/page.tsx` (modify) | Use `AgentTabContent`; choose `AppShell` or classic; hibernate handler; shell pref |
| `tests/theme-ink.test.ts`, `tests/agent-status.test.ts`, `tests/safe-storage.test.ts`, `tests/command-palette.test.ts`, `tests/unread-counts.test.ts` (create) | Unit tests |

---

### Task 1: Ink theme and fonts

**Files:**
- Modify: `app/globals.css` (append after the `:root { … }` block, which ends at line 90)
- Modify: `app/layout.tsx` (Archivo import lines 2 and 9-14; `<html>`/`<body>` around line 48)
- Test: `tests/theme-ink.test.ts`

**Interfaces:**
- Produces: CSS class `theme-ink` on `<body>`. Tailwind classes now resolve to ink values: `bg-surface` `#0f0f11`, `bg-raised` `#1c1c20`, `bg-sunken` `#0a0a0b`, `border-hairline` `#1f1f23`, `text-ink` `#ececef`, `text-ink-muted` `#85858d`, `text-gray-500` `#5e5e66` (dim), `bg-accent-fill` `#2f4bff`, `text-accent` `#9aa6ff`, `text-warn`/`bg-warn` `#d6a243`.

- [ ] **Step 1: Write the failing test**

Create `tests/theme-ink.test.ts`:

```ts
/**
 * The ink theme must define every channel variable the app reads; a theme that
 * forgets --fg-white blanks ~278 `text-white` usages (see globals.css "ONE TRAP").
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const css = readFileSync(path.join(__dirname, '..', 'app', 'globals.css'), 'utf8')

function themeBlock(name: string): string {
  const start = css.indexOf(`.${name} {`)
  if (start === -1) return ''
  return css.slice(start, css.indexOf('}', start))
}

describe('.theme-ink', () => {
  const block = themeBlock('theme-ink')

  it('exists', () => {
    expect(block).not.toBe('')
  })

  it('defines every ramp step, the foreground and the semantic roles', () => {
    const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
    const required = [
      ...steps.map(s => `--g-${s}:`),
      ...steps.map(s => `--s-${s}:`),
      ...steps.map(s => `--a-${s}:`),
      '--fg-white:',
      '--c-surface:', '--c-raised:', '--c-sunken:', '--c-hairline:',
      '--c-ink:', '--c-ink-muted:', '--c-accent:', '--c-accent-fill:', '--c-warn:',
      '--font-sans:',
    ]
    for (const v of required) expect(block, v).toContain(v)
  })

  it('uses the spec palette', () => {
    expect(block).toContain('--c-sunken: 10 10 11')    // #0a0a0b
    expect(block).toContain('--c-surface: 15 15 17')   // #0f0f11
    expect(block).toContain('--c-raised: 28 28 32')    // #1c1c20
    expect(block).toContain('--c-hairline: 31 31 35')  // #1f1f23
    expect(block).toContain('--c-accent-fill: 47 75 255') // #2f4bff
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/obre/Downloads/ai-maestro && yarn vitest run tests/theme-ink.test.ts`
Expected: FAIL. The `exists` test fails with `expected '' not to be ''`.

- [ ] **Step 3: Add the theme block**

Append to `app/globals.css`, directly after the closing `}` of `:root` (line 90):

```css
/* ══ INK THEME ═══════════════════════════════════════════════════════════════
   Flat near-black, T3-style. Spec: docs/superpowers/specs/2026-10-03-…
   Accent is only for toggles-on, Send, focus, unread badges and "working". */
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
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn vitest run tests/theme-ink.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Load the font and apply the theme**

In `app/layout.tsx`:
- Change line 2 to `import { JetBrains_Mono } from 'next/font/google'`.
- Delete the Archivo comment and the `const sans = Archivo({...})` block (lines 7-14).
- Replace the returned JSX with:

```tsx
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Stack+Sans+Text:wght@400;500&display=swap"
        />
      </head>
      <body className={`theme-ink ${mono.variable} font-sans`}><ClientDiagnostics /><Providers>{children}</Providers></body>
    </html>
  )
```

- [ ] **Step 6: Build and look**

Run: `yarn build 2>&1 | tail -15`
Expected: `✓ Compiled successfully`, with no type errors.

If `yarn dev` is running on :23000, reload it. The page background should be near-black `#0a0a0b`, the text Stack Sans, and the blue buttons `#2f4bff`.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/layout.tsx tests/theme-ink.test.ts
git commit -m "feat(theme): add ink theme and Stack Sans Text"
```

---

### Task 2: Agent status logic

**Files:**
- Create: `lib/agent-status.ts`
- Test: `tests/agent-status.test.ts`

**Interfaces:**
- Consumes: `Agent` from `@/types/agent`. It has `id`, `name`, `label?`, `alias?`, `tags?`, `hostId`, `session?: { status: 'online' | 'offline'; lastActivity?: string }` and `sessions: { status: 'online' | 'offline'; lastActive?: string }[]`. Also `SessionActivityInfo` from `@/hooks/useSessionActivity` (`{ status: 'active' | 'idle' | 'waiting'; lastActivity: string }`).
- Produces:
  - `isOnline(agent: Agent): boolean`
  - `isHibernated(agent: Agent): boolean`
  - `displayName(agent: Agent): string`
  - `formatAge(iso: string | undefined | null, now: number): string`
  - `type ShellStatus = 'needs-you' | 'working' | 'idle' | 'asleep' | 'offline'`
  - `interface StatusEntry { agent: Agent; status: ShellStatus; since?: string }`
  - `interface StatusGroups { needsYou: StatusEntry[]; working: StatusEntry[]; idle: StatusEntry[]; asleep: StatusEntry[] }`
  - `groupByStatus(agents: Agent[], activityOf: (agent: Agent) => SessionActivityInfo | null): StatusGroups`

- [ ] **Step 1: Write the failing tests**

Create `tests/agent-status.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isOnline, isHibernated, displayName, formatAge, groupByStatus } from '@/lib/agent-status'

const NOW = Date.parse('2026-10-03T12:00:00Z')
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR

function agent(over: Record<string, unknown> = {}): any {
  return { id: 'a', name: 'a', hostId: 'local', sessions: [], ...over }
}
const online = (over = {}) => agent({ session: { status: 'online' }, sessions: [{ index: 0, status: 'online' }], ...over })

describe('isOnline / isHibernated', () => {
  it('is online when either the live session or the first session is online', () => {
    expect(isOnline(agent({ session: { status: 'online' } }))).toBe(true)
    expect(isOnline(agent({ sessions: [{ index: 0, status: 'online' }] }))).toBe(true)
    expect(isOnline(agent())).toBe(false)
  })
  it('is hibernated when offline but has sessions', () => {
    expect(isHibernated(agent({ sessions: [{ index: 0, status: 'offline' }] }))).toBe(true)
    expect(isHibernated(agent())).toBe(false)
    expect(isHibernated(online())).toBe(false)
  })
})

describe('displayName', () => {
  it('prefers label, then name, then alias, then id', () => {
    expect(displayName(agent({ label: 'L', name: 'n' }))).toBe('L')
    expect(displayName(agent({ name: 'n' }))).toBe('n')
    expect(displayName(agent({ name: '', alias: 'al' }))).toBe('al')
    expect(displayName(agent({ name: '', id: 'x1' }))).toBe('x1')
  })
})

describe('formatAge', () => {
  it('formats boundaries', () => {
    expect(formatAge(ago(30_000), NOW)).toBe('now')
    expect(formatAge(ago(MIN), NOW)).toBe('1m')
    expect(formatAge(ago(59 * MIN), NOW)).toBe('59m')
    expect(formatAge(ago(HOUR), NOW)).toBe('1h')
    expect(formatAge(ago(23 * HOUR), NOW)).toBe('23h')
    expect(formatAge(ago(DAY), NOW)).toBe('1d')
    expect(formatAge(ago(6 * DAY), NOW)).toBe('6d')
    expect(formatAge(ago(7 * DAY), NOW)).toBe('1w')
    expect(formatAge(ago(30 * DAY), NOW)).toBe('4w')
  })
  it('returns empty for missing or invalid input and now for future times', () => {
    expect(formatAge(undefined, NOW)).toBe('')
    expect(formatAge(null, NOW)).toBe('')
    expect(formatAge('not-a-date', NOW)).toBe('')
    expect(formatAge(new Date(NOW + 5 * MIN).toISOString(), NOW)).toBe('now')
  })
})

describe('groupByStatus', () => {
  const act = (map: Record<string, { status: 'active' | 'idle' | 'waiting'; lastActivity: string }>) =>
    (a: any) => map[a.id] ?? null

  it('maps each state to its group', () => {
    const agents = [
      online({ id: 'w', name: 'w' }),
      online({ id: 'k', name: 'k' }),
      online({ id: 'i', name: 'i' }),
      agent({ id: 'h', name: 'h', sessions: [{ index: 0, status: 'offline', lastActive: ago(2 * DAY) }] }),
      agent({ id: 'o', name: 'o' }),
    ]
    const g = groupByStatus(agents, act({
      w: { status: 'waiting', lastActivity: ago(6 * MIN) },
      k: { status: 'active', lastActivity: ago(MIN) },
      i: { status: 'idle', lastActivity: ago(20 * MIN) },
    }))
    expect(g.needsYou.map(e => [e.agent.id, e.status])).toEqual([['w', 'needs-you']])
    expect(g.working.map(e => [e.agent.id, e.status])).toEqual([['k', 'working']])
    expect(g.idle.map(e => [e.agent.id, e.status])).toEqual([['i', 'idle']])
    expect(g.asleep.map(e => [e.agent.id, e.status])).toEqual([['h', 'asleep'], ['o', 'offline']])
    expect(g.needsYou[0].since).toBe(ago(6 * MIN))
    expect(g.asleep[0].since).toBe(ago(2 * DAY))
  })

  it('online with no activity is idle', () => {
    const g = groupByStatus([online({ id: 'x', name: 'x' })], () => null)
    expect(g.idle.map(e => e.agent.id)).toEqual(['x'])
  })

  it('ignores activity for offline agents', () => {
    const g = groupByStatus(
      [agent({ id: 'h', sessions: [{ index: 0, status: 'offline' }] })],
      () => ({ status: 'active', lastActivity: ago(MIN) }),
    )
    expect(g.working).toEqual([])
    expect(g.asleep.map(e => e.agent.id)).toEqual(['h'])
  })

  it('sorts newest first, then by name; offline agents after hibernated', () => {
    const agents = [
      online({ id: 'b', name: 'beta' }),
      online({ id: 'a', name: 'alpha' }),
      online({ id: 'c', name: 'gamma' }),
    ]
    const g = groupByStatus(agents, act({
      a: { status: 'idle', lastActivity: ago(10 * MIN) },
      b: { status: 'idle', lastActivity: ago(10 * MIN) },
      c: { status: 'idle', lastActivity: ago(MIN) },
    }))
    expect(g.idle.map(e => e.agent.id)).toEqual(['c', 'a', 'b'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run tests/agent-status.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/agent-status"`.

- [ ] **Step 3: Implement**

Create `lib/agent-status.ts`:

```ts
/**
 * Status vocabulary for the command-center shell. Pure: no React, no fetch.
 * Spec §6: needs-you / working / idle / asleep (+ offline shown inside asleep).
 */
import type { Agent } from '@/types/agent'
import type { SessionActivityInfo } from '@/hooks/useSessionActivity'

export type ShellStatus = 'needs-you' | 'working' | 'idle' | 'asleep' | 'offline'

export interface StatusEntry {
  agent: Agent
  status: ShellStatus
  since?: string
}

export interface StatusGroups {
  needsYou: StatusEntry[]
  working: StatusEntry[]
  idle: StatusEntry[]
  asleep: StatusEntry[]
}

export function isOnline(agent: Agent): boolean {
  return agent.session?.status === 'online' || agent.sessions?.[0]?.status === 'online'
}

export function isHibernated(agent: Agent): boolean {
  return !isOnline(agent) && (agent.sessions?.length ?? 0) > 0
}

export function displayName(agent: Agent): string {
  return agent.label || agent.name || agent.alias || agent.id
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const WEEK = 7 * DAY

export function formatAge(iso: string | undefined | null, now: number): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const diff = now - t
  if (diff < MIN) return 'now'
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`
  return `${Math.floor(diff / WEEK)}w`
}

function lastSeen(agent: Agent): string | undefined {
  return agent.session?.lastActivity ?? agent.sessions?.[0]?.lastActive
}

function byRecency(a: StatusEntry, b: StatusEntry): number {
  const ta = a.since ? Date.parse(a.since) || 0 : 0
  const tb = b.since ? Date.parse(b.since) || 0 : 0
  if (ta !== tb) return tb - ta
  return displayName(a.agent).toLowerCase().localeCompare(displayName(b.agent).toLowerCase())
}

export function groupByStatus(
  agents: Agent[],
  activityOf: (agent: Agent) => SessionActivityInfo | null,
): StatusGroups {
  const groups: StatusGroups = { needsYou: [], working: [], idle: [], asleep: [] }
  const offline: StatusEntry[] = []

  for (const agent of agents) {
    if (!isOnline(agent)) {
      const entry: StatusEntry = { agent, status: isHibernated(agent) ? 'asleep' : 'offline', since: lastSeen(agent) }
      ;(entry.status === 'asleep' ? groups.asleep : offline).push(entry)
      continue
    }
    const activity = activityOf(agent)
    const since = activity?.lastActivity ?? lastSeen(agent)
    if (activity?.status === 'waiting') groups.needsYou.push({ agent, status: 'needs-you', since })
    else if (activity?.status === 'active') groups.working.push({ agent, status: 'working', since })
    else groups.idle.push({ agent, status: 'idle', since })
  }

  groups.needsYou.sort(byRecency)
  groups.working.sort(byRecency)
  groups.idle.sort(byRecency)
  groups.asleep.sort(byRecency)
  offline.sort(byRecency)
  groups.asleep.push(...offline)
  return groups
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run tests/agent-status.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-status.ts tests/agent-status.test.ts
git commit -m "feat(shell): add agent status grouping and age formatting"
```

---

### Task 3: Safe preferences

**Files:**
- Create: `lib/safe-storage.ts`
- Test: `tests/safe-storage.test.ts`

**Interfaces:**
- Produces:
  - `readPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T`
  - `writePref(key: string, value: string): void`
  - `readBool(key: string, fallback: boolean): boolean`
  - `SHELL_KEY = 'aimaestro-shell'`
  - `INBOX_KEY = 'aimaestro-inbox-collapsed'`
  - `SIDEBAR_MODE_KEY = 'aimaestro-sidebar-mode'`

- [ ] **Step 1: Write the failing tests**

Create `tests/safe-storage.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { readPref, writePref, readBool } from '@/lib/safe-storage'

function stubStorage(store: Record<string, string>) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('readPref', () => {
  it('returns the stored value when allowed', () => {
    stubStorage({ k: 'classic' })
    expect(readPref('k', 'command-center', ['command-center', 'classic'] as const)).toBe('classic')
  })
  it('falls back on missing or corrupt values', () => {
    stubStorage({ k: 'garbage' })
    expect(readPref('k', 'command-center', ['command-center', 'classic'] as const)).toBe('command-center')
    expect(readPref('missing', 'status', ['status', 'project'] as const)).toBe('status')
  })
  it('falls back when localStorage throws or is absent', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } })
    expect(readPref('k', 'status', ['status', 'project'] as const)).toBe('status')
    expect(() => writePref('k', 'project')).not.toThrow()
    vi.unstubAllGlobals()
    expect(readPref('k', 'status', ['status', 'project'] as const)).toBe('status')
  })
})

describe('readBool / writePref', () => {
  it('round-trips booleans', () => {
    const store: Record<string, string> = {}
    stubStorage(store)
    writePref('b', 'true')
    expect(readBool('b', false)).toBe(true)
    expect(readBool('nope', true)).toBe(true)
    store.b = 'x'
    expect(readBool('b', false)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run tests/safe-storage.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/safe-storage"`.

- [ ] **Step 3: Implement**

Create `lib/safe-storage.ts`:

```ts
/**
 * localStorage that never throws: private mode, blocked storage and SSR all fall
 * back to defaults. Used by the command-center shell for its UI preferences.
 */
export const SHELL_KEY = 'aimaestro-shell'
export const INBOX_KEY = 'aimaestro-inbox-collapsed'
export const SIDEBAR_MODE_KEY = 'aimaestro-sidebar-mode'

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const v = storage()?.getItem(key)
    return v !== null && v !== undefined && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

export function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = storage()?.getItem(key)
    if (v === null || v === undefined) return fallback
    return v === 'true'
  } catch {
    return fallback
  }
}

export function writePref(key: string, value: string): void {
  try {
    storage()?.setItem(key, value)
  } catch {
    /* storage unavailable: preference just won't persist */
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run tests/safe-storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/safe-storage.ts tests/safe-storage.test.ts
git commit -m "feat(shell): add non-throwing preference storage"
```

---

### Task 4: Command palette logic

**Files:**
- Create: `lib/command-palette.ts`
- Test: `tests/command-palette.test.ts`

**Interfaces:**
- Produces:
  - `interface CommandItem { id: string; kind: 'agent' | 'screen' | 'action'; label: string; keywords: string[]; hint?: string }`
  - `rankCommandResults(query: string, items: CommandItem[]): CommandItem[]`
  - `shouldOpenPalette(e: { key: string; metaKey: boolean; ctrlKey: boolean }, target: { closest?: (sel: string) => unknown } | null): boolean`

- [ ] **Step 1: Write the failing tests**

Create `tests/command-palette.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rankCommandResults, shouldOpenPalette, type CommandItem } from '@/lib/command-palette'

const items: CommandItem[] = [
  { id: 's:teams', kind: 'screen', label: 'Teams', keywords: [] },
  { id: 'a:web', kind: 'agent', label: 'web-app', keywords: ['frontend', 'mac-mini'] },
  { id: 'a:back', kind: 'agent', label: 'backend-api', keywords: ['api'] },
  { id: 'a:docs', kind: 'agent', label: 'docs-bot', keywords: ['writer'] },
  { id: 's:web', kind: 'screen', label: 'Web hosts', keywords: ['settings'] },
]

describe('rankCommandResults', () => {
  it('returns everything, agents first, for an empty query', () => {
    expect(rankCommandResults('  ', items).map(i => i.id)).toEqual(['a:web', 'a:back', 'a:docs', 's:teams', 's:web'])
  })
  it('ranks label prefix > word prefix > substring, agents before screens on ties', () => {
    expect(rankCommandResults('web', items).map(i => i.id)).toEqual(['a:web', 's:web'])
    expect(rankCommandResults('api', items).map(i => i.id)).toEqual(['a:back'])
    expect(rankCommandResults('ck', items).map(i => i.id)).toEqual(['a:back'])
  })
  it('matches keywords and is case-insensitive', () => {
    expect(rankCommandResults('MAC', items).map(i => i.id)).toEqual(['a:web'])
    expect(rankCommandResults('writer', items).map(i => i.id)).toEqual(['a:docs'])
  })
  it('drops non-matches', () => {
    expect(rankCommandResults('zzz', items)).toEqual([])
  })
})

describe('shouldOpenPalette', () => {
  const k = (over = {}) => ({ key: 'k', metaKey: true, ctrlKey: false, ...over })
  const el = (inSearch: boolean) => ({ closest: (sel: string) => (sel === '[data-agent-search]' && inSearch ? {} : null) })

  it('opens on Cmd+K or Ctrl+K', () => {
    expect(shouldOpenPalette(k(), null)).toBe(true)
    expect(shouldOpenPalette(k({ metaKey: false, ctrlKey: true }), null)).toBe(true)
    expect(shouldOpenPalette(k({ key: 'K' }), el(false))).toBe(true)
  })
  it('ignores other keys and plain k', () => {
    expect(shouldOpenPalette(k({ key: 'j' }), null)).toBe(false)
    expect(shouldOpenPalette(k({ metaKey: false }), null)).toBe(false)
  })
  it('leaves Cmd+K to the agent search box', () => {
    expect(shouldOpenPalette(k(), el(true))).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run tests/command-palette.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/command-palette"`.

- [ ] **Step 3: Implement**

Create `lib/command-palette.ts`:

```ts
/** ⌘K palette: search ranking and the shortcut guard. Pure. */
export interface CommandItem {
  id: string
  kind: 'agent' | 'screen' | 'action'
  label: string
  keywords: string[]
  hint?: string
}

const KIND_ORDER: Record<CommandItem['kind'], number> = { agent: 0, screen: 1, action: 2 }

function score(q: string, item: CommandItem): number {
  const label = item.label.toLowerCase()
  const words = [...label.split(/[\s\-_/.]+/), ...item.keywords.map(k => k.toLowerCase())]
  if (label.startsWith(q)) return 3
  if (words.some(w => w.startsWith(q))) return 2
  if (label.includes(q) || item.keywords.some(k => k.toLowerCase().includes(q))) return 1
  return 0
}

export function rankCommandResults(query: string, items: CommandItem[]): CommandItem[] {
  const q = query.trim().toLowerCase()
  const indexed = items.map((item, i) => ({ item, i, s: q ? score(q, item) : 1 }))
  return indexed
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind] || a.i - b.i)
    .map(x => x.item)
}

export function shouldOpenPalette(
  e: { key: string; metaKey: boolean; ctrlKey: boolean },
  target: { closest?: (sel: string) => unknown } | null,
): boolean {
  if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return false
  if (target?.closest?.('[data-agent-search]')) return false
  return true
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run tests/command-palette.test.ts`
Expected: PASS.

- [ ] **Step 5: Mark AgentSearch so the guard can see it**

In `components/AgentSearch.tsx`, find the component's outermost returned `<div` and add the attribute `data-agent-search`. That `div` is the first JSX element after `return (`. For example, `<div className="…">` becomes `<div data-agent-search className="…">`. Make no other changes.

- [ ] **Step 6: Commit**

```bash
git add lib/command-palette.ts tests/command-palette.test.ts components/AgentSearch.tsx
git commit -m "feat(shell): add command palette ranking and shortcut guard"
```

---

### Task 5: Unread counts hook

**Files:**
- Create: `hooks/useUnreadCounts.ts`
- Test: `tests/unread-counts.test.ts`

**Interfaces:**
- Consumes: `getAgentBaseUrl(agent)` from `@/lib/agent-utils`. The endpoint `GET {base}/api/messages?agent={id}&action=unread-count` returns `{ count: number }`.
- Produces:
  - `mergeUnreadCounts(prev: Record<string, number>, results: { id: string; outcome: PromiseSettledResult<number> }[]): Record<string, number>`
  - `useUnreadCounts(agents: Agent[], intervalMs?: number): Record<string, number>`

- [ ] **Step 1: Write the failing tests**

Create `tests/unread-counts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mergeUnreadCounts } from '@/hooks/useUnreadCounts'

const ok = (n: number): PromiseSettledResult<number> => ({ status: 'fulfilled', value: n })
const fail: PromiseSettledResult<number> = { status: 'rejected', reason: new Error('host down') }

describe('mergeUnreadCounts', () => {
  it('takes fresh counts', () => {
    expect(mergeUnreadCounts({}, [{ id: 'a', outcome: ok(2) }, { id: 'b', outcome: ok(0) }])).toEqual({ a: 2, b: 0 })
  })
  it('keeps the last known count when a host fails', () => {
    expect(mergeUnreadCounts({ a: 3, b: 1 }, [{ id: 'a', outcome: fail }, { id: 'b', outcome: ok(4) }])).toEqual({ a: 3, b: 4 })
  })
  it('drops agents that are no longer listed', () => {
    expect(mergeUnreadCounts({ gone: 5 }, [{ id: 'a', outcome: ok(1) }])).toEqual({ a: 1 })
  })
  it('treats a failure with no history as zero', () => {
    expect(mergeUnreadCounts({}, [{ id: 'a', outcome: fail }])).toEqual({ a: 0 })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn vitest run tests/unread-counts.test.ts`
Expected: FAIL with `Failed to resolve import "@/hooks/useUnreadCounts"`.

- [ ] **Step 3: Implement**

Create `hooks/useUnreadCounts.ts`:

```ts
'use client'

/**
 * Unread message counts for every agent, polled every 10s. One shared source for
 * the shell's sidebar dots, inbox header and Home. A failing host keeps its last
 * known counts instead of blanking them.
 */
import { useEffect, useRef, useState } from 'react'
import type { Agent } from '@/types/agent'
import { getAgentBaseUrl } from '@/lib/agent-utils'

export function mergeUnreadCounts(
  prev: Record<string, number>,
  results: { id: string; outcome: PromiseSettledResult<number> }[],
): Record<string, number> {
  const next: Record<string, number> = {}
  for (const { id, outcome } of results) {
    next[id] = outcome.status === 'fulfilled' ? outcome.value : prev[id] ?? 0
  }
  return next
}

async function fetchCount(agent: Agent): Promise<number> {
  const base = getAgentBaseUrl(agent)
  const res = await fetch(`${base}/api/messages?agent=${encodeURIComponent(agent.id)}&action=unread-count`)
  if (!res.ok) throw new Error(`unread-count ${res.status}`)
  const data = await res.json()
  return typeof data.count === 'number' ? data.count : 0
}

export function useUnreadCounts(agents: Agent[], intervalMs = 10_000): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const agentsRef = useRef(agents)
  agentsRef.current = agents
  const idsKey = agents.map(a => a.id).join(',')

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const list = agentsRef.current
      const outcomes = await Promise.allSettled(list.map(fetchCount))
      if (cancelled) return
      setCounts(prev => mergeUnreadCounts(prev, list.map((a, i) => ({ id: a.id, outcome: outcomes[i] }))))
    }
    tick()
    const t = setInterval(tick, intervalMs)
    return () => { cancelled = true; clearInterval(t) }
  }, [idsKey, intervalMs])

  return counts
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn vitest run tests/unread-counts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useUnreadCounts.ts tests/unread-counts.test.ts
git commit -m "feat(shell): add shared unread counts hook"
```

---

### Task 6: Style primitives

**Files:**
- Create: `components/shell/ui.tsx`

**Interfaces:**
- Consumes: the Tailwind role classes from Task 1.
- Produces (all named exports):
  - `Button({ children, onClick, disabled, title, variant?: 'outline' | 'accent' })`
  - `IconButton({ label, onClick, children, active? })`
  - `Badge({ children })`
  - `StatusDot({ status }: { status: ShellStatus })`
  - `SectionLabel({ children, count?, action? })`
  - `Card({ children, className? })`
  - `Row({ title, description?, control? , onClick? })`
  - `Toggle({ checked, onChange, label })`

These are presentational only, so there are no unit tests. Verification is type-checking and use in later tasks.

- [ ] **Step 1: Create the primitives**

Create `components/shell/ui.tsx`:

```tsx
'use client'

import type { ReactNode } from 'react'
import type { ShellStatus } from '@/lib/agent-status'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-0'

export function Button({ children, onClick, disabled, title, variant = 'outline' }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; title?: string; variant?: 'outline' | 'accent'
}) {
  const look = variant === 'accent'
    ? 'bg-accent-fill text-white border-transparent hover:bg-blue-600'
    : 'border-[rgb(42_42_47)] text-ink hover:bg-raised'
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center gap-2 h-[34px] px-3 rounded-[10px] border text-[14px] transition-colors disabled:opacity-50 ${look} ${focus}`}>
      {children}
    </button>
  )
}

export function IconButton({ label, onClick, children, active }: {
  label: string; onClick?: () => void; children: ReactNode; active?: boolean
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className={`grid place-items-center w-[34px] h-[34px] rounded-[10px] transition-colors ${active ? 'bg-raised text-ink' : 'text-ink-muted hover:text-ink hover:bg-raised'} ${focus}`}>
      {children}
    </button>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="min-w-[18px] px-1.5 rounded-full bg-accent-fill text-white text-[11px] leading-[18px] text-center">{children}</span>
}

const DOT: Record<ShellStatus, string> = {
  'needs-you': 'bg-warn',
  working: 'bg-accent-fill ring-[3px] ring-accent-fill/20',
  idle: 'bg-gray-600',
  asleep: 'bg-gray-700',
  offline: 'bg-gray-700',
}

export function StatusDot({ status }: { status: ShellStatus }) {
  return <span aria-hidden className={`inline-block w-[7px] h-[7px] rounded-full flex-none ${DOT[status]}`} />
}

export function SectionLabel({ children, count, action }: { children: ReactNode; count?: number; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mx-2.5 mt-[18px] mb-1.5 text-[13px] text-ink-muted">
      <span>{children}</span>
      <span className="flex-1 h-px bg-hairline/70" />
      {count !== undefined && <span className="text-[12px] text-gray-500">{count}</span>}
      {action}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface border border-hairline rounded-[14px] overflow-hidden ${className}`}>{children}</div>
}

export function Row({ title, description, control, onClick }: {
  title: ReactNode; description?: ReactNode; control?: ReactNode; onClick?: () => void
}) {
  const body = (
    <>
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-ink truncate">{title}</div>
        {description && <div className="text-[14px] text-ink-muted mt-0.5 truncate">{description}</div>}
      </div>
      {control && <div className="ml-auto flex-none">{control}</div>}
    </>
  )
  const cls = 'flex items-center gap-4 px-[22px] py-4 border-t border-hairline/70 first:border-t-0 w-full text-left'
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} hover:bg-raised/50 ${focus}`}>{body}</button>
    : <div className={cls}>{body}</div>
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors ${checked ? 'bg-accent-fill' : 'bg-[rgb(38_38_43)]'} ${focus}`}>
      <span className={`absolute top-[3px] w-4 h-4 rounded-full transition-all ${checked ? 'left-[21px] bg-white' : 'left-[3px] bg-sunken'}`} />
    </button>
  )
}
```

The two arbitrary values `rgb(42_42_47)` (outline-button border) and `rgb(38_38_43)` (toggle-off track) come from the style system. They have no ramp step, so they are allowed inline here, in this one primitives file only.

- [ ] **Step 2: Type-check**

Run: `yarn tsc --noEmit -p tsconfig.json 2>&1 | grep -E "components/shell|error" | head -20`
Expected: no errors under `components/shell/ui.tsx`. Pre-existing errors elsewhere don't count; compare against `git stash`, and if they also appear on the base commit, ignore them.

- [ ] **Step 3: Commit**

```bash
git add components/shell/ui.tsx
git commit -m "feat(shell): add ink style primitives"
```

---

### Task 7: Extract the shared tab content

**Files:**
- Create: `components/shell/AgentTabContent.tsx`
- Modify: `app/page.tsx` (tab-content block lines 961-1153; dynamic imports lines 64-91; lucide import line 26)

**Interfaces:**
- Produces:

```ts
export type AgentTab = 'terminal' | 'chat' | 'streaming' | 'messages' | 'worktree' | 'graph' | 'memory' | 'docs' | 'canvas' | 'search' | 'export' | 'playback'
export interface AgentTabContentProps {
  agent: Agent
  activeTab: AgentTab
  setActiveTab: (t: AgentTab) => void
  onlineAgents: Agent[]
  wakingAgentId: string | null
  onWake: (agent: Agent) => void
  onShowProfile: (agent: Agent) => void
  hideHeaders?: boolean   // Task 8 wires this into the panels
  chatVariant?: 'classic' | 'ink'
}
export default function AgentTabContent(props: AgentTabContentProps): JSX.Element
```

This task is a pure move: the classic layout must look and behave exactly as before.

- [ ] **Step 1: Create the component by moving code**

Create `components/shell/AgentTabContent.tsx` with this header:

```tsx
'use client'

import dynamic from 'next/dynamic'
import TerminalView from '@/components/TerminalView'
import ChatView from '@/components/ChatView'
import StreamingChatView from '@/components/StreamingChatView'
import MessageCenter from '@/components/MessageCenter'
import ErrorBoundary from '@/components/ErrorBoundary'
import WorkTree from '@/components/WorkTree'
import AgentSearch from '@/components/AgentSearch'
import TranscriptExport from '@/components/TranscriptExport'
import AgentPlayback from '@/components/AgentPlayback'
import { getRuntimeMode } from '@/lib/runtime-mode'
import { agentToSession, getAgentBaseUrl } from '@/lib/agent-utils'
import { isHibernated as isAgentHibernated } from '@/lib/agent-status'
import { Terminal, Moon, Power, Loader2, Zap } from 'lucide-react'
import type { Agent } from '@/types/agent'

const MemoryViewer = dynamic(() => import('@/components/MemoryViewer'), { ssr: false })
const AgentGraph = dynamic(() => import('@/components/AgentGraph'), { ssr: false })
const DocumentationPanel = dynamic(() => import('@/components/DocumentationPanel'), { ssr: false })
const CanvasPanel = dynamic(() => import('@/components/CanvasPanel'), { ssr: false })

export type AgentTab = 'terminal' | 'chat' | 'streaming' | 'messages' | 'worktree' | 'graph' | 'memory' | 'docs' | 'canvas' | 'search' | 'export' | 'playback'

export interface AgentTabContentProps {
  agent: Agent
  activeTab: AgentTab
  setActiveTab: (t: AgentTab) => void
  onlineAgents: Agent[]
  wakingAgentId: string | null
  onWake: (agent: Agent) => void
  onShowProfile: (agent: Agent) => void
  hideHeaders?: boolean
  chatVariant?: 'classic' | 'ink'
}

export default function AgentTabContent({
  agent, activeTab, setActiveTab, onlineAgents, wakingAgentId, onWake, onShowProfile,
  hideHeaders = false, chatVariant = 'classic',
}: AgentTabContentProps) {
  const isActive = true
  const isHibernated = isAgentHibernated(agent)
  const session = agentToSession(agent)
  const agentMode = getRuntimeMode(agent.id)
  const handleWakeAgent = onWake
  const handleShowAgentProfile = onShowProfile

  return (
    // PASTE HERE: app/page.tsx lines 962-1153 verbatim, i.e. the
    // `<div className="flex-1 flex overflow-hidden min-h-0">` element and everything
    // inside it, through its matching closing `</div>`.
  )
}
```

The `// PASTE HERE` comment marks where to move code. It is **not** a placeholder for new code: cut that exact range from `page.tsx` and paste it there, replacing the comment. The local aliases `handleWakeAgent`, `handleShowAgentProfile`, `isActive`, `session`, `isHibernated` and `agentMode` keep the moved JSX compiling unchanged.

If the pasted JSX references an icon not imported above (check for `Terminal`, `Moon`, `Power`, `Loader2`, `Zap` and any others), add it to the lucide import. Run `grep -oE "<[A-Z][A-Za-z0-9]+" components/shell/AgentTabContent.tsx | sort -u` and make sure every name is imported.

- [ ] **Step 2: Replace the block in page.tsx**

In `app/page.tsx`, where lines 961-1153 were, keep the `{/* Tab Content */}` comment and put:

```tsx
                  <AgentTabContent
                    agent={agent}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onlineAgents={onlineAgents}
                    wakingAgentId={wakingAgentId}
                    onWake={handleWakeAgent}
                    onShowProfile={handleShowAgentProfile}
                  />
```

Then:
- Add `import AgentTabContent from '@/components/shell/AgentTabContent'`.
- Delete the now-unused `MemoryViewer`, `AgentGraph`, `DocumentationPanel` and `CanvasPanel` dynamic imports.
- Delete any static imports, and any lucide icons on line 26, that the editor or `yarn lint` reports as unused. Keep everything the tab strip still uses.
- Keep the `isHibernated` and `session` declarations in the IIFE only if they are still used (lint will say).

- [ ] **Step 3: Verify that nothing changed**

Run: `yarn lint 2>&1 | tail -5 && yarn build 2>&1 | tail -8`
Expected: lint shows no new errors in `app/page.tsx` or `components/shell/`, and the build prints `✓ Compiled successfully`.

Then, in the browser at http://localhost:23000 with the classic layout (the only one so far), select an agent and click through every tab: Chat, Terminal, Messages, Worktree, Graph, Memory, Docs, Canvas, Search, Export, Playback. Each must render as before.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/shell/AgentTabContent.tsx
git commit -m "refactor: extract agent tab content for reuse by both layouts"
```

---

### Task 8: Panel options (hideHeader, ink chat)

**Files:**
- Modify: `components/ChatView.tsx` (props lines 61-64, signature line 126, `AgentHeaderBar` at line 881, bubble classes 1016-1023, input area 1373-1414)
- Modify: `components/StreamingChatView.tsx` (props line 18, signature line 59, `AgentHeaderBar` at line 283)
- Modify: `components/shell/AgentTabContent.tsx` (pass the props through)

**Interfaces:**
- Consumes: `hideHeaders` and `chatVariant` from Task 7.
- Produces:
  - `ChatView` props `hideHeader?: boolean` (default false) and `variant?: 'classic' | 'ink'` (default `'classic'`).
  - `StreamingChatView` prop `hideHeader?: boolean`.

- [ ] **Step 1: Add the props to ChatView**

In `components/ChatView.tsx`:

```tsx
interface ChatViewProps {
  agent: Agent
  isActive?: boolean  // Only connect WebSocket when active (prevents resource waste with many agents)
  hideHeader?: boolean  // Command-center shell shows its own top bar
  variant?: 'classic' | 'ink'
}
```

Change line 126 to:

```tsx
export default function ChatView({ agent, isActive = false, hideHeader = false, variant = 'classic' }: ChatViewProps) {
  const ink = variant === 'ink'
```

Wrap the `<AgentHeaderBar … />` element at line 881 as `{!hideHeader && ( <AgentHeaderBar … /> )}`, keeping its props unchanged.

- [ ] **Step 2: Ink message styling (classic unchanged)**

Replace the bubble `className` at lines 1016-1023 with:

```tsx
                  className={
                    ink
                      ? isQueued
                        ? 'rounded-2xl px-4 py-2.5 bg-warn/15 text-ink border border-warn/40'
                        : isUser
                        ? 'rounded-2xl px-4 py-2.5 bg-raised text-ink'
                        : 'px-0 py-1 text-[15px] leading-relaxed text-ink'
                      : `rounded-2xl px-4 py-3 ${
                          isQueued
                            ? 'bg-yellow-600/80 text-white border border-yellow-500'
                            : isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-200'
                        }`
                  }
```

On the line 1026 header condition, change `{!isGrouped && (` to `{!isGrouped && !ink && (`. The ink style drops the per-message "You / Agent" header row, as in the mockup.

- [ ] **Step 3: Ink composer**

Replace the input-area wrapper `div` on line 1373 and the textarea/button row (lines 1386-1410) like this, keeping the two status banners in between unchanged:
- Wrapper: `<div className={ink ? 'px-8 pb-6 pt-2 flex-shrink-0' : 'border-t border-gray-700 bg-gray-800 p-4 flex-shrink-0'}>`
- Row:

```tsx
        <div className={ink ? 'rounded-[18px] border border-[rgb(38_38_43)] bg-[rgb(17_17_19)] px-4 pt-3.5 pb-3' : 'flex items-end gap-3'}>
          <textarea
            ref={inputRef}
            data-chat-input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isOnline ? `Message ${agent.label || agent.name || agent.alias || 'agent'}${ink ? ', or attach images' : '... (Enter to send)'}` : 'Agent is offline'}
            className={ink
              ? 'w-full bg-transparent text-[15px] text-ink placeholder:text-gray-500 resize-none focus:outline-none min-h-[44px] disabled:opacity-50'
              : 'flex-1 bg-gray-900 text-gray-200 text-sm rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 disabled:opacity-50'}
            rows={1}
            style={{ maxHeight: '160px' }}
            disabled={!isOnline || isSending}
          />
          <div className={ink ? 'flex items-center gap-5 mt-1 text-[14px] text-ink-muted' : 'contents'}>
            {ink && <span className="text-[12px] text-gray-500">Enter to send · Shift+Enter for a new line</span>}
            <button
              onClick={handleSend}
              disabled={!isOnline || isSending || !input.trim()}
              aria-label="Send"
              className={ink
                ? 'ml-auto grid place-items-center w-[34px] h-[34px] rounded-full bg-accent-fill text-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent'
                : 'px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg'}
            >
              {isSending ? <Loader2 className={ink ? 'w-4 h-4 animate-spin' : 'w-5 h-5 animate-spin'} /> : <Send className={ink ? 'w-4 h-4' : 'w-5 h-5'} />}
            </button>
          </div>
        </div>

        {!ink && (
          <div className="mt-2 text-xs text-gray-500">
            Enter = Send &bull; Shift+Enter = New Line
          </div>
        )}
```

`ink` uses `rgb(38_38_43)` and `rgb(17_17_19)` from the style system's composer values (border `#26262b`, background `#111113`).

- [ ] **Step 4: StreamingChatView hideHeader**

In `components/StreamingChatView.tsx`:
- Add `hideHeader?: boolean` to `StreamingChatViewProps`.
- Change the signature to `({ agent, isActive = false, hideHeader = false }: StreamingChatViewProps)`.
- Wrap the `<AgentHeaderBar … />` at line 283 in `{!hideHeader && ( … )}`.

- [ ] **Step 5: Pass the options through AgentTabContent**

In `components/shell/AgentTabContent.tsx`, update these elements (other props stay unchanged):
- `<ChatView agent={agent} isActive={true} />` becomes `<ChatView agent={agent} isActive={true} hideHeader={hideHeaders} variant={chatVariant} />`.
- `<StreamingChatView agent={agent} isActive={true} />` becomes `<StreamingChatView agent={agent} isActive={true} hideHeader={hideHeaders} />`.
- On the `<TerminalView` element, add `hideHeader={hideHeaders}`.

- [ ] **Step 6: Verify**

Run: `yarn lint 2>&1 | tail -5 && yarn build 2>&1 | tail -8`
Expected: no new lint errors, and `✓ Compiled successfully`.

In the classic layout, Chat and Terminal must look exactly as before, because the defaults are classic.

- [ ] **Step 7: Commit**

```bash
git add components/ChatView.tsx components/StreamingChatView.tsx components/shell/AgentTabContent.tsx
git commit -m "feat(chat): add hideHeader and ink variant to chat panels"
```

---

### Task 9: Status sidebar and project tree

**Files:**
- Create: `components/shell/StatusSidebar.tsx`
- Create: `components/shell/ProjectTree.tsx`

**Interfaces:**
- Consumes:
  - `groupByStatus`, `displayName`, `formatAge` and `StatusGroups` (Task 2)
  - `readPref`, `writePref` and `SIDEBAR_MODE_KEY` (Task 3)
  - `StatusDot`, `SectionLabel`, `Badge` and `IconButton` (Task 6)
  - `SessionActivityInfo` (from `@/hooks/useSessionActivity`)
- Produces:

```ts
export interface StatusSidebarProps {
  agents: Agent[]
  groups: StatusGroups
  activeAgentId: string | null      // null = Home is selected
  unread: Record<string, number>
  now: number
  statusConnected: boolean          // useSessionActivity().connected
  error: string | null              // useAgents().error
  onRetry: () => void
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  onOpenPalette: () => void
  onNewAgent: () => void
}
export default function StatusSidebar(props: StatusSidebarProps): JSX.Element
// ProjectTree
export default function ProjectTree(props: { agents: Agent[]; groupsById: Record<string, StatusEntry>; activeAgentId: string | null; unread: Record<string, number>; onSelectAgent: (a: Agent) => void }): JSX.Element
```

- [ ] **Step 1: Create ProjectTree**

Create `components/shell/ProjectTree.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, type StatusEntry } from '@/lib/agent-status'
import { StatusDot, Badge } from './ui'

export function buildTagTree(agents: Agent[]): [string, [string, Agent[]][]][] {
  const tree = new Map<string, Map<string, Agent[]>>()
  for (const a of agents) {
    const l1 = a.tags?.[0] || 'ungrouped'
    const l2 = a.tags?.[1] || 'default'
    if (!tree.has(l1)) tree.set(l1, new Map())
    const sub = tree.get(l1)!
    if (!sub.has(l2)) sub.set(l2, [])
    sub.get(l2)!.push(a)
  }
  return [...tree.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, sub]) => [k, [...sub.entries()].sort(([a], [b]) => a.localeCompare(b))])
}

export default function ProjectTree({ agents, groupsById, activeAgentId, unread, onSelectAgent }: {
  agents: Agent[]; groupsById: Record<string, StatusEntry>; activeAgentId: string | null
  unread: Record<string, number>; onSelectAgent: (a: Agent) => void
}) {
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setClosed(c => ({ ...c, [k]: !c[k] }))
  return (
    <div className="mt-2">
      {buildTagTree(agents).map(([l1, subs]) => (
        <div key={l1}>
          <button type="button" onClick={() => toggle(l1)} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-ink-muted hover:text-ink">
            <ChevronRight strokeWidth={1.5} className={`w-3.5 h-3.5 transition-transform ${closed[l1] ? '' : 'rotate-90'}`} />{l1}
          </button>
          {!closed[l1] && subs.map(([l2, list]) => (
            <div key={l2} className="ml-4">
              {l2 !== 'default' && <div className="px-2.5 pt-1 text-[12px] text-gray-500">{l2}</div>}
              {list.map(a => (
                <button type="button" key={a.id} onClick={() => onSelectAgent(a)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] ${a.id === activeAgentId ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
                  <span className="truncate">{displayName(a)}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {unread[a.id] > 0 && <Badge>{unread[a.id]}</Badge>}
                    <StatusDot status={groupsById[a.id]?.status ?? 'offline'} />
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create StatusSidebar**

Create `components/shell/StatusSidebar.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, PanelLeft, Home, Settings, Users, Presentation, Boxes, Plus, AlertCircle } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, formatAge, type StatusEntry, type StatusGroups } from '@/lib/agent-status'
import { readPref, writePref, SIDEBAR_MODE_KEY } from '@/lib/safe-storage'
import { StatusDot, SectionLabel, Badge, IconButton } from './ui'
import ProjectTree from './ProjectTree'

export interface StatusSidebarProps {
  agents: Agent[]
  groups: StatusGroups
  activeAgentId: string | null
  unread: Record<string, number>
  now: number
  statusConnected: boolean
  error: string | null
  onRetry: () => void
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  onOpenPalette: () => void
  onNewAgent: () => void
}

const initials = (name: string) => name.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

function AgentRow({ entry, active, unread, now, onSelect }: {
  entry: StatusEntry; active: boolean; unread: number; now: number; onSelect: () => void
}) {
  const name = displayName(entry.agent)
  const right = entry.status === 'working'
    ? <StatusDot status="working" />
    : <span className="text-[12px] text-gray-500">{entry.status === 'offline' ? 'Offline' : formatAge(entry.since, now)}</span>
  return (
    <button type="button" onClick={onSelect} aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${active ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
      <span className="text-[10px] text-gray-400 bg-raised/80 rounded-[5px] px-1.5 min-w-[22px] text-center">{initials(name)}</span>
      <span className="truncate">{name}</span>
      <span className="ml-auto flex items-center gap-1.5">{unread > 0 && <Badge>{unread}</Badge>}{right}</span>
    </button>
  )
}

export default function StatusSidebar(p: StatusSidebarProps) {
  const [mode, setMode] = useState<'status' | 'project'>(() => readPref(SIDEBAR_MODE_KEY, 'status', ['status', 'project'] as const))
  const switchMode = (m: 'status' | 'project') => { setMode(m); writePref(SIDEBAR_MODE_KEY, m) }
  const byId = useMemo(() => {
    const map: Record<string, StatusEntry> = {}
    for (const e of [...p.groups.needsYou, ...p.groups.working, ...p.groups.idle, ...p.groups.asleep]) map[e.agent.id] = e
    return map
  }, [p.groups])

  const section = (label: string, list: StatusEntry[]) => list.length === 0 ? null : (
    <div key={label}>
      <SectionLabel count={list.length}>{label}</SectionLabel>
      {list.map(e => (
        <AgentRow key={e.agent.id} entry={e} active={e.agent.id === p.activeAgentId} unread={p.unread[e.agent.id] ?? 0} now={p.now} onSelect={() => p.onSelectAgent(e.agent)} />
      ))}
    </div>
  )

  return (
    <aside className="w-[268px] flex-none flex flex-col bg-surface border-r border-hairline px-3 pt-4 pb-3 min-h-0">
      <div className="flex items-center gap-3 px-2.5 pb-4 text-[15px] font-medium text-ink">
        <PanelLeft strokeWidth={1.5} className="w-4 h-4" />AI Maestro
      </div>

      <button type="button" onClick={p.onOpenPalette} className="flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] text-ink-muted hover:bg-raised/60">
        <Search strokeWidth={1.5} className="w-4 h-4" />Search<span className="ml-auto text-[12px] text-gray-500">⌘K</span>
      </button>

      {p.error && (
        <div className="mx-1 mt-2 flex items-center gap-2 rounded-[10px] border border-hairline px-3 py-2 text-[13px] text-ink-muted">
          <AlertCircle strokeWidth={1.5} className="w-4 h-4 text-warn" />Can&apos;t reach host
          <button type="button" onClick={p.onRetry} className="ml-auto text-ink hover:underline">Retry</button>
        </div>
      )}
      {!p.statusConnected && !p.error && <div className="px-2.5 pt-1 text-[12px] text-gray-500">Status may be stale</div>}

      <button type="button" onClick={p.onSelectHome} aria-current={p.activeAgentId === null ? 'page' : undefined}
        className={`mt-1 flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] ${p.activeAgentId === null ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
        <Home strokeWidth={1.5} className="w-4 h-4" />Home
      </button>

      <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
        {p.groups.needsYou.map(e => (
          <button type="button" key={e.agent.id} onClick={() => p.onSelectAgent(e.agent)}
            className="w-full text-left mt-2.5 rounded-xl border border-[rgb(42_35_20)] bg-[rgb(22_19_13)] px-3.5 py-3 hover:border-warn/60">
            <div className="flex items-center gap-2 text-[12px] text-warn"><StatusDot status="needs-you" />Needs you</div>
            <div className="mt-1 text-[15px] text-ink">Waiting for your input</div>
            <div className="text-[13px] text-ink-muted">{displayName(e.agent)} · {formatAge(e.since, p.now)}</div>
          </button>
        ))}

        <div className="flex items-center justify-end mt-3 mx-1">
          <div role="tablist" aria-label="Group agents by" className="flex rounded-full bg-raised/70 p-0.5 text-[12px]">
            {(['status', 'project'] as const).map(m => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}
                className={`px-2.5 py-0.5 rounded-full capitalize ${mode === m ? 'bg-ink text-sunken' : 'text-ink-muted'}`}>{m}</button>
            ))}
          </div>
        </div>

        {mode === 'status'
          ? <>{section('Working', p.groups.working)}{section('Idle', p.groups.idle)}{section('Asleep', p.groups.asleep)}</>
          : <ProjectTree agents={p.agents} groupsById={byId} activeAgentId={p.activeAgentId} unread={p.unread} onSelectAgent={p.onSelectAgent} />}
      </div>

      <div className="flex items-center gap-1 pt-3 border-t border-hairline">
        <Link href="/settings" aria-label="Settings" title="Settings" className="grid place-items-center w-[34px] h-[34px] rounded-[10px] text-ink-muted hover:text-ink hover:bg-raised"><Settings strokeWidth={1.5} className="w-4 h-4" /></Link>
        <Link href="/teams" aria-label="Teams" title="Teams" className="grid place-items-center w-[34px] h-[34px] rounded-[10px] text-ink-muted hover:text-ink hover:bg-raised"><Users strokeWidth={1.5} className="w-4 h-4" /></Link>
        <Link href="/team-meeting" aria-label="Meetings" title="Meetings" className="grid place-items-center w-[34px] h-[34px] rounded-[10px] text-ink-muted hover:text-ink hover:bg-raised"><Presentation strokeWidth={1.5} className="w-4 h-4" /></Link>
        <Link href="/plugin-builder" aria-label="Plugins" title="Plugins" className="grid place-items-center w-[34px] h-[34px] rounded-[10px] text-ink-muted hover:text-ink hover:bg-raised"><Boxes strokeWidth={1.5} className="w-4 h-4" /></Link>
        <span className="ml-auto"><IconButton label="New agent" onClick={p.onNewAgent}><Plus strokeWidth={1.5} className="w-4 h-4" /></IconButton></span>
      </div>
    </aside>
  )
}
```

`rgb(42_35_20)` and `rgb(22_19_13)` are the spec's needs-you border `#2a2314` and background `#16130d`.

- [ ] **Step 3: Type-check**

Run: `yarn tsc --noEmit -p tsconfig.json 2>&1 | grep components/shell | head`
Expected: no output. If any `lucide-react` icon name is missing from v0.545, replace it with the nearest existing icon: `Presentation` → `Monitor`, `Boxes` → `Package`.

- [ ] **Step 4: Commit**

```bash
git add components/shell/StatusSidebar.tsx components/shell/ProjectTree.tsx
git commit -m "feat(shell): add status-grouped sidebar with project tree mode"
```

---

### Task 10: Top bar and tab bar

**Files:**
- Create: `components/shell/AgentTopBar.tsx`
- Create: `components/shell/TabBar.tsx`

**Interfaces:**
- Consumes: `AgentTab` (Task 7); `StatusEntry`, `displayName`, `formatAge` (Task 2); `Button`, `IconButton` (Task 6).
- Produces:

```ts
// AgentTopBar
export interface AgentTopBarProps {
  agent: Agent
  entry: StatusEntry | undefined
  now: number
  busy: boolean                       // waking or sleeping in progress
  onSleep: () => void
  onWake: () => void
  onProfile: () => void
  onExport: () => void
  onToggleInbox: () => void
  inboxCollapsed: boolean
}
// TabBar
export const PRIMARY_TABS: { id: AgentTab; label: string }[]
export const MORE_TABS: { id: AgentTab; label: string }[]
export interface TabBarProps { activeTab: AgentTab; onChange: (t: AgentTab) => void; streaming: boolean }
```

- [ ] **Step 1: Create TabBar**

Create `components/shell/TabBar.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AgentTab } from './AgentTabContent'

export const PRIMARY_TABS: { id: AgentTab; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'worktree', label: 'Files' },
  { id: 'memory', label: 'Memory' },
  { id: 'graph', label: 'Code graph' },
  { id: 'docs', label: 'Docs' },
]
export const MORE_TABS: { id: AgentTab; label: string }[] = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'search', label: 'Search' },
  { id: 'export', label: 'Export' },
  { id: 'playback', label: 'Playback' },
]

export interface TabBarProps { activeTab: AgentTab; onChange: (t: AgentTab) => void; streaming: boolean }

export default function TabBar({ activeTab, onChange, streaming }: TabBarProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  // In streaming mode, the Chat tab shows the streaming view (same as classic's Streaming tab)
  const current: AgentTab = activeTab === 'streaming' || activeTab === 'messages' ? 'chat' : activeTab
  const pick = (t: AgentTab) => onChange(t === 'chat' && streaming ? 'streaming' : t)
  const moreActive = MORE_TABS.find(t => t.id === current)

  const tabCls = (on: boolean) =>
    `py-2.5 pb-3 text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${on ? 'text-ink shadow-[inset_0_-2px_0_rgb(var(--c-ink))]' : 'text-ink-muted hover:text-ink'}`

  return (
    <nav role="tablist" aria-label="Agent views" className="flex items-center gap-6 px-6 border-b border-hairline/70">
      {PRIMARY_TABS.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={current === t.id} onClick={() => pick(t.id)} className={tabCls(current === t.id)}>{t.label}</button>
      ))}
      <div ref={ref} className="relative">
        <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)} className={`${tabCls(!!moreActive)} flex items-center gap-1`}>
          {moreActive ? moreActive.label : 'More'}<ChevronDown strokeWidth={1.5} className="w-3 h-3" />
        </button>
        {open && (
          <div role="menu" className="absolute left-0 top-full mt-1 z-30 min-w-[160px] rounded-[12px] border border-hairline bg-surface p-1">
            {MORE_TABS.map(t => (
              <button key={t.id} type="button" role="menuitem" onClick={() => { onChange(t.id); setOpen(false) }}
                className={`w-full text-left px-3 py-2 rounded-[8px] text-[14px] ${current === t.id ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>{t.label}</button>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
```

`'messages'` maps to Chat here because Inbox lives in the right panel. If the stored tab from the classic layout is `messages`, the shell shows Chat.

- [ ] **Step 2: Create AgentTopBar**

Create `components/shell/AgentTopBar.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Moon, Power, ExternalLink, MoreHorizontal, PanelRight, Loader2 } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, formatAge, type StatusEntry } from '@/lib/agent-status'
import { Button, IconButton } from './ui'

export interface AgentTopBarProps {
  agent: Agent
  entry: StatusEntry | undefined
  now: number
  busy: boolean
  onSleep: () => void
  onWake: () => void
  onProfile: () => void
  onExport: () => void
  onToggleInbox: () => void
  inboxCollapsed: boolean
}

const LABEL: Record<string, string> = { 'needs-you': 'Needs you', working: 'Working', idle: 'Idle', asleep: 'Asleep', offline: 'Offline' }

export default function AgentTopBar(p: AgentTopBarProps) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(false) }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [menu])

  const status = p.entry?.status ?? 'offline'
  const asleep = status === 'asleep' || status === 'offline'
  const age = formatAge(p.entry?.since, p.now)
  const host = p.agent.session?.hostName || p.agent.hostId || 'this Mac'
  const tone = status === 'working' ? 'text-accent' : status === 'needs-you' ? 'text-warn' : 'text-ink-muted'
  const dot = status === 'working' ? 'bg-accent-fill ring-[3px] ring-accent-fill/20' : status === 'needs-you' ? 'bg-warn' : 'bg-gray-600'

  return (
    <header className="h-[60px] flex-none flex items-center gap-3 px-6">
      <div className="flex items-center gap-2.5 text-[16px] text-ink-muted min-w-0">
        <span className="truncate">{host === 'local' ? 'this Mac' : host}</span>
        <span>/</span>
        <span className="text-ink font-medium truncate">{displayName(p.agent)}</span>
      </div>
      <span className={`flex items-center gap-2 text-[13px] ml-2 ${tone}`}>
        <span className={`w-[7px] h-[7px] rounded-full ${dot}`} />{LABEL[status]}{age && status !== 'offline' ? ` · ${age}` : ''}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {asleep
          ? <Button onClick={p.onWake} disabled={p.busy}>{p.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power strokeWidth={1.5} className="w-4 h-4" />}Wake</Button>
          : <Button onClick={p.onSleep} disabled={p.busy}>{p.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Moon strokeWidth={1.5} className="w-4 h-4" />}Sleep</Button>}
        <a href={`/zoom/agent?id=${encodeURIComponent(p.agent.id)}`} target="_blank" rel="noopener noreferrer" aria-label="Pop out" title="Pop out"
          className="grid place-items-center w-[34px] h-[34px] rounded-[10px] border border-[rgb(42_42_47)] text-ink hover:bg-raised"><ExternalLink strokeWidth={1.5} className="w-4 h-4" /></a>
        <div ref={ref} className="relative">
          <IconButton label="More actions" onClick={() => setMenu(m => !m)} active={menu}><MoreHorizontal strokeWidth={1.5} className="w-4 h-4" /></IconButton>
          {menu && (
            <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-[180px] rounded-[12px] border border-hairline bg-surface p-1">
              <button type="button" role="menuitem" onClick={() => { setMenu(false); p.onProfile() }} className="w-full text-left px-3 py-2 rounded-[8px] text-[14px] text-gray-300 hover:bg-raised/60">Profile</button>
              <button type="button" role="menuitem" onClick={() => { setMenu(false); p.onExport() }} className="w-full text-left px-3 py-2 rounded-[8px] text-[14px] text-gray-300 hover:bg-raised/60">Export transcript</button>
            </div>
          )}
        </div>
        <IconButton label={p.inboxCollapsed ? 'Show inbox' : 'Hide inbox'} onClick={p.onToggleInbox} active={!p.inboxCollapsed}><PanelRight strokeWidth={1.5} className="w-4 h-4" /></IconButton>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `yarn tsc --noEmit -p tsconfig.json 2>&1 | grep components/shell | head`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add components/shell/TabBar.tsx components/shell/AgentTopBar.tsx
git commit -m "feat(shell): add agent top bar and underline tab bar"
```

---

### Task 11: Inbox panel and Home screen

**Files:**
- Create: `components/shell/InboxPanel.tsx`
- Create: `components/shell/HomeScreen.tsx`

**Interfaces:**
- Consumes: `MessageCenter` (props `sessionName` = `agentToSession(agent).id`, `agentId`, `allAgents: { id; name; alias; tmuxSessionName?; hostId }[]`, `hostUrl`, `isActive`); `getAgentBaseUrl`; Task 2 and Task 6 exports.
- Produces:

```ts
export default function InboxPanel(p: { agent: Agent; onlineAgents: Agent[]; unread: number; onCollapse: () => void }): JSX.Element
export default function HomeScreen(p: { groups: StatusGroups; agents: Agent[]; unread: Record<string, number>; now: number; onSelectAgent: (a: Agent) => void; onNewAgent: () => void }): JSX.Element
```

- [ ] **Step 1: Create InboxPanel**

Create `components/shell/InboxPanel.tsx`. `toRecipients` and `sessionName` match exactly what the classic Messages tab passes:

```tsx
'use client'

import { Inbox, PanelRightClose } from 'lucide-react'
import MessageCenter from '@/components/MessageCenter'
import ErrorBoundary from '@/components/ErrorBoundary'
import { agentToSession, getAgentBaseUrl } from '@/lib/agent-utils'
import type { Agent } from '@/types/agent'
import { Badge, IconButton } from './ui'

function toRecipients(onlineAgents: Agent[]) {
  return onlineAgents.map(a => ({
    id: a.id,
    name: a.name || a.alias || a.id,              // technical name for lookups
    alias: a.label || a.name || a.alias || a.id,  // display name
    tmuxSessionName: a.session?.tmuxSessionName,
    hostId: a.hostId,
  }))
}

export default function InboxPanel({ agent, onlineAgents, unread, onCollapse }: {
  agent: Agent; onlineAgents: Agent[]; unread: number; onCollapse: () => void
}) {
  return (
    <aside className="w-[300px] flex-none flex flex-col border-l border-hairline min-h-0">
      <div className="h-[60px] flex-none flex items-center gap-2 px-4">
        <span className="flex items-center gap-2 rounded-[10px] bg-raised px-3 py-1.5 text-[14px] text-ink">
          <Inbox strokeWidth={1.5} className="w-4 h-4" />Inbox{unread > 0 && <Badge>{unread}</Badge>}
        </span>
        <span className="ml-auto"><IconButton label="Hide inbox" onClick={onCollapse}><PanelRightClose strokeWidth={1.5} className="w-4 h-4" /></IconButton></span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex">
        <ErrorBoundary fallbackLabel="Inbox">
          <MessageCenter
            sessionName={agentToSession(agent).id}
            agentId={agent.id}
            allAgents={toRecipients(onlineAgents)}
            hostUrl={getAgentBaseUrl(agent)}
            isActive={true}
          />
        </ErrorBoundary>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create HomeScreen**

Create `components/shell/HomeScreen.tsx`:

```tsx
'use client'

import { Plus } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, formatAge, type StatusEntry, type StatusGroups } from '@/lib/agent-status'
import { Card, Row, Button, StatusDot } from './ui'

const STATE_LABEL: Record<string, string> = { 'needs-you': 'Needs you', working: 'Working', idle: 'Idle', asleep: 'Asleep', offline: 'Offline' }

export default function HomeScreen({ groups, agents, unread, now, onSelectAgent, onNewAgent }: {
  groups: StatusGroups; agents: Agent[]; unread: Record<string, number>; now: number
  onSelectAgent: (a: Agent) => void; onNewAgent: () => void
}) {
  const all: StatusEntry[] = [...groups.needsYou, ...groups.working, ...groups.idle, ...groups.asleep]
  const attention = [
    ...groups.needsYou.map(e => ({ e, text: `Waiting for your input · ${formatAge(e.since, now)}` })),
    ...all.filter(e => e.status !== 'needs-you' && (unread[e.agent.id] ?? 0) > 0)
      .map(e => ({ e, text: `${unread[e.agent.id]} unread message${unread[e.agent.id] === 1 ? '' : 's'}` })),
  ]

  if (agents.length === 0) {
    return (
      <div className="flex-1 grid place-items-center p-10">
        <Card className="w-full max-w-[520px]">
          <Row title="Create your first agent" description="An agent is a Claude Code (or other CLI) session with its own folder, memory and inbox."
            control={<Button variant="accent" onClick={onNewAgent}><Plus strokeWidth={1.5} className="w-4 h-4" />New agent</Button>} />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-10 py-14">
      <div className="mx-auto w-full max-w-[760px]">
        {attention.length > 0 && (
          <>
            <h3 className="text-[15px] font-normal text-gray-400 mb-3">Needs you</h3>
            <Card className="mb-7">
              {attention.map(({ e, text }) => (
                <Row key={e.agent.id}
                  title={<span className="flex items-center gap-3"><StatusDot status={e.status === 'needs-you' ? 'needs-you' : e.status} />{displayName(e.agent)}</span>}
                  description={text}
                  control={<Button onClick={() => onSelectAgent(e.agent)}>Open</Button>} />
              ))}
            </Card>
          </>
        )}
        <h3 className="text-[15px] font-normal text-gray-400 mb-3">Agents</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
          {all.map(e => (
            <button type="button" key={e.agent.id} onClick={() => onSelectAgent(e.agent)}
              className="text-left flex flex-col gap-2.5 rounded-[14px] border border-hairline bg-surface p-3.5 hover:bg-raised/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill">
              <span className="flex items-center gap-2"><StatusDot status={e.status} /><span className="text-[14px] font-medium text-ink truncate">{displayName(e.agent)}</span></span>
              <span className="text-[12px] text-ink-muted">{STATE_LABEL[e.status]}{e.since && e.status !== 'offline' ? ` ${formatAge(e.since, now)}` : ''}</span>
            </button>
          ))}
          <button type="button" onClick={onNewAgent}
            className="grid place-items-center rounded-[14px] border border-dashed border-hairline text-ink-muted hover:text-ink min-h-[78px]">
            <span className="flex items-center gap-2 text-[14px]"><Plus strokeWidth={1.5} className="w-4 h-4" />New</span>
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `yarn tsc --noEmit -p tsconfig.json 2>&1 | grep components/shell | head`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add components/shell/InboxPanel.tsx components/shell/HomeScreen.tsx
git commit -m "feat(shell): add inbox panel and home screen"
```

---

### Task 12: Command palette component

**Files:**
- Create: `components/shell/CommandPalette.tsx`

**Interfaces:**
- Consumes: `rankCommandResults`, `shouldOpenPalette` and `CommandItem` (Task 4); `displayName` (Task 2).
- Produces:

```ts
export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: Agent[]
  statusOf: (agent: Agent) => string      // label shown on the right, e.g. "Working"
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  onSwitchClassic: () => void
}
export default function CommandPalette(p: CommandPaletteProps): JSX.Element | null
```

- [ ] **Step 1: Create the component**

Create `components/shell/CommandPalette.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName } from '@/lib/agent-status'
import { rankCommandResults, shouldOpenPalette, type CommandItem } from '@/lib/command-palette'

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: Agent[]
  statusOf: (agent: Agent) => string
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  onSwitchClassic: () => void
}

const SCREENS: CommandItem[] = [
  { id: 'screen:home', kind: 'screen', label: 'Home', keywords: ['dashboard'] },
  { id: 'screen:/teams', kind: 'screen', label: 'Teams', keywords: [] },
  { id: 'screen:/team-meeting', kind: 'screen', label: 'Meetings', keywords: ['war room'] },
  { id: 'screen:/plugin-builder', kind: 'screen', label: 'Plugins', keywords: ['skills'] },
  { id: 'screen:/settings', kind: 'screen', label: 'Settings', keywords: ['hosts', 'preferences'] },
  { id: 'action:classic', kind: 'action', label: 'Switch to classic layout', keywords: ['old', 'layout'] },
]

export default function CommandPalette(p: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shouldOpenPalette(e, e.target as Element | null)) {
        e.preventDefault()
        p.onOpenChange(!p.open)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [p])

  useEffect(() => {
    if (p.open) { setQuery(''); setIndex(0); setTimeout(() => inputRef.current?.focus(), 0) }
  }, [p.open])

  const items = useMemo<CommandItem[]>(() => [
    ...p.agents.map(a => ({ id: `agent:${a.id}`, kind: 'agent' as const, label: displayName(a), keywords: [a.name, a.alias || '', a.hostId, ...(a.tags || [])].filter(Boolean), hint: p.statusOf(a) })),
    ...SCREENS,
  ], [p])
  const results = rankCommandResults(query, items).slice(0, 12)

  if (!p.open) return null

  const run = (item: CommandItem | undefined) => {
    if (!item) return
    p.onOpenChange(false)
    if (item.kind === 'agent') {
      const a = p.agents.find(x => `agent:${x.id}` === item.id)
      if (a) p.onSelectAgent(a)
    } else if (item.id === 'screen:home') p.onSelectHome()
    else if (item.id === 'action:classic') p.onSwitchClassic()
    else router.push(item.id.slice('screen:'.length))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); p.onOpenChange(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[index]) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[12vh]" onMouseDown={() => p.onOpenChange(false)}>
      <div role="dialog" aria-label="Command palette" onMouseDown={e => e.stopPropagation()}
        className="w-[560px] max-w-[92vw] rounded-[14px] border border-hairline bg-surface overflow-hidden">
        <div className="flex items-center gap-3 px-4 h-[52px] border-b border-hairline/70">
          <Search strokeWidth={1.5} className="w-4 h-4 text-ink-muted" />
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setIndex(0) }} onKeyDown={onKeyDown}
            placeholder="Jump to an agent or screen…" aria-label="Search"
            className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-gray-500 focus:outline-none" />
          <span className="text-[12px] text-gray-500">Esc</span>
        </div>
        <ul role="listbox" className="max-h-[360px] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-ink-muted">No matches</li>}
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === index} onMouseEnter={() => setIndex(i)} onClick={() => run(r)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] cursor-pointer ${i === index ? 'bg-raised text-ink' : 'text-gray-300'}`}>
              <span className="truncate">{r.label}</span>
              <span className="ml-auto text-[12px] text-gray-500">{r.kind === 'agent' ? r.hint : r.kind === 'action' ? 'Action' : 'Go to'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `yarn tsc --noEmit -p tsconfig.json 2>&1 | grep components/shell | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/shell/CommandPalette.tsx
git commit -m "feat(shell): add command palette"
```

---

### Task 13: AppShell and page wiring

**Files:**
- Create: `components/shell/AppShell.tsx`
- Modify: `app/page.tsx` (desktop return at line ~647; state near line 100; handlers near line 487)
- Modify: `components/Header.tsx` (add an optional `onTryNewLayout` prop)

**Interfaces:**
- Consumes: everything from Tasks 2-12; `useSessionActivity` (`getSessionActivity(name, id)`, `connected`); `AgentCreationWizard` (`onClose`, `onComplete`); `TranscriptExport`.
- Produces:

```ts
export interface AppShellProps {
  agents: Agent[]
  onlineAgents: Agent[]
  error: string | null
  onRetry: () => void
  activeAgentId: string | null
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  activeTab: AgentTab
  setActiveTab: (t: AgentTab) => void
  wakingAgentId: string | null
  onWake: (agent: Agent) => void
  onSleep: (agent: Agent) => Promise<void>
  onShowProfile: (agent: Agent) => void
  onAgentsChanged: () => void
  onSwitchClassic: () => void
}
```

- [ ] **Step 1: Create AppShell**

Create `components/shell/AppShell.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Agent } from '@/types/agent'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { groupByStatus, type StatusEntry } from '@/lib/agent-status'
import { getRuntimeMode } from '@/lib/runtime-mode'
import { readBool, writePref, INBOX_KEY } from '@/lib/safe-storage'
import AgentCreationWizard from '@/components/AgentCreationWizard'
import StatusSidebar from './StatusSidebar'
import AgentTopBar from './AgentTopBar'
import TabBar from './TabBar'
import InboxPanel from './InboxPanel'
import HomeScreen from './HomeScreen'
import CommandPalette from './CommandPalette'
import AgentTabContent, { type AgentTab } from './AgentTabContent'

export interface AppShellProps {
  agents: Agent[]
  onlineAgents: Agent[]
  error: string | null
  onRetry: () => void
  activeAgentId: string | null
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  activeTab: AgentTab
  setActiveTab: (t: AgentTab) => void
  wakingAgentId: string | null
  onWake: (agent: Agent) => void
  onSleep: (agent: Agent) => Promise<void>
  onShowProfile: (agent: Agent) => void
  onAgentsChanged: () => void
  onSwitchClassic: () => void
}

const LABEL: Record<string, string> = { 'needs-you': 'Needs you', working: 'Working', idle: 'Idle', asleep: 'Asleep', offline: 'Offline' }

export default function AppShell(p: AppShellProps) {
  const { getSessionActivity, connected } = useSessionActivity()
  const unread = useUnreadCounts(p.agents)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  const groups = useMemo(() => groupByStatus(p.agents, a => getSessionActivity(a.name, a.id)), [p.agents, getSessionActivity])
  const entryById = useMemo(() => {
    const m: Record<string, StatusEntry> = {}
    for (const e of [...groups.needsYou, ...groups.working, ...groups.idle, ...groups.asleep]) m[e.agent.id] = e
    return m
  }, [groups])

  const [inboxCollapsed, setInboxCollapsed] = useState(() => readBool(INBOX_KEY, false))
  const toggleInbox = () => setInboxCollapsed(c => { writePref(INBOX_KEY, String(!c)); return !c })
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [sleepingId, setSleepingId] = useState<string | null>(null)

  const agent = p.activeAgentId ? p.agents.find(a => a.id === p.activeAgentId) : undefined
  const sleep = async (a: Agent) => { setSleepingId(a.id); try { await p.onSleep(a) } finally { setSleepingId(null) } }

  return (
    <div className="fixed inset-0 flex bg-sunken text-ink overflow-hidden">
      <StatusSidebar
        agents={p.agents} groups={groups} activeAgentId={agent ? agent.id : null} unread={unread} now={now}
        statusConnected={connected} error={p.error} onRetry={p.onRetry}
        onSelectAgent={p.onSelectAgent} onSelectHome={p.onSelectHome}
        onOpenPalette={() => setPaletteOpen(true)} onNewAgent={() => setWizardOpen(true)}
      />

      {agent ? (
        <>
          <section className="flex-1 min-w-0 flex flex-col">
            <AgentTopBar
              agent={agent} entry={entryById[agent.id]} now={now}
              busy={p.wakingAgentId === agent.id || sleepingId === agent.id}
              onSleep={() => sleep(agent)} onWake={() => p.onWake(agent)}
              onProfile={() => p.onShowProfile(agent)} onExport={() => p.setActiveTab('export')}
              onToggleInbox={toggleInbox} inboxCollapsed={inboxCollapsed}
            />
            <TabBar activeTab={p.activeTab} onChange={p.setActiveTab} streaming={getRuntimeMode(agent.id) === 'streaming'} />
            <div className="flex-1 min-h-0 flex relative">
              <AgentTabContent
                agent={agent}
                activeTab={p.activeTab === 'messages' ? 'chat' : p.activeTab}
                setActiveTab={p.setActiveTab}
                onlineAgents={p.onlineAgents}
                wakingAgentId={p.wakingAgentId}
                onWake={p.onWake}
                onShowProfile={p.onShowProfile}
                hideHeaders
                chatVariant="ink"
              />
            </div>
          </section>
          {!inboxCollapsed && <InboxPanel agent={agent} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0} onCollapse={toggleInbox} />}
        </>
      ) : (
        <HomeScreen groups={groups} agents={p.agents} unread={unread} now={now} onSelectAgent={p.onSelectAgent} onNewAgent={() => setWizardOpen(true)} />
      )}

      <CommandPalette
        open={paletteOpen} onOpenChange={setPaletteOpen} agents={p.agents}
        statusOf={a => LABEL[entryById[a.id]?.status ?? 'offline']}
        onSelectAgent={p.onSelectAgent} onSelectHome={p.onSelectHome} onSwitchClassic={p.onSwitchClassic}
      />
      {wizardOpen && <AgentCreationWizard onClose={() => setWizardOpen(false)} onComplete={() => { setWizardOpen(false); p.onAgentsChanged() }} />}
    </div>
  )
}
```

- [ ] **Step 2: Wire page.tsx**

In `app/page.tsx`:

(a) Add the imports:

```tsx
import AppShell from '@/components/shell/AppShell'
import { readPref, writePref, SHELL_KEY } from '@/lib/safe-storage'
```

(b) Add state next to `layoutOverride` (around line 109):

```tsx
  const [shell, setShell] = useState<'command-center' | 'classic'>(() =>
    typeof window === 'undefined' ? 'command-center' : readPref(SHELL_KEY, 'command-center', ['command-center', 'classic'] as const))
  const switchShell = (next: 'command-center' | 'classic') => { setShell(next); writePref(SHELL_KEY, next) }
```

(c) Add a hibernate handler after `handleWakeAgent` (around line 492). It uses the same request as `AgentList.handleHibernate`:

```tsx
  const handleSleepAgent = async (agent: Agent) => {
    try {
      const response = await fetch(`/api/agents/${agent.id}/hibernate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostUrl: agent.hostUrl }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || data.error || 'Failed to hibernate agent')
      }
      refreshAgents()
    } catch (error) {
      addToast({ type: 'error', title: 'Could not put agent to sleep', message: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
```

`addToast` is already destructured from `useToast()` at line 94.

(d) Directly before the `// Desktop dashboard - AGENT-CENTRIC` return (line ~647), insert:

```tsx
  if (shell === 'command-center') {
    return (
      <TerminalProvider key="desktop-dashboard">
        <AppShell
          agents={selectableAgents}
          onlineAgents={onlineAgents}
          error={agentsError ?? null}
          onRetry={refreshAgents}
          activeAgentId={activeAgentId}
          onSelectAgent={(a) => {
            if (a.session?.status === 'online' || (a.sessions?.length ?? 0) > 0) handleAgentSelect(a)
            else handleShowAgentProfile(a)
          }}
          onSelectHome={() => setActiveAgentId(null)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          wakingAgentId={wakingAgentId}
          onWake={handleWakeAgent}
          onSleep={handleSleepAgent}
          onShowProfile={handleShowAgentProfile}
          onAgentsChanged={refreshAgents}
          onSwitchClassic={() => switchShell('classic')}
        />
        {profileAgent && (
          <AgentProfile
            isOpen={isProfileOpen}
            onClose={() => { setIsProfileOpen(false); setProfileAgent(null); setProfileScrollToDangerZone(false) }}
            agentId={profileAgent.id}
            sessionStatus={profileAgent.session}
            onStartSession={() => handleStartSession(profileAgent)}
            onDeleteAgent={handleDeleteAgent}
            scrollToDangerZone={profileScrollToDangerZone}
            hostUrl={getAgentBaseUrl(profileAgent)}
          />
        )}
        <WakeAgentDialog
          isOpen={wakeDialogAgent !== null}
          onClose={() => setWakeDialogAgent(null)}
          onConfirm={handleWakeConfirm}
          agentName={wakeDialogAgent?.name || wakeDialogAgent?.id || ''}
          agentAlias={wakeDialogAgent?.alias}
          defaultPermissionMode={(wakeDialogAgent as any)?.permissionMode}
        />
      </TerminalProvider>
    )
  }
```

Notes:
- Check `selectableAgents` (the `useMemo` at line 150). If it filters out agents the sidebar should show, pass `agents` instead of `selectableAgents`. The classic `AgentList` receives `agents`.
- `activeAgentId` is already `useState<string | null>` (line 99), so `setActiveAgentId(null)` is valid.

(d2) Make Home stick. The effect at lines ~297-302 re-selects the first online agent whenever `activeAgentId` is null, which would undo clicking Home. Replace it with a once-only version:

```tsx
  const didAutoSelect = useRef(false)
  useEffect(() => {
    if (didAutoSelect.current) return
    if (hasOnlineAgents && !activeAgentId && firstOnlineAgentId) {
      didAutoSelect.current = true
      setActiveAgentId(firstOnlineAgentId)
    }
  }, [hasOnlineAgents, activeAgentId, firstOnlineAgentId])
```

`useRef` is already imported on line 3. Classic behaviour is unchanged: it still auto-selects on first load.

(e) Add a way back from classic. In the classic `<Header … />` (line 652), add `onTryNewLayout={() => switchShell('command-center')}`.

- [ ] **Step 3: Header button**

In `components/Header.tsx`:
- Add `onTryNewLayout?: () => void` to `HeaderProps` and to the destructured params.
- Directly before the `{onSwitchLayout && (` block (line 90), add:

```tsx
          {onTryNewLayout && (
            <button
              onClick={onTryNewLayout}
              className="px-2.5 py-1 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              title="Try the new command-center layout"
            >
              Try new layout
            </button>
          )}
```

- [ ] **Step 4: Verify**

Run: `yarn lint 2>&1 | tail -8 && yarn test 2>&1 | tail -8 && yarn build 2>&1 | tail -10`
Expected: lint shows no new errors; all Vitest suites pass, including the 5 new ones; the build prints `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add components/shell/AppShell.tsx app/page.tsx components/Header.tsx
git commit -m "feat(shell): wire command-center layout with classic fallback"
```

---

### Task 14: End-to-end verification in the browser

**Files:**
- Create: `scripts/shell-check.mjs` (a throwaway Playwright script; delete it before the final commit, or keep it if useful)

**Interfaces:**
- Consumes: the running dev server on http://localhost:23000 (`yarn dev`, started by the user) and the full shell.

- [ ] **Step 1: Write the check script**

Create `scripts/shell-check.mjs`:

```js
import { chromium } from 'playwright'

const url = process.env.URL || 'http://localhost:23000'
const out = process.env.OUT || '/tmp/shell-check'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push(String(e)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('aimaestro-shell', 'command-center'))
await page.reload({ waitUntil: 'networkidle' })
await page.screenshot({ path: `${out}-home.png` })

// Open the first agent in the sidebar (any row below Home)
const firstAgent = page.locator('aside button[aria-current], aside button').filter({ hasNotText: /Home|Search|Retry|status|project/i }).first()
await firstAgent.click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${out}-agent.png` })

for (const tab of ['Terminal', 'Files', 'Memory', 'Code graph', 'Docs', 'Chat']) {
  await page.getByRole('tab', { name: tab }).click()
  await page.waitForTimeout(400)
}
await page.getByRole('button', { name: /More/ }).click()
await page.getByRole('menuitem', { name: 'Search' }).click()

await page.keyboard.press('Meta+k')
await page.waitForTimeout(200)
const paletteOpen = await page.getByRole('dialog', { name: 'Command palette' }).isVisible()
await page.screenshot({ path: `${out}-palette.png` })
await page.keyboard.press('Escape')

await page.getByRole('button', { name: /Hide inbox/ }).first().click()
await page.screenshot({ path: `${out}-inbox-collapsed.png` })

console.log(JSON.stringify({ paletteOpen, errors }, null, 2))
await browser.close()
```

- [ ] **Step 2: Run it**

Run: `cd /Users/obre/Downloads/ai-maestro && npx -y -p playwright@latest sh -c "npx playwright install chromium >/dev/null && node scripts/shell-check.mjs"`
Expected:
- The output includes `"paletteOpen": true` and `"errors": []`.
- Four PNGs exist under `/tmp/shell-check-*.png`.

Open them (`open /tmp/shell-check-*.png`) and compare against `.superpowers/brainstorm/91350-1791046217/content/full-design-v3.html`. Check:
- the near-black page and `#0f0f11` sidebar
- underline tabs
- the inbox on the right
- Stack Sans text
- the blue used only for the working dot, Send and badges

- [ ] **Step 3: Manual checks the script can't do**

At http://localhost:23000:
1. Sleep an online agent. It moves to Asleep, and the top-bar button becomes Wake.
2. Wake it. The wake dialog opens; confirming moves the agent back to Working or Idle.
3. Switch the sidebar to Project, reload, and confirm it stays on Project.
4. ⌘K → "Switch to classic layout". The classic dashboard appears, with a "Try new layout" button in its header that switches back.
5. Click Home. The Needs-you card and tiles appear. Reload: Home is not replaced by an auto-selected agent.
6. Click on the terminal, press ⌘K, and confirm the palette opens. On the Search tab, with its input focused, ⌘K focuses that input instead.

Fix anything that fails in the task that owns it, then re-run that task's verification.

- [ ] **Step 4: Final gates**

Run: `yarn lint 2>&1 | tail -8; yarn test 2>&1 | tail -12; yarn build 2>&1 | tail -10`
Expected: all three pass. Paste the output into the hand-off message.

- [ ] **Step 5: Commit**

```bash
git rm --cached scripts/shell-check.mjs 2>/dev/null; rm -f scripts/shell-check.mjs
git commit --allow-empty -m "chore: verify command-center shell end to end"
```
