# Team Workspace (Part 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teams work like agents. A team is a sidebar item. Selecting one shows its meeting chat in the centre, with team tools and member terminals in the shared tool panel. The old full-screen pages redirect into the shell.

**Architecture:**
- **Pure helpers, written test-first:** `lib/team-panels.ts`, plus team-tab support in `lib/panel-layout.ts`.
- **A generic dock:** Part 1's panel is split into `DockFrame`, a generic tab strip with menu and controls, and `ToolMenu`, a generic menu. Both the agent dock and the team dock use them.
- **A shared layout container:** `AppShell`'s geometry moves into a reusable `WorkArea`, used for agent and team views alike.
- **Data:** small hooks `useTeams` and `useActiveMeetings`. The existing team, task, document and meeting-message hooks and components are reused.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind 3 (ink tokens), lucide-react, Vitest (node), Yarn.

**Spec:** `docs/superpowers/specs/2026-10-03-team-workspace-design.md`

## Global Constraints

- Branch `redesign/command-center`. Use Yarn. No API changes. The classic layout is untouched, and the old pages render as before under the `classic` preference.
- **Team tool keys:** Kanban K, Tasks A, Documents D, Instructions N, Members E. Member terminals use 1–9 for the first nine members.
- The default team tabs are `['kanban']`. The team tab list is separate from the agent tab list, but the dock geometry is shared.
- **Start meeting** calls `POST /api/meetings {name, agentIds, teamId}` and then `POST /api/teams/notify {agentIds, teamName}`. If notify fails, that's fine. **End meeting** calls `PATCH /api/meetings/:id {status: 'ended', endedAt}`.
- **Polling:** teams and active meetings every 15s. Tasks are fetched only for the selected team.
- **Storage:** read only after mount, through `lib/safe-storage`.
- **Done means:** lint, test and tsc show no new failures (baseline: 4 test failures and 7 tsc errors), the browser check passes, and `yarn build` is never run while the dev server is up.

## Review Focus

1. **A stored team tab for a member who later left the team** must disappear from the strip, not render an empty terminal. Pinned by the `pruneMemberTabs` and `pruneTeam` tests in Tasks 1–2.
2. **A meeting link whose meeting has no team, or no longer exists,** must land on `/`, not loop or crash. Pinned by the `redirectTarget` tests in Task 1.
3. **More than nine members:** keys 1–9 cover the first nine, and the rest stay reachable from the menu by click. Pinned by the `teamTabForKey` tests in Task 1.
4. **Several active meetings for one team** (stale records): the newest is used. Pinned by the `activeMeetingFor` test in Task 1.
5. **Corrupt `teamTabs` in storage** must be dropped field by field. Pinned by the `parseLayout` team test in Task 2.

---

### Task 1: Team panel helpers (`lib/team-panels.ts`)

**Files:**
- Create: `lib/team-panels.ts`
- Test: `tests/team-panels.test.ts`

**Interfaces:**
- Produces:
  - `TeamTool`;
  - `TeamTab`;
  - `TEAM_TOOLS: { id: TeamTool; label: string; key: string }[]`;
  - `isTeamTab(v: unknown): v is TeamTab`;
  - `termTab(agentId): TeamTab`;
  - `termAgentId(tab): string | null`;
  - `teamTabForKey(key, memberIds): TeamTab | null`;
  - `teamTabLabel(tab, nameOf: (id: string) => string | undefined): string`;
  - `pruneMemberTabs(tabs: string[], memberIds: string[]): string[]`;
  - `activeMeetingFor<M extends { teamId: string | null; status: string; startedAt: string }>(teamId, meetings: M[]): M | null`;
  - `redirectTarget(pathname, params: { get(k: string): string | null }, meetingTeamId?: string | null): string`.

- [ ] **Step 1: Write the failing tests**

Create `tests/team-panels.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  TEAM_TOOLS, isTeamTab, termTab, termAgentId, teamTabForKey, teamTabLabel,
  pruneMemberTabs, activeMeetingFor, redirectTarget,
} from '@/lib/team-panels'

const q = (s: string) => new URLSearchParams(s)

describe('team tabs', () => {
  it('lists the five tools with their keys', () => {
    expect(TEAM_TOOLS.map(t => `${t.id}:${t.key}`)).toEqual(['kanban:K', 'tasks:A', 'documents:D', 'instructions:N', 'members:E'])
  })
  it('recognises tools and member terminals only', () => {
    expect(isTeamTab('kanban')).toBe(true)
    expect(isTeamTab('term:a5e8acf8-19d4')).toBe(true)
    expect(isTeamTab('term:')).toBe(false)
    expect(isTeamTab('terminal')).toBe(false)
    expect(isTeamTab(42)).toBe(false)
  })
  it('builds and reads member terminal tabs', () => {
    expect(termTab('abc')).toBe('term:abc')
    expect(termAgentId('term:abc')).toBe('abc')
    expect(termAgentId('kanban')).toBeNull()
  })
  it('maps keys: letters to tools, digits to the first nine members', () => {
    const members = ['m1', 'm2', 'm3']
    expect(teamTabForKey('k', members)).toBe('kanban')
    expect(teamTabForKey('A', members)).toBe('tasks')
    expect(teamTabForKey('2', members)).toBe('term:m2')
    expect(teamTabForKey('4', members)).toBeNull()
    expect(teamTabForKey('0', members)).toBeNull()
    expect(teamTabForKey('z', members)).toBeNull()
    const ten = Array.from({ length: 10 }, (_, i) => `x${i}`)
    expect(teamTabForKey('9', ten)).toBe('term:x8')
  })
  it('labels tools by name and terminals by member name, falling back to the id', () => {
    const nameOf = (id: string) => (id === 'a1' ? 'web-app' : undefined)
    expect(teamTabLabel('documents', nameOf)).toBe('Documents')
    expect(teamTabLabel('term:a1', nameOf)).toBe('web-app')
    expect(teamTabLabel('term:zz', nameOf)).toBe('zz')
  })
  it('prunes terminals of agents no longer in the team', () => {
    expect(pruneMemberTabs(['kanban', 'term:a', 'term:b', 'tasks'], ['b'])).toEqual(['kanban', 'term:b', 'tasks'])
  })
})

describe('activeMeetingFor', () => {
  const m = (id: string, teamId: string | null, status: string, startedAt: string) => ({ id, teamId, status, startedAt })
  it('returns the newest active meeting of the team', () => {
    const list = [
      m('old', 't1', 'active', '2026-10-01T10:00:00Z'),
      m('new', 't1', 'active', '2026-10-03T10:00:00Z'),
      m('ended', 't1', 'ended', '2026-10-04T10:00:00Z'),
      m('other', 't2', 'active', '2026-10-05T10:00:00Z'),
    ]
    expect(activeMeetingFor('t1', list)?.id).toBe('new')
    expect(activeMeetingFor('t3', list)).toBeNull()
  })
})

describe('redirectTarget', () => {
  it('maps old team pages into the shell', () => {
    expect(redirectTarget('/teams', q(''))).toBe('/')
    expect(redirectTarget('/teams/abc', q(''))).toBe('/?team=abc')
    expect(redirectTarget('/team-meeting', q('team=t1'))).toBe('/?team=t1')
    expect(redirectTarget('/team-meeting', q('meeting=new&team=t1'))).toBe('/?team=t1')
    expect(redirectTarget('/team-meeting', q('meeting=m1'), 't9')).toBe('/?team=t9')
    expect(redirectTarget('/team-meeting', q('meeting=m1'), null)).toBe('/')
    expect(redirectTarget('/team-meeting', q(''))).toBe('/')
  })
})
```

- [ ] **Step 2: Run them and see them fail**

Run: `yarn vitest run tests/team-panels.test.ts`
Expected: FAIL with `Cannot find package '@/lib/team-panels'`.

- [ ] **Step 3: Implement**

Create `lib/team-panels.ts`:

