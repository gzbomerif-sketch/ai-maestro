'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { TaskStatus } from '@/types/task'
import type { AgentTaskView } from '@/services/agents-tasks-service'

export type { AgentTaskView }

/** Fields the PATCH route accepts (anything else is dropped server-side). */
export type AgentTaskPatch = Partial<{ subject: string; description: string; status: TaskStatus; priority: number }>

const POLL_MS = 15_000

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/** Team-sourced rows live on the team kanban: this API only mutates personal tasks. */
export function isTeamTask(t: Pick<AgentTaskView, 'source'>): boolean {
  return t.source === 'team'
}

/** completed -> pending, anything else -> completed. */
export function nextToggleStatus(status: TaskStatus): TaskStatus {
  return status === 'completed' ? 'pending' : 'completed'
}

/** Trimmed subject, or null when the input is empty/whitespace (nothing to add). */
export function normalizeSubject(input: string): string | null {
  const s = input.trim()
  return s ? s : null
}

/** Merge a patch into one task. Other tasks (and unknown ids) pass through untouched. */
export function applyTaskPatch(tasks: AgentTaskView[], id: string, patch: AgentTaskPatch): AgentTaskView[] {
  return tasks.map(t => (t.id === id && !isTeamTask(t) ? { ...t, ...patch } : t))
}

/** Optimistic toggle of a personal task; team rows are never changed. */
export function applyOptimisticToggle(tasks: AgentTaskView[], id: string): AgentTaskView[] {
  return tasks.map(t => (t.id === id && !isTeamTask(t) ? { ...t, status: nextToggleStatus(t.status) } : t))
}

export function removeTaskFromList(tasks: AgentTaskView[], id: string): AgentTaskView[] {
  return tasks.filter(t => !(t.id === id && !isTeamTask(t)))
}

/** Open work first, completed last; otherwise the server order is kept (stable). */
export function orderTasks(tasks: AgentTaskView[]): AgentTaskView[] {
  const open = tasks.filter(t => t.status !== 'completed')
  const done = tasks.filter(t => t.status === 'completed')
  return [...open, ...done]
}

/**
 * A mutation's rollback/inflight bookkeeping only applies while the agent it
 * started for is still current. `epoch` bumps on every agent change, so even
 * A -> B -> A does not let a stale mutation touch the new state.
 */
export function isCurrentEpoch(current: number, startedAt: number): boolean {
  return current === startedAt
}

/** The agent's tasks route on its own host ('' = this host, see getAgentBaseUrl). */
export function agentTasksUrl(agentId: string, hostUrl = ''): string {
  return `${hostUrl}/api/agents/${encodeURIComponent(agentId)}/tasks`
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseAgentTasksResult {
  tasks: AgentTaskView[]
  loading: boolean
  add: (subject: string) => Promise<void>
  toggle: (task: AgentTaskView) => Promise<void>
  update: (id: string, patch: AgentTaskPatch) => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: () => void
}

/** `hostUrl` is the agent's base URL (getAgentBaseUrl): remote-host agents keep their tasks on their own host. */
export function useAgentTasks(agentId: string | null, hostUrl = ''): UseAgentTasksResult {
  const [tasks, setTasks] = useState<AgentTaskView[]>([])
  const [loading, setLoading] = useState(false)
  const tasksRef = useRef<AgentTaskView[]>([])
  const agentRef = useRef<string | null>(agentId)
  // While a mutation is in flight a poll result would clobber the optimistic state
  const inflight = useRef(0)
  // Bumped on every agent change; mutations remember the epoch they started in
  const epoch = useRef(0)

  agentRef.current = agentId

  const commit = useCallback((next: AgentTaskView[]) => {
    tasksRef.current = next
    setTasks(next)
  }, [])

  const fetchTasks = useCallback(async () => {
    if (!agentId) return
    try {
      const res = await fetch(agentTasksUrl(agentId, hostUrl))
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data = await res.json()
      if (agentRef.current !== agentId || inflight.current > 0) return
      commit(Array.isArray(data.tasks) ? data.tasks : [])
    } catch {
      // keep what we have; the next poll retries
    }
  }, [agentId, hostUrl, commit])

  useEffect(() => {
    epoch.current++
    inflight.current = 0
    commit([])
    if (!agentId) { setLoading(false); return }
    setLoading(true)
    fetchTasks().finally(() => setLoading(false))
    const timer = setInterval(fetchTasks, POLL_MS)
    return () => clearInterval(timer)
  }, [agentId, fetchTasks, commit])

  const base = agentId ? agentTasksUrl(agentId, hostUrl) : ''

  /** Optimistic mutation: apply, send, roll back to the pre-mutation list on failure. */
  const mutate = useCallback(async (optimistic: (prev: AgentTaskView[]) => AgentTaskView[], send: () => Promise<Response>, failure: string) => {
    if (!agentId) return
    const snapshot = tasksRef.current
    const startedAt = epoch.current
    commit(optimistic(snapshot))
    inflight.current++
    try {
      const res = await send()
      if (!res.ok) throw new Error(failure)
    } catch (err) {
      // The agent may have changed mid-flight: never write the old list into the new agent's state
      if (isCurrentEpoch(epoch.current, startedAt)) commit(snapshot)
      throw err instanceof Error ? err : new Error(failure)
    } finally {
      // The counter was reset on agent change; a stale mutation must not decrement the new one
      if (isCurrentEpoch(epoch.current, startedAt)) inflight.current--
    }
    void fetchTasks()
  }, [agentId, commit, fetchTasks])

  const add = useCallback(async (subject: string) => {
    const s = normalizeSubject(subject)
    if (!agentId || !s) return
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: s }),
    })
    if (!res.ok) throw new Error('Failed to add task')
    await fetchTasks()
  }, [agentId, base, fetchTasks])

  const update = useCallback(async (id: string, patch: AgentTaskPatch) => {
    const target = tasksRef.current.find(t => t.id === id)
    if (!target || isTeamTask(target)) return
    await mutate(
      prev => applyTaskPatch(prev, id, patch),
      () => fetch(`${base}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
      'Failed to update task',
    )
  }, [base, mutate])

  const toggle = useCallback(async (task: AgentTaskView) => {
    if (isTeamTask(task)) return
    await update(task.id, { status: nextToggleStatus(task.status) })
  }, [update])

  const remove = useCallback(async (id: string) => {
    const target = tasksRef.current.find(t => t.id === id)
    if (!target || isTeamTask(target)) return
    await mutate(
      prev => removeTaskFromList(prev, id),
      () => fetch(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
      'Failed to delete task',
    )
  }, [base, mutate])

  const refresh = useCallback(() => { void fetchTasks() }, [fetchTasks])

  return { tasks, loading, add, toggle, update, remove, refresh }
}
