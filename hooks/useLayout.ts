'use client'

/** Layout state for the command-center shell: sidebar width/collapse, persisted, plus the ⌘B shortcut. Windows live in useWindows. */
import { useEffect, useReducer, useState } from 'react'
import { DEFAULT_LAYOUT, isEditableTarget, layoutReducer, layoutShortcut, parseLayout } from '@/lib/panel-layout'
import { readString, writePref } from '@/lib/safe-storage'

export const LAYOUT_KEY = 'aimaestro-layout'

export function useLayout() {
  const [layout, dispatch] = useReducer(layoutReducer, DEFAULT_LAYOUT)
  const [hydrated, setHydrated] = useState(false)

  // Read after mount (the server render has no localStorage). A stored layout from before the window
  // workspace may still carry a dock `panel`; parseLayout drops it.
  useEffect(() => {
    const stored = parseLayout(readString(LAYOUT_KEY))
    if (stored) dispatch({ type: 'replace', state: stored })
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) writePref(LAYOUT_KEY, JSON.stringify(layout))
  }, [layout, hydrated])

  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    const onKey = (e: KeyboardEvent) => {
      // ⌘J and ⇧⌘M act on windows: WorkArea handles them
      if (layoutShortcut(e, isMac) !== 'toggleSidebar' || isEditableTarget(e.target as Element | null)) return
      e.preventDefault()
      dispatch({ type: 'toggleSidebar' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { layout, dispatch, hydrated }
}
