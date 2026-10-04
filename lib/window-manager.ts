/**
 * Floating workspace window manager: which tool windows are open, where, how big, and in what z-order.
 * Pure (no React, no storage) so it can be unit-tested. Mirrors the idioms of lib/panel-layout.ts.
 */
import { PANEL_TYPES, clampSize, type PanelType } from '@/lib/panel-layout'

export type WindowTool = PanelType | 'tasks' | 'skills' | `term:${string}`

export interface ManagedWindow {
  /** windowId(tool, agentId) */
  id: string
  tool: WindowTool
  /** undefined = global window (colony) */
  agentId?: string
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
  /** Presentation flag: the rect (x/y/w/h) is kept untouched while maximized so toggling back restores it exactly. */
  maximized: boolean
}

export interface WindowState {
  windows: ManagedWindow[]
  nextZ: number
}

type Area = { w: number; h: number }

export type WindowAction =
  | { type: 'open'; tool: WindowTool; agentId?: string; area: Area }
  | { type: 'close'; id: string }
  | { type: 'focus'; id: string }
  | { type: 'move'; id: string; x: number; y: number; area: Area }
  | { type: 'resize'; id: string; x: number; y: number; w: number; h: number; area: Area }
  | { type: 'minimize'; id: string }
  | { type: 'restore'; id: string }
  | { type: 'toggleMaximize'; id: string }
  | { type: 'snap'; id: string; half: 'left' | 'right'; area: Area }
  | { type: 'clampAll'; area: Area }
  | { type: 'closeAgent'; agentId: string }
  | { type: 'replace'; state: WindowState }

export const WINDOW_DEFAULTS = { w: 720, h: 480, minW: 360, minH: 240 } as const
export const EMPTY_WINDOWS: WindowState = { windows: [], nextZ: 1 }
export const WINDOWS_STORAGE_KEY = 'aimaestro-windows'

const CASCADE_ORIGIN = 48
const CASCADE_STEP = 32

export function windowId(tool: WindowTool, agentId?: string): string {
  return `${agentId ?? '_'}:${tool}`
}

/** Size that respects the minimum, but never exceeds the area (a tiny area wins over the minimum). */
function fitSize(value: number, min: number, areaDim: number): number {
  return Math.min(clampSize(Math.round(value), min, areaDim), Math.max(0, areaDim))
}

/** Position that keeps a window of `size` fully inside the area. */
function fitPos(value: number, size: number, areaDim: number): number {
  return clampSize(Math.round(value), 0, Math.max(0, areaDim - size))
}

function fitRect(r: { x: number; y: number; w: number; h: number }, area: Area) {
  const w = fitSize(r.w, WINDOW_DEFAULTS.minW, area.w)
  const h = fitSize(r.h, WINDOW_DEFAULTS.minH, area.h)
  return { x: fitPos(r.x, w, area.w), y: fitPos(r.y, h, area.h), w, h }
}

function patch(s: WindowState, id: string, fn: (w: ManagedWindow) => ManagedWindow): WindowState {
  const cur = s.windows.find(w => w.id === id)
  if (!cur) return s
  const next = fn(cur)
  return next === cur ? s : { ...s, windows: s.windows.map(w => (w.id === id ? next : w)) }
}

/** Bring a window to the top (and optionally un-minimize it). No-op when nothing would change. */
function raise(s: WindowState, id: string, unminimize: boolean): WindowState {
  const w = s.windows.find(x => x.id === id)
  if (!w) return s
  const onTop = w.z === s.nextZ - 1
  if (onTop && (!unminimize || !w.minimized)) return s
  return {
    windows: s.windows.map(x => (x.id === id ? { ...x, z: onTop ? x.z : s.nextZ, minimized: unminimize ? false : x.minimized } : x)),
    nextZ: onTop ? s.nextZ : s.nextZ + 1,
  }
}

