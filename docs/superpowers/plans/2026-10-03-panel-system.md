# Panel System (Part 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chat stays in the centre. Every other agent tool opens as a tab in a resizable side panel, which can sit on the right or be docked at the bottom, can be maximized or hidden, and is filled from a ＋ menu with one-letter shortcuts. The left sidebar becomes resizable and collapsible.

**Architecture:**
- **Pure layout logic** goes in `lib/panel-layout.ts`, written test-first: reducer, clamping, parsing, shortcuts.
- **Small presentational components** go in `components/shell/`: `ResizeHandle`, `PanelMenu`, `PanelDock`, `PanelBody`.
- **`hooks/useLayout.ts`** owns the state, persistence and global shortcuts.
- **`AppShell`** composes them. The tool bodies reuse the existing `AgentTabContent`, and `MessageCenter compact` for Inbox.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind 3 (ink tokens), lucide-react, Vitest (node), Yarn.

**Spec:** `docs/superpowers/specs/2026-10-03-panel-system-design.md`

## Global Constraints

- Branch `redesign/command-center`. Use Yarn. No API changes.
- The classic layout, tablet and mobile are not touched.
- **Dividers:**
  - 1px `bg-hairline` with a 9px hit area;
  - on hover (after 400ms) the line is `bg-gray-600` and a tooltip reads "Drag to resize sidebar" or "Drag to resize panel";
  - **never** an accent colour;
  - double-click resets the size;
  - arrow keys move ±16px, Shift+arrows ±64px.
- **Size limits:**
  - sidebar 220–420px, default 268;
  - right panel 320px to 70% of the work-area width, default 480;
  - bottom panel 200px to 70% of the work-area height, default 320.
- **Panel types and keys:** Terminal T, Inbox I, Files F, Memory M, Code graph G, Docs D, Canvas C, Search S, Playback P, Export X. One instance per type.
- **Global shortcuts:** ⌘J (Ctrl+J off Mac) toggles the panel, ⌘B (Ctrl+B) toggles the sidebar, ⌘⇧M (Ctrl+Shift+M) maximizes. All are ignored while focus is in an input, textarea, select, contenteditable or `.xterm`.
- **Persistence:**
  - one key, `aimaestro-layout`, holding JSON;
  - read after mount, never inside a `useState` initializer, to avoid SSR hydration mismatches;
  - every read and write goes through `lib/safe-storage.ts`.
- **Below 1100px work-area width,** the right panel overlays the chat instead of squeezing it.
- **Done means:** lint, test and tsc show no new failures (baseline: 4 test failures and 7 tsc errors), a Playwright browser check passes, and `yarn build` is never run while the dev server is up.

## Review Focus

1. **A corrupt or old `aimaestro-layout` value** (wrong types, unknown panel ids, negative sizes) must fall back field by field and not crash. Pinned by the `parseLayout` tests in Task 1.
2. **A window narrower than the minimums** (a container smaller than 320/0.7) must clamp to a usable size, never NaN or negative. Pinned by the `clampSize` tests in Task 1.
3. **Shortcuts while typing in the chat box or the terminal** must not toggle panels. Pinned by the `layoutShortcut` and `isEditableTarget` tests in Task 1.
4. **Closing the active tab** must activate a neighbour, and closing the last tab must leave a valid empty state. Pinned by the reducer tests in Task 1.
5. **Dragging over the terminal** must not stall: the drag uses pointer capture and turns off pointer events on xterm and iframes. Verified by the drag-over-terminal step in Task 5.

---

### Task 1: Layout logic (`lib/panel-layout.ts`)

**Files:**
- Create: `lib/panel-layout.ts`
- Test: `tests/panel-layout.test.ts`

**Interfaces:**
- Produces:
  - `PanelType`;
  - `PANEL_TYPES: { id: PanelType; label: string; key: string }[]`;
  - `PanelPosition = 'right' | 'bottom'`;
  - `LayoutState`;
  - `DEFAULT_LAYOUT`;
  - `LIMITS`;
  - `LayoutAction`;
  - `layoutReducer(s, a): LayoutState`;
  - `clampSize(v, min, max): number`;
  - `panelLimits(position, containerSize): { min: number; max: number }`;
  - `parseLayout(raw: string | null): LayoutState | null`;
  - `panelForKey(k: string): PanelType | null`;
  - `migrateActiveTab(tab: string | null): PanelType | null`;
  - `layoutShortcut(e, isMac): 'togglePanel' | 'toggleSidebar' | 'toggleMaximize' | null`;
  - `isEditableTarget(el): boolean`;
  - `keyboardStep(key, shift): number`.

- [ ] **Step 1: Write the failing tests**

