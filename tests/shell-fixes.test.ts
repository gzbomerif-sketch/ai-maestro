/**
 * Regression tests for the final-review findings on the command-center shell.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { resolveAgentTab } from '@/lib/shell-tabs'
import { shouldOpenPalette } from '@/lib/command-palette'
import { fetchUnreadCount } from '@/hooks/useUnreadCounts'
import { readNumber } from '@/lib/safe-storage'

const src = (p: string) => readFileSync(path.join(__dirname, '..', p), 'utf8')

describe('I1 resolveAgentTab: chat follows each agent\'s runtime mode', () => {
  it('maps chat/streaming/messages to the agent\'s own chat view', () => {
    expect(resolveAgentTab('streaming', 'terminal')).toBe('chat')
    expect(resolveAgentTab('chat', 'streaming')).toBe('streaming')
    expect(resolveAgentTab('messages', 'terminal')).toBe('chat')
    expect(resolveAgentTab('messages', 'streaming')).toBe('streaming')
  })
  it('leaves other tabs alone', () => {
    expect(resolveAgentTab('terminal', 'streaming')).toBe('terminal')
    expect(resolveAgentTab('memory', 'terminal')).toBe('memory')
  })
})

describe('I4 shouldOpenPalette: never steals Ctrl+K kill-line', () => {
  const k = (over = {}) => ({ key: 'k', metaKey: false, ctrlKey: false, ...over })
  const inXterm = { closest: (sel: string) => (sel === '.xterm' ? {} : null) }
  it('on Mac only Cmd+K opens it', () => {
    expect(shouldOpenPalette(k({ metaKey: true }), null, true)).toBe(true)
    expect(shouldOpenPalette(k({ ctrlKey: true }), null, true)).toBe(false)
  })
  it('elsewhere Ctrl+K opens it, except inside the terminal', () => {
    expect(shouldOpenPalette(k({ ctrlKey: true }), null, false)).toBe(true)
    expect(shouldOpenPalette(k({ ctrlKey: true }), inXterm, false)).toBe(false)
  })
})

describe('I2 fetchUnreadCount: a hanging host times out', () => {
  afterEach(() => vi.useRealTimers())
  it('rejects after the timeout instead of hanging forever', async () => {
    vi.useFakeTimers()
    const hanging = (_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
    })
    const p = fetchUnreadCount({ id: 'a', hostUrl: 'http://dead:23000' } as any, hanging as any, 5000)
    const settled = p.then(() => 'ok', () => 'rejected')
    await vi.advanceTimersByTimeAsync(5001)
    await expect(settled).resolves.toBe('rejected')
  })
  it('returns the count when the host answers', async () => {
    const ok = async () => new Response(JSON.stringify({ count: 3 }), { status: 200 })
    await expect(fetchUnreadCount({ id: 'a' } as any, ok as any, 5000)).resolves.toBe(3)
  })
})

describe('I3 page never touches localStorage directly', () => {
  it('app/page.tsx routes storage through lib/safe-storage', () => {
    expect(src('app/page.tsx')).not.toMatch(/\blocalStorage\./)
  })
  it('readNumber falls back on throw, garbage and missing', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('SecurityError') } })
    expect(readNumber('sidebar-width', 320)).toBe(320)
    vi.stubGlobal('localStorage', { getItem: () => 'abc' })
    expect(readNumber('sidebar-width', 320)).toBe(320)
    vi.stubGlobal('localStorage', { getItem: () => '280' })
    expect(readNumber('sidebar-width', 320)).toBe(280)
    vi.unstubAllGlobals()
  })
})

describe('M7 ink chat copy does not promise image attachments', () => {
  it('ChatView has no "attach images" text', () => {
    expect(src('components/ChatView.tsx')).not.toMatch(/attach images/)
  })
})
