# Plan: team zones, persistent colony, instant new agents

Feature: agents created in AI Maestro appear in the colony immediately, teams show as shared
zones, and the colony never reloads when switching tabs, agents, or into a team workspace.

No third-party API/service is involved — everything builds on the two local codebases:

| Repo | Branch | Role |
|---|---|---|
| `~/Downloads/ai-maestro` | `redesign/command-center` | panel shell, teams API, agent wizard |
| `~/Downloads/bot-crossing` | `main` | colony renderer + `ai-maestro` harness adapter |

Prior art this plan extends (all already merged): `lib/colony-message.ts`,
`components/shell/ColonyPanel.tsx`, `lib/bot-crossing-sidecar.mjs`, Bot Crossing's
`server/harnesses/ai-maestro.mjs` and `src/game/host.js`.
Conventions: TDD (vitest in ai-maestro, `node --test` in bot-crossing), no commits unless asked,
design tokens only in components. Known pre-existing vitest failures (ignore, cause no new ones):
mesh-primer, plugin-hook-sync ×2, plugin-skill-frontmatter.

## UI first (what the user sees)

1. Colony tab exists in BOTH docks: agent dock (key `O`, already shipped) and team workspace
   dock (new team tool, key `O`, icon `Orbit`).
2. The colony is ONE live instance. Switching agent↔team↔tabs repositions it; it never reloads,
   so camera, selection and walking bots persist. (Today `PanelBody key={p.active}` remounts the
   iframe on every tab switch — that is the bug being fixed.)
3. A team is one shared zone named after the team; all member bots/buildings stand on it.
   Agents in no team keep one zone per working folder, as today.
4. Finishing the agent-creation wizard refreshes the colony at once — the new bot walks out of
   the ship within ~1–2 s instead of up to 15 s.

## Authentication

None anywhere: all HTTP is localhost-to-localhost (existing threat model). Trust boundaries that
MUST be kept: `parseColonyMessage` accepts only the colony origin; Bot Crossing accepts host
messages only from `hostOrigin` (already validated local-only by `hostTarget`).

## Setup / initialization

No new processes, env vars or deps. The sidecar, ports (23000/23010) and
`BOT_CROSSING_HARNESSES=ai-maestro` wiring stay untouched.

## Core changes

### A. Bot Crossing — team zones (server/harnesses/ai-maestro.mjs)

- `readAgents` additionally fetches `GET {AIMAESTRO_URL}/api/teams` (same 2.5 s abort signal;
  `.catch(() => ({ teams: [] }))` so a failure costs teams, not the scan).
  Response shape (verified live): `{ teams: [{ id, name, agentIds: string[], ... }] }`.
- `agentsToThreads(agents, activity, teams)` gains the third param. Build `agentId → team` from
  the teams array in order; the FIRST team listing an agent wins. For a teamed agent:
  `project = team.name`, `projectPath = ''` (keep `cwd` = real dir).
  WHY `projectPath: ''` for every member: `disambiguateProjects` (server/scan.mjs) splits one
  project name into several zones when it sees ≥2 distinct `projectPath`s under that name —
  identical empty paths keep the team in one zone. Known cosmetic consequences, accept both:
  a folder zone sharing the team's name gets renamed to a deeper path label; the team zone's
  Finder / Copy path / New conversation buttons act on no real path.
- Tests (extend `test/ai-maestro.test.mjs`, fixtures only): two members share `project`; an
  untea­med agent keeps folder project; agent in two teams takes the first; teams fetch throwing
  is tolerated; `teams: undefined` / non-array tolerated; teamed thread has `projectPath === ''`.

### B. Bot Crossing — host-triggered refresh (src/game/host.js, src/main.js)

- `host.js`: export `isHostRefresh(event, hostOrigin)` → true only when `hostOrigin` is set,
  `event.origin === hostOrigin`, and `event.data?.type === 'bot-crossing:refresh'`.
- `main.js` (embedded mode only, next to the existing `HOST_ORIGIN` const):
  `window.addEventListener('message', (e) => { if (isHostRefresh(e, HOST_ORIGIN)) poll() })`.
- Tests (extend `test/host.test.mjs`): accepts the exact shape; rejects wrong origin, wrong
  type, null hostOrigin.

### C. AI Maestro — persistent colony host (new `components/shell/ColonyHost.tsx`)

The iframe moves OUT of the dock tree into a component mounted once at the AppShell root.
CRITICAL: an iframe that is reparented in the DOM reloads — so the slot pattern, never a portal
that moves the node:

