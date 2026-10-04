import { describe, it, expect } from 'vitest'
import { findAgentByRef } from '@/lib/agent-lookup'

const agents = [
  { id: 'a1', name: 'raimundo', label: 'Raimundo', avatar: '/avatars/men_01.png' },
  { id: 'a2', name: 'codeai', alias: 'CodeAI' },
]

describe('findAgentByRef', () => {
  it('matches by id first', () => {
    expect(findAgentByRef(agents, 'a2')?.id).toBe('a2')
  })
  it('matches name, alias and label case-insensitively', () => {
    expect(findAgentByRef(agents, 'RAIMUNDO')?.id).toBe('a1')
    expect(findAgentByRef(agents, 'codeai')?.id).toBe('a2')
    expect(findAgentByRef(agents, 'Raimundo')?.id).toBe('a1')
  })
  it('tries each ref in order and skips blanks', () => {
    expect(findAgentByRef(agents, undefined, '', 'nobody', 'CodeAI')?.id).toBe('a2')
  })
  it('returns undefined when nothing matches', () => {
    expect(findAgentByRef(agents, 'ghost')).toBeUndefined()
    expect(findAgentByRef([], 'a1')).toBeUndefined()
    expect(findAgentByRef(agents)).toBeUndefined()
  })
  it('returns undefined when a name matches more than one agent (never guesses)', () => {
    const dup = [{ id: 'h1', name: 'worker' }, { id: 'h2', name: 'Worker' }]
    expect(findAgentByRef(dup, 'worker')).toBeUndefined()
  })
  it('returns undefined when a label matches more than one agent', () => {
    const dup = [{ id: 'x1', name: 'a', label: 'Scout' }, { id: 'x2', name: 'b', label: 'scout' }]
    expect(findAgentByRef(dup, 'Scout')).toBeUndefined()
  })
  it('a single hit in a tier still resolves, and id stays exact even when names collide', () => {
    const mixed = [{ id: 'x1', name: 'a', label: 'Scout' }, { id: 'x2', name: 'b', label: 'Other' }]
    expect(findAgentByRef(mixed, 'scout')?.id).toBe('x1')
    const dup = [{ id: 'h1', name: 'worker' }, { id: 'h2', name: 'worker' }]
    expect(findAgentByRef(dup, 'h2')?.id).toBe('h2')
  })
})
