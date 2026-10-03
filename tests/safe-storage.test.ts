import { describe, it, expect, afterEach, vi } from 'vitest'
import { readPref, writePref, readBool } from '@/lib/safe-storage'

function stubStorage(store: Record<string, string>) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('readPref', () => {
  it('returns the stored value when allowed', () => {
    stubStorage({ k: 'classic' })
    expect(readPref('k', 'command-center', ['command-center', 'classic'] as const)).toBe('classic')
  })
  it('falls back on missing or corrupt values', () => {
    stubStorage({ k: 'garbage' })
    expect(readPref('k', 'command-center', ['command-center', 'classic'] as const)).toBe('command-center')
    expect(readPref('missing', 'status', ['status', 'project'] as const)).toBe('status')
  })
  it('falls back when localStorage throws or is absent', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } })
    expect(readPref('k', 'status', ['status', 'project'] as const)).toBe('status')
    expect(() => writePref('k', 'project')).not.toThrow()
    vi.unstubAllGlobals()
    expect(readPref('k', 'status', ['status', 'project'] as const)).toBe('status')
  })
})

describe('readBool / writePref', () => {
  it('round-trips booleans', () => {
    const store: Record<string, string> = {}
    stubStorage(store)
    writePref('b', 'true')
    expect(readBool('b', false)).toBe(true)
    expect(readBool('nope', true)).toBe(true)
    store.b = 'x'
    expect(readBool('b', false)).toBe(false)
  })
})
