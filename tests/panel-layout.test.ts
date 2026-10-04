import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LAYOUT, layoutReducer, clampSize, parseLayout, panelForKey,
  layoutShortcut, isEditableTarget, keyboardStep,
} from '@/lib/panel-layout'

describe('layoutReducer: sidebar', () => {
  it('resize clamps to 220–420', () => {
    expect(layoutReducer(DEFAULT_LAYOUT, { type: 'resizeSidebar', width: 999 }).sidebarW).toBe(420)
    expect(layoutReducer(DEFAULT_LAYOUT, { type: 'resizeSidebar', width: 10 }).sidebarW).toBe(220)
    expect(layoutReducer(DEFAULT_LAYOUT, { type: 'resizeSidebar', width: 300.4 }).sidebarW).toBe(300)
  })
  it('toggleSidebar flips collapse and back', () => {
    const collapsed = layoutReducer(DEFAULT_LAYOUT, { type: 'toggleSidebar' })
    expect(collapsed.sidebarCollapsed).toBe(true)
    expect(layoutReducer(collapsed, { type: 'toggleSidebar' }).sidebarCollapsed).toBe(false)
  })
  it('replace swaps the whole state', () => {
    expect(layoutReducer(DEFAULT_LAYOUT, { type: 'replace', state: { sidebarW: 300, sidebarCollapsed: true } })).toEqual({ sidebarW: 300, sidebarCollapsed: true })
  })
})

describe('clampSize', () => {
  it('clamps, and never returns below min even if max < min', () => {
    expect(clampSize(50, 100, 300)).toBe(100)
    expect(clampSize(500, 100, 300)).toBe(300)
    expect(clampSize(200, 320, 140)).toBe(320)
    expect(clampSize(NaN, 100, 300)).toBe(100)
  })
})

describe('parseLayout', () => {
  it('returns null for missing or unparsable', () => {
    expect(parseLayout(null)).toBeNull()
    expect(parseLayout('{nope')).toBeNull()
    expect(parseLayout('42')).toBeNull()
  })
  it('keeps valid fields and falls back per field', () => {
    expect(parseLayout(JSON.stringify({ sidebarW: 300, sidebarCollapsed: 'yes' }))).toEqual({ sidebarW: 300, sidebarCollapsed: false })
    expect(parseLayout(JSON.stringify({ sidebarW: 5, sidebarCollapsed: true }))).toEqual({ sidebarW: DEFAULT_LAYOUT.sidebarW, sidebarCollapsed: true })
    expect(parseLayout('{}')).toEqual(DEFAULT_LAYOUT)
  })
  it('tolerates the old dock shape: reads the sidebar fields and ignores the panel field', () => {
    const old = JSON.stringify({
      sidebarW: 310, sidebarCollapsed: true,
      panel: { open: true, position: 'bottom', rightW: 500, bottomH: 333, maximized: true, tabs: ['terminal', 'inbox'], active: 'terminal', teamTabs: ['kanban'], teamActive: 'kanban' },
    })
    const s = parseLayout(old)!
    expect(s).toEqual({ sidebarW: 310, sidebarCollapsed: true })
    expect('panel' in s).toBe(false)
  })
})

describe('keys and shortcuts', () => {
  it('panelForKey maps letters case-insensitively', () => {
    expect(panelForKey('t')).toBe('terminal')
    expect(panelForKey('I')).toBe('inbox')
    expect(panelForKey('x')).toBe('export')
    expect(panelForKey('b')).toBe('browser')
    expect(panelForKey('z')).toBeNull()
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

describe('shouldRestoreOnEscape', () => {
  it('restores only when not typing and not already handled', async () => {
    const { shouldRestoreOnEscape } = await import('@/lib/panel-layout')
    const div = { tagName: 'DIV', isContentEditable: false, closest: () => null }
    const term = { tagName: 'TEXTAREA', isContentEditable: false, closest: (s: string) => (s === '.xterm' ? {} : null) }
    expect(shouldRestoreOnEscape({ key: 'Escape', defaultPrevented: false, target: div as any })).toBe(true)
    expect(shouldRestoreOnEscape({ key: 'Escape', defaultPrevented: false, target: term as any })).toBe(false)
    expect(shouldRestoreOnEscape({ key: 'Escape', defaultPrevented: true, target: div as any })).toBe(false)
    expect(shouldRestoreOnEscape({ key: 'Enter', defaultPrevented: false, target: div as any })).toBe(false)
  })
})
