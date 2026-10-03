/**
 * Browser panel: URL normalisation and the panel's own back/forward history.
 * Pure. The embedded page is cross-origin, so only navigations made from the
 * URL bar are tracked (clicks inside the page are not visible to us).
 */
export const DEFAULT_URL = 'http://localhost:3000/'
const MAX_HISTORY = 50

export interface BrowserState {
  history: string[]
  index: number
  /** Floating mini preview visible */
  mini: boolean
}

export const DEFAULT_BROWSER: BrowserState = { history: [DEFAULT_URL], index: 0, mini: false }

export type BrowserAction =
  | { type: 'navigate'; url: string }
  | { type: 'back' }
  | { type: 'forward' }
  | { type: 'setMini'; mini: boolean }
  | { type: 'replace'; state: BrowserState }

export const currentUrl = (s: BrowserState) => s.history[s.index] ?? DEFAULT_URL

/** http(s) only; bare hosts get http://. Returns the canonical href or null. */
export function normalizeUrl(input: string): string | null {
  let v = input.trim()
  if (!v) return null
  if (v.startsWith('//')) v = 'http:' + v
  else if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^[\w.-]+:\d+/.test(v)) {
    if (!/^https?:/i.test(v)) return null
  } else if (!/^https?:/i.test(v)) {
    v = 'http://' + v
  }
  try {
    const u = new URL(v)
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !u.hostname) return null
    return u.href
  } catch {
    return null
  }
}

export function browserReducer(s: BrowserState, a: BrowserAction): BrowserState {
  switch (a.type) {
    case 'navigate': {
      if (a.url === currentUrl(s)) return s
      const history = [...s.history.slice(0, s.index + 1), a.url].slice(-MAX_HISTORY)
      return { ...s, history, index: history.length - 1 }
    }
    case 'back':
      return s.index > 0 ? { ...s, index: s.index - 1 } : s
    case 'forward':
      return s.index < s.history.length - 1 ? { ...s, index: s.index + 1 } : s
    case 'setMini':
      return { ...s, mini: a.mini }
    case 'replace':
      return a.state
  }
}

export function parseBrowserState(raw: string | null): BrowserState | null {
  if (!raw) return null
  let o: unknown
  try { o = JSON.parse(raw) } catch { return null }
  if (!o || typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  const history = Array.isArray(r.history)
    ? r.history.filter((u): u is string => typeof u === 'string').map(u => normalizeUrl(u)).filter((u): u is string => !!u).slice(-MAX_HISTORY)
    : []
  const safe = history.length ? history : [DEFAULT_URL]
  const index = typeof r.index === 'number' && Number.isInteger(r.index) ? Math.min(Math.max(r.index, 0), safe.length - 1) : safe.length - 1
  return { history: safe, index, mini: typeof r.mini === 'boolean' ? r.mini : false }
}
