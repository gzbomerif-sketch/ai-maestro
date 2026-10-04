import { describe, it, expect } from 'vitest'
import { EventEmitter } from 'events'
import path from 'path'
import { sidecarPlan, createSidecar, waitForUrl } from '@/lib/bot-crossing-sidecar.mjs'

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

describe('warming AI Maestro before the colony starts', () => {
  it('waitForUrl retries until the URL answers', async () => {
    let calls = 0
    const fetchImpl = async () => { calls++; if (calls < 3) throw new Error('ECONNREFUSED'); return { ok: true } }
    expect(await waitForUrl('http://localhost:23000/api/agents', { fetchImpl, deadlineMs: 1000, intervalMs: 1 })).toBe(true)
    expect(calls).toBe(3)
  })

  it('waitForUrl gives up at the deadline instead of hanging', async () => {
    const fetchImpl = async () => ({ ok: false })
    const started = Date.now()
    expect(await waitForUrl('http://localhost:1/x', { fetchImpl, deadlineMs: 50, intervalMs: 5 })).toBe(false)
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('start warms AI Maestro before spawning anything', async () => {
    const { sidecar, children, opts } = harness()
    const order: string[] = []
    const spawnImpl = (cmd: string, args: string[]) => { order.push('spawn'); return opts.spawnImpl(cmd, args) }
    await sidecar.start({ ...opts, spawnImpl, warmUp: async () => { order.push('warm') } })
    expect(order).toEqual(['warm', 'spawn'])
    expect(children).toHaveLength(1)
  })

  it('shutting down during the warm-up spawns nothing afterwards', async () => {
    const { sidecar, children, opts } = harness()
    await sidecar.start({ ...opts, warmUp: async () => { sidecar.stop() } })
    expect(children).toHaveLength(0)
    expect(sidecar.status()).toMatchObject({ running: false, reason: 'Colony stopped with AI Maestro.' })
  })

  it('a failed warm-up does not stop the colony from starting', async () => {
    const { sidecar, children, opts } = harness()
    await sidecar.start({ ...opts, warmUp: async () => { throw new Error('not up yet') } })
    expect(children).toHaveLength(1)
  })
})
