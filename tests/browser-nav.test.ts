import { describe, it, expect } from 'vitest'
import { normalizeUrl, browserReducer, parseBrowserState, DEFAULT_BROWSER, DEFAULT_URL, currentUrl } from '@/lib/browser-nav'

describe('normalizeUrl', () => {
  it('keeps http(s) URLs', () => {
    expect(normalizeUrl('http://localhost:3000/')).toBe('http://localhost:3000/')
    expect(normalizeUrl('  https://example.com/a?b=1 ')).toBe('https://example.com/a?b=1')
  })
  it('adds http:// to bare hosts', () => {
    expect(normalizeUrl('localhost:3000')).toBe('http://localhost:3000/')
    expect(normalizeUrl('127.0.0.1:8080/x')).toBe('http://127.0.0.1:8080/x')
    expect(normalizeUrl('example.com')).toBe('http://example.com/')
    expect(normalizeUrl('//cdn.example.com/x')).toBe('http://cdn.example.com/x')
  })
  it('rejects other schemes, empty and junk', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('JavaScript:alert(1)')).toBeNull()
    expect(normalizeUrl('file:///etc/passwd')).toBeNull()
    expect(normalizeUrl('data:text/html,hi')).toBeNull()
    expect(normalizeUrl('')).toBeNull()
    expect(normalizeUrl('   ')).toBeNull()
    expect(normalizeUrl('http://')).toBeNull()
  })
})

describe('browserReducer', () => {
  it('starts at localhost:3000', () => {
    expect(currentUrl(DEFAULT_BROWSER)).toBe(DEFAULT_URL)
  })
  it('navigate pushes, drops forward history, ignores same URL', () => {
    let s = browserReducer(DEFAULT_BROWSER, { type: 'navigate', url: 'http://a.test/' })
    s = browserReducer(s, { type: 'navigate', url: 'http://b.test/' })
    expect(s.history).toEqual([DEFAULT_URL, 'http://a.test/', 'http://b.test/'])
    s = browserReducer(s, { type: 'back' })
    s = browserReducer(s, { type: 'navigate', url: 'http://c.test/' })
    expect(s.history).toEqual([DEFAULT_URL, 'http://a.test/', 'http://c.test/'])
    expect(browserReducer(s, { type: 'navigate', url: 'http://c.test/' })).toBe(s)
  })
  it('back/forward stay in bounds', () => {
    let s = browserReducer(DEFAULT_BROWSER, { type: 'back' })
    expect(s.index).toBe(0)
    s = browserReducer(s, { type: 'navigate', url: 'http://a.test/' })
    s = browserReducer(s, { type: 'forward' })
    expect(s.index).toBe(1)
    s = browserReducer(s, { type: 'back' })
    expect(currentUrl(s)).toBe(DEFAULT_URL)
  })
  it('caps history at 50', () => {
    let s = DEFAULT_BROWSER
    for (let i = 0; i < 60; i++) s = browserReducer(s, { type: 'navigate', url: `http://p${i}.test/` })
    expect(s.history.length).toBe(50)
    expect(currentUrl(s)).toBe('http://p59.test/')
  })
  it('mini preview toggles', () => {
    expect(browserReducer(DEFAULT_BROWSER, { type: 'setMini', mini: true }).mini).toBe(true)
  })
})

describe('parseBrowserState', () => {
  it('validates and falls back', () => {
    expect(parseBrowserState(null)).toBeNull()
    expect(parseBrowserState('{bad')).toBeNull()
    const s = parseBrowserState(JSON.stringify({ history: ['http://a.test/', 'javascript:alert(1)', 'http://b.test/'], index: 9, mini: 'yes' }))!
    expect(s.history).toEqual(['http://a.test/', 'http://b.test/'])
    expect(s.index).toBe(1)
    expect(s.mini).toBe(false)
    expect(parseBrowserState(JSON.stringify({ history: [] }))!.history).toEqual([DEFAULT_URL])
  })
})