```ts
/** Team workspace panel tabs, keys and routing helpers. Pure. Spec: 2026-10-03-team-workspace-design.md */
export type TeamTool = 'kanban' | 'tasks' | 'documents' | 'instructions' | 'members'
export type TeamTab = TeamTool | `term:${string}`

export const TEAM_TOOLS: { id: TeamTool; label: string; key: string }[] = [
  { id: 'kanban', label: 'Kanban', key: 'K' },
  { id: 'tasks', label: 'Tasks', key: 'A' },
  { id: 'documents', label: 'Documents', key: 'D' },
  { id: 'instructions', label: 'Instructions', key: 'N' },
  { id: 'members', label: 'Members', key: 'E' },
]
const TOOL_IDS = new Set<string>(TEAM_TOOLS.map(t => t.id))

export function isTeamTab(v: unknown): v is TeamTab {
  return typeof v === 'string' && (TOOL_IDS.has(v) || /^term:[\w.:-]+$/.test(v))
}

export const termTab = (agentId: string): TeamTab => `term:${agentId}`
export function termAgentId(tab: string): string | null {
  return tab.startsWith('term:') && tab.length > 5 ? tab.slice(5) : null
}

/** Letters pick tools; digits 1–9 pick the first nine members' terminals. */
export function teamTabForKey(key: string, memberIds: string[]): TeamTab | null {
  if (/^[1-9]$/.test(key)) {
    const id = memberIds[Number(key) - 1]
    return id ? termTab(id) : null
  }
  return TEAM_TOOLS.find(t => t.key === key.toUpperCase())?.id ?? null
}

export function teamTabLabel(tab: string, nameOf: (id: string) => string | undefined): string {
  const agentId = termAgentId(tab)
  if (agentId) return nameOf(agentId) ?? agentId
  return TEAM_TOOLS.find(t => t.id === tab)?.label ?? tab
}

export function pruneMemberTabs(tabs: string[], memberIds: string[]): string[] {
  const members = new Set(memberIds)
  return tabs.filter(t => { const id = termAgentId(t); return !id || members.has(id) })
}

export function activeMeetingFor<M extends { teamId: string | null; status: string; startedAt: string }>(teamId: string, meetings: M[]): M | null {
  return meetings
    .filter(m => m.teamId === teamId && m.status === 'active')
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0] ?? null
}

/** Where an old full-screen Teams/Meeting URL should land inside the shell. */
export function redirectTarget(pathname: string, params: { get(k: string): string | null }, meetingTeamId?: string | null): string {
  const toTeam = (id: string) => `/?team=${encodeURIComponent(id)}`
  const teamPage = pathname.match(/^\/teams\/([^/]+)\/?$/)
  if (teamPage) return toTeam(decodeURIComponent(teamPage[1]))
  if (pathname.startsWith('/team-meeting')) {
    const team = params.get('team')
    if (team) return toTeam(team)
    const meeting = params.get('meeting')
    if (meeting && meeting !== 'new' && meetingTeamId) return toTeam(meetingTeamId)
  }
  return '/'
}
```

- [ ] **Step 4: Run them and see them pass**

Run: `yarn vitest run tests/team-panels.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/team-panels.ts tests/team-panels.test.ts
git commit -m "feat(teams): add team panel tabs, keys and redirect helpers"
```

---

### Task 2: Team tabs in the layout reducer

**Files:**
- Modify: `lib/panel-layout.ts`
- Modify: `hooks/useLayout.ts` (shortcut toggle scope)
- Test: `tests/panel-layout.test.ts` (append)

**Interfaces:**
- Consumes: `isTeamTab`, `pruneMemberTabs` (Task 1).
- Produces:
  - `PanelState` gains `teamTabs: string[]` and `teamActive: string | null`, with defaults `['kanban']` and `'kanban'`;
  - new actions `{ type: 'openTeam'; tab: string }`, `{ type: 'closeTeam'; tab: string }`, `{ type: 'activateTeam'; tab: string }` and `{ type: 'pruneTeam'; memberIds: string[] }`;
  - `toggle` gains an optional `scope?: 'agent' | 'team'`;
  - `useLayout(scope: 'agent' | 'team' = 'agent')`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/panel-layout.test.ts`:

```ts
describe('team tabs in layout', () => {
  const T = (teamTabs: string[], teamActive: string | null): LayoutState =>
    ({ ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, teamTabs, teamActive } })
  it('defaults to Kanban', () => {
    expect(DEFAULT_LAYOUT.panel.teamTabs).toEqual(['kanban'])
    expect(DEFAULT_LAYOUT.panel.teamActive).toBe('kanban')
  })
  it('openTeam adds/focuses without duplicates and opens the panel', () => {
    const s = layoutReducer({ ...T(['kanban'], 'kanban'), panel: { ...T(['kanban'], 'kanban').panel, open: false } }, { type: 'openTeam', tab: 'term:a1' })
    expect(s.panel).toMatchObject({ open: true, teamTabs: ['kanban', 'term:a1'], teamActive: 'term:a1' })
    expect(layoutReducer(s, { type: 'openTeam', tab: 'kanban' }).panel.teamTabs).toEqual(['kanban', 'term:a1'])
  })
  it('openTeam ignores invalid tabs', () => {
    expect(layoutReducer(T(['kanban'], 'kanban'), { type: 'openTeam', tab: 'bogus' }).panel.teamTabs).toEqual(['kanban'])
  })
  it('closeTeam activates a neighbour; agent tabs untouched', () => {
    const s = layoutReducer(T(['kanban', 'tasks', 'members'], 'tasks'), { type: 'closeTeam', tab: 'tasks' })
    expect(s.panel).toMatchObject({ teamTabs: ['kanban', 'members'], teamActive: 'members', tabs: DEFAULT_LAYOUT.panel.tabs })
  })
  it('pruneTeam removes terminals of non-members and fixes the active tab', () => {
    const s = layoutReducer(T(['kanban', 'term:a', 'term:b'], 'term:a'), { type: 'pruneTeam', memberIds: ['b'] })
    expect(s.panel.teamTabs).toEqual(['kanban', 'term:b'])
    expect(s.panel.teamActive).toBe('kanban')
  })
  it('toggle with team scope and no team tabs opens Kanban', () => {
    const hidden = { ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, open: false, teamTabs: [], teamActive: null } }
    expect(layoutReducer(hidden, { type: 'toggle', scope: 'team' }).panel).toMatchObject({ open: true, teamTabs: ['kanban'], teamActive: 'kanban' })
  })
  it('parseLayout validates team tabs', () => {
    const s = parseLayout(JSON.stringify({ panel: { teamTabs: ['kanban', 'nope', 'term:x', 'kanban'], teamActive: 'nope' } }))!
    expect(s.panel.teamTabs).toEqual(['kanban', 'term:x'])
    expect(s.panel.teamActive).toBe('kanban')
  })
})
```

- [ ] **Step 2: Run them and see them fail**

Run: `yarn vitest run tests/panel-layout.test.ts`
Expected: the new `team tabs in layout` tests FAIL. TypeScript inside Vitest is not type-checked, so the failure is on values: `teamTabs` is undefined.

- [ ] **Step 3: Implement**

In `lib/panel-layout.ts`:

(a) Add the import below the header comment: `import { isTeamTab, pruneMemberTabs } from '@/lib/team-panels'`.

(b) Add `teamTabs: string[]` and `teamActive: string | null` to `PanelState`, and `teamTabs: ['kanban'], teamActive: 'kanban'` to `DEFAULT_LAYOUT.panel`.

(c) Extend `LayoutAction`:

```ts
  | { type: 'toggle'; scope?: 'agent' | 'team' }
  | { type: 'openTeam'; tab: string }
  | { type: 'closeTeam'; tab: string }
  | { type: 'activateTeam'; tab: string }
  | { type: 'pruneTeam'; memberIds: string[] }
```

Replace the existing `| { type: 'toggle' }` line with the first of these.

(d) Add a helper above `layoutReducer`:

```ts
function closeIn<T extends string>(tabs: T[], active: T | null, tab: T): { tabs: T[]; active: T | null } {
  const i = tabs.indexOf(tab)
  if (i === -1) return { tabs, active }
  const next = tabs.filter(t => t !== tab)
  return { tabs: next, active: active === tab ? (next[i] ?? next[i - 1] ?? null) : active }
}
```

(e) Replace the `toggle` case with:

```ts
    case 'toggle':
      if (p.open) return { ...s, panel: { ...p, open: false, maximized: false } }
      if (a.scope === 'team') {
        if (p.teamTabs.length === 0) return { ...s, panel: { ...p, open: true, teamTabs: ['kanban'], teamActive: 'kanban' } }
        return { ...s, panel: { ...p, open: true, teamActive: p.teamActive ?? p.teamTabs[0] } }
      }
      if (p.tabs.length === 0) return { ...s, panel: { ...p, open: true, tabs: ['terminal'], active: 'terminal' } }
      return { ...s, panel: { ...p, open: true, active: p.active ?? p.tabs[0] } }
