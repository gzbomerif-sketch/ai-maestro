import type { ITheme } from '@xterm/xterm'

/**
 * xterm.js colours derived from the app's design tokens (app/globals.css), so the
 * terminal sits flush in whatever surface hosts it instead of being a VS Code
 * grey box. Pure: pass a token reader, e.g. one backed by getComputedStyle.
 */
export type TokenReader = (name: string) => string | undefined

// Ink theme values, used when a token is missing (never the old #1e1e1e grey).
const FALLBACK = {
  '--c-sunken': '10 10 11',
  '--c-ink': '236 236 239',
  '--c-ink-muted': '133 133 141',
  '--c-accent-fill': '47 75 255',
} as const

/** "10 10 11" → "#0a0a0b"; null when missing or malformed. */
export function tripleToHex(value: string | undefined): string | null {
  const parts = value?.trim().split(/\s+/)
  if (!parts || parts.length !== 3) return null
  const nums = parts.map(Number)
  if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null
  return '#' + nums.map(n => n.toString(16).padStart(2, '0')).join('')
}

function luma(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

// Muted ANSI palettes. Agents (Claude Code, Codex) mostly paint in truecolor, so
// these mainly affect shells, git and test runners.
const ANSI_DARK = {
  black: '#1f1f23', red: '#e0707a', green: '#7ec08a', yellow: '#d6b26c',
  blue: '#7d92ff', magenta: '#c49be8', cyan: '#6fbfc8', white: '#c4c4ca',
  brightBlack: '#5e5e66', brightRed: '#ef8a93', brightGreen: '#98d4a2', brightYellow: '#e6c68a',
  brightBlue: '#9ba8ff', brightMagenta: '#d5b3f1', brightCyan: '#8fd2da', brightWhite: '#ececef',
}
const ANSI_LIGHT = {
  black: '#111827', red: '#b42318', green: '#2e7d32', yellow: '#8a6100',
  blue: '#1d4ed8', magenta: '#86198f', cyan: '#0e7490', white: '#4b5563',
  brightBlack: '#6b7280', brightRed: '#d92d20', brightGreen: '#388e3c', brightYellow: '#a16207',
  brightBlue: '#2563eb', brightMagenta: '#a21caf', brightCyan: '#0891b2', brightWhite: '#1f2937',
}

export function buildTerminalTheme(read: TokenReader): ITheme {
  const token = (name: keyof typeof FALLBACK) => tripleToHex(read(name)) ?? (tripleToHex(FALLBACK[name]) as string)
  const background = token('--c-sunken')
  const foreground = token('--c-ink')
  return {
    background,
    foreground,
    cursor: foreground,
    cursorAccent: background,
    selectionBackground: token('--c-accent-fill') + '59',          // ~35%
    selectionInactiveBackground: token('--c-ink-muted') + '40',    // ~25%
    ...(luma(background) < 0.5 ? ANSI_DARK : ANSI_LIGHT),
  }
}
