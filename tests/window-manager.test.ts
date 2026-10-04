import { describe, it, expect } from 'vitest'
import { windowReducer, windowId, parseWindows, visibleWindows, stackRanks, EMPTY_WINDOWS, WINDOW_DEFAULTS, WINDOWS_STORAGE_KEY, type WindowState } from '@/lib/window-manager'

const AREA = { w: 1600, h: 900 }
const open = (s = EMPTY_WINDOWS, tool: any = 'terminal', agentId?: string) =>
  windowReducer(s, { type: 'open', tool, agentId, area: AREA })

describe('window-manager', () => {
  it('opens a window with default size, cascaded position, top z', () => {
    const s = open()
    expect(s.windows).toHaveLength(1)
    const w = s.windows[0]
    expect(w).toMatchObject({ tool: 'terminal', x: 48, y: 48, w: WINDOW_DEFAULTS.w, h: WINDOW_DEFAULTS.h, minimized: false })
    expect(w.z).toBe(1)
  })
  it('open on an existing id focuses and restores instead of duplicating', () => {
    let s = open(open(), 'inbox')               // terminal z1, inbox z2
    s = windowReducer(s, { type: 'minimize', id: windowId('terminal') })
    s = open(s, 'terminal')                     // re-open terminal
    expect(s.windows).toHaveLength(2)
    const t = s.windows.find(w => w.id === windowId('terminal'))!
    expect(t.minimized).toBe(false)
    expect(t.z).toBeGreaterThan(s.windows.find(w => w.id === windowId('inbox'))!.z)
  })
  it('scopes ids by agent', () => {
    expect(windowId('terminal', 'a1')).toBe('a1:terminal')
    expect(windowId('browser')).toBe('_:browser')
  })
  it('visibleWindows returns globals plus the active agent’s windows only', () => {
    let s = open(EMPTY_WINDOWS, 'browser')            // global
    s = open(s, 'terminal', 'a1')
    s = open(s, 'terminal', 'a2')
    expect(visibleWindows(s, 'a1').map(w => w.id).sort()).toEqual(['_:browser', 'a1:terminal'])
    expect(visibleWindows(s, null).map(w => w.id)).toEqual(['_:browser'])
  })
  it('move clamps inside the area', () => {
    let s = open()
    s = windowReducer(s, { type: 'move', id: '_:terminal', x: -500, y: 5000, area: AREA })
    const w = s.windows[0]
    expect(w.x).toBe(0)
    expect(w.y + w.h).toBeLessThanOrEqual(AREA.h)
  })
  it('resize enforces minimum size', () => {
    let s = open()
    s = windowReducer(s, { type: 'resize', id: '_:terminal', x: 48, y: 48, w: 10, h: 10, area: AREA })
    expect(s.windows[0].w).toBe(WINDOW_DEFAULTS.minW)
    expect(s.windows[0].h).toBe(WINDOW_DEFAULTS.minH)
  })
  it('clampAll pulls stranded windows back inside a shrunken area', () => {
    let s = open()
    s = windowReducer(s, { type: 'move', id: '_:terminal', x: 800, y: 400, area: AREA })
    s = windowReducer(s, { type: 'clampAll', area: { w: 800, h: 500 } })
    const w = s.windows[0]
    expect(w.x + w.w).toBeLessThanOrEqual(800)
    expect(w.y + w.h).toBeLessThanOrEqual(500)
  })
  it('snap left fills the left half', () => {
    let s = open()
    s = windowReducer(s, { type: 'snap', id: '_:terminal', half: 'left', area: AREA })
    expect(s.windows[0]).toMatchObject({ x: 0, y: 0, w: 800, h: 900 })
  })
  it('toggleMaximize round-trips the previous rect', () => {
    let s = open()
    const before = { ...s.windows[0] }
    s = windowReducer(s, { type: 'toggleMaximize', id: '_:terminal' })
    expect(s.windows[0].maximized).toBe(true)
    s = windowReducer(s, { type: 'toggleMaximize', id: '_:terminal' })
    expect(s.windows[0]).toMatchObject({ x: before.x, y: before.y, w: before.w, h: before.h, maximized: false })
  })
  it('closeAgent removes that agent’s windows and keeps globals', () => {
    let s = open(open(EMPTY_WINDOWS, 'browser'), 'terminal', 'a1')
    s = windowReducer(s, { type: 'closeAgent', agentId: 'a1' })
    expect(s.windows.map(w => w.id)).toEqual(['_:browser'])
  })
  it('parseWindows rejects garbage and filters bad entries', () => {
    expect(parseWindows(null)).toBeNull()
    expect(parseWindows('{nope')).toBeNull()
    expect(parseWindows(JSON.stringify({ windows: 'x' }))).toBeNull()
    const ok = parseWindows(JSON.stringify({
      nextZ: 5,
      windows: [
        { id: '_:terminal', tool: 'terminal', x: 1, y: 2, w: 500, h: 400, z: 1, minimized: false, maximized: false },
        { id: 'bad', tool: 'not-a-tool', x: 0, y: 0, w: 0, h: 0, z: 0, minimized: false, maximized: false },
      ],
    }))
    expect(ok?.windows).toHaveLength(1)
    expect(ok?.windows[0].tool).toBe('terminal')
  })

  // ---- additional coverage beyond the brief ----
  it('exposes the storage key and an empty initial state', () => {
    expect(WINDOWS_STORAGE_KEY).toBe('aimaestro-windows')
    expect(EMPTY_WINDOWS).toEqual({ windows: [], nextZ: 1 })
  })
  it('open with agentId undefined creates a global window; with agentId scopes it', () => {
    const g = open(EMPTY_WINDOWS, 'browser').windows[0]
    expect(g.agentId).toBeUndefined()
    expect(g.id).toBe('_:browser')
    const a = open(EMPTY_WINDOWS, 'terminal', 'a1').windows[0]
    expect(a.agentId).toBe('a1')
    expect(a.id).toBe('a1:terminal')
  })
  it('cascades each new window by 32px and clamps so it still fits', () => {
    let s = open()
    s = open(s, 'inbox')
    expect(s.windows[1]).toMatchObject({ x: 80, y: 80 })
    const small = { w: 800, h: 500 }
    let t = windowReducer(EMPTY_WINDOWS, { type: 'open', tool: 'terminal', area: small })
    t = windowReducer(t, { type: 'open', tool: 'inbox', area: small })
    t = windowReducer(t, { type: 'open', tool: 'files', area: small })
    for (const w of t.windows) {
      expect(w.x + w.w).toBeLessThanOrEqual(small.w)
      expect(w.y + w.h).toBeLessThanOrEqual(small.h)
      expect(w.x).toBeGreaterThanOrEqual(0)
      expect(w.y).toBeGreaterThanOrEqual(0)
    }
  })
  it('open shrinks the default size to fit a small area', () => {
    const s = windowReducer(EMPTY_WINDOWS, { type: 'open', tool: 'terminal', area: { w: 500, h: 300 } })
    const w = s.windows[0]
    expect(w.w).toBeLessThanOrEqual(500)
    expect(w.h).toBeLessThanOrEqual(300)
    expect(w.x + w.w).toBeLessThanOrEqual(500)
    expect(w.y + w.h).toBeLessThanOrEqual(300)
  })
  it('accepts term:<id> tools', () => {
    const s = open(EMPTY_WINDOWS, 'term:abc', 'a1')
    expect(s.windows[0].id).toBe('a1:term:abc')
    expect(s.windows[0].tool).toBe('term:abc')
  })
  it('focus raises the window to the top; unknown id is a no-op returning the same state', () => {
    let s = open(open(), 'inbox')
    const t0 = s.windows.find(w => w.id === '_:terminal')!
    s = windowReducer(s, { type: 'focus', id: '_:terminal' })
    const t1 = s.windows.find(w => w.id === '_:terminal')!
    expect(t1.z).toBeGreaterThan(t0.z)
    expect(s.nextZ).toBe(t1.z + 1)
    const same = windowReducer(s, { type: 'focus', id: 'nope:terminal' })
    expect(same).toBe(s)
  })
  it('close removes only that window; the next open lands on top of a compacted stack', () => {
    let s = open(open(), 'inbox')
    const nz = s.nextZ
    s = windowReducer(s, { type: 'close', id: '_:terminal' })
    expect(s.windows.map(w => w.id)).toEqual(['_:inbox'])
    expect(s.nextZ).toBe(nz)
    s = open(s, 'files')
    expect(s.windows.find(w => w.id === '_:inbox')!.z).toBe(1)
    expect(s.windows.find(w => w.id === '_:files')!.z).toBe(2)
    expect(s.nextZ).toBe(3)
  })
  it('minimize then restore toggles the flag and restore focuses', () => {
    let s = open(open(), 'inbox')
    s = windowReducer(s, { type: 'minimize', id: '_:terminal' })
    expect(s.windows.find(w => w.id === '_:terminal')!.minimized).toBe(true)
    s = windowReducer(s, { type: 'restore', id: '_:terminal' })
    const t = s.windows.find(w => w.id === '_:terminal')!
    expect(t.minimized).toBe(false)
    expect(t.z).toBeGreaterThan(s.windows.find(w => w.id === '_:inbox')!.z)
  })
  it('actions on unknown ids return the same state object', () => {
    const s = open()
    for (const a of [
      { type: 'close', id: 'x' }, { type: 'minimize', id: 'x' }, { type: 'restore', id: 'x' },
      { type: 'toggleMaximize', id: 'x' },
      { type: 'move', id: 'x', x: 1, y: 1, area: AREA },
      { type: 'resize', id: 'x', x: 1, y: 1, w: 500, h: 400, area: AREA },
      { type: 'snap', id: 'x', half: 'left', area: AREA },
    ] as const) {
      expect(windowReducer(s, a)).toBe(s)
    }
  })
  it('resize clamps the rect fully inside the area', () => {
    let s = open()
    s = windowReducer(s, { type: 'resize', id: '_:terminal', x: 1500, y: 800, w: 2000, h: 2000, area: AREA })
    const w = s.windows[0]
    expect(w.x).toBeGreaterThanOrEqual(0)
    expect(w.y).toBeGreaterThanOrEqual(0)
    expect(w.x + w.w).toBeLessThanOrEqual(AREA.w)
    expect(w.y + w.h).toBeLessThanOrEqual(AREA.h)
  })
  it('snap right fills the right half', () => {
    let s = open()
    s = windowReducer(s, { type: 'snap', id: '_:terminal', half: 'right', area: AREA })
    expect(s.windows[0]).toMatchObject({ x: 800, y: 0, w: 800, h: 900 })
  })
  it('toggleMaximize only flips the flag and leaves the rect untouched; move/resize are ignored while maximized', () => {
    let s = open()
    const rect = { x: s.windows[0].x, y: s.windows[0].y, w: s.windows[0].w, h: s.windows[0].h }
    s = windowReducer(s, { type: 'toggleMaximize', id: '_:terminal' })
    expect(s.windows[0]).toMatchObject({ ...rect, maximized: true })
    const moved = windowReducer(s, { type: 'move', id: '_:terminal', x: 300, y: 300, area: AREA })
    expect(moved).toBe(s)
    const resized = windowReducer(s, { type: 'resize', id: '_:terminal', x: 0, y: 0, w: 900, h: 600, area: AREA })
    expect(resized).toBe(s)
  })
  it('snap while maximized un-maximizes', () => {
    let s = open()
    s = windowReducer(s, { type: 'toggleMaximize', id: '_:terminal' })
    s = windowReducer(s, { type: 'snap', id: '_:terminal', half: 'left', area: AREA })
    expect(s.windows[0]).toMatchObject({ x: 0, y: 0, w: 800, h: 900, maximized: false })
  })
  it('clampAll shrinks oversized windows, floors at min size, and lets a tiny area win', () => {
    let s = open()
    s = windowReducer(s, { type: 'clampAll', area: { w: 500, h: 300 } })
    expect(s.windows[0]).toMatchObject({ w: 500, h: 300, x: 0, y: 0 })
    s = open()
    s = windowReducer(s, { type: 'clampAll', area: { w: 200, h: 100 } })
    expect(s.windows[0]).toMatchObject({ w: 200, h: 100, x: 0, y: 0 })
  })
  it('clampAll still clamps the stored rect of a maximized window and keeps the flag', () => {
    let s = open()
    s = windowReducer(s, { type: 'toggleMaximize', id: '_:terminal' })
    s = windowReducer(s, { type: 'clampAll', area: { w: 500, h: 300 } })
    expect(s.windows[0]).toMatchObject({ x: 0, y: 0, w: 500, h: 300, maximized: true })
  })
  it('clampAll returns the same state when everything already fits', () => {
    const s = open()
    expect(windowReducer(s, { type: 'clampAll', area: AREA })).toBe(s)
  })
  it('replace swaps the whole state', () => {
    const next = open(EMPTY_WINDOWS, 'inbox')
    expect(windowReducer(open(), { type: 'replace', state: next })).toBe(next)
  })
  it('visibleWindows keeps minimized windows', () => {
    let s = open()
    s = windowReducer(s, { type: 'minimize', id: '_:terminal' })
    expect(visibleWindows(s, null)).toHaveLength(1)
  })
  it('parseWindows drops a stored colony window now that the colony is gone', () => {
    const back = parseWindows(JSON.stringify({
      windows: [
        { id: '_:colony', tool: 'colony', x: 0, y: 0, w: 500, h: 400, z: 2, minimized: false, maximized: false },
        { id: 'a1:terminal', tool: 'terminal', agentId: 'a1', x: 0, y: 0, w: 500, h: 400, z: 1, minimized: false, maximized: false },
      ],
    }))!
    expect(back.windows.map(w => w.id)).toEqual(['a1:terminal'])
  })
  it('parseWindows round-trips a reducer state including prev, and recomputes nextZ when invalid', () => {
    let s = open(open(), 'inbox', 'a1')
    s = windowReducer(s, { type: 'toggleMaximize', id: '_:terminal' })
    const back = parseWindows(JSON.stringify(s))!
    expect(back.windows).toEqual(s.windows)
    expect(back.nextZ).toBe(s.nextZ)
    const noZ = parseWindows(JSON.stringify({ windows: s.windows }))!
    expect(noZ.nextZ).toBe(Math.max(...s.windows.map(w => w.z)) + 1)
    const badZ = parseWindows(JSON.stringify({ windows: s.windows, nextZ: 'x' }))!
    expect(badZ.nextZ).toBe(Math.max(...s.windows.map(w => w.z)) + 1)
  })
  it('parseWindows accepts term:<id> and rejects malformed term/duplicate/id-mismatch/non-finite entries', () => {
    const base = { x: 0, y: 0, w: 500, h: 400, z: 1, minimized: false, maximized: false }
    const ok = parseWindows(JSON.stringify({ windows: [
      { ...base, id: 'a1:term:abc', tool: 'term:abc', agentId: 'a1' },
      { ...base, id: '_:term:bad id', tool: 'term:bad id' },
      { ...base, id: '_:tasks', tool: 'tasks' },
      { ...base, id: '_:tasks', tool: 'tasks' },
      { ...base, id: 'wrong', tool: 'skills' },
      { ...base, id: '_:skills', tool: 'skills', w: null },
      { ...base, id: '_:docs', tool: 'docs', minimized: 'yes' },
    ] }))
    expect(ok?.windows.map(w => w.id)).toEqual(['a1:term:abc', '_:tasks'])
  })
  it('parseWindows accepts team tools scoped by a team id', () => {
    const base = { x: 0, y: 0, w: 500, h: 400, z: 1, minimized: false, maximized: false }
    const ok = parseWindows(JSON.stringify({ windows: [
      { ...base, id: 'team:t1:kanban', tool: 'kanban', agentId: 'team:t1' },
      { ...base, id: 'team:t1:term:a1', tool: 'term:a1', agentId: 'team:t1' },
    ] }))
    expect(ok?.windows.map(w => w.id)).toEqual(['team:t1:kanban', 'team:t1:term:a1'])
  })

  // ---- z compaction (menus compare against 10 + z, so z must stay small) ----
  const zOf = (s: WindowState, id: string) => s.windows.find(w => w.id === id)!.z
  it('z stays bounded by the window count after 100 focus toggles', () => {
    let s = open(open(open(EMPTY_WINDOWS, 'browser'), 'terminal', 'a1'), 'inbox', 'a1')
    for (let i = 0; i < 100; i++) {
      s = windowReducer(s, { type: 'focus', id: i % 2 ? 'a1:terminal' : '_:browser' })
      for (const w of s.windows) expect(w.z).toBeLessThanOrEqual(s.windows.length)
      expect(s.nextZ).toBe(s.windows.length + 1)
    }
    expect(new Set(s.windows.map(w => w.z)).size).toBe(s.windows.length)
  })
  it('focus compacts to 1..n, keeps the relative order of the others and puts the focused one on top', () => {
    const base = { x: 0, y: 0, w: 500, h: 400, minimized: false, maximized: false }
    let s: WindowState = { nextZ: 90, windows: [
      { ...base, id: '_:terminal', tool: 'terminal', z: 40 },
      { ...base, id: '_:inbox', tool: 'inbox', z: 7 },
      { ...base, id: '_:files', tool: 'files', z: 89 },
      { ...base, id: '_:docs', tool: 'docs', z: 12 },
    ] }
    s = windowReducer(s, { type: 'focus', id: '_:docs' })
    expect([zOf(s, '_:inbox'), zOf(s, '_:terminal'), zOf(s, '_:files'), zOf(s, '_:docs')]).toEqual([1, 2, 3, 4])
    expect(s.nextZ).toBe(5)
  })
  it('re-opening (open-focus) and restore compact too', () => {
    let s = open(open(open(), 'inbox'), 'files')
    for (let i = 0; i < 20; i++) s = open(s, i % 2 ? 'terminal' : 'inbox')
    expect(Math.max(...s.windows.map(w => w.z))).toBe(3)
    s = windowReducer(s, { type: 'minimize', id: '_:files' })
    s = windowReducer(s, { type: 'restore', id: '_:files' })
    expect(zOf(s, '_:files')).toBe(3)
    expect(s.nextZ).toBe(4)
  })
  it('open/close churn never grows z past the window count', () => {
    let s = open()
    for (let i = 0; i < 50; i++) {
      s = open(s, 'inbox')
      s = windowReducer(s, { type: 'close', id: '_:inbox' })
    }
    s = open(s, 'files')
    expect(s.windows.map(w => w.z)).toEqual([1, 2])
  })
  it('focus on the window already on top is a no-op returning the same state', () => {
    const s = open(open(), 'inbox')
    expect(windowReducer(s, { type: 'focus', id: '_:inbox' })).toBe(s)
  })
  it('parseWindows renormalizes stored z to 1..n in stacking order', () => {
    const base = { x: 0, y: 0, w: 500, h: 400, minimized: false, maximized: false }
    const s = parseWindows(JSON.stringify({ nextZ: 500, windows: [
      { ...base, id: '_:terminal', tool: 'terminal', z: 300 },
      { ...base, id: '_:inbox', tool: 'inbox', z: 41 },
      { ...base, id: '_:files', tool: 'files', z: 499 },
    ] }))!
    expect(s.windows.map(w => [w.id, w.z])).toEqual([['_:terminal', 2], ['_:inbox', 1], ['_:files', 3]])
    expect(s.nextZ).toBe(4)
  })
  it('stackRanks renumbers a visible subset 1..k in z order, reusing unchanged objects', () => {
    let s = open(EMPTY_WINDOWS, 'browser')
    for (const a of ['a1', 'a2', 'a3']) s = open(open(s, 'terminal', a), 'inbox', a)
    s = windowReducer(s, { type: 'focus', id: '_:browser' })
    const ranked = stackRanks(visibleWindows(s, 'a3'))
    expect(Object.fromEntries(ranked.map(w => [w.id, w.z]))).toEqual({ 'a3:terminal': 1, 'a3:inbox': 2, '_:browser': 3 })
    const already = stackRanks(ranked)
    already.forEach((w, i) => expect(w).toBe(ranked[i]))
  })

  // ---- cascade is per workspace ----
  it('cascade counts only the windows of the workspace being opened into, and wraps every 8', () => {
    let s = EMPTY_WINDOWS
    for (const t of ['terminal', 'inbox', 'files']) s = open(s, t, 'a1')
    s = open(s, 'terminal', 'a2')
    expect(s.windows.find(w => w.id === 'a2:terminal')).toMatchObject({ x: 48, y: 48 })
    s = open(s, 'browser')
    expect(s.windows.find(w => w.id === '_:browser')).toMatchObject({ x: 48, y: 48 })
    s = open(s, 'inbox', 'a2')                         // a2 sees the global window + its terminal
    expect(s.windows.find(w => w.id === 'a2:inbox')).toMatchObject({ x: 48 + 64, y: 48 + 64 })
    let t = EMPTY_WINDOWS
    const tools = ['terminal', 'inbox', 'files', 'memory', 'graph', 'docs', 'canvas', 'search', 'playback'] as const
    for (const tool of tools) t = open(t, tool, 'a1')
    expect(t.windows.find(w => w.tool === 'playback')).toMatchObject({ x: 48, y: 48 })
  })
})