export function windowReducer(s: WindowState, a: WindowAction): WindowState {
  switch (a.type) {
    case 'open': {
      const id = windowId(a.tool, a.agentId)
      if (s.windows.some(w => w.id === id)) return raise(s, id, true)
      const rect = fitRect({
        x: CASCADE_ORIGIN + CASCADE_STEP * s.windows.length,
        y: CASCADE_ORIGIN + CASCADE_STEP * s.windows.length,
        w: WINDOW_DEFAULTS.w,
        h: WINDOW_DEFAULTS.h,
      }, a.area)
      const win: ManagedWindow = { id, tool: a.tool, ...(a.agentId !== undefined ? { agentId: a.agentId } : {}), ...rect, z: s.nextZ, minimized: false, maximized: false }
      return { windows: [...s.windows, win], nextZ: s.nextZ + 1 }
    }
    case 'close': {
      if (!s.windows.some(w => w.id === a.id)) return s
      return { ...s, windows: s.windows.filter(w => w.id !== a.id) }
    }
    case 'focus':
      return raise(s, a.id, false)
    case 'move':
      return patch(s, a.id, w => (w.maximized ? w : { ...w, x: fitPos(a.x, w.w, a.area.w), y: fitPos(a.y, w.h, a.area.h) }))
    case 'resize':
      return patch(s, a.id, w => (w.maximized ? w : { ...w, ...fitRect(a, a.area) }))
    case 'minimize':
      return patch(s, a.id, w => (w.minimized ? w : { ...w, minimized: true }))
    case 'restore':
      return raise(s, a.id, true)
    case 'toggleMaximize':
      return patch(s, a.id, w => ({ ...w, maximized: !w.maximized }))
    case 'snap':
      return patch(s, a.id, w => {
        const half = Math.floor(a.area.w / 2)
        return a.half === 'left'
          ? { ...w, x: 0, y: 0, w: half, h: a.area.h, maximized: false }
          : { ...w, x: half, y: 0, w: a.area.w - half, h: a.area.h, maximized: false }
      })
    case 'clampAll': {
      let changed = false
      const windows = s.windows.map(w => {
        const r = fitRect(w, a.area)
        if (r.x === w.x && r.y === w.y && r.w === w.w && r.h === w.h) return w
        changed = true
        return { ...w, ...r }
      })
      return changed ? { ...s, windows } : s
    }
    case 'closeAgent': {
      const windows = s.windows.filter(w => w.agentId !== a.agentId)
      return windows.length === s.windows.length ? s : { ...s, windows }
    }
    case 'replace':
      return a.state
  }
}

const TOOL_IDS = new Set<string>([...PANEL_TYPES.map(p => p.id), 'tasks', 'skills'])
const TERM_TOOL = /^term:[a-zA-Z0-9_-]+$/
const isTool = (t: unknown): t is WindowTool => typeof t === 'string' && (TOOL_IDS.has(t) || TERM_TOOL.test(t))
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function parseWindow(v: unknown): ManagedWindow | null {
  if (!v || typeof v !== 'object') return null
  const r = v as Record<string, unknown>
  if (!isTool(r.tool)) return null
  if (r.agentId != null && (typeof r.agentId !== 'string' || r.agentId === '')) return null
  const agentId = typeof r.agentId === 'string' ? r.agentId : undefined
  if (r.id !== windowId(r.tool, agentId)) return null
  if (!isNum(r.x) || !isNum(r.y) || !isNum(r.w) || !isNum(r.h) || r.w <= 0 || r.h <= 0 || !isNum(r.z)) return null
  if (typeof r.minimized !== 'boolean' || typeof r.maximized !== 'boolean') return null
  return {
    id: r.id, tool: r.tool, ...(agentId !== undefined ? { agentId } : {}),
    x: r.x, y: r.y, w: r.w, h: r.h, z: r.z, minimized: r.minimized, maximized: r.maximized,
  }
}

/** Validate stored windows field by field; null when there is nothing usable. */
export function parseWindows(raw: string | null): WindowState | null {
  if (!raw) return null
  let o: unknown
  try { o = JSON.parse(raw) } catch { return null }
  if (!o || typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  if (!Array.isArray(r.windows)) return null
  const seen = new Set<string>()
  const windows: ManagedWindow[] = []
  for (const entry of r.windows) {
    const w = parseWindow(entry)
    if (!w || seen.has(w.id)) continue
    seen.add(w.id)
    windows.push(w)
  }
  const nextZ = Math.max(1, ...windows.map(w => w.z + 1))
  return { windows, nextZ: isNum(r.nextZ) && r.nextZ >= nextZ ? Math.floor(r.nextZ) : nextZ }
}

/** Global windows plus the given agent's windows (minimized included; the layer decides how to draw them). */
export function visibleWindows(s: WindowState, agentId: string | null): ManagedWindow[] {
  return s.windows.filter(w => w.agentId === undefined || w.agentId === agentId)
}
