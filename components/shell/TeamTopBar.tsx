'use client'

import { PanelLeft, PanelRight, Loader2 } from 'lucide-react'
import type { Agent } from '@/types/agent'
import type { Team, Meeting } from '@/types/team'
import { displayName, formatAge } from '@/lib/agent-status'
import { Button, IconButton } from './ui'

const initials = (n: string) => n.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

export default function TeamTopBar({ team, meeting, members, now, starting, onStart, onEnd, panelOpen, onTogglePanel, sidebarCollapsed, onToggleSidebar }: {
  team: Team
  meeting: Meeting | null
  members: Agent[]
  now: number
  starting: boolean
  onStart: () => void
  onEnd: () => void
  panelOpen: boolean
  onTogglePanel: () => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}) {
  const shown = members.slice(0, 5)
  return (
    <header className="h-[60px] flex-none flex items-center gap-3 px-6">
      {sidebarCollapsed && <IconButton label="Expand sidebar (⌘B)" onClick={onToggleSidebar}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>}
      <div className="flex items-center gap-2.5 text-[16px] text-ink-muted min-w-0">
        <span>Teams</span><span>/</span><span className="text-ink font-medium truncate">{team.name}</span>
      </div>
      {meeting && <span className="text-[13px] text-ok whitespace-nowrap flex-none">● Meeting · {formatAge(meeting.startedAt, now) || 'now'}</span>}
      <div className="ml-auto flex items-center gap-2 flex-none">
        <div className="flex" aria-label={`${members.length} members`}>
          {shown.map((m, i) => (
            <span key={m.id} title={displayName(m)}
              className={`grid place-items-center w-6 h-6 rounded-full bg-raised border-2 border-sunken text-[9px] text-gray-300 ${i ? '-ml-1.5' : ''}`}>{initials(displayName(m))}</span>
          ))}
          {members.length > shown.length && <span className="-ml-1.5 grid place-items-center w-6 h-6 rounded-full bg-raised border-2 border-sunken text-[9px] text-gray-400">+{members.length - shown.length}</span>}
        </div>
        {meeting
          ? <Button onClick={onEnd}>End meeting</Button>
          : <Button variant="accent" onClick={onStart} disabled={starting || members.length === 0} title={members.length === 0 ? 'Add members first' : undefined}>
              {starting && <Loader2 className="w-4 h-4 animate-spin" />}Start meeting
            </Button>}
        <IconButton label={panelOpen ? 'Hide panel (⌘J)' : 'Show panel (⌘J)'} onClick={onTogglePanel} active={panelOpen}><PanelRight strokeWidth={1.5} className="w-4 h-4" /></IconButton>
      </div>
    </header>
  )
}
