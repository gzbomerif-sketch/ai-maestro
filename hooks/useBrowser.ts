'use client'

/**
 * One browser state for the whole shell (panel + mini preview share it).
 * A tiny external store: persisted to localStorage after the first mount.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { DEFAULT_BROWSER, browserReducer, parseBrowserState, type BrowserAction, type BrowserState } from '@/lib/browser-nav'
import { readString, writePref } from '@/lib/safe-storage'

const KEY = 'aimaestro-browser'
let state: BrowserState = DEFAULT_BROWSER
let hydrated = false
const subscribers = new Set<() => void>()

function setState(next: BrowserState) {
  if (next === state) return
  state = next
  if (hydrated) writePref(KEY, JSON.stringify(state))
  subscribers.forEach(fn => fn())
}

export function browserDispatch(action: BrowserAction) {
  setState(browserReducer(state, action))
}

const subscribe = (fn: () => void) => { subscribers.add(fn); return () => { subscribers.delete(fn) } }

export function useBrowser() {
  useEffect(() => {
    if (hydrated) return
    hydrated = true
    const stored = parseBrowserState(readString(KEY))
    if (stored) setState(stored)
  }, [])
  const browser = useSyncExternalStore(subscribe, () => state, () => DEFAULT_BROWSER)
  return { browser, dispatch: browserDispatch }
}
