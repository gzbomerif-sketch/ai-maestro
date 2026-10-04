import { describe, it, expect } from 'vitest'
import { buildTerminalTheme, tripleToHex } from '@/lib/terminal-theme'

// Token values copied from app/globals.css (.theme-ink and .theme-paper)
const INK: Record<string, string> = {
  '--c-sunken': ' 10 10 11',
  '--c-ink': '236 236 239',
  '--c-ink-muted': '133 133 141',
  '--c-accent-fill': '47 75 255',
}
const PAPER: Record<string, string> = {
  '--c-sunken': '244 244 241',
  '--c-ink': '24 24 27',
  '--c-ink-muted': '100 100 110',
  '--c-accent-fill': '47 75 255',
}
const reader = (vars: Record<string, string>) => (name: string) => vars[name]

describe('tripleToHex', () => {
  it('converts a space-separated RGB token to hex', () => {
    expect(tripleToHex(' 10 10 11')).toBe('#0a0a0b')
    expect(tripleToHex('236 236 239')).toBe('#ececef')
  })

  it('returns null for missing or malformed tokens', () => {
    expect(tripleToHex(undefined)).toBeNull()
    expect(tripleToHex('')).toBeNull()
    expect(tripleToHex('red')).toBeNull()
    expect(tripleToHex('300 0 0')).toBeNull()
  })
})

describe('buildTerminalTheme', () => {
  it('uses the shell surface and ink tokens so the terminal matches the panel it sits in', () => {
    const theme = buildTerminalTheme(reader(INK))
    expect(theme.background).toBe('#0a0a0b')
    expect(theme.foreground).toBe('#ececef')
    expect(theme.cursor).toBe('#ececef')
    expect(theme.cursorAccent).toBe('#0a0a0b')
  })

  it('derives a translucent selection from the accent', () => {
    const theme = buildTerminalTheme(reader(INK))
    expect(theme.selectionBackground).toBe('#2f4bff59')
    expect(theme.selectionInactiveBackground).toBe('#85858d40')
  })

  it('never falls back to the old VS Code grey', () => {
    const theme = buildTerminalTheme(reader({}))
    expect(theme.background).not.toBe('#1e1e1e')
    expect(theme.background).toBe('#0a0a0b')
    expect(theme.foreground).toBe('#ececef')
  })

  it('picks a dark ANSI palette on a dark surface and a light one on a light surface', () => {
    const dark = buildTerminalTheme(reader(INK))
    const light = buildTerminalTheme(reader(PAPER))
    expect(light.background).toBe('#f4f4f1')
    expect(light.foreground).toBe('#18181b')
    // white text must stay readable: dark-mode "white" is light, paper-mode "white" is dark
    expect(dark.white).not.toBe(light.white)
    expect(luma(dark.white!)).toBeGreaterThan(0.5)
    expect(luma(light.white!)).toBeLessThan(0.5)
  })

  it('fills all 16 ANSI colors', () => {
    const theme = buildTerminalTheme(reader(INK))
    const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
    for (const n of names) {
      expect(theme[n as keyof typeof theme]).toMatch(/^#[0-9a-f]{6}$/)
      const bright = 'bright' + n[0].toUpperCase() + n.slice(1)
      expect(theme[bright as keyof typeof theme]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

function luma(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}
