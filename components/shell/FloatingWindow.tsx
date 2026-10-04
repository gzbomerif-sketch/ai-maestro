'use client'

import { useEffect, useRef, type Dispatch, type ReactNode } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/shell/ui'
import type { ManagedWindow, WindowAction } from '@/lib/window-manager'
import { isUsableArea, resizeRect, snapZone, type Area, type Rect, type ResizeZone } from '@/lib/window-chrome'

type Half = 'left' | 'right'
type Kind = 'move' | ResizeZone
type Drag = { kind: Kind; px: number; py: number; rect: Rect; snap: Half | null }

/** Hit areas straddle the border (3px outside) so they stay grabbable without eating content. */
const ZONE_LOOK: Record<ResizeZone, { cls: string; cursor: string }> = {
  n: { cls: '-top-[3px] inset-x-3 h-[6px]', cursor: 'ns-resize' },
  s: { cls: '-bottom-[3px] inset-x-3 h-[6px]', cursor: 'ns-resize' },
  e: { cls: '-right-[3px] inset-y-3 w-[6px]', cursor: 'ew-resize' },
  w: { cls: '-left-[3px] inset-y-3 w-[6px]', cursor: 'ew-resize' },
  ne: { cls: '-top-[3px] -right-[3px] w-4 h-4', cursor: 'nesw-resize' },
  nw: { cls: '-top-[3px] -left-[3px] w-4 h-4', cursor: 'nwse-resize' },
  se: { cls: '-bottom-[3px] -right-[3px] w-4 h-4', cursor: 'nwse-resize' },
  sw: { cls: '-bottom-[3px] -left-[3px] w-4 h-4', cursor: 'nesw-resize' },
}

export function FloatingWindow({ win, dispatch, area, title, icon, children, onSnapPreview }: {
  win: ManagedWindow
  dispatch: Dispatch<WindowAction>
  area: Area
  title: string
  icon?: ReactNode
  children: ReactNode
  /** Reports the half the pointer is arming while dragging the title bar (null when none). */
  onSnapPreview?: (half: Half | null) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  // Handlers read the latest props through refs so a drag survives re-renders
  const live = useRef({ win, area, onSnapPreview })
  live.current = { win, area, onSnapPreview }

  const stopDragging = () => {
    if (!drag.current) return
    drag.current = null
    document.body.classList.remove('is-resizing')
    document.body.style.cursor = ''
    live.current.onSnapPreview?.(null)
  }
  // If the window disappears mid-drag (close shortcut, agent switch), never leave the app in drag mode
  useEffect(() => stopDragging, [])

  const begin = (kind: Kind) => (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || live.current.win.maximized || live.current.win.minimized) return
    if (kind === 'move' && (e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y, w, h } = live.current.win
    drag.current = { kind, px: e.clientX, py: e.clientY, rect: { x, y, w, h }, snap: null }
    document.body.classList.add('is-resizing')
    document.body.style.cursor = kind === 'move' ? 'grabbing' : ZONE_LOOK[kind].cursor
  }

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current
    const { area: a, win: cur } = live.current
    if (!d || !isUsableArea(a)) return
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    if (d.kind === 'move') {
      dispatch({ type: 'move', id: cur.id, x: d.rect.x + dx, y: d.rect.y + dy, area: a })
      const left = rootRef.current?.parentElement?.getBoundingClientRect().left ?? 0
      const snap = snapZone(e.clientX - left, a)
      if (snap !== d.snap) { d.snap = snap; live.current.onSnapPreview?.(snap) }
    } else {
      dispatch({ type: 'resize', id: cur.id, ...resizeRect(d.kind, d.rect, dx, dy, a), area: a })
    }
  }

  const end = (commit: boolean) => (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    const { area: a, win: cur } = live.current
    if (commit && d.kind === 'move' && d.snap && isUsableArea(a)) dispatch({ type: 'snap', id: cur.id, half: d.snap, area: a })
    stopDragging()
  }

  const handlers = (kind: Kind) => ({
    onPointerDown: begin(kind),
    onPointerMove: onMove,
    onPointerUp: end(true),
    onPointerCancel: end(false),
    onLostPointerCapture: stopDragging,
  })

  const { maximized, minimized } = win
  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={title}
      // Capture phase: a click on any child (even a button) raises the window first
      onPointerDownCapture={() => dispatch({ type: 'focus', id: win.id })}
      className={cn('absolute', maximized && 'inset-0')}
      style={{
        zIndex: 10 + win.z,
        // Minimized windows stay mounted (terminals must keep their size and scrollback): hide, never unmount or display:none
        visibility: minimized ? 'hidden' : 'visible',
        pointerEvents: minimized ? 'none' : 'auto',
        ...(maximized ? {} : { left: win.x, top: win.y, width: win.w, height: win.h }),
      }}
    >
      <div className={cn('flex h-full w-full flex-col overflow-hidden border border-hairline bg-surface shadow-window', maximized ? 'rounded-none' : 'rounded-[12px]')}>
        <div
          {...handlers('move')}
          onDoubleClick={e => { if (!(e.target as HTMLElement).closest('button')) dispatch({ type: 'toggleMaximize', id: win.id }) }}
          className={cn('flex h-10 flex-none touch-none select-none items-center gap-1 border-b border-hairline bg-raised shadow-window-titlebar pl-3 pr-1', !maximized && 'cursor-grab')}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-ink">
            {icon && <span aria-hidden className="flex flex-none items-center text-ink-muted">{icon}</span>}
            <span className="truncate">{title}</span>
          </span>
          <IconButton label="Minimize" onClick={() => dispatch({ type: 'minimize', id: win.id })}><Minus size={15} /></IconButton>
          <IconButton label={maximized ? 'Restore' : 'Maximize'} active={maximized} onClick={() => dispatch({ type: 'toggleMaximize', id: win.id })}><Square size={13} /></IconButton>
          <IconButton label="Close" onClick={() => dispatch({ type: 'close', id: win.id })}><X size={16} /></IconButton>
        </div>
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
      {!maximized && !minimized && (Object.keys(ZONE_LOOK) as ResizeZone[]).map(zone => (
        <div
          key={zone}
          aria-hidden
          {...handlers(zone)}
          style={{ cursor: ZONE_LOOK[zone].cursor }}
          className={cn('absolute z-10 touch-none', ZONE_LOOK[zone].cls)}
        />
      ))}
    </div>
  )
}