```

(f) Add these cases before `case 'resizeSidebar'`:

```ts
    case 'openTeam':
      if (!isTeamTab(a.tab)) return s
      return { ...s, panel: { ...p, open: true, teamTabs: p.teamTabs.includes(a.tab) ? p.teamTabs : [...p.teamTabs, a.tab], teamActive: a.tab } }
    case 'closeTeam': {
      const r = closeIn(p.teamTabs, p.teamActive, a.tab)
      return { ...s, panel: { ...p, teamTabs: r.tabs, teamActive: r.active } }
    }
    case 'activateTeam':
      return p.teamTabs.includes(a.tab) ? { ...s, panel: { ...p, open: true, teamActive: a.tab } } : s
    case 'pruneTeam': {
      const teamTabs = pruneMemberTabs(p.teamTabs, a.memberIds)
      if (teamTabs.length === p.teamTabs.length) return s
      const teamActive = p.teamActive && teamTabs.includes(p.teamActive) ? p.teamActive : (teamTabs[0] ?? null)
      return { ...s, panel: { ...p, teamTabs, teamActive } }
    }
```

(g) In `parseLayout`, compute the team tabs after `active`:

```ts
  const teamTabs = Array.isArray(rp.teamTabs) ? [...new Set(rp.teamTabs.filter(isTeamTab))] : d.teamTabs
  const teamActive = typeof rp.teamActive === 'string' && teamTabs.includes(rp.teamActive) ? rp.teamActive : (teamTabs[0] ?? null)
```

Add `teamTabs, teamActive,` to the returned `panel` object.

(h) In `hooks/useLayout.ts`:
- Change the signature to `export function useLayout(scope: 'agent' | 'team' = 'agent')`.
- Keep `const scopeRef = useRef(scope); scopeRef.current = scope`.
- In the shortcut handler, change `dispatch({ type: 'toggle' })` to `dispatch({ type: 'toggle', scope: scopeRef.current })`.

- [ ] **Step 4: Run them and see them pass**

Run: `yarn vitest run tests/panel-layout.test.ts tests/team-panels.test.ts`
Expected: PASS (all). Also run `yarn -s tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` and expect `7`.

- [ ] **Step 5: Commit**

```bash
git add lib/panel-layout.ts hooks/useLayout.ts tests/panel-layout.test.ts
git commit -m "feat(teams): team tab list in the shared panel layout"
```

---

### Task 3: Generic dock (`ToolMenu`, `DockFrame`) and `WorkArea`

**Files:**
- Modify: `components/shell/PanelMenu.tsx`, which becomes the generic `ToolMenu` and still exports `PANEL_ICONS`
- Create: `components/shell/DockFrame.tsx`
- Modify: `components/shell/PanelDock.tsx`, rebuilt on `DockFrame`
- Create: `components/shell/WorkArea.tsx`, the geometry moved out of `AppShell`
- Modify: `components/shell/AppShell.tsx`, which uses `WorkArea` for the agent view

**Interfaces:**
- Produces:
  - `ToolMenu({ open, onClose, anchorRef?, items: MenuItem[], openIds: string[], onPick: (id: string) => void })`, where `MenuItem = { id: string; label: string; key?: string; icon: LucideIcon; section?: string }`;
  - `DockFrame({ panel, dispatch, scope, tabs: DockTab[], active, onActivate, onClose, menuItems, onPick, children, emptyHint })`, where `DockTab = { id: string; label: string; icon: LucideIcon; badge?: number }`;
  - `WorkArea({ layout, dispatch, depKey, top, center, dock })`.
- Agent-panel behaviour is unchanged. Part 1's `panels-check.mjs` must still pass.

- [ ] **Step 1: Generic ToolMenu**

Replace `components/shell/PanelMenu.tsx` with:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { SquareTerminal, Inbox, FolderTree, Brain, GitBranch, FileText, LayoutPanelTop, Search, PlayCircle, Download, type LucideIcon } from 'lucide-react'
import type { PanelType } from '@/lib/panel-layout'

export const PANEL_ICONS: Record<PanelType, LucideIcon> = {
  terminal: SquareTerminal, inbox: Inbox, files: FolderTree, memory: Brain, graph: GitBranch,
  docs: FileText, canvas: LayoutPanelTop, search: Search, playback: PlayCircle, export: Download,
}

export interface MenuItem { id: string; label: string; key?: string; icon: LucideIcon; section?: string }

/** ＋ menu: rows with optional section headers; single-key shortcuts while open. */
export default function ToolMenu({ open, onClose, anchorRef, items, openIds, onPick }: {
  open: boolean
  onClose: () => void
  /** The toggle button: clicks on it must not count as "outside" (it toggles the menu itself) */
  anchorRef?: React.RefObject<HTMLElement>
  items: MenuItem[]
  openIds: string[]
  onPick: (id: string) => void
}) {
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Reset the highlight and take focus only when the menu opens, not on every parent re-render
  useEffect(() => {
    if (!open) return
    setIndex(0)
    ref.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchorRef?.current?.contains(t)) return
      onCloseRef.current()
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open, anchorRef])

  if (!open || items.length === 0) return null
  const pick = (id: string) => { onPick(id); onClose() }

  return (
    <div ref={ref} role="menu" aria-label="Open a tool" tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
        if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => (i + 1) % items.length); return }
        if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => (i - 1 + items.length) % items.length); return }
        if (e.key === 'Enter') { e.preventDefault(); pick(items[index].id); return }
        if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
          const hit = items.find(it => it.key && it.key.toUpperCase() === e.key.toUpperCase())
          if (hit) { e.preventDefault(); pick(hit.id) }
        }
      }}
      className="absolute left-0 top-full mt-1.5 z-40 w-[250px] max-h-[70vh] overflow-y-auto rounded-[12px] border border-hairline bg-surface p-1.5 focus:outline-none">
      {items.map((it, i) => {
        const Icon = it.icon
        const header = it.section && it.section !== items[i - 1]?.section
        return (
          <div key={it.id}>
            {header && <div className="px-2.5 pt-2 pb-1 text-[11px] text-gray-500">{it.section}</div>}
            <button type="button" role="menuitem" onMouseEnter={() => setIndex(i)} onClick={() => pick(it.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] text-[14px] text-left ${i === index ? 'bg-raised text-ink' : 'text-gray-300'}`}>
              <Icon strokeWidth={1.5} className="w-4 h-4 text-ink-muted flex-none" />
              <span className="truncate">{it.label}</span>
              {openIds.includes(it.id) && <span className="text-[11px] text-gray-500">open</span>}
              {it.key && <span className="ml-auto text-[12px] text-gray-500">{it.key}</span>}
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: DockFrame**

Create `components/shell/DockFrame.tsx`:

