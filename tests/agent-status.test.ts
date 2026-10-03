import { describe, it, expect } from 'vitest'
import { isOnline, isHibernated, displayName, formatAge, groupByStatus } from '@/lib/agent-status'

const NOW = Date.parse('2026-10-03T12:00:00Z')
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR

function agent(over: Record<string, unknown> = {}): any {
  return { id: 'a', name: 'a', hostId: 'local', sessions: [], ...over }
}
const online = (over = {}) => agent({ session: { status: 'online' }, sessions: [{ index: 0, status: 'online' }], ...over })

describe('isOnline / isHibernated', () => {
  it('is online when either the live session or the first session is online', () => {
    expect(isOnline(agent({ session: { status: 'online' } }))).toBe(true)
    expect(isOnline(agent({ sessions: [{ index: 0, status: 'online' }] }))).toBe(true)
    expect(isOnline(agent())).toBe(false)
  })
  it('is hibernated when offline but has sessions', () => {
    expect(isHibernated(agent({ sessions: [{ index: 0, status: 'offline' }] }))).toBe(true)
    expect(isHibernated(agent())).toBe(false)
    expect(isHibernated(online())).toBe(false)
  })
})

describe('displayName', () => {
  it('prefers label, then name, then alias, then id', () => {
    expect(displayName(agent({ label: 'L', name: 'n' }))).toBe('L')
    expect(displayName(agent({ name: 'n' }))).toBe('n')
    expect(displayName(agent({ name: '', alias: 'al' }))).toBe('al')
    expect(displayName(agent({ name: '', id: 'x1' }))).toBe('x1')
  })
})

describe('formatAge', () => {
  it('formats boundaries', () => {
    expect(formatAge(ago(30_000), NOW)).toBe('now')
    expect(formatAge(ago(MIN), NOW)).toBe('1m')
    expect(formatAge(ago(59 * MIN), NOW)).toBe('59m')
    expect(formatAge(ago(HOUR), NOW)).toBe('1h')
    expect(formatAge(ago(23 * HOUR), NOW)).toBe('23h')
    expect(formatAge(ago(DAY), NOW)).toBe('1d')
    expect(formatAge(ago(6 * DAY), NOW)).toBe('6d')
    expect(formatAge(ago(7 * DAY), NOW)).toBe('1w')
    expect(formatAge(ago(30 * DAY), NOW)).toBe('4w')
  })
  it('returns empty for missing or invalid input and now for future times', () => {
    expect(formatAge(undefined, NOW)).toBe('')
    expect(formatAge(null, NOW)).toBe('')
    expect(formatAge('not-a-date', NOW)).toBe('')
    expect(formatAge(new Date(NOW + 5 * MIN).toISOString(), NOW)).toBe('now')
  })
})

describe('groupByStatus', () => {
  const act = (map: Record<string, { status: 'active' | 'idle' | 'waiting'; lastActivity: string }>) =>
    (a: any) => map[a.id] ?? null

  it('maps each state to its group', () => {
    const agents = [
      online({ id: 'w', name: 'w' }),
      online({ id: 'k', name: 'k' }),
      online({ id: 'i', name: 'i' }),
      agent({ id: 'h', name: 'h', sessions: [{ index: 0, status: 'offline', lastActive: ago(2 * DAY) }] }),
      agent({ id: 'o', name: 'o' }),
    ]
    const g = groupByStatus(agents, act({
      w: { status: 'waiting', lastActivity: ago(6 * MIN) },
      k: { status: 'active', lastActivity: ago(MIN) },
      i: { status: 'idle', lastActivity: ago(20 * MIN) },
    }))
    expect(g.needsYou.map(e => [e.agent.id, e.status])).toEqual([['w', 'needs-you']])
    expect(g.working.map(e => [e.agent.id, e.status])).toEqual([['k', 'working']])
    expect(g.idle.map(e => [e.agent.id, e.status])).toEqual([['i', 'idle']])
    expect(g.asleep.map(e => [e.agent.id, e.status])).toEqual([['h', 'asleep'], ['o', 'offline']])
    expect(g.needsYou[0].since).toBe(ago(6 * MIN))
    expect(g.asleep[0].since).toBe(ago(2 * DAY))
  })

  it('online with no activity is idle', () => {
    const g = groupByStatus([online({ id: 'x', name: 'x' })], () => null)
    expect(g.idle.map(e => e.agent.id)).toEqual(['x'])
  })

  it('ignores activity for offline agents', () => {
    const g = groupByStatus(
      [agent({ id: 'h', sessions: [{ index: 0, status: 'offline' }] })],
      () => ({ status: 'active', lastActivity: ago(MIN) }),
    )
    expect(g.working).toEqual([])
    expect(g.asleep.map(e => e.agent.id)).toEqual(['h'])
  })

  it('sorts newest first, then by name; offline agents after hibernated', () => {
    const agents = [
      online({ id: 'b', name: 'beta' }),
      online({ id: 'a', name: 'alpha' }),
      online({ id: 'c', name: 'gamma' }),
    ]
    const g = groupByStatus(agents, act({
      a: { status: 'idle', lastActivity: ago(10 * MIN) },
      b: { status: 'idle', lastActivity: ago(10 * MIN) },
      c: { status: 'idle', lastActivity: ago(MIN) },
    }))
    expect(g.idle.map(e => e.agent.id)).toEqual(['c', 'a', 'b'])
  })
})
