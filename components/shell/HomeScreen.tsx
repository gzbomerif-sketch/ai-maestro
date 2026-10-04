'use client'

import { Plus } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, formatAge, type StatusEntry, type StatusGroups } from '@/lib/agent-status'
import { Card, Row, Button } from './ui'
import AgentAvatar from '@/components/AgentAvatar'

const STATE_LABEL: Record<string, string> = { 'needs-you': 'Needs you', working: 'Working', idle: 'Idle', asleep: 'Asleep', offline: 'Offline' }

export default function HomeScreen({ groups, agents, unread, now, onSelectAgent, onNewAgent }: {
  groups: StatusGroups; agents: Agent[]; unread: Record<string, number>; now: number
  onSelectAgent: (a: Agent) => void; onNewAgent: () => void
}) {
  const all: StatusEntry[] = [...groups.needsYou, ...groups.working, ...groups.idle, ...groups.asleep]
  const attention = [
    ...groups.needsYou.map(e => ({ e, text: `Waiting for your input · ${formatAge(e.since, now)}` })),
    ...all.filter(e => e.status !== 'needs-you' && (unread[e.agent.id] ?? 0) > 0)
      .map(e => ({ e, text: `${unread[e.agent.id]} unread message${unread[e.agent.id] === 1 ? '' : 's'}` })),
  ]

  if (agents.length === 0) {
    return (
      <div className="flex-1 grid place-items-center p-10">
        <Card className="w-full max-w-[520px]">
          <Row title="Create your first agent" description="An agent is a Claude Code (or other CLI) session with its own folder, memory and inbox."
            control={<Button variant="accent" onClick={onNewAgent}><Plus strokeWidth={1.5} className="w-4 h-4" />New agent</Button>} />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-10 py-14">
      <div className="mx-auto w-full max-w-[760px]">
        {attention.length > 0 && (
          <>
            <h3 className="text-[15px] font-normal text-gray-400 mb-3">Needs you</h3>
            <Card className="mb-7">
              {attention.map(({ e, text }) => (
                <Row key={e.agent.id}
                  title={<span className="flex items-center gap-3"><AgentAvatar agent={e.agent} size="sm" showStatus />{displayName(e.agent)}</span>}
                  description={text}
                  control={<Button onClick={() => onSelectAgent(e.agent)}>Open</Button>} />
              ))}
            </Card>
          </>
        )}
        <h3 className="text-[15px] font-normal text-gray-400 mb-3">Agents</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
          {all.map(e => (
            <button type="button" key={e.agent.id} onClick={() => onSelectAgent(e.agent)}
              className="text-left flex flex-col gap-2.5 rounded-[14px] border border-hairline bg-surface p-3.5 hover:bg-raised/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill">
              <span className="flex items-center gap-2"><AgentAvatar agent={e.agent} size="sm" showStatus /><span className="text-[14px] font-medium text-ink truncate">{displayName(e.agent)}</span></span>
              <span className="text-[12px] text-ink-muted">{STATE_LABEL[e.status]}{e.since && e.status !== 'offline' ? ` ${formatAge(e.since, now)}` : ''}</span>
            </button>
          ))}
          <button type="button" onClick={onNewAgent}
            className="grid place-items-center rounded-[14px] border border-dashed border-hairline text-ink-muted hover:text-ink min-h-[78px]">
            <span className="flex items-center gap-2 text-[14px]"><Plus strokeWidth={1.5} className="w-4 h-4" />New</span>
          </button>
        </div>
      </div>
    </div>
  )
}