```tsx
'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Plus, X, Maximize2, Minimize2, PanelBottom, PanelRight, PanelRightClose, type LucideIcon } from 'lucide-react'
import type { LayoutAction, PanelState } from '@/lib/panel-layout'
import { Badge, IconButton, EmptyState } from './ui'
import ToolMenu, { type MenuItem } from './PanelMenu'

export interface DockTab { id: string; label: string; icon: LucideIcon; badge?: number }

/** Panel chrome shared by the agent and team docks: tab chips, ＋ menu, maximize / dock / hide, body. */
export default function DockFrame({ panel, dispatch, scope, tabs, active, onActivate, onClose, menuItems, onPick, children, emptyHint }: {
  panel: PanelState
  dispatch: React.Dispatch<LayoutAction>
  scope: 'agent' | 'team'
  tabs: DockTab[]
  active: string | null
  onActivate: (id: string) => void
  onClose: (id: string) => void
  menuItems: MenuItem[]
  onPick: (id: string) => void
  children: ReactNode
  emptyHint: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const plusRef = useRef<HTMLDivElement>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const p = panel

  return (
    <div className="h-full w-full min-w-0 min-h-0 flex flex-col bg-sunken">
      <div className="h-[60px] flex-none flex items-center gap-1.5 px-2.5 border-b border-hairline/70">
        <div role="tablist" aria-label="Open tools" className="flex items-center gap-1 min-w-0 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon
            const on = t.id === active
            return (
              <div key={t.id} className={`group flex items-center rounded-[9px] ${on ? 'bg-raised' : 'hover:bg-raised/50'}`}>
                <button type="button" role="tab" aria-selected={on} onClick={() => onActivate(t.id)}
                  className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 text-[13px] whitespace-nowrap ${on ? 'text-ink' : 'text-ink-muted'}`}>
                  <Icon strokeWidth={1.5} className="w-3.5 h-3.5" />{t.label}
                  {!!t.badge && t.badge > 0 && <Badge>{t.badge}</Badge>}
                </button>
                <button type="button" aria-label={`Close ${t.label}`} onClick={() => onClose(t.id)}
                  className={`mr-1 grid place-items-center w-5 h-5 rounded-[6px] text-gray-500 hover:text-ink focus-visible:opacity-100 ${on ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                  <X strokeWidth={1.5} className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
        <div ref={plusRef} className="relative flex-none">
          <IconButton label="Open a tool" active={menuOpen} onClick={() => setMenuOpen(o => !o)}><Plus strokeWidth={1.5} className="w-4 h-4" /></IconButton>
          <ToolMenu open={menuOpen} onClose={closeMenu} anchorRef={plusRef} items={menuItems} openIds={tabs.map(t => t.id)} onPick={onPick} />
        </div>
        <div className="ml-auto flex items-center gap-0.5 flex-none">
          <IconButton label={p.maximized ? 'Restore panel' : 'Maximize panel'} onClick={() => dispatch({ type: 'toggleMaximize' })}>
            {p.maximized ? <Minimize2 strokeWidth={1.5} className="w-4 h-4" /> : <Maximize2 strokeWidth={1.5} className="w-4 h-4" />}
          </IconButton>
          <IconButton label={p.position === 'right' ? 'Dock panel to bottom' : 'Dock panel to right'}
            onClick={() => dispatch({ type: 'setPosition', position: p.position === 'right' ? 'bottom' : 'right' })}>
            {p.position === 'right' ? <PanelBottom strokeWidth={1.5} className="w-4 h-4" /> : <PanelRight strokeWidth={1.5} className="w-4 h-4" />}
          </IconButton>
          <IconButton label="Hide panel" onClick={() => dispatch({ type: 'toggle', scope })}><PanelRightClose strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex relative">
        {active ? children : (
          <div className="flex-1 grid place-items-center">
            <EmptyState title="Open a tool" description={emptyHint} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: PanelDock on DockFrame**

Replace `components/shell/PanelDock.tsx` with:

```tsx
'use client'

import type { Agent } from '@/types/agent'
import { PANEL_TYPES, type LayoutAction, type LayoutState, type PanelType } from '@/lib/panel-layout'
import { PANEL_ICONS } from './PanelMenu'
import DockFrame from './DockFrame'
import PanelBody from './PanelBody'

/** Agent tool panel: Terminal, Inbox, Files, Memory… for the selected agent. */
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
  const p = layout.panel
  const labelOf = (t: PanelType) => PANEL_TYPES.find(x => x.id === t)?.label ?? t
  return (
    <DockFrame
      panel={p} dispatch={dispatch} scope="agent"
      tabs={p.tabs.map(t => ({ id: t, label: labelOf(t), icon: PANEL_ICONS[t], badge: t === 'inbox' ? unread : undefined }))}
      active={p.active}
      onActivate={id => dispatch({ type: 'activate', panel: id as PanelType })}
      onClose={id => dispatch({ type: 'close', panel: id as PanelType })}
      menuItems={PANEL_TYPES.map(t => ({ id: t.id, label: t.label, key: t.key, icon: PANEL_ICONS[t.id] }))}
      onPick={id => dispatch({ type: 'open', panel: id as PanelType })}
      emptyHint="Use ＋ or ⌘J. Terminal, Inbox, Files, Memory and more open here."
    >
      {p.active && (
        <PanelBody key={p.active} type={p.active} agent={agent} onlineAgents={onlineAgents}
          wakingAgentId={wakingAgentId} onWake={onWake} onShowProfile={onShowProfile} />
      )}
    </DockFrame>
  )
}
```

- [ ] **Step 4: WorkArea**

Create `components/shell/WorkArea.tsx` by moving the geometry and JSX out of `AppShell`:

```tsx
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LIMITS, panelLimits, panelOverlays, shouldRestoreOnEscape, shownSize, type LayoutAction, type LayoutState } from '@/lib/panel-layout'
import ResizeHandle from './ResizeHandle'

