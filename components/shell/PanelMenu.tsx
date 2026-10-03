'use client'

import { useEffect, useRef, useState } from 'react'
import { SquareTerminal, Inbox, FolderTree, Brain, GitBranch, FileText, LayoutPanelTop, Search, PlayCircle, Download, type LucideIcon } from 'lucide-react'
import type { PanelType } from '@/lib/panel-layout'

export const PANEL_ICONS: Record<PanelType, LucideIcon> = {
  terminal: SquareTerminal, inbox: Inbox, files: FolderTree, memory: Brain, graph: GitBranch,
  docs: FileText, canvas: LayoutPanelTop, search: Search, playback: PlayCircle, export: Download,
}

export interface MenuItem { id: string; label: string; key?: string; icon: LucideIcon; section?: string }

/** ＋ menu: rows with optional section headers; single-key shortcuts while open. */
export default function ToolMenu({ open, onClose, anchorRef, items, openIds, onPick }: {
  open: boolean
  onClose: () => void
  /** The toggle button: clicks on it must not count as "outside" (it toggles the menu itself) */
  anchorRef?: React.RefObject<HTMLElement>
  items: MenuItem[]
  openIds: string[]
  onPick: (id: string) => void
}) {
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Reset the highlight and take focus only when the menu opens, not on every parent re-render
  useEffect(() => {
    if (!open) return
    setIndex(0)
    ref.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchorRef?.current?.contains(t)) return
      onCloseRef.current()
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open, anchorRef])

  if (!open || items.length === 0) return null
  const pick = (id: string) => { onPick(id); onClose() }

  return (
    <div ref={ref} role="menu" aria-label="Open a tool" tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
        if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => (i + 1) % items.length); return }
        if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => (i - 1 + items.length) % items.length); return }
        if (e.key === 'Enter') { e.preventDefault(); pick(items[index].id); return }
        if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
          const hit = items.find(it => it.key && it.key.toUpperCase() === e.key.toUpperCase())
          if (hit) { e.preventDefault(); pick(hit.id) }
        }
      }}
      className="absolute left-0 top-full mt-1.5 z-40 w-[250px] max-h-[70vh] overflow-y-auto rounded-[12px] border border-hairline bg-surface p-1.5 focus:outline-none">
      {items.map((it, i) => {
        const Icon = it.icon
        const header = it.section && it.section !== items[i - 1]?.section
        return (
          <div key={it.id}>
            {header && <div className="px-2.5 pt-2 pb-1 text-[11px] text-gray-500">{it.section}</div>}
            <button type="button" role="menuitem" onMouseEnter={() => setIndex(i)} onClick={() => pick(it.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] text-[14px] text-left ${i === index ? 'bg-raised text-ink' : 'text-gray-300'}`}>
              <Icon strokeWidth={1.5} className="w-4 h-4 text-ink-muted flex-none" />
              <span className="truncate">{it.label}</span>
              {openIds.includes(it.id) && <span className="text-[11px] text-gray-500">open</span>}
              {it.key && <span className="ml-auto text-[12px] text-gray-500">{it.key}</span>}
            </button>
          </div>
        )
      })}
    </div>
  )
}