Create `tests/panel-layout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LAYOUT, layoutReducer, clampSize, panelLimits, parseLayout, panelForKey,
  migrateActiveTab, layoutShortcut, isEditableTarget, keyboardStep, type LayoutState,
} from '@/lib/panel-layout'

const withTabs = (tabs: LayoutState['panel']['tabs'], active: LayoutState['panel']['active']): LayoutState =>
  ({ ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, open: true, tabs, active } })

describe('layoutReducer: tabs', () => {
  it('open adds a tab, activates it and opens the panel', () => {
    const s = layoutReducer({ ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, open: false } }, { type: 'open', panel: 'files' })
    expect(s.panel).toMatchObject({ open: true, tabs: ['files'], active: 'files' })
  })
  it('open on an existing type focuses it instead of duplicating', () => {
    const s = layoutReducer(withTabs(['terminal', 'inbox'], 'inbox'), { type: 'open', panel: 'terminal' })
    expect(s.panel.tabs).toEqual(['terminal', 'inbox'])
    expect(s.panel.active).toBe('terminal')
  })
  it('close on the active tab activates the right neighbour, else the left', () => {
    expect(layoutReducer(withTabs(['terminal', 'inbox', 'files'], 'inbox'), { type: 'close', panel: 'inbox' }).panel.active).toBe('files')
    expect(layoutReducer(withTabs(['terminal', 'inbox'], 'inbox'), { type: 'close', panel: 'inbox' }).panel.active).toBe('terminal')
  })
  it('closing a background tab keeps the active one', () => {
    expect(layoutReducer(withTabs(['terminal', 'inbox'], 'inbox'), { type: 'close', panel: 'terminal' }).panel).toMatchObject({ tabs: ['inbox'], active: 'inbox' })
  })
  it('closing the last tab leaves an empty, open panel', () => {
    expect(layoutReducer(withTabs(['inbox'], 'inbox'), { type: 'close', panel: 'inbox' }).panel).toMatchObject({ open: true, tabs: [], active: null })
  })
})

describe('layoutReducer: panel controls', () => {
  it('toggle hides an open panel and un-maximizes it', () => {
    const s = layoutReducer({ ...withTabs(['terminal'], 'terminal'), panel: { ...withTabs(['terminal'], 'terminal').panel, maximized: true } }, { type: 'toggle' })
    expect(s.panel).toMatchObject({ open: false, maximized: false })
  })
  it('toggle opens a hidden panel; with no tabs it opens Terminal', () => {
    const hidden = { ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, open: false, tabs: [], active: null } }
    expect(layoutReducer(hidden, { type: 'toggle' }).panel).toMatchObject({ open: true, tabs: ['terminal'], active: 'terminal' })
  })
  it('setPosition keeps maximize and tabs', () => {
    const s = layoutReducer({ ...withTabs(['memory'], 'memory'), panel: { ...withTabs(['memory'], 'memory').panel, maximized: true } }, { type: 'setPosition', position: 'bottom' })
    expect(s.panel).toMatchObject({ position: 'bottom', maximized: true, tabs: ['memory'] })
  })
  it('toggleMaximize flips and opens; restore un-maximizes', () => {
    const m = layoutReducer({ ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, open: false } }, { type: 'toggleMaximize' })
    expect(m.panel).toMatchObject({ open: true, maximized: true })
    expect(layoutReducer(m, { type: 'restore' }).panel.maximized).toBe(false)
  })
  it('sidebar resize clamps to 220–420 and toggleSidebar flips collapse', () => {
    expect(layoutReducer(DEFAULT_LAYOUT, { type: 'resizeSidebar', width: 999 }).sidebarW).toBe(420)
    expect(layoutReducer(DEFAULT_LAYOUT, { type: 'resizeSidebar', width: 10 }).sidebarW).toBe(220)
    expect(layoutReducer(DEFAULT_LAYOUT, { type: 'toggleSidebar' }).sidebarCollapsed).toBe(true)
  })
  it('panel resize clamps by position and container', () => {
    const right = layoutReducer(DEFAULT_LAYOUT, { type: 'resizePanel', size: 2000, container: 1000 })
    expect(right.panel.rightW).toBe(700)
    const bottom = layoutReducer({ ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, position: 'bottom' } }, { type: 'resizePanel', size: 50, container: 800 })
    expect(bottom.panel.bottomH).toBe(200)
    expect(bottom.panel.rightW).toBe(DEFAULT_LAYOUT.panel.rightW)
  })
})

describe('clampSize / panelLimits', () => {
  it('clamps, and never returns below min even if max < min', () => {
    expect(clampSize(50, 100, 300)).toBe(100)
    expect(clampSize(500, 100, 300)).toBe(300)
    expect(clampSize(200, 320, 140)).toBe(320)
    expect(clampSize(NaN, 100, 300)).toBe(100)
  })
  it('limits come from position and container', () => {
    expect(panelLimits('right', 1000)).toEqual({ min: 320, max: 700 })
    expect(panelLimits('bottom', 600)).toEqual({ min: 200, max: 420 })
    expect(panelLimits('right', 200)).toEqual({ min: 320, max: 320 })
  })
})

describe('parseLayout', () => {
  it('returns null for missing or unparsable', () => {
    expect(parseLayout(null)).toBeNull()
    expect(parseLayout('{nope')).toBeNull()
    expect(parseLayout('42')).toBeNull()
  })
  it('keeps valid fields and falls back per field', () => {
    const s = parseLayout(JSON.stringify({
      sidebarW: 300, sidebarCollapsed: 'yes',
      panel: { open: true, position: 'top', rightW: -5, bottomH: 333, maximized: false, tabs: ['terminal', 'bogus', 'inbox', 'terminal'], active: 'bogus' },
    }))!
    expect(s.sidebarW).toBe(300)
    expect(s.sidebarCollapsed).toBe(false)
    expect(s.panel.position).toBe('right')
    expect(s.panel.rightW).toBe(DEFAULT_LAYOUT.panel.rightW)
    expect(s.panel.bottomH).toBe(333)
    expect(s.panel.tabs).toEqual(['terminal', 'inbox'])
    expect(s.panel.active).toBe('terminal')
  })
})

describe('keys and shortcuts', () => {
  it('panelForKey maps letters case-insensitively', () => {
    expect(panelForKey('t')).toBe('terminal')
    expect(panelForKey('I')).toBe('inbox')
    expect(panelForKey('x')).toBe('export')
    expect(panelForKey('z')).toBeNull()
  })
  it('migrateActiveTab maps old tabs; chat stays in the centre', () => {
    expect(migrateActiveTab('worktree')).toBe('files')
    expect(migrateActiveTab('messages')).toBe('inbox')
    expect(migrateActiveTab('chat')).toBeNull()
    expect(migrateActiveTab('streaming')).toBeNull()
    expect(migrateActiveTab(null)).toBeNull()
  })
  it('layoutShortcut: Cmd on Mac, Ctrl elsewhere', () => {
    const e = (o: object) => ({ key: 'j', metaKey: false, ctrlKey: false, shiftKey: false, ...o })
    expect(layoutShortcut(e({ metaKey: true }), true)).toBe('togglePanel')
    expect(layoutShortcut(e({ ctrlKey: true }), true)).toBeNull()
    expect(layoutShortcut(e({ ctrlKey: true }), false)).toBe('togglePanel')
    expect(layoutShortcut(e({ key: 'b', metaKey: true }), true)).toBe('toggleSidebar')
    expect(layoutShortcut(e({ key: 'M', metaKey: true, shiftKey: true }), true)).toBe('toggleMaximize')
    expect(layoutShortcut(e({ key: 'm', metaKey: true }), true)).toBeNull()
  })
  it('isEditableTarget spots inputs, contenteditable and the terminal', () => {
    const el = (tag: string, match = '') => ({ tagName: tag, isContentEditable: false, closest: (s: string) => (s === match ? {} : null) })
    expect(isEditableTarget(el('INPUT') as any)).toBe(true)
    expect(isEditableTarget(el('TEXTAREA') as any)).toBe(true)
    expect(isEditableTarget(el('DIV', '.xterm') as any)).toBe(true)
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true, closest: () => null } as any)).toBe(true)
    expect(isEditableTarget(el('DIV') as any)).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
  it('keyboardStep: arrows 16, shift 64, others 0', () => {
    expect(keyboardStep('ArrowRight', false)).toBe(16)
    expect(keyboardStep('ArrowLeft', true)).toBe(-64)
    expect(keyboardStep('ArrowDown', false)).toBe(16)
    expect(keyboardStep('ArrowUp', false)).toBe(-16)
    expect(keyboardStep('Enter', false)).toBe(0)
  })
})
```

