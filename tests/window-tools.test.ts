import { describe, it, expect } from 'vitest'
import { AGENT_TOOLS, agentToolForKey, windowScopeFor, toolLabel, topWindow, topMaximized, toggleAllActions, MODAL_SELECTOR } from '@/lib/window-tools'
import type { ManagedWindow } from '@/lib/window-manager'

const win = (id: string, o: Partial<ManagedWindow> = {}): ManagedWindow =>
  ({ id, tool: 'docs', x: 0, y: 0, w: 400, h: 300, z: 1, minimized: false, maximized: false, ...o })

describe('window tools', () => {
  it('launcher lists every dock tool plus Tasks (A) and Skills (L)', () => {
    expect(AGENT_TOOLS.map(t => t.id)).toEqual(['terminal', 'inbox', 'files', 'memory', 'graph', 'docs', 'canvas', 'search', 'playback', 'export', 'browser', 'tasks', 'skills'])
    expect(new Set(AGENT_TOOLS.map(t => t.key)).size).toBe(AGENT_TOOLS.length)
  })
  it('agentToolForKey routes letters case-insensitively and ignores everything else', () => {
    expect(agentToolForKey('t')).toBe('terminal')
    expect(agentToolForKey('a')).toBe('tasks')
    expect(agentToolForKey('L')).toBe('skills')
    expect(agentToolForKey('z')).toBeNull()
    expect(agentToolForKey('Enter')).toBeNull()
    expect(agentToolForKey('1')).toBeNull()
  })
  it('every tool belongs to the workspace it opened from', () => {
    expect(windowScopeFor('terminal', 'a1')).toBe('a1')
    expect(windowScopeFor('kanban', 'team:t1')).toBe('team:t1')
  })
  it('toolLabel names tools and member terminals', () => {
    expect(toolLabel('terminal')).toBe('Terminal')
    expect(toolLabel('kanban')).toBe('Kanban')
    expect(toolLabel('term:a1', id => (id === 'a1' ? 'Ada' : undefined))).toBe('Ada')
    expect(toolLabel('term:a2', () => undefined)).toBe('a2')
  })
  it('topWindow is the highest non-minimized; topMaximized the highest maximized', () => {
    const ws = [win('a', { z: 1, maximized: true }), win('b', { z: 5, minimized: true }), win('c', { z: 3 })]
    expect(topWindow(ws)?.id).toBe('c')
    expect(topMaximized(ws)?.id).toBe('a')
    expect(topWindow([win('x', { minimized: true })])).toBeNull()
    expect(topMaximized([win('x')])).toBeNull()
  })
  it('toggleAllActions minimizes what shows, else restores bottom to top', () => {
    expect(toggleAllActions([win('a', { z: 2 }), win('b', { z: 1, minimized: true })])).toEqual([{ type: 'minimize', id: 'a' }])
    expect(toggleAllActions([win('a', { z: 2, minimized: true }), win('b', { z: 1, minimized: true })])).toEqual([{ type: 'restore', id: 'b' }, { type: 'restore', id: 'a' }])
    expect(toggleAllActions([])).toEqual([])
  })
  it('MODAL_SELECTOR covers dialogs, menus and Radix Select (listbox/combobox type-ahead)', () => {
    for (const role of ['dialog', 'menu', 'listbox', 'combobox']) expect(MODAL_SELECTOR).toContain(`[role="${role}"]`)
    expect(MODAL_SELECTOR).toContain('[aria-modal="true"]')
  })
})
