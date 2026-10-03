/**
 * Status vocabulary for the command-center shell. Pure: no React, no fetch.
 * Spec §6: needs-you / working / idle / asleep (+ offline shown inside asleep).
 */
import type { Agent } from '@/types/agent'
import type { SessionActivityInfo } from '@/hooks/useSessionActivity'

export type ShellStatus = 'needs-you' | 'working' | 'idle' | 'asleep' | 'offline'

export interface StatusEntry {
  agent: Agent
  status: ShellStatus
  since?: string
}

export interface StatusGroups {
  needsYou: StatusEntry[]
  working: StatusEntry[]
  idle: StatusEntry[]
  asleep: StatusEntry[]
}

export function isOnline(agent: Agent): boolean {
  return agent.session?.status === 'online' || agent.sessions?.[0]?.status === 'online'
}

export function isHibernated(agent: Agent): boolean {
  return !isOnline(agent) && (agent.sessions?.length ?? 0) > 0
}

export function displayName(agent: Agent): string {
  return agent.label || agent.name || agent.alias || agent.id
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const WEEK = 7 * DAY

export function formatAge(iso: string | undefined | null, now: number): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const diff = now - t
  if (diff < MIN) return 'now'
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`
  return `${Math.floor(diff / WEEK)}w`
}

function lastSeen(agent: Agent): string | undefined {
  return agent.session?.lastActivity ?? agent.sessions?.[0]?.lastActive
}

function byRecency(a: StatusEntry, b: StatusEntry): number {
  const ta = a.since ? Date.parse(a.since) || 0 : 0
  const tb = b.since ? Date.parse(b.since) || 0 : 0
  if (ta !== tb) return tb - ta
  return displayName(a.agent).toLowerCase().localeCompare(displayName(b.agent).toLowerCase())
}

export function groupByStatus(
  agents: Agent[],
  activityOf: (agent: Agent) => SessionActivityInfo | null,
): StatusGroups {
  const groups: StatusGroups = { needsYou: [], working: [], idle: [], asleep: [] }
  const offline: StatusEntry[] = []

  for (const agent of agents) {
    if (!isOnline(agent)) {
      const entry: StatusEntry = { agent, status: isHibernated(agent) ? 'asleep' : 'offline', since: lastSeen(agent) }
      ;(entry.status === 'asleep' ? groups.asleep : offline).push(entry)
      continue
    }
    const activity = activityOf(agent)
    const since = activity?.lastActivity ?? lastSeen(agent)
    if (activity?.status === 'waiting') groups.needsYou.push({ agent, status: 'needs-you', since })
    else if (activity?.status === 'active') groups.working.push({ agent, status: 'working', since })
    else groups.idle.push({ agent, status: 'idle', since })
  }

  groups.needsYou.sort(byRecency)
  groups.working.sort(byRecency)
  groups.idle.sort(byRecency)
  groups.asleep.sort(byRecency)
  offline.sort(byRecency)
  groups.asleep.push(...offline)
  return groups
}
