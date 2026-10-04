# Colony Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show AI Maestro's agents as bots in Bot Crossing inside a new AI Maestro dock panel, "Colony", where clicking a bot opens that agent.

**Architecture:** Bot Crossing gains an `ai-maestro` harness adapter that reads AI Maestro's HTTP API, an env-var harness filter, and a postMessage handoff when framed by AI Maestro. AI Maestro's `server.mjs` launches a dedicated Bot Crossing dev server as two direct node children, serves its status at `/api/colony/status`, and a new `ColonyPanel` frames it and turns messages into agent selection.

**Tech Stack:** Bot Crossing: Node ≥22.13 ESM, Vite 7, three.js, `node --test`. AI Maestro: Next.js 14, React, TypeScript, Tailwind tokens, Vitest, custom `server.mjs` run by `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-04-colony-panel-design.md` (in the AI Maestro repo). Read it before starting.

## Global Constraints

- Bot Crossing repo: `~/Downloads/bot-crossing`. Work on local branch `ai-maestro-colony` (create it in Task 1). Tests: `npm test`. Baseline is 136 passing.
- AI Maestro repo: `~/Downloads/ai-maestro`, current branch `redesign/command-center`, which already holds uncommitted terminal-restyle changes. Do not revert or reformat them. Tests: `npx vitest run`. Baseline has 4 pre-existing failures in plugin/hook-sync tests; no new failures allowed.
- **Do not commit or push in either repo.** The user commits only when asked (global CLAUDE.md). Leave all changes in the working trees.
- Bot Crossing adapters are read-only and must never block the scan (`server/harnesses/README.md`, "Ground rules").
- Thread ids from the new adapter are prefixed `ai-maestro:`.
- Message type string, exactly: `bot-crossing:open-agent`. Payload: `{ type, agentId }`.
- Query parameters on the framed page, exactly: `host=aimaestro` and `hostOrigin=<AI Maestro origin>`.
- Env vars, exactly: `BOT_CROSSING_HARNESSES`, `AIMAESTRO_URL`, `BOT_CROSSING_DATA` (Bot Crossing); `BOT_CROSSING_ENABLED` (default on, `false` disables), `BOT_CROSSING_DIR` (default `../bot-crossing` relative to AI Maestro), `BOT_CROSSING_PORT` (default `23010`) (AI Maestro).
- Colony data folder: `~/.aimaestro/bot-crossing`.
- Panel: type `colony`, label `Colony`, ＋-menu key `O`, lucide icon `Orbit`, listed after `browser`.
- AI Maestro UI uses design tokens only (`bg-sunken`, `text-ink`, `text-ink-muted`, `border-hairline/70`, etc.); no hex literals in components.
- Agent ids accepted anywhere: string matching `/^[A-Za-z0-9_-]{1,128}$/` (AI Maestro ids are UUIDs).

## Review Focus

1. **AI Maestro unreachable or slow** while the colony polls: the adapter must give up within 2.5 s and the colony must keep working (empty), not hang. Pinned in Task 2 (`detect` false on refusal; fetch is called with an abort signal).
2. **Odd agent records** (no working directory, no label, bad or missing dates, unknown status, non-UUID id): no `NaN` timestamps, no crash, bad ids dropped. Pinned in Task 2.
3. **Bot Crossing dies after starting** (Vite error, killed process): the panel must show why, with the last output lines, instead of a dead iframe. Pinned in Task 4 (exit after running sets `running: false`, `reason`, `log`) and Task 6 (panel polls status continuously).
4. **A message the panel should ignore** (another origin, wrong type, an agent id that is not in the list): nothing happens. Pinned in Task 6 (`parseColonyMessage`, `findAgent`).
5. **Restarts leave a stale Bot Crossing on the port**, or another app owns 23010: AI Maestro must say the port is taken and how to fix it, and its own shutdown must kill both children. Pinned in Task 4 (port-taken status, `stop` kills children and later exits do not overwrite status).

---

## Part 1: Bot Crossing (`~/Downloads/bot-crossing`)

### Task 1: Harness filter

**Files:**
- Modify: `server/harnesses/index.mjs`
- Test: `test/harness-filter.test.mjs` (create)

**Interfaces:**
- Produces: `selectHarnesses(all: Harness[], spec: string | undefined): Harness[]`, `ALL_HARNESSES: Harness[]`, and `HARNESSES` (now the filtered list). `harnessById` and `detectedHarnesses` keep their signatures and use the filtered list.

- [ ] **Step 1: Create the branch**

```bash
cd ~/Downloads/bot-crossing && git checkout -b ai-maestro-colony
```

- [ ] **Step 2: Write the failing test**

Create `test/harness-filter.test.mjs`:

```js
/**
 * BOT_CROSSING_HARNESSES: a comma-separated list of adapter ids that limits the colony to them.
 * AI Maestro's own instance sets it to `ai-maestro`; unset, nothing changes.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { ALL_HARNESSES, HARNESSES, selectHarnesses } from '../server/harnesses/index.mjs'

const fake = (id) => ({ id })
const all = [fake('claude-code'), fake('codex'), fake('ai-maestro')]
const ids = (list) => list.map((h) => h.id)

test('no filter keeps every harness', () => {
  assert.deepEqual(ids(selectHarnesses(all, undefined)), ['claude-code', 'codex', 'ai-maestro'])
  assert.deepEqual(ids(selectHarnesses(all, '')), ['claude-code', 'codex', 'ai-maestro'])
  assert.deepEqual(ids(selectHarnesses(all, ' , ')), ['claude-code', 'codex', 'ai-maestro'])
})

test('a filter keeps only the listed ids, in registry order, ignoring spaces', () => {
  assert.deepEqual(ids(selectHarnesses(all, 'ai-maestro, codex')), ['codex', 'ai-maestro'])
  assert.deepEqual(ids(selectHarnesses(all, 'ai-maestro')), ['ai-maestro'])
})

test('an id nobody registered matches nothing', () => {
  assert.deepEqual(ids(selectHarnesses(all, 'not-a-harness')), [])
})

test('the live registry is unfiltered when the env var is unset', () => {
  assert.equal(process.env.BOT_CROSSING_HARNESSES, undefined)
  assert.deepEqual(ids(HARNESSES), ids(ALL_HARNESSES))
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test test/harness-filter.test.mjs`
Expected: FAIL, `selectHarnesses` / `ALL_HARNESSES` are not exported.

- [ ] **Step 4: Implement the filter**

In `server/harnesses/index.mjs`, replace the line `export const HARNESSES = [claudeCode, codex, cursor, antigravity, hermes, kilocode, opencode]` with:

```js
/** Every adapter this build knows about, in display order. */
export const ALL_HARNESSES = [claudeCode, codex, cursor, antigravity, hermes, kilocode, opencode]

/**
 * `BOT_CROSSING_HARNESSES` limits the colony to a comma-separated list of adapter ids — AI
 * Maestro runs its own copy with `ai-maestro` alone. Unset or blank, every adapter is used.
 * Read once at startup: the env of a running process does not change.
 */
export function selectHarnesses(all, spec) {
  const wanted = String(spec || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!wanted.length) return all
  return all.filter((h) => wanted.includes(h.id))
}

export const HARNESSES = selectHarnesses(ALL_HARNESSES, process.env.BOT_CROSSING_HARNESSES)
if (process.env.BOT_CROSSING_HARNESSES && !HARNESSES.length) {
  console.warn(`bot-crossing: BOT_CROSSING_HARNESSES="${process.env.BOT_CROSSING_HARNESSES}" matches no adapter — the colony will be empty`)
}
```

- [ ] **Step 5: Run the new test and the full suite**

