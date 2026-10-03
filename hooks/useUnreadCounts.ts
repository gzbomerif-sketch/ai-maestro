'use client'

/**
 * Unread message counts for every agent, polled every 10s. One shared source for
 * the shell's sidebar dots, inbox header and Home. A failing host keeps its last
 * known counts instead of blanking them.
 */
import { useEffect, useRef, useState } from 'react'
import type { Agent } from '@/types/agent'
import { getAgentBaseUrl } from '@/lib/agent-utils'

export function mergeUnreadCounts(
  prev: Record<string, number>,
  results: { id: string; outcome: PromiseSettledResult<number> }[],
): Record<string, number> {
  const next: Record<string, number> = {}
  for (const { id, outcome } of results) {
    next[id] = outcome.status === 'fulfilled' ? outcome.value : prev[id] ?? 0
  }
  return next
}

/** One agent's unread count; an unreachable host is abandoned after `timeoutMs`. */
export async function fetchUnreadCount(agent: Agent, fetchImpl: typeof fetch = fetch, timeoutMs = 5_000): Promise<number> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const base = getAgentBaseUrl(agent)
    const res = await fetchImpl(`${base}/api/messages?agent=${encodeURIComponent(agent.id)}&action=unread-count`, { signal: controller.signal })
    if (!res.ok) throw new Error(`unread-count ${res.status}`)
    const data = await res.json()
    return typeof data.count === 'number' ? data.count : 0
  } finally {
    clearTimeout(timer)
  }
}

export function useUnreadCounts(agents: Agent[], intervalMs = 10_000): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const agentsRef = useRef(agents)
  agentsRef.current = agents
  const idsKey = agents.map(a => a.id).join(',')

  useEffect(() => {
    let cancelled = false
    let inFlight = false
    const tick = async () => {
      if (inFlight) return  // a slow host must not stack up requests
      inFlight = true
      try {
        const list = agentsRef.current
        const outcomes = await Promise.allSettled(list.map(a => fetchUnreadCount(a)))
        if (cancelled) return
        setCounts(prev => mergeUnreadCounts(prev, list.map((a, i) => ({ id: a.id, outcome: outcomes[i] }))))
      } finally {
        inFlight = false
      }
    }
    tick()
    const t = setInterval(tick, intervalMs)
    return () => { cancelled = true; clearInterval(t) }
  }, [idsKey, intervalMs])

  return counts
}
