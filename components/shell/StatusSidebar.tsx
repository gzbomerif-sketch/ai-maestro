'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, PanelLeft, Home, Settings, Users, Presentation, Boxes, Plus, AlertCircle } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, formatAge, type StatusEntry, type StatusGroups } from '@/lib/agent-status'
import { readPref, writePref, SIDEBAR_MODE_KEY } from '@/lib/safe-storage'
import { StatusDot, SectionLabel, Badge, IconButton } from './ui'
import ProjectTree from './ProjectTree'
import TeamSection from './TeamSection'
import type { Team, Meeting } from '@/types/team'

export interface StatusSidebarProps {
  agents: Agent[]
  groups: StatusGroups
  activeAgentId: string | null
  unread: Record<string, number>
  now: number
  statusConnected: boolean
  error: string | null
  onRetry: () => void
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  onOpenPalette: () => void
  onNewAgent: () => void
  width: number
  onCollapse: () => void
  teams: Team[]
  meetings: Meeting[]
  activeTeamId: string | null
  onSelectTeam: (id: string) => void
  onCreateTeam: (name: string) => Promise<string | null>
}

const initials = (name: string) => name.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

function AgentRow({ entry, active, unread, now, onSelect }: {
  entry: StatusEntry; active: boolean; unread: number; now: number; onSelect: () => void
}) {
  const name = displayName(entry.agent)
  const right = entry.status === 'working'
    ? <StatusDot status="working" />
    : <span className="text-[12px] text-gray-500">{entry.status === 'offline' ? 'Offline' : formatAge(entry.since, now)}</span>
  return (
    <button type="button" onClick={onSelect} aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill ${active ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
      <span className="text-[10px] text-gray-400 bg-raised/80 rounded-[5px] px-1.5 min-w-[22px] text-center">{initials(name)}</span>
      <span className="truncate">{name}</span>
      <span className="ml-auto flex items-center gap-1.5">{unread > 0 && <Badge>{unread}</Badge>}{right}</span>
    </button>
  )
}

const navLink = 'grid place-items-center w-[34px] h-[34px] rounded-[10px] text-ink-muted hover:text-ink hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill'

export default function StatusSidebar(p: StatusSidebarProps) {
  const [mode, setMode] = useState<'status' | 'project'>(() => readPref(SIDEBAR_MODE_KEY, 'status', ['status', 'project'] as const))
  const switchMode = (m: 'status' | 'project') => { setMode(m); writePref(SIDEBAR_MODE_KEY, m) }
  const byId = useMemo(() => {
    const map: Record<string, StatusEntry> = {}
    for (const e of [...p.groups.needsYou, ...p.groups.working, ...p.groups.idle, ...p.groups.asleep]) map[e.agent.id] = e
    return map
  }, [p.groups])

  const section = (label: string, list: StatusEntry[]) => list.length === 0 ? null : (
    <div key={label}>
      <SectionLabel count={list.length}>{label}</SectionLabel>
      {list.map(e => (
        <AgentRow key={e.agent.id} entry={e} active={e.agent.id === p.activeAgentId} unread={p.unread[e.agent.id] ?? 0} now={p.now} onSelect={() => p.onSelectAgent(e.agent)} />
      ))}
    </div>
  )

  return (
    <aside style={{ width: p.width }} className="flex-none flex flex-col bg-surface border-r border-hairline px-3 pt-4 pb-3 min-h-0">
      <div className="flex items-center gap-3 px-2.5 pb-4 text-[15px] font-medium text-ink">
        <button type="button" aria-label="Collapse sidebar" title="Collapse sidebar (⌘B)" onClick={p.onCollapse}
          className="grid place-items-center w-6 h-6 -ml-1 rounded-[6px] text-ink-muted hover:text-ink hover:bg-raised">
          <PanelLeft strokeWidth={1.5} className="w-4 h-4" />
        </button>AI Maestro
      </div>

      <button type="button" onClick={p.onOpenPalette} className="flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] text-ink-muted hover:bg-raised/60">
        <Search strokeWidth={1.5} className="w-4 h-4" />Search<span className="ml-auto text-[12px] text-gray-500">⌘K</span>
      </button>

      {p.error && (
        <div className="mx-1 mt-2 flex items-center gap-2 rounded-[10px] border border-hairline px-3 py-2 text-[13px] text-ink-muted">
          <AlertCircle strokeWidth={1.5} className="w-4 h-4 text-warn" />Can&apos;t reach host
          <button type="button" onClick={p.onRetry} className="ml-auto text-ink hover:underline">Retry</button>
        </div>
      )}
      {!p.statusConnected && !p.error && <div className="px-2.5 pt-1 text-[12px] text-gray-500">Status may be stale</div>}

      <button type="button" onClick={p.onSelectHome} aria-current={p.activeAgentId === null && p.activeTeamId === null ? 'page' : undefined}
        className={`mt-1 flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] ${p.activeAgentId === null && p.activeTeamId === null ? 'bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
        <Home strokeWidth={1.5} className="w-4 h-4" />Home
      </button>

      <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
        {p.groups.needsYou.map(e => (
          <button type="button" key={e.agent.id} onClick={() => p.onSelectAgent(e.agent)}
            className="w-full text-left mt-2.5 rounded-xl border border-warn-border bg-warn-surface px-3.5 py-3 hover:border-warn/60">
            <div className="flex items-center gap-2 text-[12px] text-warn"><StatusDot status="needs-you" />Needs you</div>
            <div className="mt-1 text-[15px] text-ink">Waiting for your input</div>
            <div className="text-[13px] text-ink-muted">{displayName(e.agent)} · {formatAge(e.since, p.now)}</div>
          </button>
        ))}

        <div className="flex items-center justify-end mt-3 mx-1">
          <div role="tablist" aria-label="Group agents by" className="flex rounded-full bg-raised/70 p-0.5 text-[12px]">
            {(['status', 'project'] as const).map(m => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}
                className={`px-2.5 py-0.5 rounded-full capitalize ${mode === m ? 'bg-ink text-sunken' : 'text-ink-muted'}`}>{m}</button>
            ))}
          </div>
        </div>

        {mode === 'status'
          ? <>{section('Working', p.groups.working)}{section('Idle', p.groups.idle)}{section('Asleep', p.groups.asleep)}</>
          : <ProjectTree agents={p.agents} groupsById={byId} activeAgentId={p.activeAgentId} unread={p.unread} onSelectAgent={p.onSelectAgent} />}
        <TeamSection teams={p.teams} meetings={p.meetings} activeTeamId={p.activeTeamId}
          onSelectTeam={p.onSelectTeam} onCreateTeam={p.onCreateTeam} />
      </div>

      <div className="flex items-center gap-1 pt-3 border-t border-hairline">
        <Link href="/settings" aria-label="Settings" title="Settings" className={navLink}><Settings strokeWidth={1.5} className="w-4 h-4" /></Link>
        <Link href="/teams" aria-label="Teams" title="Teams" className={navLink}><Users strokeWidth={1.5} className="w-4 h-4" /></Link>
        <Link href="/team-meeting" aria-label="Meetings" title="Meetings" className={navLink}><Presentation strokeWidth={1.5} className="w-4 h-4" /></Link>
        <Link href="/plugin-builder" aria-label="Plugins" title="Plugins" className={navLink}><Boxes strokeWidth={1.5} className="w-4 h-4" /></Link>
        <span className="ml-auto"><IconButton label="New agent" onClick={p.onNewAgent}><Plus strokeWidth={1.5} className="w-4 h-4" /></IconButton></span>
      </div>
    </aside>
  )
}
