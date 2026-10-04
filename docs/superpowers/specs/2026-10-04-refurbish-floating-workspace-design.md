# Refurbish: Floating Workspace, Colony Profile Card, Unified Tasks, Skills Editor, UI Refresh

**Date:** 2026-10-04
**Branch:** `redesign/command-center`
**Status:** Approved design, pending implementation plan

## Goal

One refurbishing pass over the command-center shell that delivers:

1. A **floating-window workspace** — terminal, colony and any other tool open
   simultaneously as draggable, resizable windows over the agent's chat.
2. A **profile card inside the colony** — clicking a bot shows its profile with
   edit, tasks/todos, new conversation, terminal and skills actions.
3. **Unified tasks** — per-agent tasks and todos sharing one model with the
   existing team tasks.
4. A **skills content editor** — create and edit custom SKILL.md files from
   the UI.
5. A **UI/UX refresh** — prominent "New agent" button, semantic-token
   migration of legacy components, light theme + toggle, consistency pass.
6. **Universal avatars** — one avatar component rendering the agent's real
   avatar everywhere; no more bare letter-initial circles in teams,
   meetings and member lists.
7. An **inbox refresh** — MessageCenter redesigned to the same standard as
   the rest of the shell.

Design toolchain: the visual language for the refresh is produced with the
**superdesign** skill before the polish phase; interactive primitives adopt
**shadcn/ui** components layered onto the existing semantic tokens.

Scope is the command-center shell only. The classic shell stays available
behind its pref but receives no refurbishing. Mobile/tablet dashboards are
unchanged.

## Non-goals

- Retiring the classic shell (separate later decision).
- A conversation-threads feature. "New conversation" means starting a fresh
  Claude session via the existing wake path.
- Game-side UI inside Bot Crossing beyond emitting one new postMessage event.
- Editing marketplace or built-in skills (their source of truth is the plugin
  build; they stay toggle-only).
- Auth, multi-user, or telemetry changes.

---

## 1. Floating-window workspace

### Model

The work area becomes a desktop. The selected agent's **chat remains the
fixed center surface** (never a window). Every tool currently in the dock —
terminal, inbox, files, memory, graph, docs, canvas, search, playback,
export, browser, colony, plus the new skills and tasks tools — opens as a
**floating window** above it.

Window behavior:

- Drag by title bar; resize from edges and corners (reuse the
  pointer-capture pattern from `ResizeHandle.tsx`).
- Click/focus brings to front (z-order).
- Minimize collapses to a **window strip** along the bottom of the work area;
  click restores. Maximize fills the work area; Esc restores.
- Snap: dragging near a work-area edge offers half-screen snap (left/right),
  shown with a translucent preview rect.
- Windows are clamped to the work area; a window whose saved rect no longer
  fits (resize, smaller screen) is pulled back inside on restore.

### State

New `lib/window-manager.ts`, a pure reducer in the style of
`lib/panel-layout.ts`:

```ts
interface ManagedWindow {
  id: string            // `${tool}` or `${tool}:${agentId}`
  tool: PanelType | 'skills' | 'tasks' | `term:${string}`
  agentId?: string      // undefined for global windows (colony)
  x: number; y: number; w: number; h: number
  z: number
  minimized: boolean
  maximized: boolean
}
interface WindowState { windows: ManagedWindow[]; nextZ: number }
```

- Actions: open, close, focus, move, resize, minimize, restore, maximize,
  snap, clampAll.
- Persisted to localStorage (`aimaestro-windows`) through
  `lib/safe-storage.ts`; `parseWindows` falls back to defaults on bad data,
  same pattern as `parseLayout`.
- Agent-scoped windows show when their agent is selected; global windows
  (colony) persist across agent switches.
- `hooks/useWindows.ts` owns the reducer + persistence + keyboard shortcuts.
  Existing single-key tool shortcuts (T, I, F, …) now open/focus the
  corresponding window. ⌘J minimizes/restores all windows.

### Components

- `components/shell/WindowLayer.tsx` — renders all windows for the current
  context inside `WorkArea`, plus the minimized strip.
- `components/shell/FloatingWindow.tsx` — chrome: title bar (tool icon,
  agent badge when agent-scoped, minimize/maximize/close), resize handles,
  focus handling.
- A transparent **drag shield** overlays all iframes (colony, browser)
  while any window drag/resize is active (body class `.is-resizing`
  already exists for this).

### What happens to the dock

`PanelDock`/`DockFrame` and the right/bottom dock geometry are **removed from
the command-center shell** and replaced by the window layer. `PanelBody`'s
tool-rendering switch is reused as the window content renderer.
`lib/panel-layout.ts` keeps sidebar width/collapse state; its dock fields are
dropped. The ＋ tool menu (`PanelMenu`) becomes the window launcher in the
top bar. Team workspace tools (`lib/team-panels.ts`) open in the same window
layer.

### Terminal rules (unchanged, now per-window)

- A hidden/minimized terminal window uses `visibility: hidden` +
  `pointerEvents: none`, never `display: none`.
