import { describe, it, expect } from 'vitest'
import type { Agent } from '@/types/agent'
import {
  resolveColonySelection, parseTagsCsv, buildProfilePatch, draftOf, presenceStatus, faceActivityFor, avatarImageSrc,
} from '@/components/shell/ColonyProfileCard'

const agent = (o: Partial<Agent> = {}): Agent =>
  ({ id: 'a1', name: 'alpha', program: 'Claude Code', taskDescription: 'Ship it', tags: ['api', 'ts'], avatar: '/avatars/men_01.png', sessions: [], ...o }) as Agent

describe('resolveColonySelection', () => {
  const agents = [agent({ id: 'a1' }), agent({ id: 'a2' })]
  it('finds the selected agent', () => {
    expect(resolveColonySelection(agents, 'a2')).toEqual({ agent: agents[1], stale: false })
  })
  it('nothing selected is neither an agent nor stale', () => {
    expect(resolveColonySelection(agents, null)).toEqual({ agent: null, stale: false })
  })
  it('an unknown id is stale so the card can clear it', () => {
    expect(resolveColonySelection(agents, 'gone')).toEqual({ agent: null, stale: true })
    expect(resolveColonySelection([], 'a1')).toEqual({ agent: null, stale: true })
  })
})

describe('parseTagsCsv', () => {
  it('trims, drops blanks and duplicates, keeps order', () => {
    expect(parseTagsCsv(' b, a,, b ,  ,c')).toEqual(['b', 'a', 'c'])
    expect(parseTagsCsv('')).toEqual([])
  })
})

describe('buildProfilePatch', () => {
  const a = agent({ label: 'Alpha' })
  it('is null when nothing changed', () => {
    expect(buildProfilePatch(a, draftOf(a))).toBeNull()
  })
  it('carries only the changed fields', () => {
    expect(buildProfilePatch(a, { ...draftOf(a), label: ' Beta ' })).toEqual({ label: 'Beta' })
    expect(buildProfilePatch(a, { ...draftOf(a), taskDescription: 'New job' })).toEqual({ taskDescription: 'New job' })
    expect(buildProfilePatch(a, { ...draftOf(a), avatar: '/avatars/women_02.png' })).toEqual({ avatar: '/avatars/women_02.png' })
  })
  it('compares tags as lists, so whitespace and a repeated tag are not changes', () => {
    expect(buildProfilePatch(a, { ...draftOf(a), tags: 'api,  ts ,api' })).toBeNull()
    expect(buildProfilePatch(a, { ...draftOf(a), tags: 'api, ts, ui' })).toEqual({ tags: ['api', 'ts', 'ui'] })
    expect(buildProfilePatch(a, { ...draftOf(a), tags: '' })).toEqual({ tags: [] })
  })
  it('never sends an emptied label (the API would ignore it)', () => {
    expect(buildProfilePatch(a, { ...draftOf(a), label: '   ' })).toBeNull()
  })
  it('can clear the task description', () => {
    expect(buildProfilePatch(a, { ...draftOf(a), taskDescription: '' })).toEqual({ taskDescription: '' })
  })
  it('handles an agent with no label, tags or avatar', () => {
    const bare = agent({ label: undefined, tags: undefined, avatar: undefined })
    expect(buildProfilePatch(bare, draftOf(bare))).toBeNull()
    expect(buildProfilePatch(bare, { ...draftOf(bare), label: 'X', tags: 'a' })).toEqual({ label: 'X', tags: ['a'] })
  })
})

describe('presence mapping', () => {
  it('maps presenceOf vocabulary to the shell dot and the face', () => {
    expect(presenceStatus('ready')).toBe('idle')
    expect(presenceStatus('working')).toBe('working')
    expect(presenceStatus('needs-you')).toBe('needs-you')
    expect(presenceStatus('offline')).toBe('offline')
    expect(faceActivityFor('working')).toBe('active')
    expect(faceActivityFor('needs-you')).toBe('waiting')
    expect(faceActivityFor('ready')).toBe('idle')
    expect(faceActivityFor('offline')).toBe('offline')
  })
})

describe('avatarImageSrc', () => {
  it('accepts image URLs and paths, rejects emoji and empty', () => {
    expect(avatarImageSrc('/avatars/men_01.png')).toBe('/avatars/men_01.png')
    expect(avatarImageSrc('https://x.test/a.png')).toBe('https://x.test/a.png')
    expect(avatarImageSrc('🤖')).toBeNull()
    expect(avatarImageSrc(undefined)).toBeNull()
  })
})
