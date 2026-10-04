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

/**
 * @typedef {Record<string, string | undefined>} Env
 * @typedef {{ env?: Env, aiMaestroDir: string, aiMaestroPort: number, exists?: (p: string) => boolean, home?: string }} PlanInput
 * @typedef {{ ok: boolean, enabled: boolean, port: number, dir: string, url: string, reason?: string, fix?: string, steps?: string[][], env?: Env }} SidecarPlan
 * @typedef {{ enabled: boolean, running: boolean, url: string | null, reason: string | null, fix: string | null, log: string[] }} ColonyStatus
 */

/**
 * What to run, or why not. Pure: everything it looks at is passed in.
 * @param {PlanInput} input
 * @returns {SidecarPlan}
 */
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

/**
 * Wait until `url` answers OK (true) or `deadlineMs` passes (false). AI Maestro warms its own
 * agent route with this before the colony starts: Next dev compiles a route on its first
 * request, which takes longer than the colony adapter's 2.5 s timeout, so an unwarmed first
 * scan comes back empty.
 * @param {string} url
 * @param {{ fetchImpl?: (url: string, init?: object) => Promise<{ ok: boolean }>, deadlineMs?: number, intervalMs?: number }} [options]
 * @returns {Promise<boolean>}
 */
export async function waitForUrl(url, { fetchImpl = fetch, deadlineMs = 60000, intervalMs = 500 } = {}) {
  const end = Date.now() + deadlineMs
  while (Date.now() < end) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(Math.max(1, end - Date.now())) })
      if (res?.ok) return true
    } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return false
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

  /**
   * @param {PlanInput & { spawnImpl?: (cmd: string, args: string[], options: object) => any, portTaken?: (port: number) => Promise<boolean>, warmUp?: () => Promise<unknown> }} opts
   * @returns {Promise<ColonyStatus>}
   */
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

    if (opts.warmUp) {
      Object.assign(state, { reason: 'Waiting for AI Maestro…' })
      try { await opts.warmUp() } catch { /* the colony's own polls retry */ }
      if (state.stopping) return status()
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
