import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('joins truthy classes and drops falsy ones', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })
  it('merges conflicting tailwind utilities, last wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
  it('keeps text size and semantic text colour together', () => {
    expect(cn('text-sm', 'text-ink-muted')).toBe('text-sm text-ink-muted')
  })
})
