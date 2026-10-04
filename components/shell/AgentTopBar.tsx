'use client'

import { useEffect, useRef, useState } from 'react'
import { Moon, Power, ExternalLink, MoreHorizontal, PanelLeft, Loader2 } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, formatAge, type StatusEntry } from '@/lib/agent-status'
import { Button, IconButton } from './ui'
import AgentAvatar from '@/components/AgentAvatar'
import { WindowLauncher, type MenuItem } from './PanelMenu'

export interface AgentTopBarProps {
  agent: Agent
  entry: StatusEntry | undefined
  now: number
  busy: boolean
  onSleep: () => void
  onWake: () => void
  onProfile: () => void
  onExport: () => void
  /** Window launcher (＋) entries, the ids already open, and the minimize/restore-all toggle */
  tools: MenuItem[]
  openToolIds: string[]
  onOpenTool: (id: string) => void
  hasWindows: boolean
  allMinimized: boolean
  onToggleAll: () => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

const LABEL: Record<string, string> = { 'needs-you': 'Needs you', working: 'Working', idle: 'Idle', asleep: 'Asleep', offline: 'Offline' }

export default function AgentTopBar(p: AgentTopBarProps) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(false) }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [menu])

  const status = p.entry?.status ?? 'offline'
  const asleep = status === 'asleep' || status === 'offline'
  const age = formatAge(p.entry?.since, p.now)
  const host = p.agent.session?.hostName || p.agent.hostId || 'this Mac'
  const tone = status === 'working' ? 'text-accent' : status === 'needs-you' ? 'text-warn' : 'text-ink-muted'
  const dot = status === 'working' ? 'bg-accent-fill ring-[3px] ring-accent-fill/20' : status === 'needs-you' ? 'bg-warn' : 'bg-gray-600'

  return (
    <header className="h-[60px] flex-none flex items-center gap-3 px-6">
      {p.sidebarCollapsed && <IconButton label="Expand sidebar (⌘B)" onClick={p.onToggleSidebar}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>}
      <div className="flex items-center gap-2.5 text-[16px] text-ink-muted min-w-0">
        <span className="truncate">{host === 'local' ? 'this Mac' : host}</span>
        <span>/</span>
        <AgentAvatar agent={p.agent} size="sm" />
        <span className="text-ink font-medium truncate">{displayName(p.agent)}</span>
      </div>
      <span className={`flex items-center gap-2 text-[13px] ml-2 whitespace-nowrap flex-none ${tone}`}>
        <span className={`w-[7px] h-[7px] rounded-full ${dot}`} />{LABEL[status]}{age && status !== 'offline' ? ` · ${age}` : ''}
      </span>
      <div className="ml-auto flex items-center gap-2 flex-none">
        {asleep
          ? <Button onClick={p.onWake} disabled={p.busy}>{p.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power strokeWidth={1.5} className="w-4 h-4" />}Wake</Button>
          : <Button onClick={p.onSleep} disabled={p.busy}>{p.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Moon strokeWidth={1.5} className="w-4 h-4" />}Sleep</Button>}
        <a href={`/zoom/agent?id=${encodeURIComponent(p.agent.id)}`} target="_blank" rel="noopener noreferrer" aria-label="Pop out" title="Pop out"
          className="grid place-items-center w-[34px] h-[34px] rounded-[10px] border border-control-border text-ink hover:bg-raised"><ExternalLink strokeWidth={1.5} className="w-4 h-4" /></a>
        <div ref={ref} className="relative">
          <IconButton label="More actions" onClick={() => setMenu(m => !m)} active={menu}><MoreHorizontal strokeWidth={1.5} className="w-4 h-4" /></IconButton>
          {menu && (
            <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-[180px] rounded-[12px] border border-hairline bg-surface p-1">
              <button type="button" role="menuitem" onClick={() => { setMenu(false); p.onProfile() }} className="w-full text-left px-3 py-2 rounded-[8px] text-[14px] text-gray-300 hover:bg-raised/60">Profile</button>
              <button type="button" role="menuitem" onClick={() => { setMenu(false); p.onExport() }} className="w-full text-left px-3 py-2 rounded-[8px] text-[14px] text-gray-300 hover:bg-raised/60">Export transcript</button>
            </div>
          )}
        </div>
        <WindowLauncher items={p.tools} openIds={p.openToolIds} onPick={p.onOpenTool}
          hasWindows={p.hasWindows} allMinimized={p.allMinimized} onToggleAll={p.onToggleAll} />
      </div>
    </header>
  )
}
