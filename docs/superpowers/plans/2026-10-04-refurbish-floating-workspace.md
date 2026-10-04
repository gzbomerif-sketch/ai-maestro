# Refurbish: Floating Workspace, Colony Profile, Unified Tasks, Skills Editor, UI Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the command-center work area as a floating-window desktop (terminal + colony open simultaneously), add a colony profile card, per-agent unified tasks, a SKILL.md editor, universal avatars, an inbox redesign, and a token/shadcn-based UI refresh.

**Architecture:** A new pure reducer (`lib/window-manager.ts`, mirroring `lib/panel-layout.ts`) drives a `WindowLayer` of `FloatingWindow`s that replaces the single-tool `PanelDock` in the command-center shell. The colony stays a single persistent iframe pinned by `ColonyHost`'s rect loop; it gains a `select-agent` postMessage that opens a React profile card. Tasks extend the existing team task model (optional `teamId`, new `agentId`) with per-agent storage; skills gain content read/write on the existing service. shadcn/ui primitives are mapped onto the existing semantic tokens.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind 3.4, shadcn/ui (Radix), lucide-react, xterm.js, vitest. Sibling repo `/Users/obre/Downloads/bot-crossing` (vite + three.js) for the colony event.

**Spec:** `docs/superpowers/specs/2026-10-04-refurbish-floating-workspace-design.md`

## Global Constraints

- Next.js 14 route params are a Promise: `{ params: Promise<{ id: string }> }`.
- Services are pure functions returning `ServiceResult<T>`; API routes are thin wrappers; every new route is also registered in `services/headless-router.ts`.
- Agent status comes only from `presenceOf` (`hooks/useSessionActivity.ts`); no view computes status or opens its own status socket.
- Terminals: inactive/minimized use `visibility: hidden` + `pointerEvents: none`, never `display: none`; initialize once on mount (empty dep array); `convertEol: false`; addons → `open()` → `fit()`.
- No nested buttons; use a `div` with `onClick` where needed.
- localStorage only through `lib/safe-storage.ts`.
- External commands via argv (`lib/tmux-safe.mjs`), never shell strings. No auth, no localhost-only bind.
- Tailwind stays 3.4; colors via semantic tokens (`surface`, `raised`, `ink`, `ink-muted`, `accent`, `hairline`, `ok`, `warn`, `danger`), never raw `gray-*`/`blue-*` in touched files.
- Classic shell (`app/page.tsx` classic branch), MobileDashboard and TabletDashboard are untouched.
- `yarn test` green before every commit; never `yarn build` in a checkout a live server runs from.
- Version bump via `./scripts/bump-version.sh` + CHANGELOG entry once per PR (Task 18), not per task.

## Review Focus

1. **Saved window rects that no longer fit** (smaller screen, shrunk work area) must be pulled fully back inside the work area, never stranded off-screen → test in Task 2 (`clampAll`).
2. **Opening an already-open tool** must focus the existing window, never create a duplicate → test in Task 2 (`open` is idempotent).
3. **A corrupt or missing personal tasks file** must yield an empty list and still accept new tasks, never crash the card → test in Task 7.
4. **Skill names containing `/`, `..` or empty strings** must be rejected before any filesystem path is built (path traversal) → test in Task 10.
5. **Colony messages from a wrong origin or with a malformed agentId** (non-string, empty, >128 chars) must be ignored for `select-agent` exactly as for `open-agent` → test in Task 5.

---

# Phase 0 — Foundations (sequential)

### Task 1: shadcn/ui mapped onto the token system

**Files:**
- Create: `components.json`, `lib/utils.ts` (cn helper), `components/ui/*` (generated)
- Modify: `app/globals.css`, `package.json`, `tailwind.config.ts`

**Interfaces:**
- Produces: shadcn components importable as `@/components/ui/dialog`, `@/components/ui/dropdown-menu`, `@/components/ui/popover`, `@/components/ui/tooltip`, `@/components/ui/tabs`, `@/components/ui/command`, `@/components/ui/checkbox`, `@/components/ui/select`, `@/components/ui/switch`, `@/components/ui/button`; `cn()` from `@/lib/utils`.

- [ ] **Step 1: Install and init.** Repo uses yarn (yarn.lock — do not mix package managers):

```bash
cd /Users/obre/Downloads/ai-maestro
npx shadcn@latest init
# prompts: style=default, base color=neutral, CSS variables=yes,
# tailwind config=tailwind.config.ts, components alias=@/components, utils alias=@/lib/utils
```

If the CLI balks at Tailwind 3.4 config shape, create `components.json` by hand:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "tailwind.config.ts", "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui" }
}
```

and `yarn add class-variance-authority clsx tailwind-merge tailwindcss-animate lucide-react@latest` (lucide already present — keep installed version if conflict).

- [ ] **Step 2: Map shadcn CSS variables to the existing tokens** instead of letting init write its own palette. In `app/globals.css`, inside the existing `.theme-ink` block (and later `.theme-paper`, Task 16), define shadcn's variables **in terms of the already-defined token channels** so there is one source of truth:

```css
.theme-ink {
  /* …existing token definitions stay… */
  --background: var(--surface);
  --foreground: var(--ink);
  --card: var(--raised);
  --card-foreground: var(--ink);
  --popover: var(--raised);
  --popover-foreground: var(--ink);
  --primary: var(--accent);
  --primary-foreground: var(--accent-fill);
  --muted: var(--sunken);
  --muted-foreground: var(--ink-muted);
  --border: var(--hairline);
  --input: var(--hairline);
  --ring: var(--accent);
  --destructive: var(--danger);
  --radius: 0.5rem;
}
```

(Adjust var names to the exact channel-variable names already in `globals.css` — read that file first; some tokens are channel triples used as `rgb(var(--x))`, in which case wrap accordingly: `--background: rgb(var(--surface-rgb))` style. Match what `tailwind.config.ts` does today.)

- [ ] **Step 3: Add the primitives:**

```bash
npx shadcn@latest add button dialog dropdown-menu popover tooltip tabs command checkbox select switch scroll-area
```

- [ ] **Step 4: Verify** nothing regressed: `yarn test` passes, `npx tsc --noEmit` passes, `yarn dev` renders the shell unchanged, and a scratch page/dialog using `@/components/ui/dialog` renders with ink-theme colors (open it once in the browser).

- [ ] **Step 5: Commit** `feat: add shadcn/ui primitives mapped to semantic tokens`

---

### Task 2: Window-manager reducer (pure logic + tests)

**Files:**
- Create: `lib/window-manager.ts`, `tests/window-manager.test.ts`

**Interfaces:**
- Consumes: `PanelType`, `PANEL_TYPES` from `@/lib/panel-layout`.
- Produces (exact):

```ts
export type WindowTool = PanelType | 'tasks' | 'skills' | `term:${string}`
export interface ManagedWindow {
  id: string            // windowId(tool, agentId)
  tool: WindowTool
  agentId?: string      // undefined = global window (colony)
  x: number; y: number; w: number; h: number
  z: number
  minimized: boolean
  maximized: boolean
}
export interface WindowState { windows: ManagedWindow[]; nextZ: number }
export type WindowAction =
  | { type: 'open'; tool: WindowTool; agentId?: string; area: { w: number; h: number } }
  | { type: 'close'; id: string }
  | { type: 'focus'; id: string }
  | { type: 'move'; id: string; x: number; y: number; area: { w: number; h: number } }
  | { type: 'resize'; id: string; x: number; y: number; w: number; h: number; area: { w: number; h: number } }
  | { type: 'minimize'; id: string }
  | { type: 'restore'; id: string }
  | { type: 'toggleMaximize'; id: string }
  | { type: 'snap'; id: string; half: 'left' | 'right'; area: { w: number; h: number } }
  | { type: 'clampAll'; area: { w: number; h: number } }
  | { type: 'closeAgent'; agentId: string }
  | { type: 'replace'; state: WindowState }
