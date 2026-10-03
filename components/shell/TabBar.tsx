'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AgentTab } from './AgentTabContent'

export const PRIMARY_TABS: { id: AgentTab; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'worktree', label: 'Files' },
  { id: 'memory', label: 'Memory' },
  { id: 'graph', label: 'Code graph' },
  { id: 'docs', label: 'Docs' },
]
export const MORE_TABS: { id: AgentTab; label: string }[] = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'search', label: 'Search' },
  { id: 'export', label: 'Export' },
  { id: 'playback', label: 'Playback' },
]

export interface TabBarProps { activeTab: AgentTab; onChange: (t: AgentTab) => void; streaming: boolean }

export default function TabBar({ activeTab, onChange, streaming }: TabBarProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  // In streaming mode, the Chat tab shows the streaming view (same as classic's Streaming tab).
  // Inbox lives in the right panel, so a stored 'messages' tab also shows Chat.
  const current: AgentTab = activeTab === 'streaming' || activeTab === 'messages' ? 'chat' : activeTab
  const pick = (t: AgentTab) => onChange(t === 'chat' && streaming ? 'streaming' : t)
  const moreActive = MORE_TABS.find(t => t.id === current)

  const tabCls = (on: boolean) =>
    `py-2.5 pb-3 text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${on ? 'text-ink shadow-[inset_0_-2px_0_rgb(var(--c-ink))]' : 'text-ink-muted hover:text-ink'}`

  return (
    <nav role="tablist" aria-label="Agent views" className="flex items-center gap-6 px-6 border-b border-hairline/70">
      {PRIMARY_TABS.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={current === t.id} onClick={() => pick(t.id)} className={tabCls(current === t.id)}>{t.label}</button>
      ))}
      <div ref={ref} className="relative">
        <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)} className={`${tabCls(!!moreActive)} flex items-center gap-1`}>
          {moreActive ? moreActive.label : 'More'}<ChevronDown strokeWidth={1.5} className="w-3 h-3" />
        </button>
        {open && (
          <div role="menu" className="absolute left-0 top-full mt-1 z-30 min-w-[160px] rounded-[12px] border border-hairline bg-surface p-1">
            {MORE_TABS.map(t => (
              <button key={t.id} type="button" role="menuitem" onClick={() => { onChange(t.id); setOpen(false) }}
                className={`w-full text-left px-3 py-2 rounded-[8px] text-[14px] ${current === t.id ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>{t.label}</button>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
