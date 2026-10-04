# Colony panel: Bot Crossing inside AI Maestro

Date: 2026-10-04
Status: approved design, awaiting spec review

## Goal

Show AI Maestro's agents as bots in [Bot Crossing](https://github.com/Station-Sciences/bot-crossing),
inside a new dock panel, **Colony**. Clicking a bot opens that agent in AI Maestro.

Decisions taken with the user:

- The panel shows **only AI Maestro agents**, not every harness thread on the machine.
- **AI Maestro starts its own Bot Crossing instance**; the user runs one command.
- Claude builds **both sides**: the AI Maestro panel and the Bot Crossing changes. The user
  restyles Bot Crossing afterwards.

## Repos and branches

| Repo | Location | Branch |
|---|---|---|
| AI Maestro | `~/Downloads/ai-maestro` | current branch, `redesign/command-center` |
| Bot Crossing | `~/Downloads/bot-crossing` (HTTPS clone of `Station-Sciences/bot-crossing`) | new local branch `ai-maestro-colony` |

Nothing is pushed. The user's GitHub account cannot push to `Station-Sciences`; a fork or PR is the
user's call later.

## Part 1: Bot Crossing changes

### 1.1 `ai-maestro` harness adapter

New file `server/harnesses/ai-maestro.mjs`, registered with one line in `server/harnesses/index.mjs`,
following `server/harnesses/README.md`.

- **Source:** `AIMAESTRO_URL` env var (no default). Reads `GET {AIMAESTRO_URL}/api/agents` and
  `GET {AIMAESTRO_URL}/api/sessions/activity`, with a short timeout.
- **`detect()`:** true when `AIMAESTRO_URL` is set and `/api/agents` answers.
- **`scanThreads()`:** one thread per agent whose `status` is not `deleted`, via a pure function
  `agentsToThreads(agents, activity)`:

| Thread field | From |
|---|---|
| `id` | `ai-maestro:{agent.id}` |
| `title` | `agent.label` or `agent.name` |
| `preview` | `agent.taskDescription` or empty |
| `project` | basename of `agent.workingDirectory`, else `agent.name` |
| `projectPath`, `cwd` | `agent.workingDirectory` |
| `model` | `agent.program` |
| `createdAt` | `agent.createdAt` as ms |
| `lastActivityAt` | activity `lastActivity`, else `session.lastActivity`, else `agent.lastActive`, as ms |
| `running` | activity status for the agent's tmux session is `active` |
| `unread` | activity status is `waiting` (the bot holds a `?`) |
| `archived` | false |
| `source` | `ai-maestro` |
| `canOpen` | true |
| `ref` | `{ agentId }` |

  The tmux session name is `agent.session.tmuxSessionName`, else `agent.name`. Offline agents are
  included, neither running nor unread.
- **`openThread({ agentId })`:** returns `{ ok: true, url: '{AIMAESTRO_URL}/?agent={agentId}' }`,
  AI Maestro's existing deep link. Used only standalone; embedded clicks never reach the server.
- **`newSession()`:** `{ ok: false, error: 'Create agents in AI Maestro' }`.

### 1.2 Harness filter

New env var `BOT_CROSSING_HARNESSES`: a comma-separated list of adapter ids. When set, `detect`,
`scanThreads` and `harnessStatus` only consider those adapters. Unset, behaviour is unchanged.
Implemented once in `server/harnesses/index.mjs` so the scanner and API need no edits.

### 1.3 Click hands off to the host page

The page reads two query parameters: `host=aimaestro` and `hostOrigin=<origin>`. Embedded mode is on
only when the page is in a frame (`window.parent !== window`), `host=aimaestro`, and `hostOrigin`'s
hostname is `localhost`, `127.0.0.1` or `::1`.

In embedded mode, `actions.openThread` in `src/main.js` does not call `/api/open` for a thread from
the `ai-maestro` harness. It posts instead:

```js
window.parent.postMessage(
  { type: 'bot-crossing:open-agent', agentId: thread.ref.agentId },
  hostOrigin,
)
```

The check is a pure function `hostTarget(search, inFrame)` returning the origin or null, with tests.

### 1.4 Tests

`node --test`, alongside the existing suite in `test/`:

- `agentsToThreads`: field mapping, the three activity states, deleted agents dropped, missing
  activity, missing working directory.
