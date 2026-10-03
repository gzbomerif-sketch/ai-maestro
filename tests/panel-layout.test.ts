import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LAYOUT, layoutReducer, clampSize, panelLimits, parseLayout, panelForKey,
  migrateActiveTab, layoutShortcut, isEditableTarget, keyboardStep, type LayoutState,
} from '@/lib/panel-layout'

const withTabs = (tabs: LayoutState['panel']['tabs'], active: LayoutState['panel']['active']): LayoutState =>
  ({ ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, open: true, tabs, active } })

describe('layoutReducer: tabs', () => {
  it('open adds a tab, activates it and opens the panel', () => {
    const s = layoutReducer({ ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, open: false, tabs: [], active: null } }, { type: 'open', panel: 'files' })
    expect(s.panel).toMatchObject({ open: true, tabs: ['files'], active: 'files' })
  })
  it('open on an existing type focuses it instead of duplicating', () => {
    const s = layoutReducer(withTabs(['terminal', 'inbox'], 'inbox'), { type: 'open', panel: 'terminal' })
    expect(s.panel.tabs).toEqual(['terminal', 'inbox'])
    expect(s.panel.active).toBe('terminal')
  })
  it('close on the active tab activates the right neighbour, else the left', () => {
    expect(layoutReducer(withTabs(['terminal', 'inbox', 'files'], 'inbox'), { type: 'close', panel: 'inbox' }).panel.active).toBe('files')
    expect(layoutReducer(withTabs(['terminal', 'inbox'], 'inbox'), { type: 'close', panel: 'inbox' }).panel.active).toBe('terminal')
  })
  it('closing a background tab keeps the active one', () => {
    expect(layoutReducer(withTabs(['terminal', 'inbox'], 'inbox'), { type: 'close', panel: 'terminal' }).panel).toMatchObject({ tabs: ['inbox'], active: 'inbox' })
  })
  it('closing the last tab leaves an empty, open panel', () => {
    expect(layoutReducer(withTabs(['inbox'], 'inbox'), { type: 'close', panel: 'inbox' }).panel).toMatchObject({ open: true, tabs: [], active: null })
  })
})

describe('layoutReducer: panel controls', () => {
  it('toggle hides an open panel and un-maximizes it', () => {
    const s = layoutReducer({ ...withTabs(['terminal'], 'terminal'), panel: { ...withTabs(['terminal'], 'terminal').panel, maximized: true } }, { type: 'toggle' })
    expect(s.panel).toMatchObject({ open: false, maximized: false })
  })
  it('toggle opens a hidden panel; with no tabs it opens Terminal', () => {
    const hidden = { ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, open: false, tabs: [], active: null } }
    expect(layoutReducer(hidden, { type: 'toggle' }).panel).toMatchObject({ open: true, tabs: ['terminal'], active: 'terminal' })
  })
  it('setPosition keeps maximize and tabs', () => {
    const s = layoutReducer({ ...withTabs(['memory'], 'memory'), panel: { ...withTabs(['memory'], 'memory').panel, maximized: true } }, { type: 'setPosition', position: 'bottom' })
    expect(s.panel).toMatchObject({ position: 'bottom', maximized: true, tabs: ['memory'] })
  })
  it('toggleMaximize flips and opens; restore un-maximizes', () => {
    const m = layoutReducer({ ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, open: false } }, { type: 'toggleMaximize' })
    expect(m.panel).toMatchObject({ open: true, maximized: true })
    expect(layoutReducer(m, { type: 'restore' }).panel.maximized).toBe(false)
  })
  it('sidebar resize clamps to 220–420 and toggleSidebar flips collapse', () => {
    expect(layoutReducer(DEFAULT_LAYOUT, { type: 'resizeSidebar', width: 999 }).sidebarW).toBe(420)
    expect(layoutReducer(DEFAULT_LAYOUT, { type: 'resizeSidebar', width: 10 }).sidebarW).toBe(220)
    expect(layoutReducer(DEFAULT_LAYOUT, { type: 'toggleSidebar' }).sidebarCollapsed).toBe(true)
  })
  it('panel resize clamps by position and container', () => {
    const right = layoutReducer(DEFAULT_LAYOUT, { type: 'resizePanel', size: 2000, container: 1000 })
    expect(right.panel.rightW).toBe(700)
    const bottom = layoutReducer({ ...DEFAULT_LAYOUT, panel: { ...DEFAULT_LAYOUT.panel, position: 'bottom' } }, { type: 'resizePanel', size: 50, container: 800 })
    expect(bottom.panel.bottomH).toBe(200)
    expect(bottom.panel.rightW).toBe(DEFAULT_LAYOUT.panel.rightW)
  })
})

