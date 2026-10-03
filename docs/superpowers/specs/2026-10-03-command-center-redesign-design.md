# Command Center Redesign — Desktop Dashboard (Part 1)

**Date:** 2026-10-03
**Branch:** `redesign/command-center`
**Status:** Approved design, awaiting spec review
**Visual reference:** `.superpowers/brainstorm/91350-1791046217/content/full-design-v3.html` (layout) and `style-system.html` (tokens/controls)

## 1. Goal

Replace the desktop dashboard's shell (sidebar, header, tab strip) with a cleaner "command center" in a flat, near-black style modelled on T3 Code, so that:

1. It looks clean and modern rather than busy.
2. Navigation is simpler: fewer always-visible controls and one place to jump anywhere (⌘K).
3. It matches the owner's brand (Stack Sans Text, accent derived from `#2236ff`).
4. Agent status is readable at a glance: who needs you, who is working, who is idle or asleep.

The existing content panels (terminal, chat, messages, files, memory, graph, docs, canvas, search, export, playback) keep their behaviour.

## 2. Scope

**In scope**
- Desktop layout of `app/page.tsx` (the branch after the phone/tablet checks).
- A new theme (colour tokens + fonts) applied app-wide.
- Chat panel visual restyle (message bubbles + composer) in `ChatView`.
- A Home screen shown when no agent is selected.
- A switch back to the classic layout.

**Out of scope (later parts)**
- Mobile and tablet layouts: they only inherit the new colours via tokens.
- Teams, Meetings, Settings, Marketplace, Plugin builder, Companion, Immersive, Zoom pages: tokens only.
- An "Activity" feed: no activity-history data exists.
- Any API or server change.

## 3. Style system

All colours live as CSS variables in a `.theme-ink` block in `app/globals.css`, using the existing channel-variable system (`--g-*`, `--s-*`, `--a-*`, `--fg-white`, `--c-*`). No hex values in components.

| Role | Value |
|---|---|
| Page background | `#0a0a0b` |
| Sidebar / card | `#0f0f11` |
| Selected / hover fill | `#1c1c20` |
| Border | `#1f1f23`; row divider `#1a1a1d` |
| Primary text | `#ececef` |
| Muted text | `#85858d`; dim text `#5e5e66` |
| Accent | `#2f4bff` (brand `#2236ff` lifted for contrast on near-black) |
| Needs-you (warning) | `#d6a243` text/dot, card bg `#16130d`, border `#2a2314` |
| Success | existing `--c-ok` |

The accent is used only for toggles that are on, the Send button, focus rings, unread badges and the "working" status. The theme must set `--fg-white` (see the "ONE TRAP" note in `globals.css`).

**Type.** Stack Sans Text throughout, loaded through a Google Fonts `<link>` in `app/layout.tsx`, because Next 14's `next/font/google` does not include it. The `--font-sans` fallback is the system UI font. JetBrains Mono stays for code, paths and the terminal. Only weights 400 and 500 are used.

| Use | Size |
|---|---|
| Breadcrumb | 16px |
| Body, row titles, nav items | 15px (titles 500) |
| Descriptions, secondary text | 14px, muted |
| Meta, timestamps | 12px, dim |
| Mono | 13px |

**Shape and spacing.**
- Radius: cards 14px; inputs, buttons and nav items 10px; badges and dots fully round.
- Rows: 16×22px padding with 1px dividers. No shadows.
- Selected nav item: a flat `#1c1c20` fill. Keyboard focus: a 2px accent outline.
- Section labels sit above cards, muted and not uppercase.
- Icons: `lucide-react` (already a dependency) at 16px, stroke 1.5.

## 4. Layout

```
┌──────────────┬────────────────────────────────────────┬───────────────┐
│ StatusSidebar│ AgentTopBar  host / name · ● Working 4m │ InboxPanel    │
│ 268px        │ TabBar  Chat Terminal Files Memory …    │ 300px,        │
│              │ ─────────────────────────────────────── │ collapsible   │
│              │ active panel (existing components)      │               │
└──────────────┴────────────────────────────────────────┴───────────────┘
```

With no agent selected, the centre and right columns are replaced by `HomeScreen`.

## 5. Components

New files go in `components/shell/`. Each has one job and receives its data through props, apart from the hooks named below.

| Component | Responsibility |
|---|---|
| `AppShell` | Three-column frame. Persists `inboxCollapsed` and the sidebar width in localStorage. |
| `StatusSidebar` | Brand row; Search row (opens ⌘K); Home item; "Needs you" card(s); Working, Idle and Asleep sections with counts; Status/Project segmented switch; footer icons for Settings, Teams, Meetings, Plugins and a round **+** (opens the existing `AgentCreationWizard`). |
| `ProjectTree` | Project mode of the sidebar: the existing tag tree (`tags[0]` → `tags[1]` → agents) restyled, with the same localStorage expansion keys. |
| `AgentTopBar` | Breadcrumb `host / agent`; status line; Sleep/Wake button; Pop-out (`/zoom/agent?id=`); ⋯ menu (Profile, Export, Subconscious status). |
| `TabBar` | Underlined text tabs: Chat, Terminal, Files, Memory, Code graph, Docs/Canvas, and a More menu with Search, Export and Playback. The Chat tab renders `ChatView` or `StreamingChatView` according to the runtime mode, as today. Uses the existing `activeTab` state and its `aimaestro-active-tab` key. |
| `InboxPanel` | Right column wrapping the existing `MessageCenter` for the selected agent; the header shows the unread count; collapsible. |
| `HomeScreen` | "Needs you" card with one row per waiting agent or agent with unread messages (Open button), and a grid of agent tiles with status dots plus a **+ New** tile. When there are no agents: a single "Create your first agent" card. |
| `CommandPalette` | ⌘K / Ctrl+K overlay. Searches agents (name, alias, tags, host) and screens (Home, Teams, Meetings, Plugins, Settings, "Switch to classic layout"). Arrow keys move, Enter opens, Esc closes. Registered on `window`; it must not swallow ⌘K while focus is inside `AgentSearch` on the Search tab. |
| `ui/Toggle`, `ui/Select`, `ui/Field`, `ui/Card`, `ui/Row`, `ui/Badge`, `ui/Button` | Style-system primitives used by the components above and reused by later parts. |

