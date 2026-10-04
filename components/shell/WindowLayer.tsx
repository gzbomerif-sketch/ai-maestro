'use client'

import { useState, type Dispatch, type ReactNode } from 'react'
import { FloatingWindow } from '@/components/shell/FloatingWindow'
import type { ManagedWindow, WindowAction } from '@/lib/window-manager'

/**
 * Overlay that hosts every floating window of the work area. The container itself never intercepts
 * pointer events; only the windows, the minimized pills and nothing else do.
 */
export function WindowLayer({ windows, dispatch, renderContent, area, titleFor, iconFor }: {
  windows: ManagedWindow[]
  dispatch: Dispatch<WindowAction>
  renderContent: (w: ManagedWindow) => ReactNode
  area: { w: number; h: number }
  titleFor: (w: ManagedWindow) => string
  iconFor: (w: ManagedWindow) => ReactNode
}) {
  const [snapPreview, setSnapPreview] = useState<'left' | 'right' | null>(null)
  const minimized = windows.filter(w => w.minimized)
  // Overlays sit above every window (a maximized one included), the strip above the preview
  const top = 10 + windows.reduce((m, w) => Math.max(m, w.z), 0) + 1

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {windows.map(w => (
        <FloatingWindow key={w.id} win={w} dispatch={dispatch} area={area} title={titleFor(w)} icon={iconFor(w)} onSnapPreview={setSnapPreview}>
          {renderContent(w)}
        </FloatingWindow>
      ))}
      {snapPreview && (
        <div
          aria-hidden
          style={{ zIndex: top }}
          className={`pointer-events-none absolute inset-y-0 w-1/2 border border-accent-fill/50 bg-accent-fill/10 ${snapPreview === 'left' ? 'left-0' : 'right-0'}`}
        />
      )}
      {minimized.length > 0 && (
        <div style={{ zIndex: top + 1 }} className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 p-2">
          {minimized.map(w => (
            <button
              key={w.id}
              type="button"
              title={`Restore ${titleFor(w)}`}
              onClick={() => dispatch({ type: 'restore', id: w.id })}
              className="pointer-events-auto flex h-8 max-w-[200px] items-center gap-2 rounded-full border border-hairline bg-raised px-3 text-[13px] text-ink shadow transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill"
            >
              <span aria-hidden className="flex flex-none items-center text-ink-muted">{iconFor(w)}</span>
              <span className="truncate">{titleFor(w)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
