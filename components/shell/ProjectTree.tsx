'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { displayName, type StatusEntry } from '@/lib/agent-status'
import { StatusDot, Badge } from './ui'
import AgentAvatar from '@/components/AgentAvatar'

export function buildTagTree(agents: Agent[]): [string, [string, Agent[]][]][] {
  const tree = new Map<string, Map<string, Agent[]>>()
  for (const a of agents) {
    const l1 = a.tags?.[0] || 'ungrouped'
    const l2 = a.tags?.[1] || 'default'
    if (!tree.has(l1)) tree.set(l1, new Map())
    const sub = tree.get(l1)!
    if (!sub.has(l2)) sub.set(l2, [])
    sub.get(l2)!.push(a)
  }
  return [...tree.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, sub]) => [k, [...sub.entries()].sort(([a], [b]) => a.localeCompare(b))])
}

export default function ProjectTree({ agents, groupsById, activeAgentId, unread, onSelectAgent }: {
  agents: Agent[]; groupsById: Record<string, StatusEntry>; activeAgentId: string | null
  unread: Record<string, number>; onSelectAgent: (a: Agent) => void
}) {
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setClosed(c => ({ ...c, [k]: !c[k] }))
  return (
    <div className="mt-2">
      {buildTagTree(agents).map(([l1, subs]) => (
        <div key={l1}>
          <button type="button" onClick={() => toggle(l1)} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-2">
            <ChevronRight strokeWidth={1.5} className={`w-3.5 h-3.5 transition-transform ${closed[l1] ? '' : 'rotate-90'}`} />{l1}
          </button>
          {!closed[l1] && subs.map(([l2, list]) => (
            <div key={l2} className="ml-4">
              {l2 !== 'default' && <div className="px-2.5 pt-1 text-[12px] text-gray-500">{l2}</div>}
              {list.map(a => (
                <button type="button" key={a.id} onClick={() => onSelectAgent(a)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[15px] transition-colors [transition-duration:120ms] ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill focus-visible:outline-offset-2 ${a.id === activeAgentId ? 'relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-accent-fill bg-raised text-ink' : 'text-gray-300 hover:bg-raised/60'}`}>
                  <AgentAvatar agent={a} size="xs" />
                  <span className="truncate">{displayName(a)}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {unread[a.id] > 0 && <Badge>{unread[a.id]}</Badge>}
                    <StatusDot status={groupsById[a.id]?.status ?? 'offline'} />
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
