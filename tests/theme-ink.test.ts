/**
 * The ink theme must define every channel variable the app reads; a theme that
 * forgets --fg-white blanks ~278 `text-white` usages (see globals.css "ONE TRAP").
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const css = readFileSync(path.join(__dirname, '..', 'app', 'globals.css'), 'utf8')

function themeBlock(name: string): string {
  const start = css.indexOf(`.${name} {`)
  if (start === -1) return ''
  return css.slice(start, css.indexOf('}', start))
}

describe('.theme-ink', () => {
  const block = themeBlock('theme-ink')

  it('exists', () => {
    expect(block).not.toBe('')
  })

  it('defines every ramp step, the foreground and the semantic roles', () => {
    const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
    const required = [
      ...steps.map(s => `--g-${s}:`),
      ...steps.map(s => `--s-${s}:`),
      ...steps.map(s => `--a-${s}:`),
      '--fg-white:',
      '--c-surface:', '--c-raised:', '--c-sunken:', '--c-hairline:',
      '--c-ink:', '--c-ink-muted:', '--c-accent:', '--c-accent-fill:', '--c-warn:',
      '--font-sans:',
    ]
    for (const v of required) expect(block, v).toContain(v)
  })

  it('uses the spec palette', () => {
    expect(block).toContain('--c-sunken: 10 10 11')    // #0a0a0b
    expect(block).toContain('--c-surface: 15 15 17')   // #0f0f11
    expect(block).toContain('--c-raised: 28 28 32')    // #1c1c20
    expect(block).toContain('--c-hairline: 31 31 35')  // #1f1f23
    expect(block).toContain('--c-accent-fill: 47 75 255') // #2f4bff
  })
})
