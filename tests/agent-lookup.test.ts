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
})
