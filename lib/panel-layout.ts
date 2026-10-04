/**
 * Shell layout (sidebar width/collapse) plus the tool catalog and key helpers the floating-window
 * workspace builds on. Pure (no React, no storage) so it can be unit-tested.
 * Window geometry and z-order live in lib/window-manager.ts.
 */
export type PanelType = 'terminal' | 'inbox' | 'files' | 'memory' | 'graph' | 'docs' | 'canvas' | 'search' | 'playback' | 'export' | 'browser'

export const PANEL_TYPES: { id: PanelType; label: string; key: string }[] = [
  { id: 'terminal', label: 'Terminal', key: 'T' },
  { id: 'inbox', label: 'Inbox', key: 'I' },
  { id: 'files', label: 'Files', key: 'F' },
  { id: 'memory', label: 'Memory', key: 'M' },
  { id: 'graph', label: 'Code graph', key: 'G' },
  { id: 'docs', label: 'Docs', key: 'D' },
  { id: 'canvas', label: 'Canvas', key: 'C' },
  { id: 'search', label: 'Search', key: 'S' },
  { id: 'playback', label: 'Playback', key: 'P' },
  { id: 'export', label: 'Export', key: 'X' },
  { id: 'browser', label: 'Browser', key: 'B' },
]

export interface LayoutState {
  sidebarW: number
  sidebarCollapsed: boolean
}

export const LIMITS = {
  sidebar: { min: 220, max: 420, def: 268 },
} as const

export const DEFAULT_LAYOUT: LayoutState = {
  sidebarW: LIMITS.sidebar.def,
  sidebarCollapsed: false,
}

export type LayoutAction =
  | { type: 'resizeSidebar'; width: number }
  | { type: 'toggleSidebar' }
  | { type: 'replace'; state: LayoutState }

export function clampSize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(Math.max(max, min), value))
}

export function layoutReducer(s: LayoutState, a: LayoutAction): LayoutState {
  switch (a.type) {
    case 'resizeSidebar':
      return { ...s, sidebarW: clampSize(Math.round(a.width), LIMITS.sidebar.min, LIMITS.sidebar.max) }
    case 'toggleSidebar':
      return { ...s, sidebarCollapsed: !s.sidebarCollapsed }
    case 'replace':
      return a.state
  }
}

const num = (v: unknown, min: number, max: number, def: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : def

/**
 * Validate stored layout field by field; null when there is nothing usable.
 * Older versions also stored a dock `panel` object; it is ignored (windows start empty).
 */
export function parseLayout(raw: string | null): LayoutState | null {
  if (!raw) return null
  let o: unknown
  try { o = JSON.parse(raw) } catch { return null }
  if (!o || typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  return {
    sidebarW: num(r.sidebarW, LIMITS.sidebar.min, LIMITS.sidebar.max, LIMITS.sidebar.def),
    sidebarCollapsed: typeof r.sidebarCollapsed === 'boolean' ? r.sidebarCollapsed : false,
  }
}

export function panelForKey(k: string): PanelType | null {
  return PANEL_TYPES.find(p => p.key === k.toUpperCase())?.id ?? null
}

/** Global chords. togglePanel = minimize/restore all windows (⌘J); toggleMaximize = maximize the top window (⇧⌘M). */
export function layoutShortcut(
  e: { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
  isMac: boolean,
): 'togglePanel' | 'toggleSidebar' | 'toggleMaximize' | null {
  if (!(isMac ? e.metaKey : e.ctrlKey)) return null
  const k = e.key.toLowerCase()
  if (k === 'j' && !e.shiftKey) return 'togglePanel'
  if (k === 'b' && !e.shiftKey) return 'toggleSidebar'
  if (k === 'm' && e.shiftKey) return 'toggleMaximize'
  return null
}

export function isEditableTarget(el: { tagName?: string; isContentEditable?: boolean; closest?: (s: string) => unknown } | null): boolean {
  if (!el) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  return !!el.closest?.('.xterm')
}

export function keyboardStep(key: string, shift: boolean): number {
  const step = shift ? 64 : 16
  if (key === 'ArrowRight' || key === 'ArrowDown') return step
  if (key === 'ArrowLeft' || key === 'ArrowUp') return -step
  return 0
}

/** Esc restores a maximized window only when nothing else used it (menu, palette, dialog) and focus isn't in a field or the terminal. */
export function shouldRestoreOnEscape(e: { key: string; defaultPrevented: boolean; target: Parameters<typeof isEditableTarget>[0] }): boolean {
  return e.key === 'Escape' && !e.defaultPrevented && !isEditableTarget(e.target)
}
