import { describe, it, expect } from 'vitest'
import { resolveTheme, THEME_PREF_KEY, THEME_PREF_EVENT, THEME_PREFS } from '@/lib/theme'

describe('resolveTheme', () => {
  it('system follows the OS: dark -> ink, light -> paper', () => {
    expect(resolveTheme('system', true)).toBe('theme-ink')
    expect(resolveTheme('system', false)).toBe('theme-paper')
  })
  it('an explicit pref ignores the OS', () => {
    expect(resolveTheme('paper', true)).toBe('theme-paper')
    expect(resolveTheme('paper', false)).toBe('theme-paper')
    expect(resolveTheme('ink', false)).toBe('theme-ink')
    expect(resolveTheme('ink', true)).toBe('theme-ink')
  })
})

describe('theme constants', () => {
  it('uses a stable storage key, event name and pref list', () => {
    expect(THEME_PREF_KEY).toBe('aimaestro-theme')
    expect(THEME_PREF_EVENT).toBe('aimaestro:theme-pref')
    expect(THEME_PREFS).toEqual(['ink', 'paper', 'system'])
  })
})