export function windowId(tool: WindowTool, agentId?: string): string
export function windowReducer(s: WindowState, a: WindowAction): WindowState
export function parseWindows(raw: string | null): WindowState | null
export function visibleWindows(s: WindowState, agentId: string | null): ManagedWindow[]
export const WINDOW_DEFAULTS: { w: number; h: number; minW: number; minH: number }
export const EMPTY_WINDOWS: WindowState
export const WINDOWS_STORAGE_KEY = 'aimaestro-windows'
```

Semantics: `windowId` = `` `${agentId ?? '_'}:${tool}` ``. `open` on an existing id = focus + restore (idempotent, Review Focus 2). New windows cascade from (48,48) + 32px per existing window, sized `WINDOW_DEFAULTS` (720×480, min 360×240), clamped to area. `focus` sets `z = nextZ++`. `visibleWindows` returns globals (no agentId) plus the given agent's windows, minimized included (layer decides rendering). `clampAll` moves/shrinks every window so it fits the area entirely (Review Focus 1); an area smaller than minW/minH clamps size to the area. `snap` sets rect to the given half. `closeAgent` drops all windows of a deleted agent. `parseWindows` validates field-by-field like `parseLayout` and returns null on garbage.

- [ ] **Step 1: Write failing tests** `tests/window-manager.test.ts` (vitest, mirror the style of existing lib tests):

```ts
import { describe, it, expect } from 'vitest'
import { windowReducer, windowId, parseWindows, visibleWindows, EMPTY_WINDOWS, WINDOW_DEFAULTS } from '@/lib/window-manager'

const AREA = { w: 1600, h: 900 }
const open = (s = EMPTY_WINDOWS, tool: any = 'terminal', agentId?: string) =>
  windowReducer(s, { type: 'open', tool, agentId, area: AREA })

describe('window-manager', () => {
  it('opens a window with default size, cascaded position, top z', () => {
    const s = open()
    expect(s.windows).toHaveLength(1)
    const w = s.windows[0]
    expect(w).toMatchObject({ tool: 'terminal', x: 48, y: 48, w: WINDOW_DEFAULTS.w, h: WINDOW_DEFAULTS.h, minimized: false })
    expect(w.z).toBe(1)
  })
  it('open on an existing id focuses and restores instead of duplicating', () => {
    let s = open(open(), 'inbox')               // terminal z1, inbox z2
    s = windowReducer(s, { type: 'minimize', id: windowId('terminal') })
    s = open(s, 'terminal')                     // re-open terminal
    expect(s.windows).toHaveLength(2)
    const t = s.windows.find(w => w.id === windowId('terminal'))!
    expect(t.minimized).toBe(false)
    expect(t.z).toBeGreaterThan(s.windows.find(w => w.id === windowId('inbox'))!.z)
  })
  it('scopes ids by agent', () => {
    expect(windowId('terminal', 'a1')).toBe('a1:terminal')
    expect(windowId('colony')).toBe('_:colony')
  })
  it('visibleWindows returns globals plus the active agent’s windows only', () => {
    let s = open(EMPTY_WINDOWS, 'colony')            // global
    s = open(s, 'terminal', 'a1')
    s = open(s, 'terminal', 'a2')
    expect(visibleWindows(s, 'a1').map(w => w.id).sort()).toEqual(['_:colony', 'a1:terminal'])
    expect(visibleWindows(s, null).map(w => w.id)).toEqual(['_:colony'])
  })
  it('move clamps inside the area', () => {
    let s = open()
    s = windowReducer(s, { type: 'move', id: '_:terminal', x: -500, y: 5000, area: AREA })
    const w = s.windows[0]
    expect(w.x).toBe(0)
    expect(w.y + w.h).toBeLessThanOrEqual(AREA.h)
  })
  it('resize enforces minimum size', () => {
    let s = open()
    s = windowReducer(s, { type: 'resize', id: '_:terminal', x: 48, y: 48, w: 10, h: 10, area: AREA })
    expect(s.windows[0].w).toBe(WINDOW_DEFAULTS.minW)
    expect(s.windows[0].h).toBe(WINDOW_DEFAULTS.minH)
  })
  it('clampAll pulls stranded windows back inside a shrunken area', () => {
    let s = open()
    s = windowReducer(s, { type: 'move', id: '_:terminal', x: 800, y: 400, area: AREA })
    s = windowReducer(s, { type: 'clampAll', area: { w: 800, h: 500 } })
    const w = s.windows[0]
    expect(w.x + w.w).toBeLessThanOrEqual(800)
    expect(w.y + w.h).toBeLessThanOrEqual(500)
  })
  it('snap left fills the left half', () => {
    let s = open()
    s = windowReducer(s, { type: 'snap', id: '_:terminal', half: 'left', area: AREA })
    expect(s.windows[0]).toMatchObject({ x: 0, y: 0, w: 800, h: 900 })
  })
  it('toggleMaximize round-trips the previous rect', () => {
    let s = open()
    const before = { ...s.windows[0] }
    s = windowReducer(s, { type: 'toggleMaximize', id: '_:terminal' })
    expect(s.windows[0].maximized).toBe(true)
    s = windowReducer(s, { type: 'toggleMaximize', id: '_:terminal' })
    expect(s.windows[0]).toMatchObject({ x: before.x, y: before.y, w: before.w, h: before.h, maximized: false })
  })
  it('closeAgent removes that agent’s windows and keeps globals', () => {
    let s = open(open(EMPTY_WINDOWS, 'colony'), 'terminal', 'a1')
    s = windowReducer(s, { type: 'closeAgent', agentId: 'a1' })
    expect(s.windows.map(w => w.id)).toEqual(['_:colony'])
  })
  it('parseWindows rejects garbage and filters bad entries', () => {
    expect(parseWindows(null)).toBeNull()
    expect(parseWindows('{nope')).toBeNull()
    expect(parseWindows(JSON.stringify({ windows: 'x' }))).toBeNull()
    const ok = parseWindows(JSON.stringify({
      nextZ: 5,
      windows: [
        { id: '_:terminal', tool: 'terminal', x: 1, y: 2, w: 500, h: 400, z: 1, minimized: false, maximized: false },
        { id: 'bad', tool: 'not-a-tool', x: 0, y: 0, w: 0, h: 0, z: 0, minimized: false, maximized: false },
      ],
    }))
    expect(ok?.windows).toHaveLength(1)
    expect(ok?.windows[0].tool).toBe('terminal')
  })
})
```

- [ ] **Step 2: Run** `yarn vitest run tests/window-manager.test.ts` — expect FAIL (module not found).

- [ ] **Step 3: Implement `lib/window-manager.ts`.** Follow `panel-layout.ts` idiom (pure, exhaustive switch, field-by-field parse). Key implementation notes beyond the interface block above:

```ts
// id helpers
export function windowId(tool: WindowTool, agentId?: string): string { return `${agentId ?? '_'}:${tool}` }

