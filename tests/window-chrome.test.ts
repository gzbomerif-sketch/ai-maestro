import { describe, it, expect } from 'vitest'
import { snapZone, resizeRect, isUsableArea, SNAP_EDGE, RESIZE_ZONES } from '@/lib/window-chrome'
import { WINDOW_DEFAULTS } from '@/lib/window-manager'

const AREA = { w: 1000, h: 600 }
const START = { x: 200, y: 100, w: 400, h: 300 }

describe('snapZone', () => {
  it('snaps left within the edge band, right within the opposite band', () => {
    expect(snapZone(0, AREA)).toBe('left')
    expect(snapZone(SNAP_EDGE - 1, AREA)).toBe('left')
    expect(snapZone(AREA.w - 1, AREA)).toBe('right')
    expect(snapZone(AREA.w - SNAP_EDGE + 1, AREA)).toBe('right')
  })
  it('returns null in the middle and exactly at the band boundary', () => {
    expect(snapZone(SNAP_EDGE, AREA)).toBeNull()
    expect(snapZone(AREA.w - SNAP_EDGE, AREA)).toBeNull()
    expect(snapZone(500, AREA)).toBeNull()
  })
  it('treats pointers outside the area as the nearest edge', () => {
    expect(snapZone(-40, AREA)).toBe('left')
    expect(snapZone(AREA.w + 40, AREA)).toBe('right')
  })
  it('never snaps with a non-finite pointer or unusable area', () => {
    expect(snapZone(NaN, AREA)).toBeNull()
    expect(snapZone(0, { w: 0, h: 600 })).toBeNull()
    expect(snapZone(0, { w: NaN, h: 600 })).toBeNull()
  })
})

describe('isUsableArea', () => {
  it('accepts only finite positive sizes', () => {
    expect(isUsableArea(AREA)).toBe(true)
    expect(isUsableArea({ w: 0, h: 10 })).toBe(false)
    expect(isUsableArea({ w: 10, h: 0 })).toBe(false)
    expect(isUsableArea({ w: Infinity, h: 10 })).toBe(false)
    expect(isUsableArea({ w: 10, h: NaN })).toBe(false)
  })
})

describe('resizeRect', () => {
  it('defines all 8 zones', () => {
    expect([...RESIZE_ZONES].sort()).toEqual(['e', 'n', 'ne', 'nw', 's', 'se', 'sw', 'w'])
  })
  it('east/south grow the size and keep the origin', () => {
    expect(resizeRect('e', START, 50, 999, AREA)).toEqual({ x: 200, y: 100, w: 450, h: 300 })
    expect(resizeRect('s', START, 999, 40, AREA)).toEqual({ x: 200, y: 100, w: 400, h: 340 })
    expect(resizeRect('se', START, 10, 20, AREA)).toEqual({ x: 200, y: 100, w: 410, h: 320 })
  })
  it('west/north move the origin and keep the opposite edge fixed', () => {
    expect(resizeRect('w', START, -50, 0, AREA)).toEqual({ x: 150, y: 100, w: 450, h: 300 })
    expect(resizeRect('n', START, 0, -30, AREA)).toEqual({ x: 200, y: 70, w: 400, h: 330 })
    expect(resizeRect('nw', START, 20, 10, AREA)).toEqual({ x: 220, y: 110, w: 380, h: 290 })
    expect(resizeRect('ne', START, 20, -10, AREA)).toEqual({ x: 200, y: 90, w: 420, h: 310 })
    expect(resizeRect('sw', START, -20, 10, AREA)).toEqual({ x: 180, y: 100, w: 420, h: 310 })
  })
  it('stops at the minimum size without sliding the fixed edge', () => {
    const r = resizeRect('w', START, 900, 0, AREA)
    expect(r.w).toBe(WINDOW_DEFAULTS.minW)
    expect(r.x + r.w).toBe(START.x + START.w)
    const n = resizeRect('n', START, 0, 900, AREA)
    expect(n.h).toBe(WINDOW_DEFAULTS.minH)
    expect(n.y + n.h).toBe(START.y + START.h)
    expect(resizeRect('e', START, -900, 0, AREA).w).toBe(WINDOW_DEFAULTS.minW)
  })
  it('stops at the area bounds', () => {
    const w = resizeRect('w', START, -900, 0, AREA)
    expect(w.x).toBe(0)
    expect(w.x + w.w).toBe(START.x + START.w)
    const e = resizeRect('e', START, 9999, 0, AREA)
    expect(e.x + e.w).toBe(AREA.w)
    const n = resizeRect('n', START, 0, -9999, AREA)
    expect(n.y).toBe(0)
    expect(n.y + n.h).toBe(START.y + START.h)
    const s = resizeRect('s', START, 0, 9999, AREA)
    expect(s.y + s.h).toBe(AREA.h)
  })
  it('lets a tiny area win over the minimum size', () => {
    const r = resizeRect('e', { x: 0, y: 0, w: 100, h: 100 }, 50, 0, { w: 200, h: 100 })
    expect(r.w).toBeLessThanOrEqual(200)
    expect(Number.isFinite(r.w)).toBe(true)
  })
  it('rounds to whole pixels', () => {
    expect(resizeRect('e', START, 10.6, 0, AREA).w).toBe(411)
  })
})
