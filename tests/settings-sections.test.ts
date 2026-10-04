import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { SETTINGS_SECTIONS, parseSection, filterSections } from '@/lib/settings-sections'

const q = (s: string) => new URLSearchParams(s)

describe('SETTINGS_SECTIONS', () => {
  it('lists the 11 sections in nav order', () => {
    expect(SETTINGS_SECTIONS.map(s => s.id)).toEqual([
      'hosts', 'domains', 'webhooks', 'memory', 'appearance', 'terminal', 'marketplace', 'experiments', 'onboarding', 'help', 'about',
    ])
  })
})

describe('parseSection', () => {
  it('reads ?section=', () => {
    expect(parseSection(q('section=webhooks'))).toBe('webhooks')
  })
  it('accepts the legacy ?tab=', () => {
    expect(parseSection(q('tab=memory'))).toBe('memory')
  })
  it('prefers section over tab', () => {
    expect(parseSection(q('section=about&tab=memory'))).toBe('about')
  })
  it('falls back to hosts for garbage or nothing', () => {
    expect(parseSection(q('section=nope'))).toBe('hosts')
    expect(parseSection(q(''))).toBe('hosts')
    expect(parseSection(null)).toBe('hosts')
  })
})

describe('filterSections', () => {
  it('matches labels and keywords, case-insensitive; empty returns all', () => {
    expect(filterSections('').length).toBe(11)
    expect(filterSections('HOOK').map(s => s.id)).toEqual(['webhooks'])
    expect(filterSections('machines').map(s => s.id)).toContain('hosts')
    expect(filterSections('dark').map(s => s.id)).toEqual(['appearance'])
    expect(filterSections('zzz')).toEqual([])
  })
})

describe('ink tokens for controls', () => {
  const css = readFileSync(path.join(__dirname, '..', 'app', 'globals.css'), 'utf8')
  const block = css.slice(css.indexOf('.theme-ink {'), css.indexOf('}', css.indexOf('.theme-ink {')))
  it('defines control and warn-surface tokens', () => {
    expect(block).toContain('--c-control-border: 42 42 47')
    expect(block).toContain('--c-control-off: 38 38 43')
    expect(block).toContain('--c-warn-surface: 22 19 13')
    expect(block).toContain('--c-warn-border: 42 35 20')
  })
})

describe('settings + shell components use tokens, not literals', () => {
  const root = path.join(__dirname, '..')
  const files = (dir: string): string[] => readdirSync(dir).flatMap(f => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : []
  })
  const targets = [...files(path.join(root, 'components', 'settings')), ...files(path.join(root, 'components', 'shell')), path.join(root, 'app', 'settings', 'page.tsx')]
  it('has no rgb()/hex colour literals or old blue-600 fills', () => {
    for (const f of targets) {
      const src = readFileSync(f, 'utf8')
      expect(src, path.relative(root, f)).not.toMatch(/rgb\(\d|\[#[0-9a-fA-F]{3,6}\]|bg-blue-600/)
    }
  })
})
