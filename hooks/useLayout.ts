'use client'

/** Layout state for the command-center shell: reducer + persistence + global shortcuts. */
import { useEffect, useReducer, useRef, useState } from 'react'
import { DEFAULT_LAYOUT, isEditableTarget, layoutReducer, layoutShortcut, migrateActiveTab, parseLayout } from '@/lib/panel-layout'
import { readString, writePref } from '@/lib/safe-storage'

export const LAYOUT_KEY = 'aimaestro-layout'

export function useLayout() {
  const [layout, dispatch] = useReducer(layoutReducer, DEFAULT_LAYOUT)
  const [hydrated, setHydrated] = useState(false)

  // Read after mount (the server render has no localStorage)
  useEffect(() => {
    const stored = parseLayout(readString(LAYOUT_KEY))
    if (stored) {
      dispatch({ type: 'replace', state: stored })
    } else {
      // First run with panels: carry over the old top-tab choice once
      const migrated = migrateActiveTab(readString('aimaestro-active-tab'))
      if (migrated) dispatch({ type: 'open', panel: migrated })
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) writePref(LAYOUT_KEY, JSON.stringify(layout))
  }, [layout, hydrated])

  const layoutRef = useRef(layout)
  layoutRef.current = layout
  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    const onKey = (e: KeyboardEvent) => {
      const action = layoutShortcut(e, isMac)
      if (!action || isEditableTarget(e.target as Element | null)) return
      e.preventDefault()
      if (action === 'togglePanel') dispatch({ type: 'toggle' })
      else if (action === 'toggleSidebar') dispatch({ type: 'toggleSidebar' })
      else dispatch({ type: 'toggleMaximize' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { layout, dispatch, hydrated }
}
