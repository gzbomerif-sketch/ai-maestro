'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { isEditableTarget, layoutShortcut, shouldRestoreOnEscape } from '@/lib/panel-layout'
import { stackRanks, visibleWindows, type ManagedWindow, type WindowAction, type WindowTool } from '@/lib/window-manager'
import { isUsableArea, type Area } from '@/lib/window-chrome'
import { MODAL_SELECTOR, toggleAllActions, topMaximized, topWindow, windowScopeFor } from '@/lib/window-tools'
import { useWindows } from '@/hooks/useWindows'
import { WindowLayer } from './WindowLayer'

/** What the top bar and overlays need to drive this work area's windows. */
export interface WorkAreaApi {
  /** Open (or focus / un-minimize) a tool window in this workspace */
  openTool: (tool: WindowTool) => void
  /** This workspace's windows plus the global ones (minimized included) */
  windows: ManagedWindow[]
  dispatch: Dispatch<WindowAction>
  /** Windows exist and every one is minimized */
  allMinimized: boolean
  /** ⌘J: minimize everything showing, or restore everything */
  toggleAll: () => void
  /** A window of this tool is open and not minimized */
  isShowing: (tool: WindowTool) => boolean
}

/**
 * Chat (the base layer) under a layer of floating tool windows that covers only the chat region (the top bar stays clear). Shared by the agent and team views.
 * Owns the area measurement (one observer feeds both useWindows and the layer) and the window shortcuts.
 */
export default function WorkArea({ scopeId, keyToTool, renderContent, titleFor, iconFor, isStale, top, center, overlay }: {
  /** Windows opened here carry this id: the agent id, or teamScope(teamId) */
  scopeId: string
  /** Single-key shortcut to tool for this workspace */
  keyToTool: (key: string) => WindowTool | null
  renderContent: (w: ManagedWindow) => ReactNode
  titleFor: (w: ManagedWindow) => string
  iconFor: (w: ManagedWindow) => ReactNode
  /** Windows of this workspace that should be closed (a team member left) */
  isStale?: (w: ManagedWindow) => boolean
  top: (api: WorkAreaApi) => ReactNode
  center: ReactNode
  /** Floating extras over the chat column (the browser mini preview) */
  overlay?: (api: WorkAreaApi) => ReactNode
}) {
  // The element is always rendered, so the ref is attached before useWindows' effects run
  const workRef = useRef<HTMLDivElement>(null)
  const { state, dispatch, openTool: openIn } = useWindows(workRef)

  // WindowLayer mounts after the first client render: useWindows reads localStorage lazily
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [area, setArea] = useState<Area | null>(null)
  useEffect(() => {
    const el = workRef.current
    if (!el) return
    const read = () => {
      const next = { w: el.clientWidth, h: el.clientHeight }
      if (!isUsableArea(next)) return
      setArea(prev => (prev && prev.w === next.w && prev.h === next.h ? prev : next))
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Drawn z is the rank within this workspace (1..k), so 10 + z stays below the shell's menus (z-30/40) and dialogs (z-50)
  const windows = useMemo(() => (mounted ? stackRanks(visibleWindows(state, scopeId)) : []), [mounted, state, scopeId])
  const allMinimized = windows.length > 0 && windows.every(w => w.minimized)

  const openTool = useCallback((tool: WindowTool) => openIn(tool, windowScopeFor(tool, scopeId)), [openIn, scopeId])
  const toggleAll = useCallback(() => {
    for (const a of toggleAllActions(windows)) dispatch(a)
  }, [windows, dispatch])
  const isShowing = useCallback((tool: WindowTool) => windows.some(w => w.tool === tool && !w.minimized), [windows])
  const api: WorkAreaApi = { openTool, windows, dispatch, allMinimized, toggleAll, isShowing }

  // Close windows whose subject is gone
  useEffect(() => {
    if (!isStale) return
    for (const w of windows) if (isStale(w)) dispatch({ type: 'close', id: w.id })
  }, [windows, isStale, dispatch])

  // Keyboard: tool keys open/focus a window, ⌘J minimizes/restores all, ⇧⌘M maximizes the top window,
  // Esc restores a maximized one. (⌘B belongs to useLayout.)
  const live = useRef({ windows, openTool, keyToTool, dispatch })
  live.current = { windows, openTool, keyToTool, dispatch }
  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    const onKey = (e: KeyboardEvent) => {
      const { windows: ws, openTool: open, keyToTool: toTool, dispatch: send } = live.current
      const target = e.target as Element | null
      const chord = layoutShortcut(e, isMac)
      if (chord === 'togglePanel' || chord === 'toggleMaximize') {
        if (isEditableTarget(target)) return
        e.preventDefault()
        if (chord === 'togglePanel') {
          for (const a of toggleAllActions(ws)) send(a)
        } else {
          const w = topWindow(ws)
          if (w) send({ type: 'toggleMaximize', id: w.id })
        }
        return
      }
      if (chord) return
      if (shouldRestoreOnEscape({ key: e.key, defaultPrevented: e.defaultPrevented, target })) {
        const w = topMaximized(ws)
        if (w) send({ type: 'toggleMaximize', id: w.id })
        return
      }
      if (e.defaultPrevented || e.repeat || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditableTarget(target) || target?.closest?.(MODAL_SELECTOR)) return
      const tool = toTool(e.key)
      if (!tool) return
      e.preventDefault()
      open(tool)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <section className="flex-1 min-w-0 flex flex-col relative">
      {top(api)}
      {/* The windows' area: everything below the top bar, so the launcher and agent controls stay reachable */}
      <div ref={workRef} className="flex-1 min-h-0 flex relative border-t border-hairline/70">
        {center}
        {overlay?.(api)}
        {mounted && area && (
          // No z-index here on purpose: windows (10 + z), the colony frame (ColonyFrame, 10 + its window's z),
          // menus (z-30/40) and dialogs (z-50) must all compare in the shell root's one stacking context
          <div className="pointer-events-none absolute inset-0">
            <WindowLayer
              windows={windows} dispatch={dispatch} area={area}
              titleFor={titleFor} iconFor={iconFor}
              renderContent={w => <div className="absolute inset-0 flex min-h-0 min-w-0">{renderContent(w)}</div>}
            />
          </div>
        )}
      </div>
    </section>
  )
}
