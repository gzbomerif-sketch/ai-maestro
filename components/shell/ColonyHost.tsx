'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Agent } from '@/types/agent'
import {
  COLONY_REFRESH, colonyFrameUrl, colonyReachableFrom, findAgent, nextColonyStatus, originOf,
  parseColonyMessage, shouldShowColony, type ColonyStatus,
} from '@/lib/colony-message'
import { BROWSER_SANDBOX } from './BrowserPanel'

/** Status is re-read on this interval so a colony that dies, or finishes starting, shows up. */
const STATUS_POLL_MS = 4000

export interface ColonyContextValue {
  /** A Colony tab's body registers its placeholder here; the host pins the live iframe over it. */
  setSlot: (el: HTMLElement | null) => void
  status: ColonyStatus | null
  /** True when this page runs on the machine that hosts the colony (it binds to localhost). */
  local: boolean
  /** Reload the iframe and re-read the status now. */
  reload: () => void
}

const ColonyContext = createContext<ColonyContextValue | null>(null)

export function useColony(): ColonyContextValue {
  const v = useContext(ColonyContext)
  if (!v) throw new Error('useColony needs <ColonyHost> above it')
  return v
}

/**
 * The one live colony. The iframe lives HERE, fixed at the shell root, and is only ever
 * repositioned over whichever Colony tab is open — agent dock or team workspace. Moving an
 * iframe in the DOM reloads it, which is exactly the camera-resetting bug this exists to fix,
 * so the tabs render an empty slot div (ColonyPanel) and never the frame itself. Only one
 * Colony surface exists at a time: the shell shows either the agent dock or a team's.
 */
export default function ColonyHost({ agents, onSelectAgent, children }: {
  agents: Agent[]
  onSelectAgent: (a: Agent) => void
  children: ReactNode
}) {
  const [status, setStatus] = useState<ColonyStatus | null>(null)
  const [nonce, setNonce] = useState(0)
  const [slot, setSlotState] = useState<HTMLElement | null>(null)
  // Lazy-boot gate: the game loads on the first opened Colony tab, never in a session that
  // has not looked at it, and then stays alive for every later tab.
  const [everShown, setEverShown] = useState(false)
  const [pageOrigin, setPageOrigin] = useState<{ hostname: string; origin: string } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // window is read in an effect so the server render of this client component stays safe
  useEffect(() => { setPageOrigin({ hostname: window.location.hostname, origin: window.location.origin }) }, [])

  // Status poll: same cadence and same-object dedupe the dock panel used before it moved
  // here, folded through nextColonyStatus so one failed fetch cannot unmount the colony.
  useEffect(() => {
    let alive = true
    let failures = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      let fetched: ColonyStatus | null = null
      try {
        const res = await fetch('/api/colony/status', { cache: 'no-store' })
        if (res.ok) fetched = await res.json() as ColonyStatus
      } catch { /* counted below */ }
      if (!alive) return
      setStatus(prev => {
        const next = nextColonyStatus(prev, fetched, failures)
        failures = next.failures
        return JSON.stringify(prev) === JSON.stringify(next.status) ? prev : next.status
      })
      timer = setTimeout(load, STATUS_POLL_MS)
    }
    void load()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [nonce])

  const local = pageOrigin !== null && colonyReachableFrom(pageOrigin.hostname)
  const colonyOrigin = originOf(status?.running ? status.url : null)

  // Colony → host: Open on a bot selects that agent, whichever view the user is in.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const agent = findAgent(agents, parseColonyMessage(event, colonyOrigin))
      if (agent) onSelectAgent(agent)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [agents, colonyOrigin, onSelectAgent])

  // Host → colony: whoever just changed the agents (the creation wizard) dispatches this
  // event, and the colony rescans at once instead of waiting out its 15 s poll.
  useEffect(() => {
    const onRefresh = () => {
      if (colonyOrigin) iframeRef.current?.contentWindow?.postMessage({ type: COLONY_REFRESH }, colonyOrigin)
    }
    window.addEventListener('aimaestro:colony-refresh', onRefresh)
    return () => window.removeEventListener('aimaestro:colony-refresh', onRefresh)
  }, [colonyOrigin])

  // Pin the frame to the slot. rAF rather than observers: one rect read per frame follows
  // panel drags, maximize and window resizes alike, and stops when no slot is mounted.
  const showing = !!slot && shouldShowColony(everShown, local, status)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    if (!showing || !slot) {
      wrapper.style.visibility = 'hidden'
      wrapper.style.pointerEvents = 'none'
      return
    }
    let raf = 0
    const tick = () => {
      const r = slot.getBoundingClientRect()
      wrapper.style.transform = `translate(${r.left}px, ${r.top}px)`
      wrapper.style.width = `${r.width}px`
      wrapper.style.height = `${r.height}px`
      wrapper.style.visibility = 'visible'
      wrapper.style.pointerEvents = 'auto'
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [showing, slot])

  const setSlot = useCallback((el: HTMLElement | null) => {
    if (el) setEverShown(true)
    setSlotState(el)
  }, [])
  const reload = useCallback(() => setNonce(n => n + 1), [])

  const src = shouldShowColony(everShown, local, status) && status?.url && pageOrigin
    ? colonyFrameUrl(status.url, pageOrigin.origin) : null

  return (
    <ColonyContext.Provider value={{ setSlot, status, local, reload }}>
      {children}
      {/* z-[25]: over the dock body (the overlay dock is z-20), under menus (z-40) and dialogs (z-50) */}
      <div ref={wrapperRef} className="fixed left-0 top-0 z-[25]" style={{ visibility: 'hidden', pointerEvents: 'none' }}>
        {src && (
          <iframe key={`${src}#${nonce}`} ref={iframeRef} src={src} title="Colony" sandbox={BROWSER_SANDBOX}
            allow="clipboard-write" referrerPolicy="no-referrer" className="w-full h-full border-0 bg-sunken" />
        )}
      </div>
    </ColonyContext.Provider>
  )
}
