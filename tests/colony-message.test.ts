import { describe, it, expect } from 'vitest'
import { COLONY_OPEN_AGENT, COLONY_REFRESH, UNREACHABLE, colonyFrameUrl, colonyReachableFrom, findAgent, nextColonyStatus, originOf, parseColonyMessage, shouldShowColony, type ColonyStatus } from '@/lib/colony-message'

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

describe('colonyReachableFrom', () => {
  it('is true only when AI Maestro is open on the machine that runs the colony', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) expect(colonyReachableFrom(host)).toBe(true)
  })
  it('is false from another device, where localhost would be that device', () => {
    for (const host of ['100.64.0.5', 'obres-macbook-air', 'obres-macbook-air.tail1234.ts.net', '192.168.1.20', '']) {
      expect(colonyReachableFrom(host)).toBe(false)
    }
  })
})

describe('COLONY_REFRESH', () => {
  it('is the exact string Bot Crossing listens for (isHostRefresh in its src/game/host.js)', () => {
    expect(COLONY_REFRESH).toBe('bot-crossing:refresh')
  })
})

const RUNNING: ColonyStatus = { enabled: true, running: true, url: 'http://localhost:23010', reason: null, fix: null, log: [] }

describe('nextColonyStatus', () => {
  it('a successful poll adopts the fetched status and clears the failure streak', () => {
    expect(nextColonyStatus(null, RUNNING, 5)).toEqual({ status: RUNNING, failures: 0 })
  })
  it('one failed poll keeps the last good status, so a dev-server blip cannot unmount the colony', () => {
    expect(nextColonyStatus(RUNNING, null, 0)).toEqual({ status: RUNNING, failures: 1 })
  })
  it('two failed polls in a row concede the colony is unreachable', () => {
    expect(nextColonyStatus(RUNNING, null, 1)).toEqual({ status: UNREACHABLE, failures: 2 })
  })
  it('a cold start with nothing to preserve reports unreachable at once', () => {
    expect(nextColonyStatus(null, null, 0)).toEqual({ status: UNREACHABLE, failures: 1 })
  })
})

describe('shouldShowColony', () => {
  it('shows only once a Colony tab has been opened, locally, with the colony running', () => {
    expect(shouldShowColony(true, true, RUNNING)).toBe(true)
  })
  it('never boots the game in a session that has not opened a Colony tab', () => {
    expect(shouldShowColony(false, true, RUNNING)).toBe(false)
  })
  it('never on a remote device, never while dead, never without a url', () => {
    expect(shouldShowColony(true, false, RUNNING)).toBe(false)
    expect(shouldShowColony(true, true, UNREACHABLE)).toBe(false)
    expect(shouldShowColony(true, true, { ...RUNNING, url: null })).toBe(false)
    expect(shouldShowColony(true, true, null)).toBe(false)
  })
})
