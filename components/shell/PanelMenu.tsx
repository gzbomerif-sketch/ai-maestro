'use client'

import { useEffect, useRef, useState } from 'react'
import { SquareTerminal, Inbox, FolderTree, Brain, GitBranch, FileText, LayoutPanelTop, Search, PlayCircle, Download, type LucideIcon } from 'lucide-react'
import { PANEL_TYPES, panelForKey, type PanelType } from '@/lib/panel-layout'

export const PANEL_ICONS: Record<PanelType, LucideIcon> = {
  terminal: SquareTerminal, inbox: Inbox, files: FolderTree, memory: Brain, graph: GitBranch,
  docs: FileText, canvas: LayoutPanelTop, search: Search, playback: PlayCircle, export: Download,
}

/** The ＋ menu: one row per tool, single-letter shortcuts while open. */
export default function PanelMenu({ open, onClose, onPick, openTypes, anchorRef }: {
  open: boolean; onClose: () => void; onPick: (t: PanelType) => void; openTypes: PanelType[]
  /** The toggle button: clicks on it must not count as "outside" (it toggles the menu itself) */
  anchorRef?: React.RefObject<HTMLElement>
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

  if (!open) return null
  const pick = (t: PanelType) => { onPick(t); onClose() }

  return (
    <div ref={ref} role="menu" aria-label="Open a tool" tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
        if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => (i + 1) % PANEL_TYPES.length); return }
        if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => (i - 1 + PANEL_TYPES.length) % PANEL_TYPES.length); return }
        if (e.key === 'Enter') { e.preventDefault(); pick(PANEL_TYPES[index].id); return }
        if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
          const t = panelForKey(e.key)
          if (t) { e.preventDefault(); pick(t) }
        }
      }}
      className="absolute left-0 top-full mt-1.5 z-40 w-[250px] rounded-[12px] border border-hairline bg-surface p-1.5 focus:outline-none">
      {PANEL_TYPES.map((p, i) => {
        const Icon = PANEL_ICONS[p.id]
        return (
          <button key={p.id} type="button" role="menuitem" onMouseEnter={() => setIndex(i)} onClick={() => pick(p.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] text-[14px] text-left ${i === index ? 'bg-raised text-ink' : 'text-gray-300'}`}>
            <Icon strokeWidth={1.5} className="w-4 h-4 text-ink-muted" />
            {p.label}
            {openTypes.includes(p.id) && <span className="text-[11px] text-gray-500">open</span>}
            <span className="ml-auto text-[12px] text-gray-500">{p.key}</span>
          </button>
        )
      })}
    </div>
  )
}
