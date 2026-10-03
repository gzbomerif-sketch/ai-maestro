'use client'

import { useEffect, useRef, useState } from 'react'
import { keyboardStep } from '@/lib/panel-layout'

/** 1px divider with a wide invisible grip. Grey only; a tooltip appears on hover. */
export default function ResizeHandle({ orientation, value, min, max, invert = false, label, onResize, onReset }: {
  orientation: 'vertical' | 'horizontal'
  value: number
  min: number
  max: number
  invert?: boolean
  label: string
  onResize: (size: number) => void
  onReset: () => void
}) {
  const vertical = orientation === 'vertical'
  const drag = useRef<{ start: number; value: number } | null>(null)
  const [hover, setHover] = useState(false)
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // If the handle disappears mid-drag (⌘J, ⌘B, agent switch), never leave the app in drag mode
  const stopDragging = () => {
    drag.current = null
    document.body.classList.remove('is-resizing')
    document.body.style.cursor = ''
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    if (drag.current) stopDragging()
  }, [])

  const sign = invert ? -1 : 1
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { start: vertical ? e.clientX : e.clientY, value }
    document.body.classList.add('is-resizing')
    document.body.style.cursor = vertical ? 'col-resize' : 'row-resize'
    setTip(null)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) {
      if (hover && !tip) setTip({ x: e.clientX, y: e.clientY })
      return
    }
    const delta = ((vertical ? e.clientX : e.clientY) - drag.current.start) * sign
    onResize(drag.current.value + delta)
  }
  const end = (e: React.PointerEvent) => {
    if (!drag.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    stopDragging()
  }

  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={() => { if (drag.current) stopDragging() }}
      onDoubleClick={onReset}
      onKeyDown={e => {
        const step = keyboardStep(e.key, e.shiftKey)
        if (step) { e.preventDefault(); onResize(value + step * sign) }
      }}
      onPointerEnter={() => { timer.current = setTimeout(() => setHover(true), 400) }}
      onPointerLeave={() => { if (timer.current) clearTimeout(timer.current); setHover(false); setTip(null) }}
      className={`group relative flex-none z-10 focus-visible:outline-none ${vertical ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize'}`}
    >
      {/* the visible 1px line */}
      <span aria-hidden className={`absolute inset-0 transition-colors ${hover || drag.current ? 'bg-gray-600' : 'bg-hairline'} group-focus-visible:bg-gray-600`} />
      {/* wide invisible grip */}
      <span aria-hidden className={`absolute ${vertical ? 'inset-y-0 -left-1 -right-1' : 'inset-x-0 -top-1 -bottom-1'}`} />
      {hover && tip && !drag.current && (
        <span role="tooltip" style={{ left: tip.x + 14, top: tip.y - 10 }}
          className="fixed z-50 pointer-events-none whitespace-nowrap rounded-[8px] border border-hairline bg-surface px-2.5 py-1 text-[12.5px] text-ink">
          {label}
        </span>
      )}
    </div>
  )
}
