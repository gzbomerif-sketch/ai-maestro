'use client'

import { useCallback, useEffect, useReducer, useRef, type Dispatch, type RefObject } from 'react'
import {
  windowReducer, parseWindows, EMPTY_WINDOWS, WINDOWS_STORAGE_KEY,
  type WindowState, type WindowAction, type WindowTool,
} from '@/lib/window-manager'
import { isUsableArea, type Area } from '@/lib/window-chrome'
import { readString, writePref } from '@/lib/safe-storage'

const PERSIST_DELAY_MS = 150

/**
 * Owns the floating-window state: restores it from localStorage, persists changes (debounced),
 * and keeps every window inside `areaRef`'s element as it resizes. Key handling lives elsewhere.
 * `areaRef.current` must be attached by the time this component's effects run.
 */
export function useWindows(areaRef: RefObject<HTMLElement>): {
  state: WindowState
  dispatch: Dispatch<WindowAction>
  openTool: (tool: WindowTool, agentId?: string) => void
} {
  const [state, dispatch] = useReducer(windowReducer, undefined, () => parseWindows(readString(WINDOWS_STORAGE_KEY)) ?? EMPTY_WINDOWS)

  /** Current area size, or null when it is not measurable (detached, hidden, 0x0): never dispatch with that. */
  const measure = useCallback((): Area | null => {
    const el = areaRef.current
    if (!el) return null
    const area = { w: el.clientWidth, h: el.clientHeight }
    return isUsableArea(area) ? area : null
  }, [areaRef])

  // Clamp on mount and whenever the area changes size
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const clamp = () => {
      const area = measure()
      if (area) dispatch({ type: 'clampAll', area })
    }
    clamp()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(clamp)
    ro.observe(el)
    return () => ro.disconnect()
  }, [areaRef, measure])

  // Debounced persist; the latest state is also flushed on unmount so a quick navigation loses nothing
  const latest = useRef(state)
  latest.current = state
  useEffect(() => {
    const t = setTimeout(() => writePref(WINDOWS_STORAGE_KEY, JSON.stringify(state)), PERSIST_DELAY_MS)
    return () => clearTimeout(t)
  }, [state])
  useEffect(() => () => writePref(WINDOWS_STORAGE_KEY, JSON.stringify(latest.current)), [])

  const openTool = useCallback((tool: WindowTool, agentId?: string) => {
    const area = measure()
    if (area) dispatch({ type: 'open', tool, agentId, area })
  }, [measure])

  return { state, dispatch, openTool }
}
