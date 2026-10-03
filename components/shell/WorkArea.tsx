'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LIMITS, panelLimits, panelOverlays, shouldRestoreOnEscape, shownSize, type LayoutAction, type LayoutState } from '@/lib/panel-layout'
import ResizeHandle from './ResizeHandle'

/** Centre column + tool panel (right or bottom, resizable, maximizable). Shared by agent and team views. */
export default function WorkArea({ layout, dispatch, depKey, top, center, dock }: {
  layout: LayoutState
  dispatch: React.Dispatch<LayoutAction>
  depKey: string
  top: ReactNode
  center: ReactNode
  dock: ReactNode
}) {
  const workRef = useRef<HTMLDivElement>(null)
  const [work, setWork] = useState({ w: 1200, h: 800 })
  useEffect(() => {
    const el = workRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWork({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [depKey])

  const P = layout.panel
  const container = P.position === 'right' ? work.w : work.h
  const lim = panelLimits(P.position, container)
  const shownRight = shownSize(P.rightW, lim)
  const shownBottom = shownSize(P.bottomH, lim)
  const overlay = P.position === 'right' && panelOverlays(work.w, shownRight)

  useEffect(() => {
    if (!P.maximized) return
    const onKey = (e: KeyboardEvent) => {
      if (shouldRestoreOnEscape({ key: e.key, defaultPrevented: e.defaultPrevented, target: e.target as Element | null })) dispatch({ type: 'restore' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [P.maximized, dispatch])

  return (
    <div ref={workRef} className="flex-1 min-w-0 flex relative">
      {P.open && P.maximized ? dock : (
        <>
          <section className="flex-1 min-w-0 flex flex-col">
            {top}
            <div className="flex-1 min-h-0 flex relative border-t border-hairline/70">{center}</div>
            {P.open && P.position === 'bottom' && (
              <>
                <ResizeHandle orientation="horizontal" invert label="Drag to resize panel" value={shownBottom} min={lim.min} max={lim.max}
                  onResize={h => dispatch({ type: 'resizePanel', size: h, container })}
                  onReset={() => dispatch({ type: 'resizePanel', size: LIMITS.bottom.def, container })} />
                <div style={{ height: shownBottom }} className="flex-none flex min-h-0">{dock}</div>
              </>
            )}
          </section>
          {P.open && P.position === 'right' && (
            <div className={overlay ? 'absolute inset-y-0 right-0 z-20 flex' : 'flex flex-none'}>
              <ResizeHandle orientation="vertical" invert label="Drag to resize panel" value={shownRight} min={lim.min} max={lim.max}
                onResize={w => dispatch({ type: 'resizePanel', size: w, container })}
                onReset={() => dispatch({ type: 'resizePanel', size: LIMITS.right.def, container })} />
              <div style={{ width: overlay ? Math.min(shownRight, work.w - 40) : shownRight }} className="flex min-w-0">{dock}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