describe('clampSize / panelLimits', () => {
  it('clamps, and never returns below min even if max < min', () => {
    expect(clampSize(50, 100, 300)).toBe(100)
    expect(clampSize(500, 100, 300)).toBe(300)
    expect(clampSize(200, 320, 140)).toBe(320)
    expect(clampSize(NaN, 100, 300)).toBe(100)
  })
  it('limits come from position and container', () => {
    expect(panelLimits('right', 1000)).toEqual({ min: 320, max: 700 })
    expect(panelLimits('bottom', 600)).toEqual({ min: 200, max: 420 })
    expect(panelLimits('right', 200)).toEqual({ min: 320, max: 320 })
  })
})

describe('parseLayout', () => {
  it('returns null for missing or unparsable', () => {
    expect(parseLayout(null)).toBeNull()
    expect(parseLayout('{nope')).toBeNull()
    expect(parseLayout('42')).toBeNull()
  })
  it('keeps valid fields and falls back per field', () => {
    const s = parseLayout(JSON.stringify({
      sidebarW: 300, sidebarCollapsed: 'yes',
      panel: { open: true, position: 'top', rightW: -5, bottomH: 333, maximized: false, tabs: ['terminal', 'bogus', 'inbox', 'terminal'], active: 'bogus' },
    }))!
    expect(s.sidebarW).toBe(300)
    expect(s.sidebarCollapsed).toBe(false)
    expect(s.panel.position).toBe('right')
    expect(s.panel.rightW).toBe(DEFAULT_LAYOUT.panel.rightW)
    expect(s.panel.bottomH).toBe(333)
    expect(s.panel.tabs).toEqual(['terminal', 'inbox'])
    expect(s.panel.active).toBe('terminal')
  })
})

describe('keys and shortcuts', () => {
  it('panelForKey maps letters case-insensitively', () => {
    expect(panelForKey('t')).toBe('terminal')
    expect(panelForKey('I')).toBe('inbox')
    expect(panelForKey('x')).toBe('export')
    expect(panelForKey('z')).toBeNull()
  })
  it('migrateActiveTab maps old tabs; chat stays in the centre', () => {
    expect(migrateActiveTab('worktree')).toBe('files')
    expect(migrateActiveTab('messages')).toBe('inbox')
    expect(migrateActiveTab('chat')).toBeNull()
    expect(migrateActiveTab('streaming')).toBeNull()
    expect(migrateActiveTab(null)).toBeNull()
  })
  it('layoutShortcut: Cmd on Mac, Ctrl elsewhere', () => {
    const e = (o: object) => ({ key: 'j', metaKey: false, ctrlKey: false, shiftKey: false, ...o })
    expect(layoutShortcut(e({ metaKey: true }), true)).toBe('togglePanel')
    expect(layoutShortcut(e({ ctrlKey: true }), true)).toBeNull()
    expect(layoutShortcut(e({ ctrlKey: true }), false)).toBe('togglePanel')
    expect(layoutShortcut(e({ key: 'b', metaKey: true }), true)).toBe('toggleSidebar')
    expect(layoutShortcut(e({ key: 'M', metaKey: true, shiftKey: true }), true)).toBe('toggleMaximize')
    expect(layoutShortcut(e({ key: 'm', metaKey: true }), true)).toBeNull()
  })
  it('isEditableTarget spots inputs, contenteditable and the terminal', () => {
    const el = (tag: string, match = '') => ({ tagName: tag, isContentEditable: false, closest: (s: string) => (s === match ? {} : null) })
    expect(isEditableTarget(el('INPUT') as any)).toBe(true)
    expect(isEditableTarget(el('TEXTAREA') as any)).toBe(true)
    expect(isEditableTarget(el('DIV', '.xterm') as any)).toBe(true)
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true, closest: () => null } as any)).toBe(true)
    expect(isEditableTarget(el('DIV') as any)).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
  it('keyboardStep: arrows 16, shift 64, others 0', () => {
    expect(keyboardStep('ArrowRight', false)).toBe(16)
    expect(keyboardStep('ArrowLeft', true)).toBe(-64)
    expect(keyboardStep('ArrowDown', false)).toBe(16)
    expect(keyboardStep('ArrowUp', false)).toBe(-16)
    expect(keyboardStep('Enter', false)).toBe(0)
  })
})