Run: `node --test test/harness-filter.test.mjs && npm test`
Expected: the new file passes; full suite 140 passing, 0 failing.

### Task 2: `ai-maestro` adapter

**Files:**
- Create: `server/harnesses/ai-maestro.mjs`
- Modify: `server/harnesses/index.mjs` (import and add to `ALL_HARNESSES`)
- Test: `test/ai-maestro.test.mjs` (create)

**Interfaces:**
- Consumes: `ALL_HARNESSES` from Task 1.
- Produces: default export `{ id: 'ai-maestro', name: 'AI Maestro', detect, scanThreads, openThread, newSession }`; named exports `agentsToThreads(agents, activity)`, `readAgents({ env, fetchImpl })`, `baseUrl(env)`, `AGENT_ID` (RegExp). Thread `ref` is `{ agentId: string }`. `harness` on each thread is `'ai-maestro'` (set by the scanner).
- AI Maestro API shapes it reads: `GET /api/agents` → `{ agents: Agent[] }` where an agent has `id, name, label?, status, program?, workingDirectory?, taskDescription?, createdAt?, lastActive?, session?: { status, tmuxSessionName?, lastActivity? }`. `GET /api/sessions/activity` → `{ activity: { [tmuxSessionName]: { lastActivity, status: 'active' | 'waiting' | 'idle' } } }`.

- [ ] **Step 1: Write the failing test**

Create `test/ai-maestro.test.mjs`:

```js
/**
 * The AI Maestro adapter: agents from AI Maestro's own API, one bot each. Fixture-driven —
 * nothing here talks to a real AI Maestro.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import aiMaestro, { agentsToThreads, readAgents, baseUrl } from '../server/harnesses/ai-maestro.mjs'
import { ALL_HARNESSES } from '../server/harnesses/index.mjs'
import { withEnv } from './support/env.mjs'

const ID = 'a5e8acf8-19d4-48fb-b1fc-8ed707cb0e30'
const agent = (over = {}) => ({
  id: ID,
  name: 'a',
  label: 'Raimundo',
  status: 'active',
  program: 'claude-code',
  workingDirectory: '/Users/me/agents/a',
  taskDescription: 'QA team',
  createdAt: '2026-10-01T10:00:00.000Z',
  lastActive: '2026-10-04T00:41:10.377Z',
  session: { status: 'online', tmuxSessionName: 'a', lastActivity: '2026-10-04T00:41:01.229Z' },
  ...over,
})

test('the adapter is registered and keeps the contract', () => {
  assert.ok(ALL_HARNESSES.includes(aiMaestro))
  assert.equal(aiMaestro.id, 'ai-maestro')
  assert.equal(aiMaestro.name, 'AI Maestro')
})

test('one thread per agent, with the fields the colony draws from', () => {
  const [t] = agentsToThreads([agent()], { a: { lastActivity: '2026-10-04T01:00:00.000Z', status: 'idle' } })
  assert.equal(t.id, `ai-maestro:${ID}`)
  assert.equal(t.title, 'Raimundo')
  assert.equal(t.preview, 'QA team')
  assert.equal(t.project, 'a')
  assert.equal(t.projectPath, '/Users/me/agents/a')
  assert.equal(t.cwd, '/Users/me/agents/a')
  assert.equal(t.model, 'claude-code')
  assert.equal(t.createdAt, Date.parse('2026-10-01T10:00:00.000Z'))
  assert.equal(t.lastActivityAt, Date.parse('2026-10-04T01:00:00.000Z'))
  assert.equal(t.running, false)
  assert.equal(t.unread, false)
  assert.equal(t.archived, false)
  assert.equal(t.source, 'ai-maestro')
  assert.equal(t.canOpen, true)
  assert.deepEqual(t.ref, { agentId: ID })
})

test('active means working, waiting means the ? over its head, idle means neither', () => {
  const state = (status) => agentsToThreads([agent()], { a: { status } })[0]
  assert.deepEqual([state('active').running, state('active').unread], [true, false])
  assert.deepEqual([state('waiting').running, state('waiting').unread], [false, true])
  assert.deepEqual([state('idle').running, state('idle').unread], [false, false])
  assert.deepEqual([state('something-new').running, state('something-new').unread], [false, false])
})

test('activity is looked up by tmux session name, falling back to the agent name', () => {
  const noSessionName = agent({ name: 'b', session: { status: 'offline' } })
  assert.equal(agentsToThreads([noSessionName], { b: { status: 'active' } })[0].running, true)
})

test('deleted agents and agents with unusable ids are dropped', () => {
  const threads = agentsToThreads(
    [agent({ status: 'deleted' }), agent({ id: '../../etc' }), agent({ id: 42 }), null, agent({ id: 'b-2' })],
    {}
  )
  assert.deepEqual(threads.map((t) => t.ref.agentId), ['b-2'])
})

test('odd records never produce NaN times or empty names', () => {
  const [t] = agentsToThreads(
    [{ id: 'x1', name: 'x', status: 'offline', createdAt: 'not a date', lastActive: null, workingDirectory: '' }],
    null
  )
  assert.equal(t.title, 'x')
  assert.equal(t.project, 'x')
  assert.equal(t.projectPath, '')
  assert.equal(t.createdAt, 0)
  assert.equal(t.lastActivityAt, 0)
  assert.ok(Number.isFinite(t.lastActivityAt))
})

test('a non-array agent list is no agents', () => {
  assert.deepEqual(agentsToThreads(undefined, {}), [])
  assert.deepEqual(agentsToThreads({ agents: [] }, {}), [])
})

test('baseUrl trims trailing slashes and is empty when unset', () => {
  assert.equal(baseUrl({ AIMAESTRO_URL: 'http://localhost:23000/' }), 'http://localhost:23000')
  assert.equal(baseUrl({}), '')
})

test('readAgents reads both endpoints, with a timeout, and survives a failed activity call', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, hasSignal: init?.signal instanceof AbortSignal })
    if (url.endsWith('/api/agents')) return { ok: true, json: async () => ({ agents: [agent()] }) }
    throw new Error('activity down')
  }
  const threads = await readAgents({ env: { AIMAESTRO_URL: 'http://localhost:23000' }, fetchImpl })
  assert.equal(threads.length, 1)
  assert.deepEqual(calls.map((c) => c.url).sort(), ['http://localhost:23000/api/agents', 'http://localhost:23000/api/sessions/activity'])
  assert.ok(calls.every((c) => c.hasSignal))
})

test('readAgents without AIMAESTRO_URL reads nothing', async () => {
  let called = false
  const threads = await readAgents({ env: {}, fetchImpl: async () => { called = true } })
  assert.deepEqual(threads, [])
  assert.equal(called, false)
})

test('detect is false when AIMAESTRO_URL is unset or AI Maestro does not answer', async () => {
  assert.equal(await aiMaestro.detect({ env: {} }), false)
  const refused = async () => { throw new Error('ECONNREFUSED') }
  assert.equal(await aiMaestro.detect({ env: { AIMAESTRO_URL: 'http://localhost:1' }, fetchImpl: refused }), false)
  const ok = async () => ({ ok: true, json: async () => ({ agents: [] }) })
  assert.equal(await aiMaestro.detect({ env: { AIMAESTRO_URL: 'http://localhost:23000' }, fetchImpl: ok }), true)
})

test('openThread hands back AI Maestro’s own deep link, and refuses refs it did not make', async () => {
  await withEnv({ AIMAESTRO_URL: 'http://localhost:23000' }, async () => {
    assert.deepEqual(await aiMaestro.openThread({ agentId: ID }), { ok: true, url: `http://localhost:23000/?agent=${ID}` })
    for (const bad of [null, {}, { agentId: [ID] }, { agentId: { toString: () => ID } }, { agentId: 'a b' }, { agentId: '' }]) {
      assert.equal((await aiMaestro.openThread(bad)).ok, false)
    }
  })
  await withEnv({ AIMAESTRO_URL: undefined }, async () => {
    assert.equal((await aiMaestro.openThread({ agentId: ID })).ok, false)
  })
})

