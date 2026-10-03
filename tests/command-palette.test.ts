import { describe, it, expect } from 'vitest'
import { rankCommandResults, shouldOpenPalette, type CommandItem } from '@/lib/command-palette'

const items: CommandItem[] = [
  { id: 's:teams', kind: 'screen', label: 'Teams', keywords: [] },
  { id: 'a:web', kind: 'agent', label: 'web-app', keywords: ['frontend', 'mac-mini'] },
  { id: 'a:back', kind: 'agent', label: 'backend-api', keywords: ['api'] },
  { id: 'a:docs', kind: 'agent', label: 'docs-bot', keywords: ['writer'] },
  { id: 's:web', kind: 'screen', label: 'Web hosts', keywords: ['settings'] },
]

describe('rankCommandResults', () => {
  it('returns everything, agents first, for an empty query', () => {
    expect(rankCommandResults('  ', items).map(i => i.id)).toEqual(['a:web', 'a:back', 'a:docs', 's:teams', 's:web'])
  })
  it('ranks label prefix > word prefix > substring, agents before screens on ties', () => {
    expect(rankCommandResults('web', items).map(i => i.id)).toEqual(['a:web', 's:web'])
    expect(rankCommandResults('api', items).map(i => i.id)).toEqual(['a:back'])
    expect(rankCommandResults('ck', items).map(i => i.id)).toEqual(['a:back'])
  })
  it('matches keywords and is case-insensitive', () => {
    expect(rankCommandResults('MAC', items).map(i => i.id)).toEqual(['a:web'])
    expect(rankCommandResults('writer', items).map(i => i.id)).toEqual(['a:docs'])
  })
  it('drops non-matches', () => {
    expect(rankCommandResults('zzz', items)).toEqual([])
  })
})

describe('shouldOpenPalette', () => {
  const k = (over = {}) => ({ key: 'k', metaKey: true, ctrlKey: false, ...over })
  const el = (inSearch: boolean) => ({ closest: (sel: string) => (sel === '[data-agent-search]' && inSearch ? {} : null) })

  it('opens on Cmd+K (Mac) or Ctrl+K (elsewhere)', () => {
    expect(shouldOpenPalette(k(), null, true)).toBe(true)
    expect(shouldOpenPalette(k({ metaKey: false, ctrlKey: true }), null, false)).toBe(true)
    expect(shouldOpenPalette(k({ key: 'K' }), el(false), true)).toBe(true)
  })
  it('ignores other keys and plain k', () => {
    expect(shouldOpenPalette(k({ key: 'j' }), null, true)).toBe(false)
    expect(shouldOpenPalette(k({ metaKey: false }), null, true)).toBe(false)
  })
  it('leaves Cmd+K to the agent search box', () => {
    expect(shouldOpenPalette(k(), el(true), true)).toBe(false)
  })
})

describe('settings commands', () => {
  it('offers every settings section as a ⌘K destination', async () => {
    const { SETTINGS_COMMANDS } = await import('@/lib/command-palette')
    expect(SETTINGS_COMMANDS).toHaveLength(10)
    const hit = rankCommandResults('webhooks', SETTINGS_COMMANDS)[0]
    expect(hit).toMatchObject({ id: 'screen:/settings?section=webhooks', label: 'Settings · Webhooks', kind: 'screen' })
  })
})