- [ ] **Step 2: Run them and see them fail**

Run: `yarn vitest run tests/panel-layout.test.ts`
Expected: FAIL with `Cannot find package '@/lib/panel-layout'`.

- [ ] **Step 3: Implement**

Create `lib/panel-layout.ts`:

```ts
/**
 * Panel system layout: which tool panels are open, where, and how big.
 * Pure (no React, no storage) so it can be unit-tested. Spec: 2026-10-03-panel-system-design.md
 */
export type PanelType = 'terminal' | 'inbox' | 'files' | 'memory' | 'graph' | 'docs' | 'canvas' | 'search' | 'playback' | 'export'
export type PanelPosition = 'right' | 'bottom'

export const PANEL_TYPES: { id: PanelType; label: string; key: string }[] = [
  { id: 'terminal', label: 'Terminal', key: 'T' },
  { id: 'inbox', label: 'Inbox', key: 'I' },
  { id: 'files', label: 'Files', key: 'F' },
  { id: 'memory', label: 'Memory', key: 'M' },
  { id: 'graph', label: 'Code graph', key: 'G' },
  { id: 'docs', label: 'Docs', key: 'D' },
  { id: 'canvas', label: 'Canvas', key: 'C' },
  { id: 'search', label: 'Search', key: 'S' },
  { id: 'playback', label: 'Playback', key: 'P' },
  { id: 'export', label: 'Export', key: 'X' },
]
const TYPE_IDS = new Set<string>(PANEL_TYPES.map(p => p.id))

export interface PanelState {
  open: boolean
  position: PanelPosition
  rightW: number
  bottomH: number
  maximized: boolean
  tabs: PanelType[]
  active: PanelType | null
}
export interface LayoutState {
  sidebarW: number
  sidebarCollapsed: boolean
  panel: PanelState
}

export const LIMITS = {
  sidebar: { min: 220, max: 420, def: 268 },
  right: { min: 320, ratio: 0.7, def: 480 },
  bottom: { min: 200, ratio: 0.7, def: 320 },
} as const

export const DEFAULT_LAYOUT: LayoutState = {
  sidebarW: LIMITS.sidebar.def,
  sidebarCollapsed: false,
  panel: { open: true, position: 'right', rightW: LIMITS.right.def, bottomH: LIMITS.bottom.def, maximized: false, tabs: ['inbox'], active: 'inbox' },
}

export type LayoutAction =
  | { type: 'open'; panel: PanelType }
  | { type: 'close'; panel: PanelType }
  | { type: 'activate'; panel: PanelType }
  | { type: 'toggle' }
  | { type: 'setPosition'; position: PanelPosition }
  | { type: 'toggleMaximize' }
  | { type: 'restore' }
  | { type: 'resizeSidebar'; width: number }
  | { type: 'resizePanel'; size: number; container: number }
  | { type: 'toggleSidebar' }
  | { type: 'replace'; state: LayoutState }

export function clampSize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(Math.max(max, min), value))
}

export function panelLimits(position: PanelPosition, container: number): { min: number; max: number } {
  const l = position === 'right' ? LIMITS.right : LIMITS.bottom
  return { min: l.min, max: Math.max(l.min, Math.round(container * l.ratio)) }
}

export function layoutReducer(s: LayoutState, a: LayoutAction): LayoutState {
  const p = s.panel
  switch (a.type) {
    case 'open':
      return { ...s, panel: { ...p, open: true, tabs: p.tabs.includes(a.panel) ? p.tabs : [...p.tabs, a.panel], active: a.panel } }
    case 'close': {
      const i = p.tabs.indexOf(a.panel)
      if (i === -1) return s
      const tabs = p.tabs.filter(t => t !== a.panel)
      const active = p.active === a.panel ? (tabs[i] ?? tabs[i - 1] ?? null) : p.active
      return { ...s, panel: { ...p, tabs, active } }
    }
    case 'activate':
      return p.tabs.includes(a.panel) ? { ...s, panel: { ...p, active: a.panel, open: true } } : s
    case 'toggle':
      if (p.open) return { ...s, panel: { ...p, open: false, maximized: false } }
      if (p.tabs.length === 0) return { ...s, panel: { ...p, open: true, tabs: ['terminal'], active: 'terminal' } }
      return { ...s, panel: { ...p, open: true, active: p.active ?? p.tabs[0] } }
    case 'setPosition':
      return { ...s, panel: { ...p, position: a.position } }
    case 'toggleMaximize':
      return { ...s, panel: { ...p, open: true, maximized: !p.maximized } }
    case 'restore':
      return { ...s, panel: { ...p, maximized: false } }
    case 'resizeSidebar':
      return { ...s, sidebarW: clampSize(Math.round(a.width), LIMITS.sidebar.min, LIMITS.sidebar.max) }
    case 'resizePanel': {
      const { min, max } = panelLimits(p.position, a.container)
      const size = clampSize(Math.round(a.size), min, max)
      return { ...s, panel: p.position === 'right' ? { ...p, rightW: size } : { ...p, bottomH: size } }
    }
    case 'toggleSidebar':
      return { ...s, sidebarCollapsed: !s.sidebarCollapsed }
    case 'replace':
      return a.state
  }
}

const num = (v: unknown, min: number, max: number, def: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : def

/** Validate stored layout field by field; null when there is nothing usable. */
export function parseLayout(raw: string | null): LayoutState | null {
  if (!raw) return null
  let o: unknown
  try { o = JSON.parse(raw) } catch { return null }
  if (!o || typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  const rp = (r.panel && typeof r.panel === 'object' ? r.panel : {}) as Record<string, unknown>
  const d = DEFAULT_LAYOUT.panel
  const tabs = Array.isArray(rp.tabs)
    ? [...new Set(rp.tabs.filter((t): t is PanelType => typeof t === 'string' && TYPE_IDS.has(t)))]
    : d.tabs
  const active = typeof rp.active === 'string' && tabs.includes(rp.active as PanelType) ? (rp.active as PanelType) : (tabs[0] ?? null)
  return {
    sidebarW: num(r.sidebarW, LIMITS.sidebar.min, LIMITS.sidebar.max, LIMITS.sidebar.def),
    sidebarCollapsed: typeof r.sidebarCollapsed === 'boolean' ? r.sidebarCollapsed : false,
    panel: {
      open: typeof rp.open === 'boolean' ? rp.open : d.open,
      position: rp.position === 'bottom' ? 'bottom' : 'right',
      rightW: num(rp.rightW, LIMITS.right.min, 4000, d.rightW),
      bottomH: num(rp.bottomH, LIMITS.bottom.min, 4000, d.bottomH),
      maximized: typeof rp.maximized === 'boolean' ? rp.maximized : false,
      tabs,
      active,
    },
  }
}

export function panelForKey(k: string): PanelType | null {
  return PANEL_TYPES.find(p => p.key === k.toUpperCase())?.id ?? null
}

const TAB_TO_PANEL: Record<string, PanelType> = {
  terminal: 'terminal', messages: 'inbox', worktree: 'files', memory: 'memory', graph: 'graph',
  docs: 'docs', canvas: 'canvas', search: 'search', playback: 'playback', export: 'export',
}
export function migrateActiveTab(tab: string | null): PanelType | null {
  return tab ? TAB_TO_PANEL[tab] ?? null : null
}

export function layoutShortcut(
  e: { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
  isMac: boolean,
): 'togglePanel' | 'toggleSidebar' | 'toggleMaximize' | null {
  if (!(isMac ? e.metaKey : e.ctrlKey)) return null
  const k = e.key.toLowerCase()
  if (k === 'j' && !e.shiftKey) return 'togglePanel'
  if (k === 'b' && !e.shiftKey) return 'toggleSidebar'
  if (k === 'm' && e.shiftKey) return 'toggleMaximize'
  return null
}

export function isEditableTarget(el: { tagName?: string; isContentEditable?: boolean; closest?: (s: string) => unknown } | null): boolean {
  if (!el) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  return !!el.closest?.('.xterm')
}

export function keyboardStep(key: string, shift: boolean): number {
  const step = shift ? 64 : 16
  if (key === 'ArrowRight' || key === 'ArrowDown') return step
  if (key === 'ArrowLeft' || key === 'ArrowUp') return -step
  return 0
}
```

