import { describe, it, expect } from 'vitest'
import { resolveTheme, themeForShell, expectCommandCenter, THEME_PREF_KEY, THEME_PREF_EVENT, THEME_PREFS } from '@/lib/theme'

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

describe('themeForShell', () => {
  it('only the command-center shell follows the preference', () => {
    expect(themeForShell('paper', false, 'command-center')).toBe('theme-paper')
    expect(themeForShell('system', false, 'command-center')).toBe('theme-paper')
    expect(themeForShell('ink', false, 'command-center')).toBe('theme-ink')
  })
  it('classic, tablet, phone and no shell at all stay Ink', () => {
    for (const shell of ['classic', 'tablet', 'phone', undefined]) {
      expect(themeForShell('paper', false, shell)).toBe('theme-ink')
      expect(themeForShell('system', false, shell)).toBe('theme-ink')
    }
  })
})

describe('expectCommandCenter (boot-script guess)', () => {
  const desk = { pathname: '/', shellPref: null, layoutMode: null, width: 1440, touch: false }
  it('a desktop on / with the default shell expects the command center', () => {
    expect(expectCommandCenter(desk)).toBe(true)
    expect(expectCommandCenter({ ...desk, shellPref: 'command-center' })).toBe(true)
  })
  it('other routes and the classic shell do not', () => {
    expect(expectCommandCenter({ ...desk, pathname: '/settings' })).toBe(false)
    expect(expectCommandCenter({ ...desk, shellPref: 'classic' })).toBe(false)
  })
  it('mirrors the phone/tablet split and the layout override', () => {
    expect(expectCommandCenter({ ...desk, width: 900 })).toBe(false)
    expect(expectCommandCenter({ ...desk, width: 500 })).toBe(false)
    expect(expectCommandCenter({ ...desk, touch: true })).toBe(false)
    expect(expectCommandCenter({ ...desk, layoutMode: 'tablet' })).toBe(false)
    expect(expectCommandCenter({ ...desk, width: 500, touch: true, layoutMode: 'desktop' })).toBe(true)
  })
})