/** Centre column + tool panel (right or bottom, resizable, maximizable). Shared by agent and team views. */
export default function WorkArea({ layout, dispatch, depKey, top, center, dock }: {
  layout: LayoutState
  dispatch: React.Dispatch<LayoutAction>
  depKey: string
  top: ReactNode
  center: ReactNode
  dock: ReactNode
}) {
  const workRef = useRef<HTMLDivElement>(null)
  const [work, setWork] = useState({ w: 1200, h: 800 })
  useEffect(() => {
    const el = workRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWork({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [depKey])

  const P = layout.panel
  const container = P.position === 'right' ? work.w : work.h
  const lim = panelLimits(P.position, container)
  const shownRight = shownSize(P.rightW, lim)
  const shownBottom = shownSize(P.bottomH, lim)
  const overlay = P.position === 'right' && panelOverlays(work.w, shownRight)

  useEffect(() => {
    if (!P.maximized) return
    const onKey = (e: KeyboardEvent) => {
      if (shouldRestoreOnEscape({ key: e.key, defaultPrevented: e.defaultPrevented, target: e.target as Element | null })) dispatch({ type: 'restore' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [P.maximized, dispatch])

  return (
    <div ref={workRef} className="flex-1 min-w-0 flex relative">
      {P.open && P.maximized ? dock : (
        <>
          <section className="flex-1 min-w-0 flex flex-col">
            {top}
            <div className="flex-1 min-h-0 flex relative border-t border-hairline/70">{center}</div>
            {P.open && P.position === 'bottom' && (
              <>
                <ResizeHandle orientation="horizontal" invert label="Drag to resize panel" value={shownBottom} min={lim.min} max={lim.max}
                  onResize={h => dispatch({ type: 'resizePanel', size: h, container })}
                  onReset={() => dispatch({ type: 'resizePanel', size: LIMITS.bottom.def, container })} />
                <div style={{ height: shownBottom }} className="flex-none flex min-h-0">{dock}</div>
              </>
            )}
          </section>
          {P.open && P.position === 'right' && (
            <div className={overlay ? 'absolute inset-y-0 right-0 z-20 flex' : 'flex flex-none'}>
              <ResizeHandle orientation="vertical" invert label="Drag to resize panel" value={shownRight} min={lim.min} max={lim.max}
                onResize={w => dispatch({ type: 'resizePanel', size: w, container })}
                onReset={() => dispatch({ type: 'resizePanel', size: LIMITS.right.def, container })} />
              <div style={{ width: overlay ? Math.min(shownRight, work.w - 40) : shownRight }} className="flex min-w-0">{dock}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: AppShell uses WorkArea**

In `components/shell/AppShell.tsx`:
- Delete the `workRef`, `work`, `ResizeObserver` effect, `P`/`container`/`lim`/`shown*`/`overlay` constants and the Esc-restore effect. These now live in `WorkArea`.
- Remove the now-unused imports: `panelLimits`, `panelOverlays`, `shouldRestoreOnEscape` and `shownSize`. Keep `LIMITS`, `useRef` if still used, and `ResizeHandle` for the sidebar.
- Replace the `{agent ? ( <div ref={workRef} …>…</div> ) : (` block with:

```tsx
      {agent ? (
        <WorkArea layout={layout} dispatch={dispatch} depKey={agent.id}
          top={
            <AgentTopBar
              agent={agent} entry={entryById[agent.id]} now={now}
              busy={p.wakingAgentId === agent.id || sleepingId === agent.id}
              onSleep={() => sleep(agent)} onWake={() => p.onWake(agent)}
              onProfile={() => p.onShowProfile(agent)} onExport={() => dispatch({ type: 'open', panel: 'export' })}
              panelOpen={layout.panel.open} onTogglePanel={() => dispatch({ type: 'toggle', scope: 'agent' })}
              sidebarCollapsed={layout.sidebarCollapsed} onToggleSidebar={() => dispatch({ type: 'toggleSidebar' })}
            />
          }
          center={
            <AgentTabContent agent={agent} activeTab={resolveAgentTab('chat', getRuntimeMode(agent.id))} setActiveTab={p.setActiveTab}
              onlineAgents={p.onlineAgents} wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile}
              hideHeaders chatVariant="ink" />
          }
          dock={
            <PanelDock layout={layout} dispatch={dispatch} agent={agent} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0}
              wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} />
          }
        />
      ) : (
```

Add `import WorkArea from './WorkArea'`.

- [ ] **Step 6: Verify there's no regression and commit**

Run:
- `yarn -s tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`, expecting `7`;
- the Part 1 browser checks `node panels-check.mjs` and `node fixes-check.mjs` (scratchpad `pw/`), expecting every value to match Part 1 and no errors.

```bash
git add components/shell
git commit -m "refactor(panels): generic dock frame, tool menu and work area"
```

---

### Task 4: Team data hooks and the sidebar section

**Files:**
- Create: `hooks/useTeams.ts`
- Create: `components/shell/TeamSection.tsx`
- Modify: `components/shell/StatusSidebar.tsx`

**Interfaces:**
- Consumes: `Team` and `Meeting` from `@/types/team`; `activeMeetingFor` (Task 1); `Dialog`, `Field`, `Button`, `SectionLabel` and `IconButton` from `./ui`.
- Produces:
  - `useTeams(): { teams: Team[]; refresh(): Promise<void>; createTeam(name: string): Promise<string | null> }`;
  - `useActiveMeetings(): { meetings: Meeting[]; refresh(): Promise<void>; startMeeting(team: Team): Promise<boolean>; endMeeting(id: string): Promise<boolean> }`;
  - `TeamSection({ teams, meetings, activeTeamId, onSelectTeam, onCreateTeam })`;
  - `StatusSidebarProps` adds `teams: Team[]; meetings: Meeting[]; activeTeamId: string | null; onSelectTeam(id: string): void; onCreateTeam(name: string): Promise<string | null>`.

- [ ] **Step 1: Hooks**

Create `hooks/useTeams.ts`:

```ts
'use client'

/** Teams list + active meetings for the shell sidebar and team workspace (polled every 15s). */
import { useCallback, useEffect, useState } from 'react'
import type { Team, Meeting } from '@/types/team'

function usePolled<T>(url: string, pick: (d: any) => T[], intervalMs: number) {
  const [items, setItems] = useState<T[]>([])
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url)
      if (res.ok) setItems(pick(await res.json()))
    } catch { /* keep last known list */ }
  }, [url, pick])
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, intervalMs)
    return () => clearInterval(t)
  }, [refresh, intervalMs])
  return { items, refresh }
}

const pickTeams = (d: any): Team[] => d.teams || []
const pickMeetings = (d: any): Meeting[] => d.meetings || []

export function useTeams(intervalMs = 15_000) {
  const { items: teams, refresh } = usePolled<Team>('/api/teams', pickTeams, intervalMs)
  const createTeam = useCallback(async (name: string): Promise<string | null> => {
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, agentIds: [] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    await refresh()
    return data.team?.id ?? null
  }, [refresh])
  return { teams, refresh, createTeam }
}

export function useActiveMeetings(intervalMs = 15_000) {
  const { items: meetings, refresh } = usePolled<Meeting>('/api/meetings?status=active', pickMeetings, intervalMs)

  const startMeeting = useCallback(async (team: Team): Promise<boolean> => {
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: team.name, agentIds: team.agentIds, teamId: team.id }),
    })
    if (!res.ok) return false
    // Tell the members; the meeting still starts if this fails
    fetch('/api/teams/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentIds: team.agentIds, teamName: team.name }),
    }).catch(() => {})
    await refresh()
    return true
  }, [refresh])

  const endMeeting = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/meetings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ended', endedAt: new Date().toISOString() }),
    })
    await refresh()
    return res.ok
  }, [refresh])

  return { meetings, refresh, startMeeting, endMeeting }
}
```

- [ ] **Step 2: TeamSection**

Create `components/shell/TeamSection.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Team, Meeting } from '@/types/team'
import { activeMeetingFor } from '@/lib/team-panels'
import { SectionLabel, Dialog, Field, Button, Notice } from './ui'

/** Sidebar "Teams" list with a live marker and a create dialog. */
export default function TeamSection({ teams, meetings, activeTeamId, onSelectTeam, onCreateTeam }: {
  teams: Team[]
  meetings: Meeting[]
  activeTeamId: string | null
  onSelectTeam: (id: string) => void
  onCreateTeam: (name: string) => Promise<string | null>
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const close = () => { setCreating(false); setName(''); setError(null) }
  const create = async () => {
    if (!name.trim()) return
    setBusy(true)
    const id = await onCreateTeam(name.trim()).catch(() => null)
    setBusy(false)
    if (!id) { setError('Could not create the team.'); return }
    close()
    onSelectTeam(id)
  }

  return (
    <div>
      <SectionLabel count={teams.length || undefined}
        action={<button type="button" aria-label="New team" title="New team" onClick={() => setCreating(true)}
          className="grid place-items-center w-5 h-5 rounded-[6px] text-ink-muted hover:text-ink hover:bg-raised"><Plus strokeWidth={1.5} className="w-3.5 h-3.5" /></button>}>
        Teams
      </SectionLabel>
      {teams.map(t => {
        const live = !!activeMeetingFor(t.id, meetings)
        const on = t.id === activeTeamId
        return (
          <button key={t.id} type="button" onClick={() => onSelectTeam(t.id)} aria-current={on ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${on ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
            <span className="truncate">{t.name}</span>
            <span className="ml-auto text-[12px]">
              {live ? <span className="text-ok">● live</span> : <span className="text-gray-500">{t.agentIds.length || ''}</span>}
            </span>
          </button>
        )
      })}
      <Dialog open={creating} onClose={close} title="New team"
        footer={<><Button onClick={close}>Cancel</Button><Button variant="accent" onClick={create} disabled={!name.trim() || busy}>{busy ? 'Creating…' : 'Create team'}</Button></>}>
        <div className="space-y-3">
          <label className="block">
            <span className="block text-[14px] text-ink mb-1.5">Name</span>
            <Field className="w-full" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Web launch"
              onKeyDown={e => { if (e.key === 'Enter') create() }} />
          </label>
          <p className="text-[13px] text-ink-muted">Add members afterwards from the team&apos;s Members panel.</p>
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      </Dialog>
    </div>
  )
}
```

The right side of each row shows "● live", or the member count. Ruling: the spec said "open-task count", but that would mean one tasks request per team, which the spec itself rules out ("no N+1"). The member count is free.

- [ ] **Step 3: StatusSidebar renders it**

In `components/shell/StatusSidebar.tsx`:
- Import `TeamSection` and `type { Team, Meeting } from '@/types/team'`.
- Add `teams: Team[]; meetings: Meeting[]; activeTeamId: string | null; onSelectTeam: (id: string) => void; onCreateTeam: (name: string) => Promise<string | null>` to `StatusSidebarProps`.
- Change the Home button's active test from `p.activeAgentId === null` to `p.activeAgentId === null && p.activeTeamId === null`. That condition appears twice, in `aria-current` and in the class.
- Directly after the `{mode === 'status' ? … : <ProjectTree … />}` expression, inside the scrolling div, add:

```tsx
        <TeamSection teams={p.teams} meetings={p.meetings} activeTeamId={p.activeTeamId}
          onSelectTeam={p.onSelectTeam} onCreateTeam={p.onCreateTeam} />
```

- [ ] **Step 4: Type-check and commit**

Wiring into AppShell happens in Task 6, so tsc will flag the missing props on `<StatusSidebar>` until then. To keep this commit green, pass them from AppShell now:
- add `const { teams, createTeam } = useTeams()` and `const { meetings, startMeeting, endMeeting } = useActiveMeetings()`;
- add `const [teamId, setTeamId] = useState<string | null>(null)`;
- pass `teams={teams} meetings={meetings} activeTeamId={teamId} onSelectTeam={id => { setTeamId(id); p.onSelectHome() }} onCreateTeam={createTeam}` to `<StatusSidebar>`.

`startMeeting` and `endMeeting` are used in Task 6.

Run: `yarn -s tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`. Expected: `7`.

```bash
git add hooks/useTeams.ts components/shell/TeamSection.tsx components/shell/StatusSidebar.tsx components/shell/AppShell.tsx
git commit -m "feat(teams): teams section in the sidebar with create dialog"
```

---

### Task 5: Team workspace pieces (top bar, chat, team dock)

**Files:**
- Create: `components/shell/TeamTopBar.tsx`
- Create: `components/shell/TeamChat.tsx`
- Create: `components/shell/TeamPanelDock.tsx`

**Interfaces:**
- Consumes:
  - `useMeetingMessages` (`hooks/useMeetingMessages.ts`): `{ messages: (MessageSummary & { isMine; displayFrom })[]; sendToAgent(id, text); broadcastToAll(text); markAsRead() }`;
  - `useTasks(teamId)`, which returns `tasks`, `pendingTasks`, `inProgressTasks`, `completedTasks`, `tasksByStatus`, `createTask`, `updateTask` and `deleteTask`;
  - `useDocuments(teamId)`;
  - `TaskKanbanBoard`, `TaskPanel`, `TeamDocumentsSection`, `TeamInstructionsSection` and `TeamOverviewSection`;
  - `AgentTabContent`;
  - `DockFrame`;
  - Task 1 helpers;
  - `formatAge`.
- Produces:
  - `TeamTopBar({ team, meeting, members, now, starting, onStart, onEnd, panelOpen, onTogglePanel, sidebarCollapsed, onToggleSidebar })`;
  - `TeamChat({ team, meeting, members, onStart, starting })`;
  - `TeamPanelDock({ layout, dispatch, team, members, allAgents, onlineAgents, updateTeam, wakingAgentId, onWake, onShowProfile })`.

- [ ] **Step 1: TeamTopBar**

Create `components/shell/TeamTopBar.tsx`:

```tsx
'use client'

import { PanelLeft, PanelRight, Loader2 } from 'lucide-react'
import type { Agent } from '@/types/agent'
import type { Team, Meeting } from '@/types/team'
import { displayName, formatAge } from '@/lib/agent-status'
import { Button, IconButton } from './ui'

const initials = (n: string) => n.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

export default function TeamTopBar({ team, meeting, members, now, starting, onStart, onEnd, panelOpen, onTogglePanel, sidebarCollapsed, onToggleSidebar }: {
  team: Team
  meeting: Meeting | null
  members: Agent[]
  now: number
  starting: boolean
  onStart: () => void
  onEnd: () => void
  panelOpen: boolean
  onTogglePanel: () => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}) {
  const shown = members.slice(0, 5)
  return (
    <header className="h-[60px] flex-none flex items-center gap-3 px-6">
      {sidebarCollapsed && <IconButton label="Expand sidebar (⌘B)" onClick={onToggleSidebar}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>}
      <div className="flex items-center gap-2.5 text-[16px] text-ink-muted min-w-0">
        <span>Teams</span><span>/</span><span className="text-ink font-medium truncate">{team.name}</span>
      </div>
      {meeting && <span className="text-[13px] text-ok whitespace-nowrap flex-none">● Meeting · {formatAge(meeting.startedAt, now) || 'now'}</span>}
      <div className="ml-auto flex items-center gap-2 flex-none">
        <div className="flex" aria-label={`${members.length} members`}>
          {shown.map((m, i) => (
            <span key={m.id} title={displayName(m)}
              className={`grid place-items-center w-6 h-6 rounded-full bg-raised border-2 border-sunken text-[9px] text-gray-300 ${i ? '-ml-1.5' : ''}`}>{initials(displayName(m))}</span>
          ))}
          {members.length > shown.length && <span className="-ml-1.5 grid place-items-center w-6 h-6 rounded-full bg-raised border-2 border-sunken text-[9px] text-gray-400">+{members.length - shown.length}</span>}
        </div>
        {meeting
          ? <Button onClick={onEnd}>End meeting</Button>
          : <Button variant="accent" onClick={onStart} disabled={starting || members.length === 0} title={members.length === 0 ? 'Add members first' : undefined}>
              {starting && <Loader2 className="w-4 h-4 animate-spin" />}Start meeting
            </Button>}
        <IconButton label={panelOpen ? 'Hide panel (⌘J)' : 'Show panel (⌘J)'} onClick={onTogglePanel} active={panelOpen}><PanelRight strokeWidth={1.5} className="w-4 h-4" /></IconButton>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: TeamChat**

Create `components/shell/TeamChat.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Users } from 'lucide-react'
import type { Agent } from '@/types/agent'
import type { Team, Meeting } from '@/types/team'
import { useMeetingMessages } from '@/hooks/useMeetingMessages'
import { displayName, formatAge } from '@/lib/agent-status'
import { Button, EmptyState, Notice } from './ui'

/** The team's meeting chat: everyone's messages, and a composer that broadcasts or targets one member. */
export default function TeamChat({ team, meeting, members, onStart, starting }: {
  team: Team
  meeting: Meeting | null
  members: Agent[]
  onStart: () => void
  starting: boolean
}) {
  const { messages, sendToAgent, broadcastToAll, markAsRead } = useMeetingMessages({
    meetingId: meeting?.id ?? null,
    participantIds: team.agentIds,
    teamName: team.name,
    isActive: !!meeting,
  })
  const [to, setTo] = useState<string>('all')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { markAsRead(); endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length, markAsRead])
  useEffect(() => { if (to !== 'all' && !team.agentIds.includes(to)) setTo('all') }, [team.agentIds, to])

  if (!meeting) {
    return (
      <div className="flex-1 grid place-items-center p-10">
        <EmptyState icon={<Users strokeWidth={1.5} className="w-6 h-6" />} title="No meeting running"
          description={members.length ? 'Start a meeting to talk to all members at once.' : 'Add members from the Members panel (＋ then E), then start a meeting.'}
          action={<Button variant="accent" onClick={onStart} disabled={starting || members.length === 0}>Start meeting</Button>} />
      </div>
    )
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true); setError(null)
    try {
      if (to === 'all') await broadcastToAll(body)
      else await sendToAgent(to, body)
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }
  const now = Date.now()

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {messages.length === 0 && <p className="text-[14px] text-ink-muted">No messages yet. Say hi to the team.</p>}
        {messages.map(m => m.isMine ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl px-4 py-2.5 bg-raised text-ink text-[15px] whitespace-pre-wrap">{m.preview}</div>
          </div>
        ) : (
          <div key={m.id} className="max-w-[80%]">
            <div className="text-[12px] text-ink-muted"><span className="text-ink font-medium">{m.displayFrom}</span> · {formatAge(m.timestamp, now) || 'now'}</div>
            <div className="text-[15px] text-ink whitespace-pre-wrap mt-0.5">{m.preview}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="px-8 pb-6 pt-2">
        <div className="rounded-[18px] border border-control-off bg-surface px-4 pt-3.5 pb-3">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} aria-label="Message the team"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={to === 'all' ? 'Message the team' : `Message ${displayName(members.find(m => m.id === to) ?? members[0])}`}
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-gray-500 resize-none focus:outline-none min-h-[44px]" style={{ maxHeight: 160 }} />
          <div className="flex items-center gap-3 mt-1">
            <select value={to} onChange={e => setTo(e.target.value)} aria-label="Send to"
              className="h-[28px] rounded-[8px] border border-control-border bg-sunken px-2 text-[13px] text-ink-muted focus:outline-none">
              <option value="all">To: Everyone</option>
              {members.map(m => <option key={m.id} value={m.id}>To: {displayName(m)}</option>)}
            </select>
            {error && <Notice tone="error">{error}</Notice>}
            <button type="button" onClick={send} disabled={sending || !text.trim()} aria-label="Send"
              className="ml-auto grid place-items-center w-[34px] h-[34px] rounded-full bg-accent-fill text-white disabled:opacity-40">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TeamPanelDock**

Create `components/shell/TeamPanelDock.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { Columns3, ListChecks, FileText, ScrollText, Users, SquareTerminal, type LucideIcon } from 'lucide-react'
import type { Agent } from '@/types/agent'
import type { Team } from '@/types/team'
import type { LayoutAction, LayoutState } from '@/lib/panel-layout'
import { TEAM_TOOLS, termAgentId, termTab, teamTabLabel, type TeamTool } from '@/lib/team-panels'
import { displayName } from '@/lib/agent-status'
import { useTasks } from '@/hooks/useTasks'
import { useDocuments } from '@/hooks/useDocuments'
import TaskKanbanBoard from '@/components/team-meeting/TaskKanbanBoard'
import TaskPanel from '@/components/team-meeting/TaskPanel'
import TeamDocumentsSection from '@/components/teams/TeamDocumentsSection'
import TeamInstructionsSection from '@/components/teams/TeamInstructionsSection'
import TeamOverviewSection from '@/components/teams/TeamOverviewSection'
import AgentTabContent from './AgentTabContent'
import DockFrame from './DockFrame'

const TOOL_ICONS: Record<TeamTool, LucideIcon> = { kanban: Columns3, tasks: ListChecks, documents: FileText, instructions: ScrollText, members: Users }
type UpdateTeam = (u: { name?: string; description?: string; agentIds?: string[]; instructions?: string }) => Promise<void>

function KanbanBody({ team, members }: { team: Team; members: Agent[] }) {
  const t = useTasks(team.id)
  return <div className="flex-1 min-w-0 overflow-auto"><TaskKanbanBoard agents={members} tasks={t.tasks} tasksByStatus={t.tasksByStatus}
    onUpdateTask={t.updateTask} onDeleteTask={t.deleteTask} onCreateTask={t.createTask} teamName={team.name} /></div>
}
function TasksBody({ team, members }: { team: Team; members: Agent[] }) {
  const t = useTasks(team.id)
  return <div className="flex-1 min-w-0 overflow-auto"><TaskPanel agents={members} tasks={t.tasks} pendingTasks={t.pendingTasks}
    inProgressTasks={t.inProgressTasks} completedTasks={t.completedTasks} onCreateTask={t.createTask} onUpdateTask={t.updateTask} onDeleteTask={t.deleteTask} /></div>
}
function MembersBody({ team, allAgents, updateTeam }: { team: Team; allAgents: Agent[]; updateTeam: UpdateTeam }) {
  const t = useTasks(team.id)
  const d = useDocuments(team.id)
  return <div className="flex-1 min-w-0 overflow-auto p-4"><TeamOverviewSection team={team} agents={allAgents} taskCount={t.tasks.length} docCount={d.documents.length} onUpdateTeam={updateTeam} /></div>
}

/** Team tool panel: Kanban, Tasks, Documents, Instructions, Members, and member terminals. */
export default function TeamPanelDock({ layout, dispatch, team, members, allAgents, onlineAgents, updateTeam, wakingAgentId, onWake, onShowProfile }: {
  layout: LayoutState
  dispatch: React.Dispatch<LayoutAction>
  team: Team
  members: Agent[]
  allAgents: Agent[]
  onlineAgents: Agent[]
  updateTeam: UpdateTeam
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
}) {
  const p = layout.panel
  const memberKey = team.agentIds.join(',')
  useEffect(() => { dispatch({ type: 'pruneTeam', memberIds: team.agentIds }) }, [memberKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const nameOf = (id: string) => { const a = allAgents.find(x => x.id === id); return a ? displayName(a) : undefined }
  const iconOf = (tab: string): LucideIcon => termAgentId(tab) ? SquareTerminal : TOOL_ICONS[tab as TeamTool]
  const menuItems = [
    ...TEAM_TOOLS.map(t => ({ id: t.id, label: t.label, key: t.key, icon: TOOL_ICONS[t.id], section: 'Team' })),
    ...members.map((m, i) => ({ id: termTab(m.id), label: displayName(m), key: i < 9 ? String(i + 1) : undefined, icon: SquareTerminal, section: 'Member terminals' })),
  ]

  const active = p.teamActive
  const body = (() => {
    if (!active) return null
    const agentId = termAgentId(active)
    if (agentId) {
      const agent = allAgents.find(a => a.id === agentId)
      if (!agent) return null
      return <AgentTabContent key={active} agent={agent} activeTab="terminal" setActiveTab={() => {}} onlineAgents={onlineAgents}
        wakingAgentId={wakingAgentId} onWake={onWake} onShowProfile={onShowProfile} hideHeaders chatVariant="ink" />
    }
    switch (active) {
      case 'kanban': return <KanbanBody key={team.id} team={team} members={members} />
      case 'tasks': return <TasksBody key={team.id} team={team} members={members} />
      case 'documents': return <div key={team.id} className="flex-1 min-w-0 overflow-auto p-4"><TeamDocumentsSection teamId={team.id} /></div>
      case 'instructions': return <div key={team.id} className="flex-1 min-w-0 overflow-auto p-4"><TeamInstructionsSection instructions={team.instructions || ''} onSave={s => updateTeam({ instructions: s })} /></div>
      case 'members': return <MembersBody key={team.id} team={team} allAgents={allAgents} updateTeam={updateTeam} />
      default: return null
    }
  })()

  return (
    <DockFrame
      panel={p} dispatch={dispatch} scope="team"
      tabs={p.teamTabs.map(t => ({ id: t, label: teamTabLabel(t, nameOf), icon: iconOf(t) }))}
      active={active}
      onActivate={id => dispatch({ type: 'activateTeam', tab: id })}
      onClose={id => dispatch({ type: 'closeTeam', tab: id })}
      menuItems={menuItems}
      onPick={id => dispatch({ type: 'openTeam', tab: id })}
      emptyHint="Use ＋ for Kanban, Tasks, Documents, Instructions, Members or a member's terminal."
    >
      {body}
    </DockFrame>
  )
}
```

- [ ] **Step 4: Type-check and commit**

Run: `yarn -s tsc --noEmit -p tsconfig.json 2>&1 | grep "error TS" | grep -v "^tests/"`
Expected: no output. If a lucide icon is missing, swap it: `Columns3` → `Columns`, `ScrollText` → `FileText`.

```bash
git add components/shell/TeamTopBar.tsx components/shell/TeamChat.tsx components/shell/TeamPanelDock.tsx
git commit -m "feat(teams): team top bar, meeting chat and team panel dock"
```

---

### Task 6: TeamWorkspace, AppShell selection, ⌘K and redirects

**Files:**
- Create: `components/shell/TeamWorkspace.tsx`
- Create: `components/shell/ShellRedirect.tsx`
- Modify: `components/shell/AppShell.tsx`, `components/shell/CommandPalette.tsx`
- Modify: `app/teams/page.tsx`, `app/teams/[id]/page.tsx`, `app/team-meeting/page.tsx` (wrap them in `ShellRedirect`)

**Interfaces:**
- Consumes: everything above; `useTeam(teamId)` returns `{ team, updateTeam }`.
- Produces:
  - `TeamWorkspace({ teamId, layout, dispatch, allAgents, onlineAgents, meetings, startMeeting, endMeeting, wakingAgentId, onWake, onShowProfile, now })`;
  - `ShellRedirect({ children })`;
  - `CommandPalette` props gain `teams?: { id: string; name: string }[]` and `onSelectTeam?: (id: string) => void`.

- [ ] **Step 1: TeamWorkspace**

Create `components/shell/TeamWorkspace.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Agent } from '@/types/agent'
import type { Team, Meeting } from '@/types/team'
import type { LayoutAction, LayoutState } from '@/lib/panel-layout'
import { activeMeetingFor } from '@/lib/team-panels'
import { useTeam } from '@/hooks/useTeam'
import { Notice } from './ui'
import WorkArea from './WorkArea'
import TeamTopBar from './TeamTopBar'
import TeamChat from './TeamChat'
import TeamPanelDock from './TeamPanelDock'

export default function TeamWorkspace({ teamId, layout, dispatch, allAgents, onlineAgents, meetings, startMeeting, endMeeting, wakingAgentId, onWake, onShowProfile, now }: {
  teamId: string
  layout: LayoutState
  dispatch: React.Dispatch<LayoutAction>
  allAgents: Agent[]
  onlineAgents: Agent[]
  meetings: Meeting[]
  startMeeting: (t: Team) => Promise<boolean>
  endMeeting: (id: string) => Promise<boolean>
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
  now: number
}) {
  const { team, updateTeam, error } = useTeam(teamId)
  const [starting, setStarting] = useState(false)
  if (!team) {
    return <div className="flex-1 grid place-items-center">{error ? <Notice tone="error">Team not found.</Notice> : <Notice>Loading team…</Notice>}</div>
  }
  const members = team.agentIds.map(id => allAgents.find(a => a.id === id)).filter((a): a is Agent => !!a)
  const meeting = activeMeetingFor(team.id, meetings)
  const start = async () => { setStarting(true); try { await startMeeting(team) } finally { setStarting(false) } }

  return (
    <WorkArea layout={layout} dispatch={dispatch} depKey={team.id}
      top={<TeamTopBar team={team} meeting={meeting} members={members} now={now} starting={starting} onStart={start}
        onEnd={() => { if (meeting) endMeeting(meeting.id) }}
        panelOpen={layout.panel.open} onTogglePanel={() => dispatch({ type: 'toggle', scope: 'team' })}
        sidebarCollapsed={layout.sidebarCollapsed} onToggleSidebar={() => dispatch({ type: 'toggleSidebar' })} />}
      center={<TeamChat key={team.id} team={team} meeting={meeting} members={members} onStart={start} starting={starting} />}
      dock={<TeamPanelDock layout={layout} dispatch={dispatch} team={team} members={members} allAgents={allAgents} onlineAgents={onlineAgents}
        updateTeam={updateTeam} wakingAgentId={wakingAgentId} onWake={onWake} onShowProfile={onShowProfile} />}
    />
  )
}
```

`useTeam` returns `error`. Check `hooks/useTeam.ts:59` and use whatever name it exposes. If there's no `error` field, drop it and show "Loading team…" only.

- [ ] **Step 2: AppShell selection**

In `components/shell/AppShell.tsx`:
- Import `TeamWorkspace`.
- Change `useLayout()` to `useLayout(teamId ? 'team' : 'agent')`. Move the `teamId` state declaration above it.
- Read `?team=` once on mount and tidy the URL:

```tsx
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('team')
    if (id) { setTeamId(id); p.onSelectHome(); window.history.replaceState(null, '', '/') }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
```

- Selecting an agent or Home clears the team. Wrap the props passed to `StatusSidebar` and `CommandPalette`:

```tsx
  const selectAgent = (a: Agent) => { setTeamId(null); p.onSelectAgent(a) }
  const selectHome = () => { setTeamId(null); p.onSelectHome() }
  const selectTeam = (id: string) => { setTeamId(id); p.onSelectHome() }
```

  Use `selectAgent` / `selectHome` / `selectTeam` everywhere `p.onSelectAgent` / `p.onSelectHome` / the inline team setter were passed in this file, including `HomeScreen` and `CommandPalette`.
- Render the team view first:

```tsx
      {teamId ? (
        <TeamWorkspace teamId={teamId} layout={layout} dispatch={dispatch} allAgents={p.agents} onlineAgents={p.onlineAgents}
          meetings={meetings} startMeeting={startMeeting} endMeeting={endMeeting}
          wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} now={now} />
      ) : agent ? (
        …existing WorkArea for the agent…
      ) : (
        …HomeScreen…
      )}
```

- Pass `teams={teams}` and `onSelectTeam={selectTeam}` to `CommandPalette`.

- [ ] **Step 3: CommandPalette teams**

In `components/shell/CommandPalette.tsx`:
- Add `teams?: { id: string; name: string }[]` and `onSelectTeam?: (id: string) => void` to `CommandPaletteProps`.
- In `items`, after the agent items, add `...(p.teams ?? []).map(t => ({ id: \`team:${t.id}\`, kind: 'screen' as const, label: \`Team · ${t.name}\`, keywords: ['team', t.name] }))`.
- In `run`, before the `screen:home` check, add `else if (item.id.startsWith('team:')) p.onSelectTeam?.(item.id.slice(5))`. Order the conditions so that agent comes first, then team, then home, classic and router.

- [ ] **Step 4: ShellRedirect and the old pages**

Create `components/shell/ShellRedirect.tsx`:

```tsx
'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { readPref, SHELL_KEY } from '@/lib/safe-storage'
import { redirectTarget } from '@/lib/team-panels'

/** In the command-center layout, old full-screen Teams/Meeting pages forward into the shell. Classic keeps them. */
export default function ShellRedirect({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [legacy, setLegacy] = useState(false)
  useEffect(() => {
    if (readPref(SHELL_KEY, 'command-center', ['command-center', 'classic'] as const) !== 'command-center') { setLegacy(true); return }
    const url = new URL(window.location.href)
    const go = (teamId: string | null) => router.replace(redirectTarget(url.pathname, url.searchParams, teamId))
    const meetingId = url.pathname.startsWith('/team-meeting') ? url.searchParams.get('meeting') : null
    if (meetingId && meetingId !== 'new' && !url.searchParams.get('team')) {
      fetch(`/api/meetings/${encodeURIComponent(meetingId)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => go(d?.meeting?.teamId ?? null))
        .catch(() => go(null))
    } else {
      go(null)
    }
  }, [router])
  return legacy ? <>{children}</> : null
}
```

In each of `app/teams/page.tsx`, `app/teams/[id]/page.tsx` and `app/team-meeting/page.tsx`:
- rename the default export function, for example `export default function TeamsPage()` → `function LegacyTeamsPage()`;
- append:

```tsx
export default function TeamsPage() {
  return <ShellRedirect><LegacyTeamsPage /></ShellRedirect>
}
```

  Use the matching names: `TeamDashboardPage` / `LegacyTeamDashboardPage` and `TeamMeetingPage` / `LegacyTeamMeetingPage`.
- add `import ShellRedirect from '@/components/shell/ShellRedirect'`.

- [ ] **Step 5: Gates**

```bash
yarn -s tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"   # 7
yarn -s lint 2>&1 | grep -E "^./(components/shell|hooks/useTeams|lib/team-panels|app/team)" -A5 | grep -E "Error"   # nothing
yarn test 2>&1 | grep -E "Tests "   # only the 4 baseline failures
```

- [ ] **Step 6: Browser check (`scratchpad/pw/teams-check.mjs`)**

Run against :23000 at 1440×900, with onboarding done, the shell set to command-center and the layout cleared. It checks:
1. Sidebar ＋ next to "Teams" → dialog → name "QA team" → Create. The team is selected, the top bar shows "Teams / QA team" and the centre shows "No meeting running".
2. Panel ＋ then `E` opens Members. Add the existing agent (Raimundo) through its Add Agent control. The top bar shows one avatar.
3. "Start meeting" → "● Meeting · …" appears, and the sidebar row shows "● live" within 15s (or after a reload).
4. Type "hello team" in the chat and press Enter. The message appears as my bubble.
5. Panel ＋ then `K` opens Kanban, and ＋ then `1` opens a "Raimundo" terminal tab with `.xterm` visible.
6. "End meeting" → the empty state returns.
7. Visiting `/teams` lands on `/`, and `/team-meeting?team=<id>` lands on `/` with "QA team" selected.
8. ⌘K "QA team", then Enter, selects it.
9. No console page errors.
10. Clean-up: delete "QA team" via `DELETE /api/teams/<id>` at the end.

Expected: every check is true.

- [ ] **Step 7: Commit**

```bash
git add components/shell app/teams app/team-meeting
git commit -m "feat(teams): team workspace in the shell, palette entries and redirects"
```
