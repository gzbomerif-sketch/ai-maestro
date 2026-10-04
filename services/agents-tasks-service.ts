/**
 * Agents Tasks Service
 *
 * Personal task management for an agent, plus a read-only merge of team tasks
 * assigned to that agent. Routes are thin wrappers that call these functions.
 */

import {
  loadAgentTasks,
  createAgentTask,
  updateAgentTask,
  deleteAgentTask,
  loadTasks,
} from '@/lib/task-registry'
import { getAgent } from '@/lib/agent-registry'
import { loadTeams } from '@/lib/team-registry'
import type { Task, TaskStatus } from '@/types/task'
import { type ServiceResult, missingField, notFound, invalidField } from '@/services/service-errors'

export type AgentTaskSource = 'personal' | 'team'
export interface AgentTaskView extends Task { source: AgentTaskSource }

const TASK_STATUSES: readonly TaskStatus[] = ['backlog', 'pending', 'in_progress', 'review', 'completed']

/**
 * The task registry joins agentId into a filesystem path, so an id must be a
 * single safe path segment AND belong to a registered agent before any
 * registry call is made. Returns a 404 result when it does not (the same
 * answer for implausible and unknown ids, so nothing is leaked).
 */
const AGENT_ID = /^[a-zA-Z0-9_-]+$/

function requireAgent(agentId: string): ServiceResult<never> | null {
  if (typeof agentId !== 'string' || !AGENT_ID.test(agentId) || !getAgent(agentId)) {
    return notFound('Agent', typeof agentId === 'string' ? agentId.slice(0, 64) : undefined)
  }
  return null
}

/**
 * List an agent's personal tasks plus team tasks assigned to it.
 */
export function listAgentTasks(agentId: string): ServiceResult<{ tasks: AgentTaskView[] }> {
  const rejected = requireAgent(agentId)
  if (rejected) return rejected

  const tasks: AgentTaskView[] = loadAgentTasks(agentId).map(t => ({ ...t, source: 'personal' as const }))
  for (const team of loadTeams()) {
    for (const t of loadTasks(team.id)) {
      if (t.assigneeAgentId === agentId) tasks.push({ ...t, source: 'team' as const })
    }
  }
  return { data: { tasks }, status: 200 }
}

/**
 * Create a personal task for an agent.
 */
export function createTask(
  agentId: string,
  body: { subject?: string; description?: string; priority?: number }
): ServiceResult<{ task: Task }> {
  const rejected = requireAgent(agentId)
  if (rejected) return rejected

  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  if (!subject) return missingField('subject')

  const task = createAgentTask({
    agentId,
    subject,
    description: body.description,
    priority: body.priority,
  })
  return { data: { task }, status: 201 }
}

/**
 * Update a personal task (team tasks are managed through the team API).
 */
export function patchTask(
  agentId: string,
  taskId: string,
  body: Partial<Pick<Task, 'subject' | 'description' | 'status' | 'priority'>>
): ServiceResult<{ task: Task }> {
  const rejected = requireAgent(agentId)
  if (rejected) return rejected

  if (body?.status !== undefined && !TASK_STATUSES.includes(body.status)) {
    return invalidField('status', `status must be one of: ${TASK_STATUSES.join(', ')}`)
  }
  if (body?.subject !== undefined && (typeof body.subject !== 'string' || !body.subject.trim())) {
    return invalidField('subject', 'subject must be a non-empty string')
  }

  const task = updateAgentTask(agentId, taskId, {
    ...body,
    ...(body?.subject !== undefined ? { subject: body.subject.trim() } : {}),
  })
  if (!task) return notFound('Task', taskId)
  return { data: { task }, status: 200 }
}

/**
 * Delete a personal task.
 */
export function removeTask(agentId: string, taskId: string): ServiceResult<{ success: true }> {
  const rejected = requireAgent(agentId)
  if (rejected) return rejected

  if (!deleteAgentTask(agentId, taskId)) return notFound('Task', taskId)
  return { data: { success: true }, status: 200 }
}