- [ ] **Step 4: Run them and see them pass**

Run: `yarn vitest run tests/panel-layout.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/panel-layout.ts tests/panel-layout.test.ts
git commit -m "feat(panels): add pure panel layout reducer, limits and shortcuts"
```

---

### Task 2: ResizeHandle

**Files:**
- Create: `components/shell/ResizeHandle.tsx`
- Modify: `app/globals.css` (append the `.is-resizing` rules)

**Interfaces:**
- Consumes: `keyboardStep` (Task 1).
- Produces: `ResizeHandle({ orientation: 'vertical' | 'horizontal', value: number, min: number, max: number, invert?: boolean, label: string, onResize: (size: number) => void, onReset: () => void })`.
  - `vertical` is a column divider that resizes width.
  - `invert` means dragging toward the start makes the value grow; it's used by the right and bottom panels.

This is a presentational component, so there's no unit test. Its pure maths (`keyboardStep`, `clampSize`) is tested in Task 1, and the behaviour is verified in Task 5.

- [ ] **Step 1: CSS for drags**

Append to `app/globals.css`:

```css
/* While a ResizeHandle is dragged: no text selection, and terminals/iframes
   must not swallow pointer events (the drag would stall over them). */
.is-resizing, .is-resizing * { user-select: none !important; }
.is-resizing iframe, .is-resizing .xterm { pointer-events: none; }
```

- [ ] **Step 2: Component**