test('new sessions are made in AI Maestro, not here', async () => {
  assert.equal((await aiMaestro.newSession('/tmp')).ok, false)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/ai-maestro.test.mjs`
Expected: FAIL, cannot find module `../server/harnesses/ai-maestro.mjs`.

- [ ] **Step 3: Write the adapter**

Create `server/harnesses/ai-maestro.mjs`:

```js
/**
 * Harness adapter: AI Maestro — the agents it runs in tmux, read from its own HTTP API.
 *
 * AI Maestro sets `AIMAESTRO_URL` when it launches its own copy of the colony; without it this
 * adapter is not detected and contributes nothing. Each scan is two GETs with a short timeout,
 * so a slow or stopped AI Maestro costs the colony its agents, never the poll.
 *
 * Read-only, like every adapter. Opening hands back AI Maestro's own `?agent=` deep link; inside
 * AI Maestro's Colony panel the page never asks the server at all — see `src/game/host.js`.
 */
import path from 'node:path'

const TIMEOUT_MS = 2500
export const AGENT_ID = /^[A-Za-z0-9_-]{1,128}$/

export const baseUrl = (env = process.env) => String(env.AIMAESTRO_URL || '').replace(/\/+$/, '')

/** The first value that parses as a time, in epoch ms; 0 when none does. */
function epoch(...values) {
  for (const v of values) {
    const t = typeof v === 'number' ? v : Date.parse(v ?? '')
    if (Number.isFinite(t)) return t
  }
  return 0
}

/** AI Maestro's agent list plus its per-tmux-session activity, as colony threads. Pure. */
export function agentsToThreads(agents, activity) {
  if (!Array.isArray(agents)) return []
  const live = activity && typeof activity === 'object' ? activity : {}
  const out = []
  for (const a of agents) {
    if (!a || typeof a.id !== 'string' || !AGENT_ID.test(a.id) || a.status === 'deleted') continue
    const dir = typeof a.workingDirectory === 'string' ? a.workingDirectory : ''
    const name = String(a.name || a.id)
    const session = a.session && typeof a.session === 'object' ? a.session : {}
    const now = live[session.tmuxSessionName || name] || {}
    const createdAt = epoch(a.createdAt)
    out.push({
      id: `ai-maestro:${a.id}`,
      title: String(a.label || name),
      preview: typeof a.taskDescription === 'string' ? a.taskDescription : '',
      project: dir ? path.basename(dir) : name,
      projectPath: dir,
      worktree: '',
      cwd: dir,
      gitBranch: '',
      model: typeof a.program === 'string' ? a.program : '',
      effort: '',
      createdAt,
      lastActivityAt: epoch(now.lastActivity, session.lastActivity, a.lastActive, createdAt),
      lastFocusedAt: 0,
      running: now.status === 'active',
      unread: now.status === 'waiting',
      hasError: false,
      archived: false,
      sizeBytes: 0,
      source: 'ai-maestro',
      canOpen: true,
      ref: { agentId: a.id },
    })
  }
  return out
}

async function getJson(url, fetchImpl) {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return res.json()
}

/** Agents as threads. Activity is optional: without it every agent simply rests. */
export async function readAgents({ env = process.env, fetchImpl = fetch } = {}) {
  const base = baseUrl(env)
  if (!base) return []
  const [agents, activity] = await Promise.all([
    getJson(`${base}/api/agents`, fetchImpl),
    getJson(`${base}/api/sessions/activity`, fetchImpl).catch(() => ({ activity: {} })),
  ])
  return agentsToThreads(agents?.agents, activity?.activity)
}

async function detect({ env = process.env, fetchImpl = fetch } = {}) {
  const base = baseUrl(env)
  if (!base) return false
  try {
    await getJson(`${base}/api/agents`, fetchImpl)
    return true
  } catch {
    return false
  }
}

const scanThreads = () => readAgents()

function openThread(ref) {
  // Type first: `RegExp.test` coerces, so an array holding a valid id would pass the pattern.
  const id = ref && typeof ref.agentId === 'string' ? ref.agentId : ''
  if (!AGENT_ID.test(id)) return { ok: false, error: 'Not an AI Maestro agent' }
  const base = baseUrl()
  if (!base) return { ok: false, error: 'AIMAESTRO_URL is not set, so there is no AI Maestro to open' }
  return { ok: true, url: `${base}/?agent=${encodeURIComponent(id)}` }
}

function newSession() {
  return { ok: false, error: 'Create agents in AI Maestro, not from the colony.' }
}

export default {
  id: 'ai-maestro',
  name: 'AI Maestro',
  detect,
  scanThreads,
  openThread,
  newSession,
}
```

- [ ] **Step 4: Register it**

In `server/harnesses/index.mjs`, add with the other imports:

```js
import aiMaestro from './ai-maestro.mjs'
```

and change the `ALL_HARNESSES` line to:

```js
export const ALL_HARNESSES = [claudeCode, codex, cursor, antigravity, hermes, kilocode, opencode, aiMaestro]
```

- [ ] **Step 5: Run the new test and the full suite**

Run: `node --test test/ai-maestro.test.mjs && npm test`
Expected: all pass, including the existing contract test "every registered harness implements the interface".

### Task 3: Hand clicks to the host page

**Files:**
- Create: `src/game/host.js`
- Modify: `src/main.js` (import near the other `./game/` imports; constant after `const POLL_MS = 15000` at line 38; `openThread` action at about line 249)
- Test: `test/host.test.mjs` (create)

**Interfaces:**
- Consumes: threads carry `harness` (set by `server/scan.mjs`) and `ref.agentId` (Task 2).
- Produces: `HOST_MESSAGE = 'bot-crossing:open-agent'`; `hostTarget(search: string, inFrame: boolean): string | null` (an origin); `hostMessage(thread): { type, agentId } | null`.

- [ ] **Step 1: Write the failing test**

Create `test/host.test.mjs`:

```js
/**
 * Inside AI Maestro's Colony panel, "open" goes to the host page as a message instead of to the
 * server. Only a framed page, asked by name, pointed at a local origin, does that.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { HOST_MESSAGE, hostMessage, hostTarget } from '../src/game/host.js'

const q = (origin) => `?host=aimaestro&hostOrigin=${encodeURIComponent(origin)}`

test('a framed page asked by AI Maestro on a local origin hands off to that origin', () => {
  assert.equal(hostTarget(q('http://localhost:23000'), true), 'http://localhost:23000')
  assert.equal(hostTarget(q('http://127.0.0.1:23000/some/path'), true), 'http://127.0.0.1:23000')
  assert.equal(hostTarget(q('http://[::1]:23000'), true), 'http://[::1]:23000')
})

test('a top-level page never hands off, whatever its URL says', () => {
  assert.equal(hostTarget(q('http://localhost:23000'), false), null)
})

test('missing or foreign parameters mean no handoff', () => {
  assert.equal(hostTarget('', true), null)
  assert.equal(hostTarget('?hostOrigin=http%3A%2F%2Flocalhost%3A23000', true), null)
  assert.equal(hostTarget('?host=other&hostOrigin=http%3A%2F%2Flocalhost%3A23000', true), null)
  assert.equal(hostTarget('?host=aimaestro', true), null)
  assert.equal(hostTarget('?host=aimaestro&hostOrigin=not-a-url', true), null)
})

test('a non-local or non-http origin is refused', () => {
  assert.equal(hostTarget(q('https://evil.example'), true), null)
  assert.equal(hostTarget(q('http://100.64.0.5:23000'), true), null)
  assert.equal(hostTarget(q('javascript:alert(1)'), true), null)
})

test('only AI Maestro threads with an agent id become a message', () => {
  assert.deepEqual(hostMessage({ harness: 'ai-maestro', ref: { agentId: 'abc' } }), { type: HOST_MESSAGE, agentId: 'abc' })
  assert.equal(HOST_MESSAGE, 'bot-crossing:open-agent')
  assert.equal(hostMessage({ harness: 'claude-code', ref: { agentId: 'abc' } }), null)
  assert.equal(hostMessage({ harness: 'ai-maestro', ref: {} }), null)
  assert.equal(hostMessage({ harness: 'ai-maestro', ref: { agentId: 7 } }), null)
  assert.equal(hostMessage(null), null)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/host.test.mjs`
Expected: FAIL, cannot find module `../src/game/host.js`.

- [ ] **Step 3: Write `src/game/host.js`**

```js
/**
 * Inside AI Maestro's Colony panel the page hands "open" to the host instead of the server: the
 * host owns those agents and knows how to show one. Only a page that is framed, asked by name
 * (`?host=aimaestro`) and given a local `hostOrigin` does this, and it posts to that exact
 * origin and nowhere else.
 */
export const HOST_MESSAGE = 'bot-crossing:open-agent'

const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]'])

/** The origin to post to, or null when the page should behave as it always has. */
export function hostTarget(search, inFrame) {
  if (!inFrame) return null
  const params = new URLSearchParams(search || '')
  if (params.get('host') !== 'aimaestro') return null
  let origin
  try {
    origin = new URL(params.get('hostOrigin') || '')
  } catch {
    return null
  }
  if (origin.protocol !== 'http:' && origin.protocol !== 'https:') return null
  if (!LOCAL.has(origin.hostname)) return null
  return origin.origin
}

/** The message for a thread the host can open, or null for any other thread. */
export function hostMessage(thread) {
  const agentId = thread?.harness === 'ai-maestro' ? thread.ref?.agentId : undefined
  return typeof agentId === 'string' && agentId ? { type: HOST_MESSAGE, agentId } : null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/host.test.mjs`
Expected: PASS.

- [ ] **Step 5: Wire it into `src/main.js`**

Add the import after `import { withErrands } from './game/errands.js'`:

```js
import { hostMessage, hostTarget } from './game/host.js'
```

Add after `const POLL_MS = 15000`:

```js
/** Set when AI Maestro frames this page: clicks on its agents go to it, not to the server. */
const HOST_ORIGIN = hostTarget(location.search, window.parent !== window)
```

In the `openThread` action, insert the handoff right after `if (!thread) return`:

```js
  openThread: async () => {
    const thread = threads.find((t) => t.id === selectedId)
    if (!thread) return
    const handoff = HOST_ORIGIN && hostMessage(thread)
    if (handoff) {
      window.parent.postMessage(handoff, HOST_ORIGIN)
      colony.astronauts.celebrate(thread.id)
      return
    }
    try {
```

Leave the rest of the action unchanged.

- [ ] **Step 6: Run the full suite and a build**

Run: `npm test && npm run build -- --outDir /tmp/bot-crossing-build-check && rm -rf /tmp/bot-crossing-build-check`
Expected: all tests pass; the build completes with no errors.

---

## Part 2: AI Maestro (`~/Downloads/ai-maestro`)

### Task 4: Sidecar launcher

**Files:**
- Create: `lib/bot-crossing-sidecar.mjs`
- Test: `tests/bot-crossing-sidecar.test.ts` (create)

**Interfaces:**
- Produces:
  - `sidecarPlan({ env, aiMaestroDir, aiMaestroPort, exists, home })` → `{ ok, enabled, port, dir, url, reason?, fix?, steps?: string[][], env?: Record<string,string> }`. Pure.
  - `createSidecar()` → `{ start(opts): Promise<ColonyStatus>, stop(): void, status(): ColonyStatus }` where `opts` is the `sidecarPlan` input plus optional `spawnImpl` and `portTaken(port): Promise<boolean>`.
  - `ColonyStatus` = `{ enabled: boolean, running: boolean, url: string | null, reason: string | null, fix: string | null, log: string[] }`.
  - `sidecar` — the process-wide instance used by `server.mjs` (Task 5).

- [ ] **Step 1: Write the failing test**

Create `tests/bot-crossing-sidecar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { EventEmitter } from 'events'
import path from 'path'
import { sidecarPlan, createSidecar } from '@/lib/bot-crossing-sidecar.mjs'

const AIM = '/Users/me/Downloads/ai-maestro'
const BC = '/Users/me/Downloads/bot-crossing'
const VITE = path.join(BC, 'node_modules', 'vite', 'bin', 'vite.js')
const everything = (p: string) => p === path.join(BC, 'package.json') || p === VITE
const base = { aiMaestroDir: AIM, aiMaestroPort: 23000, home: '/Users/me' }

describe('sidecarPlan', () => {
  it('is off when BOT_CROSSING_ENABLED=false', () => {
    const plan = sidecarPlan({ ...base, env: { BOT_CROSSING_ENABLED: 'false' }, exists: everything })
    expect(plan).toMatchObject({ ok: false, enabled: false })
    expect(plan.reason).toMatch(/turned off/)
  })

  it('says how to get Bot Crossing when the folder is missing', () => {
    const plan = sidecarPlan({ ...base, env: {}, exists: () => false })
    expect(plan).toMatchObject({ ok: false, enabled: true, dir: BC })
    expect(plan.fix).toBe(`git clone https://github.com/Station-Sciences/bot-crossing.git ${BC}`)
  })

  it('says to install dependencies when vite is missing', () => {
    const plan = sidecarPlan({ ...base, env: {}, exists: p => p === path.join(BC, 'package.json') })
    expect(plan).toMatchObject({ ok: false, enabled: true })
    expect(plan.fix).toBe(`cd ${BC} && npm install`)
  })

  it('builds assets, then runs vite on the colony port with AI Maestro-only settings', () => {
    const plan = sidecarPlan({ ...base, env: { PATH: '/bin', PORT: '23000', NODE_ENV: 'production' }, exists: everything })
    expect(plan).toMatchObject({ ok: true, enabled: true, port: 23010, dir: BC, url: 'http://localhost:23010' })
    expect(plan.steps).toEqual([
      [path.join(BC, 'tools', 'build-assets.mjs')],
      [VITE, '--port', '23010', '--strictPort'],
    ])
    expect(plan.env).toMatchObject({
      PATH: '/bin',
      PORT: '23010',
      BOT_CROSSING_HARNESSES: 'ai-maestro',
      AIMAESTRO_URL: 'http://localhost:23000',
      BOT_CROSSING_DATA: path.join('/Users/me', '.aimaestro', 'bot-crossing'),
    })
    expect(plan.env).not.toHaveProperty('NODE_ENV')
  })

  it('honours BOT_CROSSING_DIR and BOT_CROSSING_PORT', () => {
    const dir = '/opt/bc'
    const plan = sidecarPlan({
      ...base, env: { BOT_CROSSING_DIR: dir, BOT_CROSSING_PORT: '24000' },
      exists: p => p === path.join(dir, 'package.json') || p === path.join(dir, 'node_modules', 'vite', 'bin', 'vite.js'),
    })
    expect(plan).toMatchObject({ ok: true, dir, port: 24000, url: 'http://localhost:24000' })
  })
})

class FakeChild extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  killed: string[] = []
  kill(sig = 'SIGTERM') { this.killed.push(sig); return true }
}

function harness(portTaken = false) {
  const children: { args: string[]; child: FakeChild }[] = []
  const spawnImpl = (_cmd: string, args: string[]) => {
    const child = new FakeChild()
    children.push({ args, child })
    return child
  }
  const opts = { ...base, env: {}, exists: everything, spawnImpl, portTaken: async () => portTaken }
  return { sidecar: createSidecar(), children, opts }
}

describe('createSidecar', () => {
  it('starts with a status that says nothing is running', () => {
    expect(createSidecar().status()).toEqual({ enabled: false, running: false, url: null, reason: 'Colony has not started.', fix: null, log: [] })
  })

  it('does not spawn when the plan says no', async () => {
    const { sidecar, children, opts } = harness()
    const status = await sidecar.start({ ...opts, exists: () => false })
    expect(children).toHaveLength(0)
    expect(status).toMatchObject({ enabled: true, running: false })
    expect(status.fix).toMatch(/^git clone/)
  })

  it('reports a taken port instead of spawning', async () => {
    const { sidecar, children, opts } = harness(true)
    const status = await sidecar.start(opts)
    expect(children).toHaveLength(0)
    expect(status.running).toBe(false)
    expect(status.reason).toMatch(/23010 is already in use/)
    expect(status.fix).toMatch(/BOT_CROSSING_PORT/)
  })

  it('runs the asset build, then vite, and reports running', async () => {
    const { sidecar, children, opts } = harness()
    await sidecar.start(opts)
    expect(children.map(c => c.args[0])).toEqual([path.join(BC, 'tools', 'build-assets.mjs')])
    expect(sidecar.status()).toMatchObject({ running: false, reason: 'Bot Crossing is starting…' })
    children[0].child.emit('exit', 0)
    expect(children.map(c => c.args[0])).toEqual([path.join(BC, 'tools', 'build-assets.mjs'), VITE])
    expect(sidecar.status()).toMatchObject({ enabled: true, running: true, url: 'http://localhost:23010', reason: null })
  })

  it('a failed asset build is reported with its output', async () => {
    const { sidecar, children, opts } = harness()
    await sidecar.start(opts)
    children[0].child.stderr.emit('data', Buffer.from('Error: missing model\n'))
    children[0].child.emit('exit', 1)
    expect(children).toHaveLength(1)
    expect(sidecar.status()).toMatchObject({ running: false })
    expect(sidecar.status().reason).toMatch(/asset build failed \(exit 1\)/)
    expect(sidecar.status().log).toEqual(['Error: missing model'])
  })

  it('vite dying after it started is reported with the last output lines', async () => {
    const { sidecar, children, opts } = harness()
    await sidecar.start(opts)
    children[0].child.emit('exit', 0)
    const vite = children[1].child
    for (let i = 1; i <= 30; i++) vite.stdout.emit('data', `line ${i}\n`)
    vite.emit('exit', 1)
    const status = sidecar.status()
    expect(status.running).toBe(false)
    expect(status.reason).toMatch(/stopped \(exit 1\)/)
    expect(status.log).toHaveLength(20)
    expect(status.log.at(-1)).toBe('line 30')
  })

  it('a spawn error is reported, not thrown', async () => {
    const { sidecar, children, opts } = harness()
    await sidecar.start(opts)
    children[0].child.emit('error', new Error('spawn ENOENT'))
    expect(sidecar.status().running).toBe(false)
    expect(sidecar.status().reason).toMatch(/spawn ENOENT/)
  })

  it('stop kills every child, and their exits afterwards do not overwrite the status', async () => {
    const { sidecar, children, opts } = harness()
    await sidecar.start(opts)
    children[0].child.emit('exit', 0)
    sidecar.stop()
    expect(children.map(c => c.child.killed)).toEqual([['SIGTERM'], ['SIGTERM']])
    children[1].child.emit('exit', null)
    expect(sidecar.status()).toMatchObject({ running: false, reason: 'Colony stopped with AI Maestro.' })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/bot-crossing-sidecar.test.ts`
Expected: FAIL, cannot resolve `@/lib/bot-crossing-sidecar.mjs`.

- [ ] **Step 3: Write `lib/bot-crossing-sidecar.mjs`**

```js
/**
 * Bot Crossing sidecar: AI Maestro launches its own Bot Crossing dev server for the Colony
 * panel, limited to AI Maestro's agents and with its own saved map, so a standalone Bot
 * Crossing is never touched. Spec: docs/superpowers/specs/2026-10-04-colony-panel-design.md
 *
 * The two steps of Bot Crossing's `npm run dev` (asset build, then vite) run as direct node
 * children rather than through npm, so stopping AI Maestro stops vite too instead of orphaning
 * it on the port.
 */
import { spawn } from 'child_process'
import fs from 'fs'
import net from 'net'
import os from 'os'
import path from 'path'

const REPO = 'https://github.com/Station-Sciences/bot-crossing.git'
const DEFAULT_PORT = 23010
const LOG_LINES = 20

/** What to run, or why not. Pure: everything it looks at is passed in. */
export function sidecarPlan({ env = process.env, aiMaestroDir, aiMaestroPort, exists = fs.existsSync, home = os.homedir() }) {
  const port = Number(env.BOT_CROSSING_PORT) || DEFAULT_PORT
  const dir = path.resolve(aiMaestroDir, env.BOT_CROSSING_DIR || path.join('..', 'bot-crossing'))
  const url = `http://localhost:${port}`
  const where = { port, dir, url }

  if (env.BOT_CROSSING_ENABLED === 'false') {
    return { ...where, ok: false, enabled: false, reason: 'Colony is turned off (BOT_CROSSING_ENABLED=false).', fix: 'Remove BOT_CROSSING_ENABLED=false and restart AI Maestro' }
  }
  if (!exists(path.join(dir, 'package.json'))) {
    return { ...where, ok: false, enabled: true, reason: `Bot Crossing was not found at ${dir}.`, fix: `git clone ${REPO} ${dir}` }
  }
  const vite = path.join(dir, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!exists(vite)) {
    return { ...where, ok: false, enabled: true, reason: 'Bot Crossing’s dependencies are not installed.', fix: `cd ${dir} && npm install` }
  }

  // AI Maestro's own PORT and NODE_ENV must not leak into the colony's vite.
  const { NODE_ENV: _nodeEnv, PORT: _port, ...inherited } = env
  return {
    ...where,
    ok: true,
    enabled: true,
    steps: [
      [path.join(dir, 'tools', 'build-assets.mjs')],
      [vite, '--port', String(port), '--strictPort'],
    ],
    env: {
      ...inherited,
      PORT: String(port),
      BOT_CROSSING_HARNESSES: 'ai-maestro',
      AIMAESTRO_URL: `http://localhost:${aiMaestroPort}`,
      BOT_CROSSING_DATA: path.join(home, '.aimaestro', 'bot-crossing'),
    },
  }
}

/** True when something already answers on localhost:port (IPv4 or IPv6). */
export function isPortTaken(port) {
  return new Promise(resolve => {
    const socket = net.connect({ port, host: 'localhost' })
    const done = (taken) => { socket.destroy(); resolve(taken) }
    socket.setTimeout(500, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

export function createSidecar() {
  const state = { enabled: false, running: false, url: null, reason: 'Colony has not started.', fix: null, log: [], children: [], stopping: false }

  const status = () => ({ enabled: state.enabled, running: state.running, url: state.url, reason: state.reason, fix: state.fix, log: [...state.log] })

  const remember = (chunk) => {
    for (const line of String(chunk).split('\n')) if (line.trim()) state.log.push(line.trimEnd())
    if (state.log.length > LOG_LINES) state.log.splice(0, state.log.length - LOG_LINES)
  }

  const fail = (reason) => {
    if (state.stopping) return
    Object.assign(state, { running: false, reason, fix: 'Fix the error shown, then restart AI Maestro' })
    console.error(`[Colony] ${reason}`)
  }

  function run(plan, args, spawnImpl) {
    const child = spawnImpl(process.execPath, args, { cwd: plan.dir, env: plan.env, stdio: ['ignore', 'pipe', 'pipe'] })
    state.children.push(child)
    child.stdout?.on('data', remember)
    child.stderr?.on('data', remember)
    child.on('error', err => fail(`Could not start Bot Crossing: ${err.message}`))
    return child
  }

  async function start(opts) {
    const plan = sidecarPlan(opts)
    Object.assign(state, { enabled: plan.enabled, running: false, url: plan.url, reason: plan.reason ?? null, fix: plan.fix ?? null, log: [], stopping: false })
    if (!plan.ok) {
      console.log(`[Colony] Not starting: ${plan.reason}`)
      return status()
    }
    if (await (opts.portTaken ?? isPortTaken)(plan.port)) {
      Object.assign(state, { reason: `Port ${plan.port} is already in use.`, fix: `Stop whatever is using port ${plan.port}, or set BOT_CROSSING_PORT to a free port` })
      console.log(`[Colony] Not starting: port ${plan.port} is taken`)
      return status()
    }

    const spawnImpl = opts.spawnImpl ?? spawn
    Object.assign(state, { reason: 'Bot Crossing is starting…', fix: null })
    const [buildArgs, viteArgs] = plan.steps
    const build = run(plan, buildArgs, spawnImpl)
    build.on('exit', code => {
      if (state.stopping) return
      if (code !== 0) return fail(`Bot Crossing’s asset build failed (exit ${code}).`)
      const vite = run(plan, viteArgs, spawnImpl)
      Object.assign(state, { running: true, reason: null })
      console.log(`[Colony] Bot Crossing on ${plan.url}`)
      vite.on('exit', viteCode => fail(`Bot Crossing stopped (exit ${viteCode}).`))
    })
    return status()
  }

  function stop() {
    state.stopping = true
    for (const child of state.children) {
      try { child.kill('SIGTERM') } catch { /* already gone */ }
    }
    state.children = []
    Object.assign(state, { running: false, reason: 'Colony stopped with AI Maestro.' })
  }

  return { start, stop, status }
}

/** The one instance server.mjs drives. */
export const sidecar = createSidecar()
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/bot-crossing-sidecar.test.ts`
Expected: PASS, 13 tests.

### Task 5: Start, stop and report the sidecar from `server.mjs`

**Files:**
- Modify: `server.mjs` (imports at the top; request handler at about line 1016; `gracefulShutdown` at about line 2701; full-mode branch at about line 2790)

**Interfaces:**
- Consumes: `sidecar` from Task 4.
- Produces: `GET /api/colony/status` → `ColonyStatus` JSON, `Cache-Control: no-store`. Consumed by Task 6.

- [ ] **Step 1: Import the sidecar**

After `import { isValidSessionName } from './lib/tmux-safe.mjs'` add:

```js
import { sidecar as colonySidecar } from './lib/bot-crossing-sidecar.mjs'
```

- [ ] **Step 2: Serve the status endpoint**

In `startServer`'s request handler, directly before the `/api/internal/pty-sessions` block, add:

```js
      // Colony panel: whether AI Maestro's own Bot Crossing is up, and if not, why.
      // Answered here because the sidecar lives in this process, not in Next's module graph.
      if (parsedUrl.pathname === '/api/colony/status') {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(colonySidecar.status()))
        return
      }
```

- [ ] **Step 3: Stop it on shutdown**

At the top of `gracefulShutdown`, after the `console.log` line, add:

```js
    // Bot Crossing's vite would otherwise outlive us and hold the colony port
    try { colonySidecar.stop() } catch { /* ignore */ }
```

After `process.on('SIGINT', () => gracefulShutdown('SIGINT'))` add:

```js
  // Crashes and plain exits skip gracefulShutdown; the colony's children still have to go
  process.on('exit', () => { try { colonySidecar.stop() } catch { /* ignore */ } })
```

- [ ] **Step 4: Start it in full mode only**

In the full-mode `else` branch at the bottom, after the `startServer(async (req, res, parsedUrl) => { ... })` call, add:

```js
  // Colony panel: AI Maestro's own Bot Crossing. Never blocks startup; the panel shows why if
  // it does not come up.
  colonySidecar.start({ aiMaestroDir: process.cwd(), aiMaestroPort: port })
    .catch(err => console.error('[Colony] Failed to start:', err))
```

- [ ] **Step 5: Verify against the running app**

The AI Maestro dev server runs in the user's own terminal. **Ask the user before restarting it**, or ask them to restart it themselves with:

```bash
cd ~/Downloads/ai-maestro && npm run dev
```

Then:

```bash
curl -s http://localhost:23000/api/colony/status
```

Expected within ~15 s: `"running":true` and `"url":"http://localhost:23010"`.

```bash
curl -s http://localhost:23010/api/threads | python3 -c "import json,sys; d=json.load(sys.stdin); print([(t['id'], t['harness'], t['title']) for t in d['threads']])"
```

Expected: exactly the AI Maestro agents, e.g. `[('ai-maestro:a5e8acf8-…', 'ai-maestro', 'Raimundo')]`, and no `claude-code` threads.

```bash
ls ~/.aimaestro/bot-crossing
```

Expected after the colony page has been opened once: `colony.json`. `~/Downloads/bot-crossing/data/` is unchanged.

### Task 6: Message parsing and the Colony panel component

**Files:**
- Create: `lib/colony-message.ts`
- Create: `components/shell/ColonyPanel.tsx`
- Test: `tests/colony-message.test.ts` (create)

**Interfaces:**
- Consumes: `GET /api/colony/status` (Task 5); `BROWSER_SANDBOX` from `components/shell/BrowserPanel.tsx`; `Button`, `EmptyState`, `IconButton` from `components/shell/ui.tsx`.
- Produces: `COLONY_OPEN_AGENT`, `ColonyStatus` type, `parseColonyMessage(event, colonyOrigin): string | null`, `findAgent(agents, id): T | null`, `colonyFrameUrl(url, hostOrigin): string`, `originOf(url): string | null`; default export `ColonyPanel({ agents, onSelectAgent })`.

- [ ] **Step 1: Write the failing test**

Create `tests/colony-message.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { COLONY_OPEN_AGENT, colonyFrameUrl, findAgent, originOf, parseColonyMessage } from '@/lib/colony-message'

const COLONY = 'http://localhost:23010'
const msg = (data: unknown, origin = COLONY) => ({ origin, data })

describe('parseColonyMessage', () => {
  it('accepts an open-agent message from the colony', () => {
    expect(COLONY_OPEN_AGENT).toBe('bot-crossing:open-agent')
    expect(parseColonyMessage(msg({ type: COLONY_OPEN_AGENT, agentId: 'abc-1' }), COLONY)).toBe('abc-1')
  })
  it('ignores any other origin, including the colony on another host name', () => {
    expect(parseColonyMessage(msg({ type: COLONY_OPEN_AGENT, agentId: 'abc' }, 'http://evil.example'), COLONY)).toBeNull()
    expect(parseColonyMessage(msg({ type: COLONY_OPEN_AGENT, agentId: 'abc' }, 'http://127.0.0.1:23010'), COLONY)).toBeNull()
  })
  it('ignores messages when the colony is not running', () => {
    expect(parseColonyMessage(msg({ type: COLONY_OPEN_AGENT, agentId: 'abc' }), null)).toBeNull()
  })
  it('ignores the wrong shape', () => {
    for (const data of [null, 'bot-crossing:open-agent', { type: 'other', agentId: 'abc' }, { type: COLONY_OPEN_AGENT }, { type: COLONY_OPEN_AGENT, agentId: 7 }, { type: COLONY_OPEN_AGENT, agentId: '' }, { type: COLONY_OPEN_AGENT, agentId: 'x'.repeat(129) }]) {
      expect(parseColonyMessage(msg(data), COLONY)).toBeNull()
    }
  })
})

describe('findAgent', () => {
  const agents = [{ id: 'a1', name: 'one' }, { id: 'b2', name: 'two' }]
  it('finds a known agent', () => expect(findAgent(agents, 'b2')).toEqual({ id: 'b2', name: 'two' }))
  it('ignores an id that is not in the list', () => expect(findAgent(agents, 'gone')).toBeNull())
  it('ignores a null id', () => expect(findAgent(agents, null)).toBeNull())
})

describe('colonyFrameUrl and originOf', () => {
  it('tells the colony who is framing it', () => {
    expect(colonyFrameUrl(COLONY, 'http://localhost:23000')).toBe('http://localhost:23010/?host=aimaestro&hostOrigin=http%3A%2F%2Flocalhost%3A23000')
  })
  it('reduces a URL to its origin, and nothing to null', () => {
    expect(originOf('http://localhost:23010/some/path')).toBe(COLONY)
    expect(originOf(null)).toBeNull()
    expect(originOf('not a url')).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/colony-message.test.ts`
Expected: FAIL, cannot resolve `@/lib/colony-message`.

- [ ] **Step 3: Write `lib/colony-message.ts`**

```ts
/**
 * Colony panel ↔ Bot Crossing. The framed colony posts `{ type, agentId }` when a bot is opened;
 * only messages from the colony's own origin, in exactly that shape, are acted on.
 * Spec: docs/superpowers/specs/2026-10-04-colony-panel-design.md
 */
export const COLONY_OPEN_AGENT = 'bot-crossing:open-agent'

export interface ColonyStatus {
  enabled: boolean
  running: boolean
  url: string | null
  reason: string | null
  fix: string | null
  log: string[]
}

/** The agent id a message asks to open, or null for anything to ignore. */
export function parseColonyMessage(event: { origin: string; data: unknown }, colonyOrigin: string | null): string | null {
  if (!colonyOrigin || event.origin !== colonyOrigin) return null
  const data = event.data as { type?: unknown; agentId?: unknown } | null
  if (!data || typeof data !== 'object' || data.type !== COLONY_OPEN_AGENT) return null
  const id = data.agentId
  return typeof id === 'string' && id.length > 0 && id.length <= 128 ? id : null
}

export function findAgent<T extends { id: string }>(agents: T[], id: string | null): T | null {
  return id ? agents.find(a => a.id === id) ?? null : null
}

/** The colony page, told that AI Maestro frames it and where to post back. */
export function colonyFrameUrl(url: string, hostOrigin: string): string {
  const u = new URL(url)
  u.searchParams.set('host', 'aimaestro')
  u.searchParams.set('hostOrigin', hostOrigin)
  return u.toString()
}

export function originOf(url: string | null): string | null {
  if (!url) return null
  try { return new URL(url).origin } catch { return null }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/colony-message.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `components/shell/ColonyPanel.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Orbit, RotateCw, ExternalLink } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { colonyFrameUrl, findAgent, originOf, parseColonyMessage, type ColonyStatus } from '@/lib/colony-message'
import { BROWSER_SANDBOX } from './BrowserPanel'
import { Button, EmptyState, IconButton } from './ui'

/** Status is re-read on this interval so a colony that dies, or finishes starting, shows up. */
const STATUS_POLL_MS = 4000

const UNREACHABLE: ColonyStatus = { enabled: true, running: false, url: null, reason: 'Could not reach AI Maestro for the colony status.', fix: null, log: [] }

/** Bot Crossing, framed: AI Maestro's agents as bots. Clicking one opens that agent. */
export default function ColonyPanel({ agents, onSelectAgent }: { agents: Agent[]; onSelectAgent: (a: Agent) => void }) {
  const [status, setStatus] = useState<ColonyStatus | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      let next = UNREACHABLE
      try {
        const res = await fetch('/api/colony/status', { cache: 'no-store' })
        if (res.ok) next = await res.json() as ColonyStatus
      } catch { /* keep UNREACHABLE */ }
      if (!alive) return
      // Same values keep the same object, so the iframe never remounts on a poll
      setStatus(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next)
      timer = setTimeout(load, STATUS_POLL_MS)
    }
    void load()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [nonce])

  const colonyOrigin = originOf(status?.running ? status.url : null)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const agent = findAgent(agents, parseColonyMessage(event, colonyOrigin))
      if (agent) onSelectAgent(agent)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [agents, colonyOrigin, onSelectAgent])

  if (!status) return <div className="flex-1 min-h-0 bg-sunken" aria-busy="true" />

  if (!status.running || !status.url) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-sunken">
        <EmptyState
          icon={<Orbit strokeWidth={1.5} className="w-6 h-6" />}
          title={status.enabled ? 'Colony isn’t running' : 'Colony is off'}
          description={status.reason ?? 'Bot Crossing has not started yet.'}
          action={
            <div className="flex flex-col items-center gap-3 max-w-full">
              {status.fix && (
                <code className="block max-w-full whitespace-pre-wrap break-all rounded-[8px] border border-hairline/70 bg-surface px-3 py-2 text-left font-mono text-[12px] text-ink">
                  {status.fix}
                </code>
              )}
              {status.log.length > 0 && (
                <pre className="max-w-full max-h-[160px] overflow-auto rounded-[8px] border border-hairline/70 bg-surface px-3 py-2 text-left font-mono text-[11px] text-ink-muted">
                  {status.log.slice(-8).join('\n')}
                </pre>
              )}
              <Button onClick={() => setNonce(n => n + 1)}>Check again</Button>
            </div>
          }
        />
      </div>
    )
  }

  const src = colonyFrameUrl(status.url, window.location.origin)
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-sunken">
      <iframe key={`${src}#${nonce}`} src={src} title="Colony" sandbox={BROWSER_SANDBOX} allow="clipboard-write"
        referrerPolicy="no-referrer" className="flex-1 w-full min-h-0 border-0 bg-sunken" />
      <div className="flex-none flex items-center gap-2 pl-3 pr-1 h-[38px] border-t border-hairline/70 text-[12px] text-gray-500">
        <span className="truncate">Based on Bot Crossing. Click a bot, then Open, to go to that agent.</span>
        <span className="ml-auto flex items-center">
          <IconButton label="Reload colony" onClick={() => setNonce(n => n + 1)}>
            <RotateCw strokeWidth={1.5} className="w-4 h-4" />
          </IconButton>
          <IconButton label="Open colony in a new tab" onClick={() => window.open(status.url!, '_blank', 'noopener,noreferrer')}>
            <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
          </IconButton>
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Typecheck and lint the new files**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "colony-message|ColonyPanel" ; npx next lint --file lib/colony-message.ts --file components/shell/ColonyPanel.tsx`
Expected: no tsc lines for these files; `✔ No ESLint warnings or errors`.

### Task 7: Register the Colony panel and pass agent selection down

**Files:**
- Modify: `lib/panel-layout.ts:7` (type union) and `:10-22` (`PANEL_TYPES`)
- Modify: `components/shell/PanelMenu.tsx:4` (import) and `:7-10` (`PANEL_ICONS`)
- Modify: `components/shell/PanelBody.tsx` (imports, `TAB_FOR` type, props, colony branch)
- Modify: `components/shell/PanelDock.tsx:10-35` (props and `PanelBody` call)
- Modify: `components/shell/AppShell.tsx:122-123` (`PanelDock` call)
- Test: `tests/panel-layout.test.ts` (extend)

**Interfaces:**
- Consumes: `ColonyPanel` (Task 6); `selectAgent` (`AppShell.tsx:76`) and `p.agents` already in `AppShell`.
- Produces: `PanelType` includes `'colony'`; `PanelBody` and `PanelDock` take `agents: Agent[]` and `onSelectAgent: (a: Agent) => void`.

- [ ] **Step 1: Write the failing tests**

In `tests/panel-layout.test.ts`, inside the existing `describe` that holds `'panelForKey maps letters case-insensitively'`, add after that `it` block:

```ts
  it('O opens the Colony panel', () => {
    expect(panelForKey('o')).toBe('colony')
    expect(panelForKey('O')).toBe('colony')
  })
  it('a saved layout with a Colony tab survives a reload', () => {
    const saved = JSON.stringify({ ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, open: true, tabs: ['terminal', 'colony'], active: 'colony' } })
    const parsed = parseLayout(saved)
    expect(parsed?.panel.tabs).toEqual(['terminal', 'colony'])
    expect(parsed?.panel.active).toBe('colony')
  })
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/panel-layout.test.ts`
Expected: FAIL on both new tests (`panelForKey('o')` is null; `colony` is dropped by `parseLayout`).

- [ ] **Step 3: Add the panel type**

In `lib/panel-layout.ts`, change line 7 to:

```ts
export type PanelType = 'terminal' | 'inbox' | 'files' | 'memory' | 'graph' | 'docs' | 'canvas' | 'search' | 'playback' | 'export' | 'browser' | 'colony'
```

and add after the `browser` entry in `PANEL_TYPES`:

```ts
  { id: 'colony', label: 'Colony', key: 'O' },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/panel-layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the icon**

In `components/shell/PanelMenu.tsx`, add `Orbit` to the lucide import:

```ts
import { SquareTerminal, Inbox, FolderTree, Brain, GitBranch, FileText, LayoutPanelTop, Search, PlayCircle, Download, Globe, Orbit, type LucideIcon } from 'lucide-react'
```

and replace `PANEL_ICONS` with:

```ts
export const PANEL_ICONS: Record<PanelType, LucideIcon> = {
  terminal: SquareTerminal, inbox: Inbox, files: FolderTree, memory: Brain, graph: GitBranch,
  docs: FileText, canvas: LayoutPanelTop, search: Search, playback: PlayCircle, export: Download, browser: Globe,
  colony: Orbit,
}
```

- [ ] **Step 6: Render the panel in `PanelBody`**

In `components/shell/PanelBody.tsx`:

Add the import after `import BrowserPanel from './BrowserPanel'`:

```ts
import ColonyPanel from './ColonyPanel'
```

Change the `TAB_FOR` declaration's type to exclude `colony`:

```ts
const TAB_FOR: Record<Exclude<PanelType, 'inbox' | 'browser' | 'colony'>, AgentTab> = {
```

Replace the component signature and its first line with:

```tsx
export default function PanelBody({ type, agent, agents, onlineAgents, wakingAgentId, onWake, onShowProfile, onSelectAgent }: {
  type: PanelType
  agent: Agent
  agents: Agent[]
  onlineAgents: Agent[]
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
  onSelectAgent: (a: Agent) => void
}) {
  if (type === 'browser') return <BrowserPanel />
  if (type === 'colony') return <ColonyPanel agents={agents} onSelectAgent={onSelectAgent} />
```

- [ ] **Step 7: Pass the props through `PanelDock`**

In `components/shell/PanelDock.tsx`, replace the signature (lines 10-19) with:

```tsx
export default function PanelDock({ layout, dispatch, agent, agents, onlineAgents, unread, wakingAgentId, onWake, onShowProfile, onSelectAgent }: {
  layout: LayoutState
  dispatch: React.Dispatch<LayoutAction>
  agent: Agent
  agents: Agent[]
  onlineAgents: Agent[]
  unread: number
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
  onSelectAgent: (a: Agent) => void
}) {
```

and the `PanelBody` call (lines 34-35) with:

```tsx
        <PanelBody key={p.active} type={p.active} agent={agent} agents={agents} onlineAgents={onlineAgents}
          wakingAgentId={wakingAgentId} onWake={onWake} onShowProfile={onShowProfile} onSelectAgent={onSelectAgent} />
```

- [ ] **Step 8: Pass them from `AppShell`**

In `components/shell/AppShell.tsx`, the `PanelDock` call at lines 122-123 becomes:

```tsx
            <PanelDock layout={layout} dispatch={dispatch} agent={agent} agents={p.agents} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0}
              wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} onSelectAgent={selectAgent} />
```

- [ ] **Step 9: Typecheck, lint, and run the related tests**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "panel-layout|PanelMenu|PanelBody|PanelDock|AppShell|ColonyPanel|colony-message" ; npx next lint --file lib/panel-layout.ts --file components/shell/PanelMenu.tsx --file components/shell/PanelBody.tsx --file components/shell/PanelDock.tsx --file components/shell/AppShell.tsx && npx vitest run tests/panel-layout.test.ts tests/colony-message.test.ts tests/bot-crossing-sidecar.test.ts`
Expected: no tsc lines; no lint errors; all three test files pass.

### Task 8: End-to-end verification

**Files:** none changed unless a defect is found (fix it in the owning task's files and rerun that task's tests).

- [ ] **Step 1: Full suites**

```bash
cd ~/Downloads/bot-crossing && npm test
cd ~/Downloads/ai-maestro && npx vitest run
```

Expected: Bot Crossing all passing. AI Maestro: only the 4 pre-existing plugin/hook-sync failures.

- [ ] **Step 2: Restart AI Maestro and check the status**

Ask the user before restarting their dev server (it runs in their terminal). After restart:

```bash
curl -s http://localhost:23000/api/colony/status
```

Expected: `"running":true,"url":"http://localhost:23010"`.

- [ ] **Step 3: Open the panel in the browser**

In the in-app browser at `http://localhost:23000`, open an agent, press the dock's ＋ button, then `O`. Expected: a Colony tab with an Orbit icon, the colony rendering in the dock on a dark background, one bot per AI Maestro agent, and the footer line with Reload and Open-in-new-tab buttons.

- [ ] **Step 4: Prove the click handoff**

Before clicking, record messages in the AI Maestro page with the browser's JavaScript tool:

```js
window.__colonyMsgs = []; window.addEventListener('message', e => window.__colonyMsgs.push({ origin: e.origin, data: e.data }))
```

Click a bot in the colony, then its Open button. Then read `window.__colonyMsgs`. Expected: one entry with origin `http://localhost:23010` and data `{ type: 'bot-crossing:open-agent', agentId: '<that agent id>' }`, and AI Maestro showing that agent (sidebar selection and top bar name).

- [ ] **Step 5: Prove the failure state**

Find and stop only the colony's vite:

```bash
lsof -nP -iTCP:23010 -sTCP:LISTEN
kill <pid from the line above>
```

Within ~4 s the panel shows "Colony isn’t running", the reason "Bot Crossing stopped (exit …)", and the last output lines. Restart AI Maestro to bring it back.

- [ ] **Step 6: Report**

Summarize for the user: what was built in each repo, test results with numbers, the screenshots taken, and that nothing was committed or pushed.