- Terminals initialize once on mount; `TerminalContext` fitAddons refit on
  window resize/restore.

### Colony iframe constraint

`ColonyHost` keeps its single persistent fixed-position iframe and rAF
rect-tracking loop — the colony window's content area is just the rect it
pins to. Additionally the host mirrors the colony window's **z** into the
iframe's z-index so other windows stack above/below it correctly. The iframe
is never reparented (would reload the game).

## 2. Colony profile card

### Protocol

`lib/colony-message.ts` gains one message, emitted by Bot Crossing
(sibling repo `/Users/obre/Downloads/bot-crossing`, harness
`server/harnesses/ai-maestro.mjs` + `src/game/host.js`):

- `bot-crossing:select-agent { agentId }` — fired on single click of a bot.
- Existing `bot-crossing:open-agent` keeps firing on the HUD Open button /
  Enter / double-click → opens the agent in the shell as today.
- Origin-checked like existing messages. An older bot-crossing that never
  emits `select-agent` degrades gracefully to current behavior.

### Card

`components/shell/ColonyProfileCard.tsx`, rendered by the shell **over the
colony window** (anchored to a side of the colony rect; it is React DOM, not
game UI):

- **Identity:** avatar (`AgentFace`), name/label, live status via
  `presenceOf`, host, model/program, working directory, task description,
  unread count.
- **Edit:** inline form (label, taskDescription, tags, avatar) →
  `PATCH /api/agents/[id]` (existing route). Save refreshes the colony via
  the existing `aimaestro:colony-refresh` event.
- **Tasks & todos:** section 3's list, inline quick-add.
- **New conversation:** starts a fresh session through the existing
  wake/create-session path (`WakeAgentDialog` flow when choices are needed),
  then selects the agent and focuses chat.
- **Open terminal:** opens a floating terminal window for the agent.
- **Skills:** opens the skills window (section 4) for the agent.
- **Open workspace:** selects the agent in the shell (same as
  `open-agent`).
- Dismiss: ✕, Esc, or clicking another bot (card re-targets).

## 3. Unified tasks & todos

One task system. Extend, don't duplicate.

### Model (`types/task.ts`)

- `teamId` becomes **optional**.
- New optional `agentId` — the owning agent for personal tasks.
- Invariant: a task has `teamId`, `agentId`, or both (personal task linked
  to a team).
- A "todo" is just a task with only a `subject` — no second type. UI treats
  `status: completed` as the checkbox.

### Storage

- Personal tasks: `~/.aimaestro/agents/<id>/tasks.json`, managed by a
  generalized `lib/task-registry.ts`.
- Team task files stay at `~/.aimaestro/teams/tasks-<teamId>.json`,
  untouched format (existing files parse unchanged since new fields are
  optional).

### API (per convention: service + thin route + headless-router)

- `GET/POST /api/agents/[id]/tasks`, `PATCH/DELETE
  /api/agents/[id]/tasks/[taskId]` → new functions in a
  `services/agents-tasks-service.ts` returning `ServiceResult<T>`.
- The GET merges personal tasks with team tasks where
  `assigneeAgentId === agentId`, each tagged with its source so the UI can
  deep-link team tasks to the kanban.

### UI

- `components/tasks/AgentTaskList.tsx` — checkbox list, quick-add input,
  expand a row for full fields (status, priority, blockers, description).
  Used in: the colony profile card, the `AgentProfile` drawer, and as a
  floating-window tool ("Tasks", key A for agents).
- Team kanban unchanged; linked tasks appear there as before.
- `hooks/useAgentTasks.ts` — fetch + optimistic updates, polling like
  `useTasks`.

## 4. Skills editor

- `services/agents-skills-service.ts` + `/api/agents/[id]/skills` extended
  so custom skills support **content read/write**: create scaffolds
  `~/.aimaestro/agents/<id>/skills/<name>/SKILL.md` (name + description
  frontmatter + body), PATCH updates content. Write path already exists in
  `lib/agent-registry.ts` (~line 2104).
- `components/marketplace/AgentSkillEditor.tsx` gains an editor pane for
  custom skills: frontmatter fields (name, description) + markdown body in
  a monospace textarea (no heavyweight editor dependency), dirty-state
  guard, save/cancel.
- Skills become a **floating-window tool** per agent and an action on the
  colony profile card, in addition to the existing AgentProfile placement.
- Marketplace + built-in skills remain toggle-only.

## 5. Sidebar & agent creation

- The "+" moves from the `StatusSidebar` **footer** to the **header**, next
  to search, as a labeled icon button ("New agent"); footer copy is removed.
- ⌘K palette gains a "Create agent" command.
- Same `AgentCreationWizard`; creation APIs untouched.

## 5b. Universal avatars

Agent identity assets already exist (photographic portraits in
`public/avatars/`, emoji avatars, `AgentFace`/`LiveAvatar`/`AgentBadge`),
but several surfaces — team member lists, meeting chat bubbles, the teams
sidebar rows, kanban cards — render bare letter-initial circles instead.

