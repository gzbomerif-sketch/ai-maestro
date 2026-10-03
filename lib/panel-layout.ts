/**
 * Panel system layout: which tool panels are open, where, and how big.
 * Pure (no React, no storage) so it can be unit-tested. Spec: 2026-10-03-panel-system-design.md
 */
export type PanelType = 'terminal' | 'inbox' | 'files' | 'memory' | 'graph' | 'docs' | 'canvas' | 'search' | 'playback' | 'export'
export type PanelPosition = 'right' | 'bottom'

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
]
const TYPE_IDS = new Set<string>(PANEL_TYPES.map(p => p.id))

export interface PanelState {
  open: boolean
  position: PanelPosition
  rightW: number
  bottomH: number
  maximized: boolean
  tabs: PanelType[]
  active: PanelType | null
}
export interface LayoutState {
  sidebarW: number
  sidebarCollapsed: boolean
  panel: PanelState
}

export const LIMITS = {
  sidebar: { min: 220, max: 420, def: 268 },
  right: { min: 320, ratio: 0.7, def: 480 },
  bottom: { min: 200, ratio: 0.7, def: 320 },
} as const

export const DEFAULT_LAYOUT: LayoutState = {
  sidebarW: LIMITS.sidebar.def,
  sidebarCollapsed: false,
  panel: { open: true, position: 'right', rightW: LIMITS.right.def, bottomH: LIMITS.bottom.def, maximized: false, tabs: ['inbox'], active: 'inbox' },
}

export type LayoutAction =
  | { type: 'open'; panel: PanelType }
  | { type: 'close'; panel: PanelType }
  | { type: 'activate'; panel: PanelType }
  | { type: 'toggle' }
  | { type: 'setPosition'; position: PanelPosition }
  | { type: 'toggleMaximize' }
  | { type: 'restore' }
  | { type: 'resizeSidebar'; width: number }
  | { type: 'resizePanel'; size: number; container: number }
  | { type: 'toggleSidebar' }
  | { type: 'replace'; state: LayoutState }

export function clampSize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(Math.max(max, min), value))
}

export function panelLimits(position: PanelPosition, container: number): { min: number; max: number } {
  const l = position === 'right' ? LIMITS.right : LIMITS.bottom
  return { min: l.min, max: Math.max(l.min, Math.round(container * l.ratio)) }
}

export function layoutReducer(s: LayoutState, a: LayoutAction): LayoutState {
  const p = s.panel
  switch (a.type) {
    case 'open':
      return { ...s, panel: { ...p, open: true, tabs: p.tabs.includes(a.panel) ? p.tabs : [...p.tabs, a.panel], active: a.panel } }
    case 'close': {
      const i = p.tabs.indexOf(a.panel)
      if (i === -1) return s
      const tabs = p.tabs.filter(t => t !== a.panel)
      const active = p.active === a.panel ? (tabs[i] ?? tabs[i - 1] ?? null) : p.active
      return { ...s, panel: { ...p, tabs, active } }
    }
    case 'activate':
      return p.tabs.includes(a.panel) ? { ...s, panel: { ...p, active: a.panel, open: true } } : s
    case 'toggle':
      if (p.open) return { ...s, panel: { ...p, open: false, maximized: false } }
      if (p.tabs.length === 0) return { ...s, panel: { ...p, open: true, tabs: ['terminal'], active: 'terminal' } }
      return { ...s, panel: { ...p, open: true, active: p.active ?? p.tabs[0] } }
    case 'setPosition':
      return { ...s, panel: { ...p, position: a.position } }
    case 'toggleMaximize':
      return { ...s, panel: { ...p, open: true, maximized: !p.maximized } }
    case 'restore':
      return { ...s, panel: { ...p, maximized: false } }
    case 'resizeSidebar':
      return { ...s, sidebarW: clampSize(Math.round(a.width), LIMITS.sidebar.min, LIMITS.sidebar.max) }
    case 'resizePanel': {
      const { min, max } = panelLimits(p.position, a.container)
      const size = clampSize(Math.round(a.size), min, max)
      return { ...s, panel: p.position === 'right' ? { ...p, rightW: size } : { ...p, bottomH: size } }
    }
    case 'toggleSidebar':
      return { ...s, sidebarCollapsed: !s.sidebarCollapsed }
    case 'replace':
      return a.state
  }
}

const num = (v: unknown, min: number, max: number, def: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : def

/** Validate stored layout field by field; null when there is nothing usable. */
export function parseLayout(raw: string | null): LayoutState | null {
  if (!raw) return null
  let o: unknown
  try { o = JSON.parse(raw) } catch { return null }
  if (!o || typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  const rp = (r.panel && typeof r.panel === 'object' ? r.panel : {}) as Record<string, unknown>
  const d = DEFAULT_LAYOUT.panel
  const tabs = Array.isArray(rp.tabs)
    ? [...new Set(rp.tabs.filter((t): t is PanelType => typeof t === 'string' && TYPE_IDS.has(t)))]
    : d.tabs
  const active = typeof rp.active === 'string' && tabs.includes(rp.active as PanelType) ? (rp.active as PanelType) : (tabs[0] ?? null)
  return {
    sidebarW: num(r.sidebarW, LIMITS.sidebar.min, LIMITS.sidebar.max, LIMITS.sidebar.def),
    sidebarCollapsed: typeof r.sidebarCollapsed === 'boolean' ? r.sidebarCollapsed : false,
    panel: {
      open: typeof rp.open === 'boolean' ? rp.open : d.open,
      position: rp.position === 'bottom' ? 'bottom' : 'right',
      rightW: num(rp.rightW, LIMITS.right.min, 4000, d.rightW),
      bottomH: num(rp.bottomH, LIMITS.bottom.min, 4000, d.bottomH),
      maximized: typeof rp.maximized === 'boolean' ? rp.maximized : false,
      tabs,
      active,
    },
  }
}

export function panelForKey(k: string): PanelType | null {
  return PANEL_TYPES.find(p => p.key === k.toUpperCase())?.id ?? null
}

const TAB_TO_PANEL: Record<string, PanelType> = {
  terminal: 'terminal', messages: 'inbox', worktree: 'files', memory: 'memory', graph: 'graph',
  docs: 'docs', canvas: 'canvas', search: 'search', playback: 'playback', export: 'export',
}
export function migrateActiveTab(tab: string | null): PanelType | null {
  return tab ? TAB_TO_PANEL[tab] ?? null : null
}

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

/** Esc restores a maximized panel only when nothing else used it (menu, palette, dialog) and focus isn't in a field or the terminal. */
export function shouldRestoreOnEscape(e: { key: string; defaultPrevented: boolean; target: Parameters<typeof isEditableTarget>[0] }): boolean {
  return e.key === 'Escape' && !e.defaultPrevented && !isEditableTarget(e.target)
}

/** The size a panel is actually drawn at; resize handles must start from this, not the stored value. */
export function shownSize(stored: number, limits: { min: number; max: number }): number {
  return clampSize(stored, limits.min, limits.max)
}

/** Overlay the right panel only when docking it would leave the chat under 420px. */
export const MIN_CHAT_W = 420
export function panelOverlays(workW: number, rightW: number): boolean {
  return workW - rightW < MIN_CHAT_W
}
