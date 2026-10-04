/**
 * Pure geometry for the floating-window chrome (snap zones, edge/corner resize).
 * Kept free of React/DOM so it can be unit-tested; FloatingWindow wires it to pointer events.
 */
import { WINDOW_DEFAULTS } from '@/lib/window-manager'

export type Area = { w: number; h: number }
export type Rect = { x: number; y: number; w: number; h: number }
export type ResizeZone = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/** Pointer distance from the left/right area edge that arms a half-screen snap. */
export const SNAP_EDGE = 24

export const RESIZE_ZONES: readonly ResizeZone[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

/** The reducer propagates NaN areas, so only ever dispatch with a finite, positive size. */
export function isUsableArea(a: Area): boolean {
  return Number.isFinite(a.w) && Number.isFinite(a.h) && a.w > 0 && a.h > 0
}

/** Which half to snap to for a pointer at `pointerX` (relative to the area's left edge), or null. */
export function snapZone(pointerX: number, area: Area): 'left' | 'right' | null {
  if (!Number.isFinite(pointerX) || !isUsableArea(area)) return null
  if (pointerX < SNAP_EDGE) return 'left'
  if (pointerX > area.w - SNAP_EDGE) return 'right'
  return null
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/**
 * Rect after dragging `zone` by (dx, dy) from `start`. The edge opposite the dragged one stays put;
 * the result respects the minimum size and the area bounds (a tiny area wins over the minimum).
 */
export function resizeRect(zone: ResizeZone, start: Rect, dx: number, dy: number, area: Area): Rect {
  const minW = Math.min(WINDOW_DEFAULTS.minW, Math.max(0, area.w))
  const minH = Math.min(WINDOW_DEFAULTS.minH, Math.max(0, area.h))
  let left = start.x
  let right = start.x + start.w
  let top = start.y
  let bottom = start.y + start.h
  if (zone.includes('e')) right = clamp(Math.round(right + dx), left + minW, area.w)
  if (zone.includes('w')) left = clamp(Math.round(left + dx), 0, right - minW)
  if (zone.includes('s')) bottom = clamp(Math.round(bottom + dy), top + minH, area.h)
  if (zone.includes('n')) top = clamp(Math.round(top + dy), 0, bottom - minH)
  return { x: left, y: top, w: right - left, h: bottom - top }
}