- One shared `components/AgentAvatar.tsx` becomes the **only** way to render
  an agent's picture: resolves `agent.avatar` (portrait or emoji) with the
  hash-colored initial strictly as a last-resort fallback, takes a size
  prop, optionally composes the status dot (from `presenceOf`, never its own
  logic).
- Every surface migrates to it: StatusSidebar rows, HomeScreen grid,
  TeamWorkspace members list, meeting chat message headers, kanban cards,
  MessageCenter, ColonyProfileCard, AgentTopBar, command palette results.
- Meeting/team views that only have an agent name or id resolve the full
  agent record through `useAgents` data before falling back.

## 5c. Inbox (MessageCenter) refresh

`MessageCenter` is redesigned to shell standard as part of this pass:

- Two-pane layout inside its window: thread/message list (sender avatar via
  `AgentAvatar`, subject, snippet, time, unread dot) + reading pane with a
  proper compose/reply bar.
- Unread, read and archive states clearly visible; mark-read on open.
- Token-based styling and shadcn primitives like the rest of the shell; no
  behavioral changes to AMP delivery (send paths and polling untouched).

## 6. UI/UX refresh

### Design process

- A **superdesign** pass runs before the polish phase to produce the
  refreshed visual language (spacing, type scale, surfaces, states) for the
  shell, the floating-window chrome, the colony profile card and the inbox,
  grounded in the existing `theme-ink` tokens. Its output is applied through
  the token layer in `globals.css`/`tailwind.config.ts`, not as one-off
  styles.

### Component library: shadcn/ui

- shadcn/ui is adopted for interactive primitives — Dialog, DropdownMenu,
  Popover, Tooltip, Tabs, Command, Checkbox, Select, Switch — configured so
  its CSS variables map onto the existing semantic tokens (one source of
  truth; `theme-ink`/`theme-paper` keep working).
- `components/shell/ui.tsx` primitives are reimplemented on top of the
  shadcn equivalents where that deletes custom code (Dialog, Select,
  Checkbox, Toggle); purely presentational ones (Card, Row, SectionLabel,
  StatusDot, EmptyState) stay as-is.
- New UI in this spec (window chrome, profile card, task list, skills
  editor, inbox) is built with these primitives from the start.
- Tailwind stays at 3.4; Radix deps come with shadcn. The ⌘K
  `CommandPalette` migrates to the shadcn Command component.

### Polish

- **Token migration:** `ChatView`, `AgentProfile`, `MessageCenter`,
  `WorkTree`, `ConversationDetailPanel` and other command-center-reachable
  components move from raw `gray-*`/`blue-*` classes to the semantic tokens
  (`surface`, `raised`, `ink`, `ink-muted`, `accent`, `hairline`, …).
  The legacy hardcoded `sidebar.*` palette in `tailwind.config.ts` is
  removed once no reachable component uses it.
- **Light theme:** implement `.theme-paper` from the documented recipe in
  `app/globals.css`; theme preference (ink / paper / system) stored via
  `safe-storage`, applied as the body class in `app/layout.tsx` client-side,
  with `prefers-color-scheme` as the "system" source. Toggle lives in
  Settings. Terminal colors stay governed by `lib/terminal-theme.ts`
  (xterm has its own color model); it gains a paper variant.
- **Consistency pass:** focus-visible rings, hover states, empty states and
  dialogs all through `components/shell/ui.tsx` primitives; no nested
  buttons (house rule).

## 7. Error handling & testing

- `lib/window-manager.ts` and the task-registry changes get vitest suites
  (like `panel-layout`'s): reducer actions, clamp logic, parse fallbacks.
- `agents-tasks-service` and skills-service content writes get service
  tests; routes mirrored in `headless-router`.
- Colony: unknown/old message types ignored; `select-agent` from a wrong
  origin dropped (existing check).
- Bad persisted window/layout JSON → defaults, never a crash.
- Existing suites must stay green (`yarn test`); build verified outside any
  live checkout per CLAUDE.md.

## 8. Build order & execution strategy

1. **Foundations (sequential)** — shadcn setup mapped to tokens; window
   manager reducer + tests; WindowLayer/FloatingWindow; dock removal;
   terminal/colony integration. Milestone: terminal and colony open side by
   side, draggable.
2. **Parallel tracks** (independent domains, dispatched as parallel agents
   per the dispatching-parallel-agents skill):
   - **Track A — Colony profile card:** protocol message (bot-crossing
     sibling repo) + ColonyProfileCard.
   - **Track B — Unified tasks:** types, registry, service, routes,
     headless, AgentTaskList.
   - **Track C — Skills editor:** service content ops, editor UI.
   - **Track D — Universal avatars:** AgentAvatar + surface migration.
   Tracks touch disjoint files; integration points (card embeds task list
   and skills action) wire up after merge.
3. **Design pass** — superdesign produces the refreshed visual language;
   applied via tokens.
4. **Polish (parallelizable per component)** — inbox redesign, sidebar
   "+" move, palette command, token migration sweep, theme toggle.

Each step leaves the app shippable; every PR carries a version bump and
CHANGELOG entry per house rules.
