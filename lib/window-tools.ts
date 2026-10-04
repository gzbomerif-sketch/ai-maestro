/**
 * Tool catalog and pure helpers the shell uses to drive the floating-window workspace
 * (launcher entries, key routing, scope, ⌘J / ⇧⌘M targets). No React, no storage.
 */
import { PANEL_TYPES, panelForKey } from '@/lib/panel-layout'
import { TEAM_TOOLS, termAgentId } from '@/lib/team-panels'
import type { ManagedWindow, WindowAction, WindowTool } from '@/lib/window-manager'

/** Agent launcher: every dock tool plus the two tools that arrive later (Tasks, Skills; stubs until then). */
export const AGENT_TOOLS: { id: WindowTool; label: string; key: string }[] = [
  ...PANEL_TYPES,
  { id: 'tasks', label: 'Tasks', key: 'A' },
  { id: 'skills', label: 'Skills', key: 'L' },
]

/** Windows that follow the user across agents and teams instead of belonging to one. */
const GLOBAL_TOOLS = new Set<WindowTool>(['colony'])

/** The agentId a window of `tool` opened from `scope` carries (undefined = global). */
export function windowScopeFor(tool: WindowTool, scope: string): string | undefined {
  return GLOBAL_TOOLS.has(tool) ? undefined : scope
}

/** Single-key shortcut to tool for an agent workspace. */
export function agentToolForKey(key: string): WindowTool | null {
  if (key.length !== 1) return null
  const k = key.toUpperCase()
  return AGENT_TOOLS.find(t => t.key === k)?.id ?? panelForKey(k)
}

/** Window title. `nameOf` resolves member names for `term:<agentId>` windows. */
export function toolLabel(tool: WindowTool, nameOf?: (agentId: string) => string | undefined): string {
  const member = termAgentId(tool)
  if (member) return nameOf?.(member) ?? member
  return AGENT_TOOLS.find(t => t.id === tool)?.label ?? TEAM_TOOLS.find(t => t.id === tool)?.label ?? tool
}

/** The window the user is working in: highest z among the non-minimized ones. */
export function topWindow(windows: ManagedWindow[]): ManagedWindow | null {
  let top: ManagedWindow | null = null
  for (const w of windows) if (!w.minimized && (!top || w.z > top.z)) top = w
  return top
}

/** The maximized window Esc should restore (the topmost one when several are maximized). */
export function topMaximized(windows: ManagedWindow[]): ManagedWindow | null {
  return topWindow(windows.filter(w => w.maximized))
}

/** ⌘J: minimize everything that is showing, or, when nothing is, restore everything (bottom to top, keeping z order). */
export function toggleAllActions(windows: ManagedWindow[]): WindowAction[] {
  if (windows.some(w => !w.minimized)) return windows.filter(w => !w.minimized).map(w => ({ type: 'minimize', id: w.id }))
  return [...windows].sort((a, b) => a.z - b.z).map(w => ({ type: 'restore', id: w.id }))
}