// open: existing → focus+restore; else push with cascade
const count = s.windows.length
const x = clamp(48 + 32 * count, 0, Math.max(0, a.area.w - w0))
// maximize stores prevRect in a `prev?: {x,y,w,h}` field on the window (add to ManagedWindow)
// clampAll: w = Math.min(w, area.w) (floor at min unless area smaller), x = clamp(x, 0, area.w - w); same for y/h
// move/resize always re-clamp against action.area
// valid tool check for parse: PANEL_TYPES ids + 'tasks' + 'skills' + /^term:[a-zA-Z0-9_-]+$/
```

Add `prev?: { x: number; y: number; w: number; h: number }` to `ManagedWindow` for maximize round-trip (serialize it too).

- [ ] **Step 4: Run** the test file — expect PASS. Run full `yarn test` — green.

- [ ] **Step 5: Commit** `feat: window-manager reducer for floating workspace`

---

### Task 3: useWindows hook + FloatingWindow/WindowLayer components

**Files:**
- Create: `hooks/useWindows.ts`, `components/shell/FloatingWindow.tsx`, `components/shell/WindowLayer.tsx`
- Test: covered by Task 2's reducer tests + manual browser verification (DOM drag is not unit-tested in this repo; `ResizeHandle` isn't either).

**Interfaces:**
- Consumes: `windowReducer`, `parseWindows`, `visibleWindows`, `WINDOWS_STORAGE_KEY` (Task 2); `safeStorage` from `@/lib/safe-storage`; `cn` from `@/lib/utils`.
- Produces:
  - `useWindows(areaRef: RefObject<HTMLElement>): { state: WindowState; dispatch: Dispatch<WindowAction>; openTool: (tool: WindowTool, agentId?: string) => void }` — persists state (debounced 150ms) to `WINDOWS_STORAGE_KEY`, dispatches `clampAll` on mount and on ResizeObserver changes of the area element.
  - `<WindowLayer windows={ManagedWindow[]} dispatch renderContent={(w: ManagedWindow) => ReactNode} area={{w,h}} />` — absolutely-positioned layer inside `WorkArea`; renders a `FloatingWindow` per non-minimized window, plus a bottom **minimized strip** of pill buttons (tool icon + label, click → `restore`).
  - `<FloatingWindow win dispatch title icon onClose>{children}</FloatingWindow>` — title bar (drag), 8 resize zones (edges+corners, pointer-capture like `ResizeHandle.tsx`), minimize/maximize/close buttons, `onPointerDown` anywhere → `focus`.

- [ ] **Step 1: Implement `useWindows`** (reducer + lazy init from `parseWindows(safeStorage.get(WINDOWS_STORAGE_KEY)) ?? EMPTY_WINDOWS`, `useEffect` persist, ResizeObserver → `clampAll`).

- [ ] **Step 2: Implement `FloatingWindow`.** Requirements that are easy to get wrong:
  - Drag/resize use `setPointerCapture` on the handle, apply `document.body.classList.add('is-resizing')` while active (this is the existing iframe drag-shield convention), dispatch `move`/`resize` on pointermove with the live area size, remove class on pointerup/cancel.
  - While dragging near x<24 or x>area.w-24, show a translucent half-screen preview `div`; on drop there dispatch `snap`.
  - Content stays **mounted** when minimized: the window root gets `style={{ visibility: win.minimized ? 'hidden' : 'visible', pointerEvents: win.minimized ? 'none' : 'auto' }}` — never unmount, never `display:none` (terminal rule).
  - Title bar: `IconButton`s from `components/shell/ui.tsx` (minimize `Minus`, maximize `Square`, close `X` from lucide). No nested buttons.
  - z-index = `10 + win.z`; maximized renders inset-0 within the layer.
- [ ] **Step 3: Implement `WindowLayer`** (maps windows → FloatingWindow, minimized strip at bottom, `renderContent` prop so the layer stays dumb).
- [ ] **Step 4: Scratch-verify in the browser** (temporarily mount a WindowLayer with two dummy windows on the home screen, drag/resize/minimize/snap, then remove the scratch). `npx tsc --noEmit` green.
- [ ] **Step 5: Commit** `feat: floating window chrome and layer`

---

### Task 4: Replace the dock with the window layer in the shell

**Files:**
- Modify: `components/shell/WorkArea.tsx`, `components/shell/AppShell.tsx`, `components/shell/PanelBody.tsx`, `components/shell/PanelMenu.tsx`, `components/shell/TeamWorkspace.tsx`, `hooks/useLayout.ts`, `lib/panel-layout.ts`
- Delete usage of (keep files until classic-shell audit): `components/shell/PanelDock.tsx`, `components/shell/DockFrame.tsx`

**Interfaces:**
- Consumes: `useWindows`, `WindowLayer` (Task 3); `resolveAgentTab` (`lib/shell-tabs.ts`); existing `PanelBody` tool-rendering switch.
- Produces: `WorkArea` renders `AgentTopBar` + chat center + `WindowLayer` absolutely over the chat (chat keeps a readable min width — windows float above it, no reflow). `PanelBody` is refactored to export `renderTool(tool: WindowTool, ctx: { agent, team, onSelectAgent, ... }): ReactNode` used as `renderContent`. The ＋ `PanelMenu` becomes the window launcher in `AgentTopBar`/`TeamTopBar` (`openTool(tool, agentId)`); keyboard single-key shortcuts (T/I/F/M/G/D/C/S/P/X/B/O + A tasks, L skills) move into `useWindows`' keydown handler guarded by `isEditableTarget` from `panel-layout.ts`. ⌘J now minimizes/restores all windows (dispatch `minimize`/`restore` for each).
- `lib/panel-layout.ts`: `LayoutState` loses the `panel` field (keep `sidebarW`, `sidebarCollapsed`); `parseLayout` tolerates the old shape (reads sidebar fields, ignores `panel`). Update `tests/` for panel-layout accordingly (the dock actions are deleted — remove their cases; keep sidebar + shortcut + `isEditableTarget` coverage).

- [ ] **Step 1:** Refactor `PanelBody` → exported `renderTool` (move the switch; keep each tool's props exactly as today, including TerminalView's session wiring and ColonyPanel registration).
- [ ] **Step 2:** Rewrite `WorkArea` to mount `useWindows` + `WindowLayer`; delete dock geometry (`panelOverlays`, maximize-replaces-area path). Chat remains the base layer.
- [ ] **Step 3:** Update `AppShell`/`TeamWorkspace`: team tools (`lib/team-panels.ts` ids) open through the same `openTool` with the team context; member terminals open as `term:<agentId>` windows.
- [ ] **Step 4:** Trim `panel-layout.ts` + its tests; migrate `useLayout` to sidebar-only; on first run after upgrade, stale `aimaestro-layout` panel fields are simply ignored (no migration needed — windows start empty).
- [ ] **Step 5:** Manual verification in the browser (`yarn dev`): open an agent → press T (terminal window), press O (colony window) → **terminal and colony visible simultaneously, both draggable/resizable**; minimize terminal → xterm still fits correctly on restore; switch agents → agent windows swap, colony persists; reload → layout restored; shrink browser window → windows clamp back in.
- [ ] **Step 6:** `yarn test` + `npx tsc --noEmit` green. **Commit** `feat: replace panel dock with floating window workspace`

---

### Task 5: Colony window integration + `select-agent` protocol

**Files:**
- Modify: `lib/colony-message.ts`, `components/shell/ColonyHost.tsx`, `tests/colony-message.test.ts` (exists — extend; if the test file has another name, find it: `grep -l colony tests/`)
- Modify (sibling repo `/Users/obre/Downloads/bot-crossing`, branch `colony-teams`): `src/game/host.js` (+ wherever bot selection is handled, `src/ui/hud.js` selection path)

**Interfaces:**
- Produces in `lib/colony-message.ts`:

```ts
export const COLONY_SELECT_AGENT = 'bot-crossing:select-agent'
export type ColonyEvent = { kind: 'open' | 'select'; agentId: string }
export function parseColonyEvent(event: { origin: string; data: unknown }, colonyOrigin: string | null): ColonyEvent | null
// parseColonyMessage stays as a thin wrapper returning only 'open' ids (back-compat for any other caller)
```

- `ColonyHost` consumes `parseColonyEvent`: `'open'` keeps today's `onSelectAgent` behavior; `'select'` sets a new context value `selectedColonyAgentId` (exposed via `useColony()`), cleared on `null`. ColonyHost also mirrors the colony window's z: the host's iframe gets `zIndex: 10 + colonyWindowZ` (passed down from the layer via the existing slot-registration mechanism — extend the slot registration payload with `z: number`).

- [ ] **Step 1: Write failing tests** (extend the colony message test file):

```ts
it('parses select-agent from the colony origin', () => {
  expect(parseColonyEvent({ origin: 'http://localhost:23010', data: { type: 'bot-crossing:select-agent', agentId: 'a1' } }, 'http://localhost:23010'))
    .toEqual({ kind: 'select', agentId: 'a1' })
})
it('ignores select-agent from a wrong origin', () => {
  expect(parseColonyEvent({ origin: 'http://evil.test', data: { type: 'bot-crossing:select-agent', agentId: 'a1' } }, 'http://localhost:23010')).toBeNull()
})
it('ignores malformed agent ids', () => {
  for (const agentId of ['', 42, 'x'.repeat(129), null])
    expect(parseColonyEvent({ origin: 'http://localhost:23010', data: { type: 'bot-crossing:select-agent', agentId } }, 'http://localhost:23010')).toBeNull()
})
it('still parses open-agent as kind open', () => {
  expect(parseColonyEvent({ origin: 'o', data: { type: 'bot-crossing:open-agent', agentId: 'a1' } }, 'o')).toEqual({ kind: 'open', agentId: 'a1' })
})
```

- [ ] **Step 2:** Run → FAIL. Implement `parseColonyEvent` (same validation as today's `parseColonyMessage`: origin equality, object shape, string id, 1–128 chars). Run → PASS.
- [ ] **Step 3: Bot Crossing side.** In `/Users/obre/Downloads/bot-crossing`: find where a bot click selects it and shows the HUD card (`src/ui/hud.js` ~line 1143 area / `src/agents` picking). When embedded (`src/game/host.js` already knows the host origin), post `{ type: 'bot-crossing:select-agent', agentId }` on selection and `{ type: 'bot-crossing:select-agent', agentId: null }`-style deselect is **not** sent (host clears on its own when another select arrives or the card is closed). Reuse the exact mechanism `openThread` uses to post `open-agent`. The thread `ref.agentId` is the id to send. Commit in that repo: `feat: emit select-agent to embedding host on bot selection`.
- [ ] **Step 4:** Wire `ColonyHost`: handle `'select'` → context; extend slot registration with `z` and mirror onto the iframe. Manual verify: colony window open, click a bot → `useColony().selectedColonyAgentId` updates (temporary console.log, then remove); windows above/below the colony stack correctly.
- [ ] **Step 5:** `yarn test` green. **Commit** (ai-maestro) `feat: colony select-agent event and z-order mirroring`

---

# Phase 1 — Parallel tracks (independent; dispatch as parallel subagents)

Tracks A–D touch disjoint files. Task 6 depends on 5; 7→8→9 are one track; 10→11 one track; 12 standalone.

## Track A — Colony profile card

### Task 6: ColonyProfileCard

**Files:**
- Create: `components/shell/ColonyProfileCard.tsx`
- Modify: `components/shell/ColonyPanel.tsx` (render the card over the slot when `selectedColonyAgentId` is set), `components/shell/AppShell.tsx` (pass agents + action callbacks)

**Interfaces:**
- Consumes: `useColony()` (`selectedColonyAgentId`, `clearSelected`), `useAgents` data via props, `presenceOf` from `hooks/useSessionActivity`, `AgentAvatar` (Task 13 — until merged, use existing `AgentFace`; the Task 13 agent migrates this file too), shadcn `Popover`/`Tooltip`/`Button`, `PATCH /api/agents/[id]` (existing).
- Produces: `<ColonyProfileCard agent onClose onOpenWorkspace onOpenTerminal onNewConversation onOpenSkills />` — rendered absolutely at the right edge of the colony window content.
- Card sections: identity (avatar, label/name, status via `presenceOf`, host, model/program, workingDirectory, taskDescription, unread); **Edit** toggles an inline form (label, taskDescription, tags CSV, avatar via existing `AvatarPicker`) → `fetch PATCH /api/agents/${id}`, then `window.dispatchEvent(new Event('aimaestro:colony-refresh'))`; **Tasks** section = `AgentTaskList` (Task 9; until merged render placeholder `null` — Task 9's agent wires it); action row: New conversation, Terminal, Skills, Open workspace.
- Callbacks implemented in `AppShell`: `onOpenTerminal` → `openTool('terminal', agent.id)`; `onOpenSkills` → `openTool('skills', agent.id)`; `onOpenWorkspace` → `onSelectAgent(agent.id)`; `onNewConversation` → select agent, then reuse the exact flow HomeScreen/AgentTopBar uses to wake/start a session (`WakeAgentDialog` when the agent is asleep; otherwise focus chat).

- [ ] **Step 1:** Build the card UI with token classes + shadcn primitives (no raw gray/blue). Esc and ✕ call `onClose`; a new `select-agent` re-targets the card.
- [ ] **Step 2:** Wire into `ColonyPanel`/`AppShell`.
- [ ] **Step 3:** Manual verify: click bots in colony → card shows correct live status (matches sidebar), edit label → sidebar + colony refresh, actions open the right windows.
- [ ] **Step 4:** `yarn test` + tsc green. **Commit** `feat: colony profile card with edit and quick actions`

## Track B — Unified tasks

### Task 7: Task model + personal task registry

**Files:**
- Modify: `types/task.ts`, `lib/task-registry.ts`
- Test: `tests/agent-task-registry.test.ts` (create)

**Interfaces:**
- `types/task.ts` changes: `teamId` becomes `teamId?: string`; add `agentId?: string`. Comment the invariant: a task has `teamId`, `agentId`, or both.
- New in `lib/task-registry.ts` (mirror the team functions exactly):

```ts
export function loadAgentTasks(agentId: string): Task[]           // ~/.aimaestro/agents/<id>/tasks.json, [] on missing/corrupt
export function saveAgentTasks(agentId: string, tasks: Task[]): boolean
export function createAgentTask(data: { agentId: string; subject: string; description?: string; priority?: number; teamId?: string }): Task  // status 'pending'
export function updateAgentTask(agentId: string, taskId: string, updates: Partial<Pick<Task, 'subject' | 'description' | 'status' | 'priority'>>): Task | null
export function deleteAgentTask(agentId: string, taskId: string): boolean
```

Timestamps behave like `updateTask` (startedAt on in_progress/review, completedAt on completed). `blockedBy` stays `[]` for personal tasks (no cross-file deps — YAGNI).

- [ ] **Step 1: Failing tests** (`tests/agent-task-registry.test.ts`) — use a temp dir: the existing registry hardcodes `os.homedir()`; follow the pattern other registry tests in `tests/` use (check `tests/agent-registry.test.ts` — if it mocks `os.homedir` via `vi.mock('os')`, do the same):

```ts
it('returns [] for a missing or corrupt tasks file', () => {
  expect(loadAgentTasks('nonexistent-agent')).toEqual([])
  fs.mkdirSync(agentDir('bad'), { recursive: true })
  fs.writeFileSync(path.join(agentDir('bad'), 'tasks.json'), '{broken', 'utf-8')
  expect(loadAgentTasks('bad')).toEqual([])          // Review Focus 3
})
it('creates, updates and completes a personal task', () => {
  const t = createAgentTask({ agentId: 'a1', subject: 'Write docs' })
  expect(t).toMatchObject({ agentId: 'a1', subject: 'Write docs', status: 'pending', blockedBy: [] })
  expect(t.teamId).toBeUndefined()
  const done = updateAgentTask('a1', t.id, { status: 'completed' })!
  expect(done.completedAt).toBeTruthy()
  expect(loadAgentTasks('a1')).toHaveLength(1)
})
it('deletes and reports missing ids', () => {
  const t = createAgentTask({ agentId: 'a1', subject: 'x' })
  expect(deleteAgentTask('a1', t.id)).toBe(true)
  expect(deleteAgentTask('a1', 'nope')).toBe(false)
})
it('a corrupt file still accepts new tasks', () => {
  fs.writeFileSync(path.join(agentDir('a2'), 'tasks.json'), '{broken', 'utf-8')
  const t = createAgentTask({ agentId: 'a2', subject: 'recover' })
  expect(loadAgentTasks('a2')).toEqual([expect.objectContaining({ id: t.id })])
})
```

- [ ] **Step 2:** Run → FAIL. Implement (file path `path.join(os.homedir(), '.aimaestro', 'agents', agentId, 'tasks.json')`, `mkdirSync recursive` before write). Verify the `teamId?` change compiles everywhere: `npx tsc --noEmit` (fix any `task.teamId` non-null uses in team-meeting components with a guard — they only ever receive team tasks, so `task.teamId!` is acceptable there with a comment).
- [ ] **Step 3:** Run tests → PASS, full suite green. **Commit** `feat: per-agent task storage with optional teamId`

### Task 8: Agent tasks service + API routes + headless

**Files:**
- Create: `services/agents-tasks-service.ts`, `app/api/agents/[id]/tasks/route.ts`, `app/api/agents/[id]/tasks/[taskId]/route.ts`
- Modify: `services/headless-router.ts`
- Test: `tests/services/agents-tasks-service.test.ts`

**Interfaces:**
- Produces in `services/agents-tasks-service.ts` (pure `ServiceResult<T>`, idiom of `agents-skills-service.ts`):

```ts
export type AgentTaskSource = 'personal' | 'team'
export interface AgentTaskView extends Task { source: AgentTaskSource }
export function listAgentTasks(agentId: string): ServiceResult<{ tasks: AgentTaskView[] }>
// personal (loadAgentTasks) + for each team from lib/team-registry loadTeams():
// loadTasks(team.id).filter(t => t.assigneeAgentId === agentId) tagged 'team'
export function createTask(agentId: string, body: { subject?: string; description?: string; priority?: number }): ServiceResult<{ task: Task }>
// 404 unknown agent (getAgent), missingField('subject') on empty/whitespace subject
export function patchTask(agentId: string, taskId: string, body: Partial<Pick<Task, 'subject' | 'description' | 'status' | 'priority'>>): ServiceResult<{ task: Task }>
// personal tasks only; invalidField('status') unless in TaskStatus union; 404 when not found
export function removeTask(agentId: string, taskId: string): ServiceResult<{ success: true }>
```

Routes: `GET/POST /api/agents/[id]/tasks`, `PATCH/DELETE /api/agents/[id]/tasks/[taskId]` — thin wrappers, `{ params: Promise<{ id: string }> }` shape. Register the same four in `headless-router.ts` (copy the registration pattern of the skills routes there).

- [ ] **Step 1: Failing service tests** (mock `lib/task-registry` + `lib/agent-registry` + `lib/team-registry` with `vi.mock`, idiom of existing `tests/services/*`): list merges + tags sources; create validates subject (`''`, `'   '` → 400) and unknown agent → 404; patch rejects status `'done'` (invalid) and unknown task → 404; delete → success/404.
- [ ] **Step 2:** Run → FAIL. Implement service, routes, headless registrations.
- [ ] **Step 3:** Run → PASS; `curl localhost:23000/api/agents/<realid>/tasks` returns `{ tasks: [] }` on a dev server.
- [ ] **Step 4:** **Commit** `feat: agent tasks API (list/create/update/delete, team merge)`

### Task 9: useAgentTasks + AgentTaskList UI + placements

**Files:**
- Create: `hooks/useAgentTasks.ts`, `components/tasks/AgentTaskList.tsx`
- Modify: `components/shell/ColonyProfileCard.tsx` (tasks section), `components/AgentProfile.tsx` (add Tasks section), window tool registration: `lib/window-manager.ts` already accepts `'tasks'`; add `{ id: 'tasks', label: 'Tasks', key: 'A' }` to the launcher list in `PanelMenu` and the `renderTool` switch (render `AgentTaskList`).

**Interfaces:**
- `useAgentTasks(agentId: string | null): { tasks: AgentTaskView[]; loading: boolean; add: (subject: string) => Promise<void>; toggle: (t: AgentTaskView) => Promise<void>; update: (id: string, patch: object) => Promise<void>; remove: (id: string) => Promise<void>; refresh: () => void }` — fetch + 15s poll (idiom of `useTasks`), optimistic toggle (`status: completed ↔ pending`).
- `<AgentTaskList agentId compact? />` — quick-add input at top (Enter adds; empty input does nothing); checkbox rows (shadcn `Checkbox`, strikethrough completed); a row expands (chevron) to description/priority/status select; `source === 'team'` rows show a team badge and are **read-only except status** (they live in the kanban); delete via row menu. `compact` (card) hides expansion.

- [ ] **Step 1:** Implement hook + component with token classes + shadcn primitives.
- [ ] **Step 2:** Place in ColonyProfileCard, AgentProfile ("Tasks" section above Skills), and the `tasks` window tool (key A).
- [ ] **Step 3:** Manual verify: add todo from colony card → appears in Tasks window and AgentProfile; complete from window → card updates ≤15s (or on refocus); team task assigned to the agent appears with badge.
- [ ] **Step 4:** `yarn test` + tsc green. **Commit** `feat: per-agent task list UI in card, profile and window`

## Track C — Skills editor

### Task 10: Skill content read/write (registry + service + routes)

**Files:**
- Modify: `lib/agent-registry.ts` (next to `addCustomSkill`, ~line 2104), `services/agents-skills-service.ts`, `services/headless-router.ts`
- Create: `app/api/agents/[id]/skills/custom/[name]/route.ts` (GET, PATCH)
- Test: `tests/services/agents-skills-content.test.ts`

**Interfaces:**
- `lib/agent-registry.ts` additions:

```ts
export function getCustomSkillContent(agentId: string, name: string): string | null  // reads ~/.aimaestro/agents/<id>/skills/<name>/SKILL.md
export function updateCustomSkill(agentId: string, name: string, data: { content: string; description?: string }): boolean
```

- `services/agents-skills-service.ts` additions:

```ts
const SKILL_NAME = /^[a-zA-Z0-9_-]+$/   // reuse the existing addSkill regex — single const, used by both
export function getSkillContent(agentId: string, name: string): ServiceResult<{ name: string; content: string }>
export function updateSkillContent(agentId: string, name: string, body: { content?: string; description?: string }): ServiceResult<{ success: true }>
```

Both validate `SKILL_NAME` **before** any path join (Review Focus 4) and 404 on unknown agent/skill; `updateSkillContent` requires non-empty `content`.

- [ ] **Step 1: Failing tests**: name `'../escape'`, `'a/b'`, `''` → 400 `invalidField` without touching fs (assert mocked fs not called); unknown skill → 404; round-trip content; description update rewrites the registry entry's `description` (mock `getAgent`/registry fs per existing service-test idiom).
- [ ] **Step 2:** Run → FAIL. Implement registry fns + service + route (`{ params: Promise<{ id: string; name: string }> }`) + headless registration.
- [ ] **Step 3:** Run → PASS, suite green. **Commit** `feat: custom skill content read/write API`

### Task 11: Skills editor UI + window tool

**Files:**
- Modify: `components/marketplace/AgentSkillEditor.tsx`
- Create: `components/marketplace/SkillContentEditor.tsx`
- Modify: launcher list (`PanelMenu`) + `renderTool`: `{ id: 'skills', label: 'Skills', key: 'L' }` → renders `AgentSkillEditor` for the window's agent; ColonyProfileCard "Skills" button already opens it (Task 6).

**Interfaces:**
- `<SkillContentEditor agentId name onClose onSaved />`: fetches `GET .../skills/custom/<name>`, shows name (read-only), description field, monospace `<textarea>` (font-mono, min-h-[50vh]) for the SKILL.md body; Save → PATCH; dirty guard (shadcn Dialog confirm on close with unsaved changes).
- `AgentSkillEditor` changes: custom-skill rows gain **Edit** (opens SkillContentEditor) and a **New skill** button → name+description form that POSTs the existing add-skill route with scaffold content:

```markdown
---
name: <name>
description: <description>
---

<description>

## Instructions

```

Marketplace + built-in sections unchanged (toggle-only). Remove the "add SKILL.md files by hand" copy.

- [ ] **Step 1:** Build editor + wire rows/buttons; token classes + shadcn primitives in touched code.
- [ ] **Step 2:** Manual verify: create skill from the Skills window (key L) → file exists at `~/.aimaestro/agents/<id>/skills/<name>/SKILL.md`; edit + save → file updated; dirty-close prompts.
- [ ] **Step 3:** `yarn test` + tsc green. **Commit** `feat: skill content editor and skills window`

## Track D — Universal avatars

### Task 12: AgentAvatar component

**Files:**
- Create: `components/AgentAvatar.tsx`
- Test: `tests/agent-avatar.test.ts` (pure resolution helper)

**Interfaces:**

```ts
export function resolveAvatar(agent: { avatar?: string; name?: string; label?: string } | null | undefined):
  { kind: 'image'; src: string } | { kind: 'emoji'; emoji: string } | { kind: 'initial'; initial: string }
export function AgentAvatar(props: {
  agent: Agent | { id: string; name?: string; label?: string; avatar?: string } | null
  size?: 'xs' | 'sm' | 'md' | 'lg'      // 20 / 28 / 40 / 64 px
  showStatus?: boolean                   // composes StatusDot from presenceOf(agent) — only when a full Agent is given
  className?: string
}): JSX.Element
```

Resolution: `avatar` starting with `/` or matching an entry in `public/avatars/` → image (`next/image` not required; plain `<img>` matches existing `AgentFace` usage — **read `AgentFace.tsx` first and reuse its resolution if one exists**, wrapping rather than duplicating); single-grapheme emoji value → emoji span; else hash-colored initial (reuse the hash-color helper from `AgentList.tsx` — export it from a shared location `lib/agent-colors.ts` if it's currently inline).

- [ ] **Step 1: Failing tests** for `resolveAvatar`: portrait path → image; `'🤖'` → emoji; missing avatar → initial from label-over-name first grapheme; null agent → initial `'?'`.
- [ ] **Step 2:** Run → FAIL. Implement (extract hash color to `lib/agent-colors.ts`, re-export from AgentList to avoid touching its imports). Run → PASS.
- [ ] **Step 3:** **Commit** `feat: universal AgentAvatar component`

### Task 13: Migrate every surface to AgentAvatar

**Files (modify each to render `AgentAvatar` instead of initials/local variants):**
- `components/shell/StatusSidebar.tsx` (status rows), `components/shell/ProjectTree.tsx`, `components/shell/HomeScreen.tsx` (grid), `components/shell/AgentTopBar.tsx`, `components/shell/CommandPalette.tsx` (results), `components/shell/TeamWorkspace.tsx` + `components/shell/TeamChat.tsx` (members list, meeting chat bubbles — resolve full agent records from the `agents` prop by name/id before falling back), `components/team-meeting/KanbanCard.tsx`, `components/teams/TeamTasksSection.tsx`, `components/MessageCenter.tsx`, `components/shell/ColonyProfileCard.tsx` (swap `AgentFace` → `AgentAvatar`).

- [ ] **Step 1:** Sweep the files above: `grep -rn "charAt(0)\|toUpperCase()\|initial" components/shell components/team-meeting components/teams` to find every initial-circle; replace with `AgentAvatar` at the matching size; delete now-dead local avatar helpers.
- [ ] **Step 2:** Manual verify against the fleet: sidebar, home grid, team members ("Raimundo", "CodeAI" must show their avatar images, not R/C circles), meeting chat bubbles, kanban cards, palette.
- [ ] **Step 3:** `yarn test` + tsc green. **Commit** `feat: universal avatars across all surfaces`

---

# Phase 2 — Design pass (sequential, after Phase 1 merges)

### Task 14: Superdesign visual language

**Process task (uses the `superdesign` skill — the executor invokes it):**

- [ ] **Step 1:** Invoke the superdesign skill with the current shell (screenshot states: home, agent + 2 floating windows, colony + profile card, inbox, skills editor) and the brief: refine the `theme-ink` language — type scale, spacing rhythm, surface elevation for floating windows (shadow/border treatment), focus/hover states, status color accessibility — expressive but power-user-first (PRODUCT.md).
- [ ] **Step 2:** Apply the outcome **only** through `app/globals.css` token values, `tailwind.config.ts` token additions (e.g. `shadow-window`, radius scale) and `components/shell/ui.tsx` / `components/ui/*` variants — no per-component one-off styles.
- [ ] **Step 3:** Capture before/after screenshots; verify terminal legibility unchanged (`lib/terminal-theme.ts` untouched here).
- [ ] **Step 4:** **Commit** `style: apply refreshed visual language via tokens`

---

# Phase 3 — Polish (parallelizable per task)

### Task 15: Inbox (MessageCenter) redesign

**Files:**
- Modify: `components/MessageCenter.tsx` (split into:) Create: `components/inbox/MessageList.tsx`, `components/inbox/MessageReader.tsx`, `components/inbox/ComposeBar.tsx`

**Interfaces:**
- Consumes: existing message fetch/send plumbing already inside `MessageCenter` (REST `/api/messages/*` — keep every endpoint call and AMP behavior byte-identical; this is a presentation refactor), `AgentAvatar`, shadcn `Tabs`/`DropdownMenu`/`ScrollArea`, `useUnreadCounts`.
- Produces: two-pane layout (list: avatar, sender, subject, snippet, relative time, unread dot; reader: thread with compose/reply bar at bottom); unread/read/archive affordances; mark-read on open (existing endpoint).

- [ ] **Step 1:** Extract the three subcomponents; restyle with tokens; keep all handlers.
- [ ] **Step 2:** Manual verify: send an AMP message between two agents (existing flows), unread badge increments, opening marks read, reply arrives.
- [ ] **Step 3:** `yarn test` + tsc green. **Commit** `refactor: two-pane inbox redesign`

### Task 16: Theme toggle + token migration sweep

**Files:**
- Modify: `app/globals.css` (implement `.theme-paper` from its in-file recipe comment + the shadcn var block for it), `app/layout.tsx` (+ small client `components/ThemeApplier.tsx`: reads pref via `safe-storage` key `aimaestro-theme` = `'ink' | 'paper' | 'system'`, resolves `system` from `prefers-color-scheme`, sets body class, listens for changes), `components/settings/` (add a Theme section with the three-way shadcn `Select`), `lib/terminal-theme.ts` (add a paper variant keyed off the same pref), token sweep: `components/ChatView.tsx`, `components/AgentProfile.tsx`, `components/WorkTree.tsx`, `components/ConversationDetailPanel.tsx` (raw `gray-*`/`blue-*` → semantic tokens; `grep -n "gray-\|blue-" <file>` and map: `bg-gray-900→bg-surface`, `bg-gray-800→bg-raised`, `text-gray-400→text-ink-muted`, `border-gray-700→border-hairline`, `text-blue-*→text-accent`, `bg-blue-600→bg-accent-fill`).
- Remove the legacy `sidebar.*` hex set from `tailwind.config.ts` once `grep -rn "sidebar-" components/ app/` shows no command-center-reachable use (classic-only uses stay; if any exist, leave the palette and note it).
- Test: `tests/theme-pref.test.ts` for the pure resolver `resolveTheme(pref, systemDark) → 'theme-ink' | 'theme-paper'`.

- [ ] **Step 1:** Failing test for `resolveTheme` (`('system', true) → 'theme-ink'`, `('system', false) → 'theme-paper'`, `('paper', true) → 'theme-paper'`); implement in `lib/theme.ts`; PASS.
- [ ] **Step 2:** Implement `.theme-paper`, applier, settings control, terminal paper variant; sweep the four components.
- [ ] **Step 2b:** Reimplement `components/shell/ui.tsx`'s `Dialog`, `Select`, `Checkbox` and `Toggle` as thin wrappers over the shadcn equivalents (`@/components/ui/dialog`, `select`, `checkbox`, `switch`), **keeping their current exported prop signatures byte-compatible** so no call site changes; presentational primitives (Card, Row, SectionLabel, StatusDot, EmptyState, Badge, Button, IconButton) stay as-is. Verify every dialog in the shell still opens/closes (wizard, team create, delete agent).
- [ ] **Step 3:** Manual verify both themes across: shell, floating windows, colony card, inbox, chat, terminal (legible in both), dialogs.
- [ ] **Step 4:** `yarn test` green. **Commit** `feat: light theme with system preference + token migration sweep`

### Task 17: Sidebar "+" prominence + palette command

**Files:**
- Modify: `components/shell/StatusSidebar.tsx` (move the "+" `IconButton` from the footer (line ~131) to the header row next to search, `aria-label="New agent"`, tooltip "New agent"; remove the footer one), `components/shell/CommandPalette.tsx` (add a "Create agent…" command that fires the same `onCreateAgent` callback).

- [ ] **Step 1:** Make both changes.
- [ ] **Step 2:** Manual verify: header "+" opens the wizard; ⌘K → "create" → Enter opens the wizard; collapsed sidebar still exposes the "+" (icon-only rail).
- [ ] **Step 3:** `yarn test` + tsc green. **Commit** `feat: prominent New-agent button and palette command`

### Task 18: Final verification + release chores

- [ ] **Step 1:** Full pass: `yarn test`, `npx tsc --noEmit`, `yarn lint`, `yarn build` **in a separate worktree** (never the live checkout).
- [ ] **Step 2:** End-to-end manual script: create agent from header "+" → appears in sidebar + colony (refresh event) → open terminal (T) + colony (O) side by side, drag/resize/minimize/snap → click bot → card → edit label → add todo → new conversation → open skills → create + edit a skill → inbox send/receive → theme toggle both ways → reload restores windows.
- [ ] **Step 3:** `./scripts/bump-version.sh minor`; CHANGELOG entry describing the refurbish.
- [ ] **Step 4:** **Commit** `chore: bump version + changelog for workspace refurbish`

---

## Execution notes

- Phase 0 is sequential (Tasks 1→5). Phase 1's four tracks (Task 6 / Tasks 7–9 / Tasks 10–11 / Tasks 12–13) are independent domains — dispatch in parallel per the dispatching-parallel-agents skill, each agent getting only its track's tasks plus the Global Constraints block. Integration points after merge: ColonyProfileCard ↔ AgentTaskList (Task 9 wires it), ColonyProfileCard ↔ AgentAvatar (Task 13 migrates it).
- Phase 2 (superdesign) is one sequential task. Phase 3's three tasks are parallelizable again; Task 18 is last, sequential.
- Bot Crossing changes (Task 5) are committed in `/Users/obre/Downloads/bot-crossing` on `colony-teams`; the colony degrades gracefully if that repo isn't rebuilt (card simply never opens — `open-agent` still works).