**Changes to existing files** (kept minimal so upstream merges stay easy):
- `app/page.tsx`: in the desktop branch, render `AppShell` when the layout is `'command-center'`, otherwise the current JSX unchanged. The handlers stay where they are (`handleAgentSelect`, `handleWakeAgent`, hibernate, `refreshAgents`, the profile and import dialogs) and are passed down.
- `app/globals.css`: add the `.theme-ink` block.
- `app/layout.tsx`: add the font `<link>`, set `--font-sans`, and put `theme-ink` on `<body>`.
- `TerminalView`, `ChatView`, `StreamingChatView`: add an optional `hideHeader?: boolean` prop. When true, `AgentHeaderBar` is not rendered. It defaults to false, so the classic layout and mobile are unaffected.
- `ChatView`: class-only restyle. User messages get a `#1c1c20` bubble with 16px radius, aligned right. Assistant messages are plain text with no bubble. Tool output goes in a card. The composer becomes a large rounded box (radius 18) with the program and access selectors and a round accent Send button. No logic changes.

## 6. Data and behaviour

**Sources (unchanged APIs)**
- Agents: `useAgents()` (polls every 10s across hosts).
- Live status: `useSessionActivity()`, which returns `{status: 'active' | 'idle' | 'waiting', lastActivity}` per session over the `/status` WebSocket, falling back to a 30s poll.
- Unread counts: a new `hooks/useUnreadCounts.ts`. It polls `/api/messages?action=unread-count` every 10s for all agents and returns `Record<agentId, number>`. It replaces the duplicated polling in `page.tsx` (lines ~370–390) for the new shell. The classic `AgentList` keeps its own polling and is not touched.

**New pure logic: `lib/agent-status.ts`**
- `isHibernated(agent)` returns `agent.session?.status !== 'online' && (agent.sessions?.length ?? 0) > 0`. This replaces the inline copies in the new shell.
- `groupByStatus(agents, activityOf)` returns `{ needsYou, working, idle, asleep }`:

| Agent state | Group | Label |
|---|---|---|
| online + `waiting` | needsYou | "Waiting for your input · {age}" |
| online + `active` | working | accent dot |
| online + `idle` (or no activity info) | idle | `{age}` |
| hibernated | asleep | `{age}` |
| offline, no sessions | asleep | "Offline" |

  Within each group, agents are sorted by `lastActivity`, newest first, then by alias.
- `formatAge(iso, now)` gives `"now"`, `"4m"`, `"2h"`, `"5d"` or `"3w"`.
- `rankCommandResults(query, items)`: a case-insensitive match where an exact prefix beats a word prefix, which beats a substring. Agents come before screens when scores tie.

**Interactions**
- Clicking an agent calls the existing `handleAgentSelect`. Online and hibernated agents open on the last-used tab. Offline agents with no sessions open the existing `AgentProfile`.
- Sleep calls the existing hibernate request. Wake opens the existing `WakeAgentDialog`, restyled by the tokens.
- **Layout switch.** The key `aimaestro-shell` holds `'command-center'` (the default) or `'classic'`. It can be changed from ⌘K, and from the ⋯ menu in the classic layout's header, which adds a "Try new layout" item.
- Persisted UI state (localStorage, each access wrapped in try/catch): `aimaestro-shell`, `aimaestro-inbox-collapsed`, `aimaestro-sidebar-mode` (`'status'` or `'project'`), plus the existing `sidebar-width` and `aimaestro-active-tab`.

**Errors and empty states**
- `useAgents` error: a quiet sidebar banner "Can't reach {host} · Retry" that calls `refreshAgents`. The last agent list stays visible.
- Activity WebSocket down: a dim "Status may be stale" line under the sidebar's search row.
- No agents: Home shows "Create your first agent", which opens the wizard.
- Each panel stays wrapped in the existing `ErrorBoundary`.

## 7. Testing

- **Unit tests (Vitest, `tests/*.test.ts`, written first):**
  - `groupByStatus`: every row of the table above, plus the sort order.
  - `isHibernated`
  - `formatAge`: all the boundaries.
  - `rankCommandResults`
  - the reducer that merges unread counts into a map.
- **Quality gates:** `yarn lint`, `yarn test` and `yarn build`, all passing, with the output reported.
- **Browser check (Playwright, run via `npx playwright`/the frontend-testing skill since it is not a project dependency, against :23000 at 1440×900):**
  - Screenshots are compared against the v3 mockup.
  - Interactions to exercise: selecting an agent, switching tabs including More, ⌘K open/search/Enter/Esc, Sleep/Wake, collapsing the inbox, the Status/Project switch, the classic-layout switch and back, and the empty Home state.
  - The console must show no errors.

## 8. Risks

- **Upstream merges.** `app/page.tsx` is large and changes often upstream. Mitigation: the new shell is one conditional branch, and everything else goes in new files.
- **Font availability.** Stack Sans Text loads from Google Fonts at runtime, so offline use falls back to the system font. Acceptable.
- **Contrast.** Muted `#85858d` on `#0f0f11` is about 5.2:1, which passes WCAG AA. Dim `#5e5e66` is only for 12px meta text that is not essential, and must never carry required information.
- **⌘K conflict** with `AgentSearch`: handled as described in §5.