Create `components/shell/ResizeHandle.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { keyboardStep } from '@/lib/panel-layout'

/** 1px divider with a wide invisible grip. Grey only; a tooltip appears on hover. */
export default function ResizeHandle({ orientation, value, min, max, invert = false, label, onResize, onReset }: {
  orientation: 'vertical' | 'horizontal'
  value: number
  min: number
  max: number
  invert?: boolean
  label: string
  onResize: (size: number) => void
  onReset: () => void
}) {
  const vertical = orientation === 'vertical'
  const drag = useRef<{ start: number; value: number } | null>(null)
  const [hover, setHover] = useState(false)
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const sign = invert ? -1 : 1
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { start: vertical ? e.clientX : e.clientY, value }
    document.body.classList.add('is-resizing')
    document.body.style.cursor = vertical ? 'col-resize' : 'row-resize'
    setTip(null)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) {
      if (hover && !tip) setTip({ x: e.clientX, y: e.clientY })
      return
    }
    const delta = ((vertical ? e.clientX : e.clientY) - drag.current.start) * sign
    onResize(drag.current.value + delta)
  }
  const end = (e: React.PointerEvent) => {
    if (!drag.current) return
    drag.current = null
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    document.body.classList.remove('is-resizing')
    document.body.style.cursor = ''
  }

  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={onReset}
      onKeyDown={e => {
        const step = keyboardStep(e.key, e.shiftKey)
        if (step) { e.preventDefault(); onResize(value + step * sign) }
      }}
      onPointerEnter={() => { timer.current = setTimeout(() => setHover(true), 400) }}
      onPointerLeave={() => { if (timer.current) clearTimeout(timer.current); setHover(false); setTip(null) }}
      className={`group relative flex-none z-10 focus-visible:outline-none ${vertical ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize'}`}
    >
      {/* the visible 1px line */}
      <span aria-hidden className={`absolute inset-0 transition-colors ${hover || drag.current ? 'bg-gray-600' : 'bg-hairline'} group-focus-visible:bg-gray-600`} />
      {/* wide invisible grip */}
      <span aria-hidden className={`absolute ${vertical ? 'inset-y-0 -left-1 -right-1' : 'inset-x-0 -top-1 -bottom-1'}`} />
      {hover && tip && !drag.current && (
        <span role="tooltip" style={{ left: tip.x + 14, top: tip.y - 10 }}
          className="fixed z-50 pointer-events-none whitespace-nowrap rounded-[8px] border border-hairline bg-surface px-2.5 py-1 text-[12.5px] text-ink">
          {label}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `yarn -s tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `7` (the baseline).

- [ ] **Step 4: Commit**

```bash
git add components/shell/ResizeHandle.tsx app/globals.css
git commit -m "feat(panels): add slim grey resize handle with tooltip"
```

---

### Task 3: useLayout hook

**Files:**
- Create: `hooks/useLayout.ts`

**Interfaces:**
- Consumes: Task 1 (`layoutReducer`, `DEFAULT_LAYOUT`, `parseLayout`, `migrateActiveTab`, `layoutShortcut`, `isEditableTarget`); `readString`/`writePref` from `lib/safe-storage`.
- Produces: `useLayout(): { layout: LayoutState; dispatch: React.Dispatch<LayoutAction>; hydrated: boolean }`, plus the global ⌘J/⌘B/⌘⇧M listeners. The storage key is `LAYOUT_KEY = 'aimaestro-layout'`.

- [ ] **Step 1: Implement**

Create `hooks/useLayout.ts`:

```ts
'use client'

/** Layout state for the command-center shell: reducer + persistence + global shortcuts. */
import { useEffect, useReducer, useRef, useState } from 'react'
import { DEFAULT_LAYOUT, isEditableTarget, layoutReducer, layoutShortcut, migrateActiveTab, parseLayout } from '@/lib/panel-layout'
import { readString, writePref } from '@/lib/safe-storage'

export const LAYOUT_KEY = 'aimaestro-layout'

export function useLayout() {
  const [layout, dispatch] = useReducer(layoutReducer, DEFAULT_LAYOUT)
  const [hydrated, setHydrated] = useState(false)

  // Read after mount (the server render has no localStorage)
  useEffect(() => {
    const stored = parseLayout(readString(LAYOUT_KEY))
    if (stored) {
      dispatch({ type: 'replace', state: stored })
    } else {
      // First run with panels: carry over the old top-tab choice once
      const migrated = migrateActiveTab(readString('aimaestro-active-tab'))
      if (migrated) dispatch({ type: 'open', panel: migrated })
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) writePref(LAYOUT_KEY, JSON.stringify(layout))
  }, [layout, hydrated])

  const layoutRef = useRef(layout)
  layoutRef.current = layout
  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    const onKey = (e: KeyboardEvent) => {
      const action = layoutShortcut(e, isMac)
      if (!action || isEditableTarget(e.target as Element | null)) return
      e.preventDefault()
      if (action === 'togglePanel') dispatch({ type: 'toggle' })
      else if (action === 'toggleSidebar') dispatch({ type: 'toggleSidebar' })
      else dispatch({ type: 'toggleMaximize' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { layout, dispatch, hydrated }
}
```

- [ ] **Step 2: Type-check and commit**

Run: `yarn -s tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `7`.

```bash
git add hooks/useLayout.ts
git commit -m "feat(panels): add useLayout with persistence and shortcuts"
```

---

### Task 4: PanelMenu, PanelBody and PanelDock

**Files:**
- Create: `components/shell/PanelMenu.tsx`
- Create: `components/shell/PanelBody.tsx`
- Create: `components/shell/PanelDock.tsx`

**Interfaces:**
- Consumes:
  - Task 1 (`PANEL_TYPES`, `PanelType`, `panelForKey`, `LayoutState`, `LayoutAction`);
  - `AgentTabContent` and its `AgentTab` type (`components/shell/AgentTabContent.tsx`);
  - `MessageCenter`;
  - `agentToSession` and `getAgentBaseUrl` (`lib/agent-utils`);
  - the `ui` primitives.
- Produces:
  - `PanelMenu({ open, onClose, onPick: (t: PanelType) => void, openTypes: PanelType[] })`;
  - `PanelBody({ type, agent, onlineAgents, wakingAgentId, onWake, onShowProfile })`;
  - `PanelDock({ layout, dispatch, agent, onlineAgents, unread, wakingAgentId, onWake, onShowProfile })`;
  - `PANEL_ICONS: Record<PanelType, LucideIcon>`.

- [ ] **Step 1: PanelMenu**

Create `components/shell/PanelMenu.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { SquareTerminal, Inbox, FolderTree, Brain, GitBranch, FileText, LayoutPanelTop, Search, PlayCircle, Download, type LucideIcon } from 'lucide-react'
import { PANEL_TYPES, panelForKey, type PanelType } from '@/lib/panel-layout'

export const PANEL_ICONS: Record<PanelType, LucideIcon> = {
  terminal: SquareTerminal, inbox: Inbox, files: FolderTree, memory: Brain, graph: GitBranch,
  docs: FileText, canvas: LayoutPanelTop, search: Search, playback: PlayCircle, export: Download,
}

/** The ＋ menu: one row per tool, single-letter shortcuts while open. */
export default function PanelMenu({ open, onClose, onPick, openTypes }: {
  open: boolean; onClose: () => void; onPick: (t: PanelType) => void; openTypes: PanelType[]
}) {
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setIndex(0)
    ref.current?.focus()
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open, onClose])

  if (!open) return null
  const pick = (t: PanelType) => { onPick(t); onClose() }

  return (
    <div ref={ref} role="menu" aria-label="Open a tool" tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
        if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => (i + 1) % PANEL_TYPES.length); return }
        if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => (i - 1 + PANEL_TYPES.length) % PANEL_TYPES.length); return }
        if (e.key === 'Enter') { e.preventDefault(); pick(PANEL_TYPES[index].id); return }
        if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
          const t = panelForKey(e.key)
          if (t) { e.preventDefault(); pick(t) }
        }
      }}
      className="absolute left-0 top-full mt-1.5 z-40 w-[250px] rounded-[12px] border border-hairline bg-surface p-1.5 focus:outline-none">
      {PANEL_TYPES.map((p, i) => {
        const Icon = PANEL_ICONS[p.id]
        return (
          <button key={p.id} type="button" role="menuitem" onMouseEnter={() => setIndex(i)} onClick={() => pick(p.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] text-[14px] text-left ${i === index ? 'bg-raised text-ink' : 'text-gray-300'}`}>
            <Icon strokeWidth={1.5} className="w-4 h-4 text-ink-muted" />
            {p.label}
            {openTypes.includes(p.id) && <span className="text-[11px] text-gray-500">open</span>}
            <span className="ml-auto text-[12px] text-gray-500">{p.key}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: PanelBody**

Create `components/shell/PanelBody.tsx`:

```tsx
'use client'

import MessageCenter from '@/components/MessageCenter'
import ErrorBoundary from '@/components/ErrorBoundary'
import { agentToSession, getAgentBaseUrl } from '@/lib/agent-utils'
import type { Agent } from '@/types/agent'
import type { PanelType } from '@/lib/panel-layout'
import AgentTabContent, { type AgentTab } from './AgentTabContent'

const TAB_FOR: Record<Exclude<PanelType, 'inbox'>, AgentTab> = {
  terminal: 'terminal', files: 'worktree', memory: 'memory', graph: 'graph', docs: 'docs',
  canvas: 'canvas', search: 'search', playback: 'playback', export: 'export',
}

/** Same recipient shape the classic Messages tab passes to MessageCenter. */
function toRecipients(onlineAgents: Agent[]) {
  return onlineAgents.map(a => ({
    id: a.id,
    name: a.name || a.alias || a.id,
    alias: a.label || a.name || a.alias || a.id,
    tmuxSessionName: a.session?.tmuxSessionName,
    hostId: a.hostId,
  }))
}

/** One tool's content inside the panel dock. */
export default function PanelBody({ type, agent, onlineAgents, wakingAgentId, onWake, onShowProfile }: {
  type: PanelType
  agent: Agent
  onlineAgents: Agent[]
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
}) {
  if (type === 'inbox') {
    return (
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <ErrorBoundary fallbackLabel="Inbox">
          <MessageCenter sessionName={agentToSession(agent).id} agentId={agent.id} allAgents={toRecipients(onlineAgents)}
            hostUrl={getAgentBaseUrl(agent)} isActive={true} compact />
        </ErrorBoundary>
      </div>
    )
  }
  return (
    <AgentTabContent agent={agent} activeTab={TAB_FOR[type]} setActiveTab={() => {}} onlineAgents={onlineAgents}
      wakingAgentId={wakingAgentId} onWake={onWake} onShowProfile={onShowProfile} hideHeaders chatVariant="ink" />
  )
}
```

- [ ] **Step 3: PanelDock**

Create `components/shell/PanelDock.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Plus, X, Maximize2, Minimize2, PanelBottom, PanelRight, PanelRightClose } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { PANEL_TYPES, type LayoutAction, type LayoutState } from '@/lib/panel-layout'
import { Badge, IconButton, EmptyState } from './ui'
import PanelMenu, { PANEL_ICONS } from './PanelMenu'
import PanelBody from './PanelBody'

/** Tabbed tool panel: chips, ＋ menu, maximize / dock / hide, active body. */
export default function PanelDock({ layout, dispatch, agent, onlineAgents, unread, wakingAgentId, onWake, onShowProfile }: {
  layout: LayoutState
  dispatch: React.Dispatch<LayoutAction>
  agent: Agent
  onlineAgents: Agent[]
  unread: number
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const p = layout.panel
  const labelOf = (t: string) => PANEL_TYPES.find(x => x.id === t)?.label ?? t

  return (
    <div className={`h-full w-full min-w-0 min-h-0 flex flex-col bg-sunken ${p.position === 'bottom' ? '' : ''}`}>
      <div className="h-[52px] flex-none flex items-center gap-1.5 px-2.5 border-b border-hairline/70">
        <div role="tablist" aria-label="Open tools" className="flex items-center gap-1 min-w-0 overflow-x-auto">
          {p.tabs.map(t => {
            const Icon = PANEL_ICONS[t]
            const on = t === p.active
            return (
              <div key={t} className={`group flex items-center rounded-[9px] ${on ? 'bg-raised' : 'hover:bg-raised/50'}`}>
                <button type="button" role="tab" aria-selected={on} onClick={() => dispatch({ type: 'activate', panel: t })}
                  className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 text-[13px] whitespace-nowrap ${on ? 'text-ink' : 'text-ink-muted'}`}>
                  <Icon strokeWidth={1.5} className="w-3.5 h-3.5" />{labelOf(t)}
                  {t === 'inbox' && unread > 0 && <Badge>{unread}</Badge>}
                </button>
                <button type="button" aria-label={`Close ${labelOf(t)}`} onClick={() => dispatch({ type: 'close', panel: t })}
                  className={`mr-1 grid place-items-center w-5 h-5 rounded-[6px] text-gray-500 hover:text-ink ${on ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                  <X strokeWidth={1.5} className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
        <div className="relative flex-none">
          <IconButton label="Open a tool" active={menuOpen} onClick={() => setMenuOpen(o => !o)}><Plus strokeWidth={1.5} className="w-4 h-4" /></IconButton>
          <PanelMenu open={menuOpen} onClose={() => setMenuOpen(false)} openTypes={p.tabs} onPick={t => dispatch({ type: 'open', panel: t })} />
        </div>
        <div className="ml-auto flex items-center gap-0.5 flex-none">
          <IconButton label={p.maximized ? 'Restore panel' : 'Maximize panel'} onClick={() => dispatch({ type: 'toggleMaximize' })}>
            {p.maximized ? <Minimize2 strokeWidth={1.5} className="w-4 h-4" /> : <Maximize2 strokeWidth={1.5} className="w-4 h-4" />}
          </IconButton>
          <IconButton label={p.position === 'right' ? 'Dock panel to bottom' : 'Dock panel to right'}
            onClick={() => dispatch({ type: 'setPosition', position: p.position === 'right' ? 'bottom' : 'right' })}>
            {p.position === 'right' ? <PanelBottom strokeWidth={1.5} className="w-4 h-4" /> : <PanelRight strokeWidth={1.5} className="w-4 h-4" />}
          </IconButton>
          <IconButton label="Hide panel" onClick={() => dispatch({ type: 'toggle' })}><PanelRightClose strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex relative">
        {p.active ? (
          <PanelBody key={p.active} type={p.active} agent={agent} onlineAgents={onlineAgents}
            wakingAgentId={wakingAgentId} onWake={onWake} onShowProfile={onShowProfile} />
        ) : (
          <div className="flex-1 grid place-items-center">
            <EmptyState title="Open a tool" description="Use ＋ or press ⌘J. Terminal, Inbox, Files, Memory and more open here."
              action={<span className="text-[13px] text-ink-muted">＋ then a letter: T I F M G D C S P X</span>} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type-check and commit**

Run: `yarn -s tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `7`. If a lucide icon name is missing in the installed version, swap it for one that exists: `FolderTree` → `Folder`, `LayoutPanelTop` → `PanelsTopLeft`.

```bash
git add components/shell/PanelMenu.tsx components/shell/PanelBody.tsx components/shell/PanelDock.tsx
git commit -m "feat(panels): add panel dock, + menu and panel bodies"
```

---

### Task 5: Wire it into AppShell, the top bar and the sidebar

**Files:**
- Modify: `components/shell/AppShell.tsx`
- Modify: `components/shell/AgentTopBar.tsx` (replace the inbox props with panel and sidebar props)
- Modify: `components/shell/StatusSidebar.tsx` (`width`, `onCollapse`)
- Delete: `components/shell/TabBar.tsx`, `components/shell/InboxPanel.tsx`

**Interfaces:**
- Consumes: `useLayout` (Task 3), `ResizeHandle` (Task 2), `PanelDock` (Task 4), `panelLimits`/`LIMITS` (Task 1), `resolveAgentTab` (`lib/shell-tabs`).
- Produces:
  - `AgentTopBarProps`: drops `onToggleInbox`/`inboxCollapsed` and adds `panelOpen: boolean; onTogglePanel(): void; sidebarCollapsed: boolean; onToggleSidebar(): void`.
  - `StatusSidebarProps`: adds `width: number; onCollapse(): void`.

- [ ] **Step 1: StatusSidebar width and collapse**

In `components/shell/StatusSidebar.tsx`:
- Add `width: number` and `onCollapse: () => void` to `StatusSidebarProps`.
- Change the `<aside className="w-[268px] flex-none …">` to `<aside style={{ width: p.width }} className="flex-none …">`. Keep the rest of its classes.
- Replace the brand row's static `<PanelLeft … />` with a button that collapses the sidebar:

```tsx
        <button type="button" aria-label="Collapse sidebar" title="Collapse sidebar (⌘B)" onClick={p.onCollapse}
          className="grid place-items-center w-6 h-6 -ml-1 rounded-[6px] text-ink-muted hover:text-ink hover:bg-raised">
          <PanelLeft strokeWidth={1.5} className="w-4 h-4" />
        </button>AI Maestro
```

- [ ] **Step 2: AgentTopBar props**

In `components/shell/AgentTopBar.tsx`:
- Replace `onToggleInbox: () => void` and `inboxCollapsed: boolean` with `panelOpen: boolean; onTogglePanel: () => void; sidebarCollapsed: boolean; onToggleSidebar: () => void`.
- Replace the last `IconButton` (Show/Hide inbox) with `<IconButton label={p.panelOpen ? 'Hide panel (⌘J)' : 'Show panel (⌘J)'} onClick={p.onTogglePanel} active={p.panelOpen}><PanelRight strokeWidth={1.5} className="w-4 h-4" /></IconButton>`.
- As the first child of `<header>`, add `{p.sidebarCollapsed && <IconButton label="Expand sidebar (⌘B)" onClick={p.onToggleSidebar}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>}`.
- Import `PanelLeft` from lucide-react.

- [ ] **Step 3: AppShell layout**

In `components/shell/AppShell.tsx`:
- Remove the `TabBar`, `InboxPanel`, `readBool`/`writePref`/`INBOX_KEY` imports and the `inboxCollapsed` state.
- Import `useLayout`, `ResizeHandle`, `PanelDock`, `{ LIMITS, panelLimits }` and `resolveAgentTab`.

Add the following after `const sleep = …`:

```tsx
  const { layout, dispatch } = useLayout()
  const workRef = useRef<HTMLDivElement>(null)
  const [work, setWork] = useState({ w: 1200, h: 800 })
  useEffect(() => {
    const el = workRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWork({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [agent])
  const P = layout.panel
  const container = P.position === 'right' ? work.w : work.h
  const lim = panelLimits(P.position, container)
  const overlay = P.position === 'right' && work.w < 1100
```

(`useRef` is added to the react import.) Then replace the returned JSX with:

```tsx
    <div className="fixed inset-0 flex bg-sunken text-ink overflow-hidden">
      {!layout.sidebarCollapsed && (
        <>
          <StatusSidebar
            width={layout.sidebarW} onCollapse={() => dispatch({ type: 'toggleSidebar' })}
            agents={p.agents} groups={groups} activeAgentId={agent ? agent.id : null} unread={unread} now={now}
            statusConnected={connected} error={p.error} onRetry={p.onRetry}
            onSelectAgent={p.onSelectAgent} onSelectHome={p.onSelectHome}
            onOpenPalette={() => setPaletteOpen(true)} onNewAgent={() => setWizardOpen(true)}
          />
          <ResizeHandle orientation="vertical" label="Drag to resize sidebar" value={layout.sidebarW}
            min={LIMITS.sidebar.min} max={LIMITS.sidebar.max}
            onResize={w => dispatch({ type: 'resizeSidebar', width: w })}
            onReset={() => dispatch({ type: 'resizeSidebar', width: LIMITS.sidebar.def })} />
        </>
      )}

      {agent ? (
        <div ref={workRef} className="flex-1 min-w-0 flex relative">
          {P.open && P.maximized ? (
            <PanelDock layout={layout} dispatch={dispatch} agent={agent} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0}
              wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} />
          ) : (
            <>
              <section className="flex-1 min-w-0 flex flex-col">
                <AgentTopBar
                  agent={agent} entry={entryById[agent.id]} now={now}
                  busy={p.wakingAgentId === agent.id || sleepingId === agent.id}
                  onSleep={() => sleep(agent)} onWake={() => p.onWake(agent)}
                  onProfile={() => p.onShowProfile(agent)} onExport={() => dispatch({ type: 'open', panel: 'export' })}
                  panelOpen={P.open} onTogglePanel={() => dispatch({ type: 'toggle' })}
                  sidebarCollapsed={layout.sidebarCollapsed} onToggleSidebar={() => dispatch({ type: 'toggleSidebar' })}
                />
                <div className="flex-1 min-h-0 flex relative border-t border-hairline/70">
                  <AgentTabContent agent={agent} activeTab={resolveAgentTab('chat', getRuntimeMode(agent.id))} setActiveTab={p.setActiveTab}
                    onlineAgents={p.onlineAgents} wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile}
                    hideHeaders chatVariant="ink" />
                </div>
                {P.open && P.position === 'bottom' && (
                  <>
                    <ResizeHandle orientation="horizontal" invert label="Drag to resize panel" value={P.bottomH} min={lim.min} max={lim.max}
                      onResize={h => dispatch({ type: 'resizePanel', size: h, container })}
                      onReset={() => dispatch({ type: 'resizePanel', size: LIMITS.bottom.def, container })} />
                    <div style={{ height: Math.min(P.bottomH, lim.max) }} className="flex-none flex min-h-0">
                      <PanelDock layout={layout} dispatch={dispatch} agent={agent} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0}
                        wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} />
                    </div>
                  </>
                )}
              </section>
              {P.open && P.position === 'right' && (
                <div className={overlay ? 'absolute inset-y-0 right-0 z-20 flex' : 'flex flex-none'}>
                  <ResizeHandle orientation="vertical" invert label="Drag to resize panel" value={P.rightW} min={lim.min} max={lim.max}
                    onResize={w => dispatch({ type: 'resizePanel', size: w, container })}
                    onReset={() => dispatch({ type: 'resizePanel', size: LIMITS.right.def, container })} />
                  <div style={{ width: overlay ? Math.min(P.rightW, work.w - 40) : Math.min(P.rightW, lim.max) }} className="flex min-w-0">
                    <PanelDock layout={layout} dispatch={dispatch} agent={agent} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0}
                      wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <HomeScreen groups={groups} agents={p.agents} unread={unread} now={now} onSelectAgent={p.onSelectAgent} onNewAgent={() => setWizardOpen(true)} />
      )}

      {layout.sidebarCollapsed && !agent && (
        <div className="absolute top-3 left-3 z-10">
          <IconButton label="Expand sidebar (⌘B)" onClick={() => dispatch({ type: 'toggleSidebar' })}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      )}

      <CommandPalette
        open={paletteOpen} onOpenChange={setPaletteOpen} agents={p.agents}
        statusOf={a => LABEL[entryById[a.id]?.status ?? 'offline']}
        onSelectAgent={p.onSelectAgent} onSelectHome={p.onSelectHome} onSwitchClassic={p.onSwitchClassic}
      />
      {wizardOpen && <AgentCreationWizard onClose={() => setWizardOpen(false)} onComplete={() => { setWizardOpen(false); p.onAgentsChanged() }} />}
    </div>
```

Also:
- Import `IconButton` from `./ui` and `PanelLeft` from lucide-react.
- Esc while maximized restores the panel: add an effect with `if (!P.maximized) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dispatch({ type: 'restore' }) }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)`, with dependency `[P.maximized, dispatch]`.

- [ ] **Step 4: Delete the replaced components**

```bash
git rm components/shell/TabBar.tsx components/shell/InboxPanel.tsx
grep -rn "TabBar\|InboxPanel" components app lib hooks | grep -v "^components/shell/AppShell.tsx" || true
```

Expected: no remaining imports.

- [ ] **Step 5: Gates**

```bash
yarn -s tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # 7
yarn -s lint 2>&1 | grep -E "^./components/shell" -A4 | grep -E "Error|Warning"   # nothing new
yarn test 2>&1 | grep -E "Tests "   # only the 4 baseline failures
```

- [ ] **Step 6: Browser check**

Run `scratchpad/pw/panels-check.mjs` (Playwright against :23000 at 1440×900, with onboarding marked done and `aimaestro-layout` cleared first). It checks:
1. ＋ then `T` opens Terminal and ＋ then `I` focuses the existing Inbox tab. The tab count goes from 1 to 2, not 3.
2. Dragging the panel divider 120px left increases `rightW` by about 120. After a reload the width persists.
3. Hovering the divider shows a tooltip with "Drag to resize panel". The divider's computed background is not the accent colour (`rgb(47, 75, 255)`).
4. Double-click resets the width to 480.
5. ⌘J hides the panel and ⌘J shows it again. With the chat textarea focused, ⌘J does nothing.
6. ⌘B collapses the sidebar and the top-bar expand button brings it back.
7. Maximize fills the work area, and Esc restores it.
8. Docking to the bottom moves the panel under the chat; dragging it adjusts `bottomH`.
9. With Terminal active, dragging the divider across the terminal still resizes, and the terminal re-renders afterwards.
10. Sidebar drag clamps to 220–420.
11. No console page errors.

Expected: every check is true, and screenshots of the right, bottom and maximized states are saved.

- [ ] **Step 7: Commit**

```bash
git add components/shell
git commit -m "feat(panels): chat-centred layout with resizable sidebar and tabbed tool panel"
```