- `ColonyHost` renders a `position:fixed` wrapper holding the single iframe
  (`colonyFrameUrl(status.url, window.location.origin)`, `BROWSER_SANDBOX`,
  `allow="clipboard-write"`, `referrerPolicy="no-referrer"`, keyed only by url+reload nonce).
  It owns everything stateful ColonyPanel owns today: the 4 s status poll of
  `/api/colony/status`, the window `message` listener (`parseColonyMessage` → `findAgent` →
  `onSelectAgent`), and NEW: a `window` CustomEvent listener `aimaestro:colony-refresh` that
  posts `{ type: COLONY_REFRESH }` into the iframe at the colony origin.
- Slot registry via React context `ColonySlot` exported from the same file:
  `{ setSlot(el: HTMLElement | null), status, reload() }`. While a slot is registered and
  status.running, the wrapper syncs to `slot.getBoundingClientRect()` on a rAF loop and is
  visible; with no slot (or not running / remote) it keeps its DOM but goes
  `visibility:hidden` + `pointer-events:none`. Respect the existing `.is-resizing` iframe rule.
- Remote guard stays: when `!colonyReachableFrom(window.location.hostname)` the host never
  mounts the iframe at all.
- `lib/colony-message.ts`: add `export const COLONY_REFRESH = 'bot-crossing:refresh'`.
- `components/shell/ColonyPanel.tsx` becomes dumb: register its div as the slot on mount /
  unregister on unmount; render the existing EmptyStates (off / not running / remote, with
  reason + fix + log + Check again) and the footer bar from context `status`; no iframe, no
  props — `PanelBody` renders plain `<ColonyPanel />`.
- `AppShell.tsx`: wrap the shell in `<ColonyHost agents={p.agents} onSelectAgent={selectAgent}>`
  (provider + layer); in the wizard's `onComplete` (line ~142), after `p.onAgentsChanged()`,
  `window.dispatchEvent(new CustomEvent('aimaestro:colony-refresh'))`.

### D. AI Maestro — colony in the team dock

- `lib/team-panels.ts`: add `'colony'` to `TeamTool`; `TEAM_TOOLS` gains
  `{ id: 'colony', label: 'Colony', key: 'O' }` (team-scope letters taken: K A D N E B; digits
  are member terminals — O is free).
- `components/shell/TeamPanelDock.tsx`: `TOOL_ICONS.colony = Orbit`; body
  `case 'colony': return <ColonyPanel />`.
- Selection from a team view already works: `onSelectAgent` is AppShell's `selectAgent`, which
  clears `teamId` and opens the agent.

## Example payloads

- Teams: `GET http://localhost:23000/api/teams` →
  `{"teams":[{"id":"6791…","name":"A","agentIds":["a5e8acf8-…"]}]}`
- Host→colony refresh: `iframe.contentWindow.postMessage({ type: 'bot-crossing:refresh' },
  'http://localhost:23010')`
- Colony→host open (unchanged): `{ type: 'bot-crossing:open-agent', agentId }`.

## Error handling

- Teams endpoint down → agents still scan, zones fall back to folders (test-covered).
- Colony not running → slots render reason/fix/log EmptyState (existing behavior, now via
  context); refresh events while dead are no-ops.
- Opened from another device → "Colony is only on the host machine" EmptyState; no iframe.
- Empty team (no agents) → no threads → no zone; nothing to handle.

## Rate limits / cadence (no pricing — all local)

Colony thread scan: 15 s poll (`POLL_MS`) + instant on wizard completion. Status endpoint: 4 s.
Adapter HTTP timeout: 2.5 s per request, teams included.

## Tests & verification

- vitest: extend `tests/colony-message.test.ts` (COLONY_REFRESH constant),
  `tests/team-panels.test.ts` if present else create (teamTabForKey 'o' → colony; prune keeps
  colony); keep `tests/panel-layout.test.ts` green.
- bot-crossing: `npm test` (adapter + host additions above).
- Live, in order: (1) `curl /api/colony/status` running; (2) open colony in agent dock, note
  camera; switch Terminal→Colony→team "A"→its Colony tab→back — network panel must show ONE
  load of `23010/?host=` total; (3) team "A" shows one zone named "A" with Raimundo on it;
  (4) create a throwaway agent in the wizard → its bot appears in ≤2 s; (5) delete it after.

## Out of scope

Creating agents from inside the colony (colony's New conversation stays refusing for the
ai-maestro harness); team zones for other harnesses; narrow-panel colony layout.