- Harness filter: only listed ids are scanned; unset means all.
- `hostTarget`: rejects non-local origins, missing params, and top-level windows.

## Part 2: AI Maestro changes

### 2.1 Sidecar launcher

New module `lib/bot-crossing-sidecar.mjs`, started from `server.mjs` after the HTTP server listens,
and stopped on exit and on SIGINT/SIGTERM.

Configuration, all env vars with defaults:

| Var | Default | Meaning |
|---|---|---|
| `BOT_CROSSING_ENABLED` | `true` | `false` turns the launcher off |
| `BOT_CROSSING_DIR` | `../bot-crossing` from AI Maestro's folder | the clone |
| `BOT_CROSSING_PORT` | `23010` | the colony's port |

It runs the two steps of Bot Crossing's `npm run dev` as direct node children in `BOT_CROSSING_DIR`, so stopping AI Maestro also stops vite: `tools/build-assets.mjs`, then `node_modules/vite/bin/vite.js --port {port} --strictPort`. Both get:

- `BOT_CROSSING_HARNESSES=ai-maestro`
- `AIMAESTRO_URL=http://localhost:{AI Maestro port}`
- `BOT_CROSSING_DATA=~/.aimaestro/bot-crossing`, so the standalone map is untouched

It does not start, and records why, when: disabled; the folder is missing; `node_modules` is
missing; or the port is already taken. If the child exits, the status records the exit and the last
lines of its output; there is no automatic restart. A pure function
`sidecarPlan(env, aiMaestroDir, aiMaestroPort, fsExists)` decides the command, env and any reason
not to start, and is unit-tested.

`GET /api/colony/status` returns `{ enabled, running, url, reason, fix, log }`, where `url` is
`http://localhost:{port}`, `fix` is the command that resolves a not-started state, and `log` holds
the last output lines after a failure.

### 2.2 Colony panel

- `lib/panel-layout.ts`: add `colony` to `PanelType` and to `PANEL_TYPES` with label `Colony` and
  key `O`, after `browser`.
- `components/shell/PanelMenu.tsx`: icon `Orbit` from lucide.
- `components/shell/ColonyPanel.tsx`: fetches `/api/colony/status`.
  - Running: an iframe at `{url}/?host=aimaestro&hostOrigin={window.location.origin}`, with the
    Browser panel's `BROWSER_SANDBOX`, `allow="clipboard-write"` and `referrerPolicy="no-referrer"`.
  - Not running: `EmptyState` from `components/shell/ui.tsx`, with the reason and the command that
    fixes it, for example `cd ~/Downloads/bot-crossing && npm install`, and a Retry button.
  - Listens for `message` events. A pure function `parseColonyMessage(event, colonyOrigin)` accepts
    only `event.origin === colonyOrigin` with `type === 'bot-crossing:open-agent'` and a string
    `agentId`, and returns the id or null.
- Agent selection: `onSelectAgent` is passed from `AppShell` through `PanelDock` to `PanelBody` and
  on to `ColonyPanel`. An id that is not a known agent is ignored.

### 2.3 Tests

Vitest:

- `tests/panel-layout.test.ts`: `O` maps to `colony`; a saved layout containing `colony` survives
  `parseLayout`.
- `tests/colony-message.test.ts`: `parseColonyMessage` accepts the right origin and shape and rejects
  everything else.
- `tests/bot-crossing-sidecar.test.ts`: `sidecarPlan` for each start and no-start case.

Then a manual end-to-end check in the browser: open the Colony panel, see Raimundo as a bot, click it,
confirm AI Maestro selects Raimundo.

## Out of scope

- Restyling Bot Crossing for AI Maestro; the user will do that.
- Remote access: the colony binds to localhost, so the panel does not load when AI Maestro is opened
  from another device.
- A layout tuned for the narrow side panel; Bot Crossing's phone layout applies, and maximizing the
  dock gives the full view.
- Creating agents from the colony.
- Pushing either repo.

## Risks

- **Port clash:** another process on 23010 stops the sidecar; the panel says so.
- **Stale activity:** Bot Crossing polls every 15 seconds (`POLL_MS` in `src/main.js`), so a bot can lag up to
  15 seconds behind AI Maestro.
- **Trademark:** "Bot Crossing" is a reserved name. Fine for local use; if AI Maestro is published
  with this panel, refer to it descriptively, for example "based on Bot Crossing".
