'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName } from '@/lib/agent-status'
import { rankCommandResults, shouldOpenPalette, type CommandItem } from '@/lib/command-palette'

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: Agent[]
  statusOf: (agent: Agent) => string
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  onSwitchClassic: () => void
}

const SCREENS: CommandItem[] = [
  { id: 'screen:home', kind: 'screen', label: 'Home', keywords: ['dashboard'] },
  { id: 'screen:/teams', kind: 'screen', label: 'Teams', keywords: [] },
  { id: 'screen:/team-meeting', kind: 'screen', label: 'Meetings', keywords: ['war room'] },
  { id: 'screen:/plugin-builder', kind: 'screen', label: 'Plugins', keywords: ['skills'] },
  { id: 'screen:/settings', kind: 'screen', label: 'Settings', keywords: ['hosts', 'preferences'] },
  { id: 'action:classic', kind: 'action', label: 'Switch to classic layout', keywords: ['old', 'layout'] },
]

export default function CommandPalette(p: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shouldOpenPalette(e, e.target as Element | null)) {
        e.preventDefault()
        p.onOpenChange(!p.open)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [p])

  useEffect(() => {
    if (p.open) { setQuery(''); setIndex(0); setTimeout(() => inputRef.current?.focus(), 0) }
  }, [p.open])

  const items = useMemo<CommandItem[]>(() => [
    ...p.agents.map(a => ({ id: `agent:${a.id}`, kind: 'agent' as const, label: displayName(a), keywords: [a.name, a.alias || '', a.hostId, ...(a.tags || [])].filter(Boolean), hint: p.statusOf(a) })),
    ...SCREENS,
  ], [p])
  const results = rankCommandResults(query, items).slice(0, 12)

  if (!p.open) return null

  const run = (item: CommandItem | undefined) => {
    if (!item) return
    p.onOpenChange(false)
    if (item.kind === 'agent') {
      const a = p.agents.find(x => `agent:${x.id}` === item.id)
      if (a) p.onSelectAgent(a)
    } else if (item.id === 'screen:home') p.onSelectHome()
    else if (item.id === 'action:classic') p.onSwitchClassic()
    else router.push(item.id.slice('screen:'.length))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); p.onOpenChange(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[index]) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[12vh]" onMouseDown={() => p.onOpenChange(false)}>
      <div role="dialog" aria-label="Command palette" onMouseDown={e => e.stopPropagation()}
        className="w-[560px] max-w-[92vw] rounded-[14px] border border-hairline bg-surface overflow-hidden">
        <div className="flex items-center gap-3 px-4 h-[52px] border-b border-hairline/70">
          <Search strokeWidth={1.5} className="w-4 h-4 text-ink-muted" />
          <input ref={inputRef} autoFocus value={query} onChange={e => { setQuery(e.target.value); setIndex(0) }} onKeyDown={onKeyDown}
            placeholder="Jump to an agent or screen…" aria-label="Search"
            className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-gray-500 focus:outline-none" />
          <span className="text-[12px] text-gray-500">Esc</span>
        </div>
        <ul role="listbox" className="max-h-[360px] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-ink-muted">No matches</li>}
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === index} onMouseEnter={() => setIndex(i)} onClick={() => run(r)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] cursor-pointer ${i === index ? 'bg-raised text-ink' : 'text-gray-300'}`}>
              <span className="truncate">{r.label}</span>
              <span className="ml-auto text-[12px] text-gray-500">{r.kind === 'agent' ? r.hint : r.kind === 'action' ? 'Action' : 'Go to'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
