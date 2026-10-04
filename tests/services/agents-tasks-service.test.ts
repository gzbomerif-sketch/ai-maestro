/**
 * Agents Tasks Service — personal + team task merge and CRUD
 *
 * task-registry, agent-registry and team-registry are mocked; the security
 * cases assert a rejected / unknown agent id never reaches the task registry
 * (which joins the id into a filesystem path).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Task } from '@/types/task'
import { type ServiceError } from '@/services/service-errors'

vi.mock('@/lib/task-registry', () => ({
  loadAgentTasks: vi.fn(),
  createAgentTask: vi.fn(),
  updateAgentTask: vi.fn(),
  deleteAgentTask: vi.fn(),
  loadTasks: vi.fn(),
}))
vi.mock('@/lib/agent-registry', () => ({ getAgent: vi.fn() }))
vi.mock('@/lib/team-registry', () => ({ loadTeams: vi.fn() }))

import * as taskRegistry from '@/lib/task-registry'
import { getAgent } from '@/lib/agent-registry'
import { loadTeams } from '@/lib/team-registry'
import { type AgentTaskView, listAgentTasks, createTask, patchTask, removeTask } from '@/services/agents-tasks-service'

const AGENT = 'agent-1'

function task(over: Partial<Task>): Task {
  return {
    id: 't', subject: 's', status: 'pending', blockedBy: [],
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getAgent).mockReturnValue({ id: AGENT } as never)
  vi.mocked(loadTeams).mockReturnValue([])
  vi.mocked(taskRegistry.loadAgentTasks).mockReturnValue([])
  vi.mocked(taskRegistry.loadTasks).mockReturnValue([])
})

describe('listAgentTasks', () => {
  it('merges personal and team tasks assigned to the agent, tagging sources', () => {
    vi.mocked(taskRegistry.loadAgentTasks).mockReturnValue([task({ id: 'p1', agentId: AGENT })])
    vi.mocked(loadTeams).mockReturnValue([{ id: 'team-a' }, { id: 'team-b' }] as never)
    vi.mocked(taskRegistry.loadTasks).mockImplementation((teamId: string) =>
      teamId === 'team-a'
        ? [
            task({ id: 'ta1', teamId: 'team-a', assigneeAgentId: AGENT }),
            task({ id: 'ta2', teamId: 'team-a', assigneeAgentId: 'other' }),
          ]
        : [task({ id: 'tb1', teamId: 'team-b', assigneeAgentId: AGENT })]
    )

    const result = listAgentTasks(AGENT)
    expect(result.status).toBe(200)
    expect((result.data as { tasks: AgentTaskView[] }).tasks.map(t => [t.id, t.source])).toEqual([
      ['p1', 'personal'],
      ['ta1', 'team'],
      ['tb1', 'team'],
    ])
  })

  it('returns empty list when nothing matches', () => {
    expect(listAgentTasks(AGENT).data).toEqual({ tasks: [] })
  })

  it('404s on unknown agent without touching the task registry', () => {
    vi.mocked(getAgent).mockReturnValue(null)
    const result = listAgentTasks('ghost')
    expect(result.status).toBe(404)
    expect(taskRegistry.loadAgentTasks).not.toHaveBeenCalled()
  })

  it.each(['../../etc', 'a/b', '..', 'a\\b', '', 'a b', 'x\0y'])(
    'rejects implausible agent id %j before any registry call',
    (bad) => {
      const result = listAgentTasks(bad)
      expect(result.status).toBe(404)
      expect(getAgent).not.toHaveBeenCalled()
      expect(taskRegistry.loadAgentTasks).not.toHaveBeenCalled()
      expect(loadTeams).not.toHaveBeenCalled()
    }
  )
})

describe('createTask', () => {
  it('creates a personal task for a known agent', () => {
    const created = task({ id: 'new', agentId: AGENT, subject: 'Do it' })
    vi.mocked(taskRegistry.createAgentTask).mockReturnValue(created)
    const result = createTask(AGENT, { subject: '  Do it  ', description: 'd', priority: 1 })
    expect(result).toEqual({ data: { task: created }, status: 201 })
    expect(taskRegistry.createAgentTask).toHaveBeenCalledWith({
      agentId: AGENT, subject: 'Do it', description: 'd', priority: 1,
    })
  })

  it.each([undefined, '', '   '])('400s on empty subject %j', (subject) => {
    const result = createTask(AGENT, { subject })
    expect(result.status).toBe(400)
    expect((result.data as ServiceError).error).toBe('missing_field')
    expect(taskRegistry.createAgentTask).not.toHaveBeenCalled()
  })

  it('404s on unknown agent', () => {
    vi.mocked(getAgent).mockReturnValue(null)
    expect(createTask('ghost', { subject: 'x' }).status).toBe(404)
    expect(taskRegistry.createAgentTask).not.toHaveBeenCalled()
  })

  it('rejects traversal ids before registry calls', () => {
    expect(createTask('../../x', { subject: 'x' }).status).toBe(404)
    expect(getAgent).not.toHaveBeenCalled()
    expect(taskRegistry.createAgentTask).not.toHaveBeenCalled()
  })
})

describe('patchTask', () => {
  it('updates a personal task', () => {
    const updated = task({ id: 't1', status: 'in_progress' })
    vi.mocked(taskRegistry.updateAgentTask).mockReturnValue(updated)
    const result = patchTask(AGENT, 't1', { status: 'in_progress' })
    expect(result).toEqual({ data: { task: updated }, status: 200 })
    expect(taskRegistry.updateAgentTask).toHaveBeenCalledWith(AGENT, 't1', { status: 'in_progress' })
  })

  it("rejects invalid status 'done'", () => {
    const result = patchTask(AGENT, 't1', { status: 'done' as never })
    expect(result.status).toBe(400)
    expect((result.data as ServiceError).error).toBe('invalid_field')
    expect(taskRegistry.updateAgentTask).not.toHaveBeenCalled()
  })

  it('rejects a blank subject', () => {
    const result = patchTask(AGENT, 't1', { subject: '   ' })
    expect(result.status).toBe(400)
    expect(taskRegistry.updateAgentTask).not.toHaveBeenCalled()
  })

  it('404s when task not found', () => {
    vi.mocked(taskRegistry.updateAgentTask).mockReturnValue(null)
    expect(patchTask(AGENT, 'nope', { subject: 'x' }).status).toBe(404)
  })

  it('404s on unknown agent', () => {
    vi.mocked(getAgent).mockReturnValue(null)
    expect(patchTask('ghost', 't1', { subject: 'x' }).status).toBe(404)
    expect(taskRegistry.updateAgentTask).not.toHaveBeenCalled()
  })
})

describe('removeTask', () => {
  it('deletes an existing personal task', () => {
    vi.mocked(taskRegistry.deleteAgentTask).mockReturnValue(true)
    expect(removeTask(AGENT, 't1')).toEqual({ data: { success: true }, status: 200 })
    expect(taskRegistry.deleteAgentTask).toHaveBeenCalledWith(AGENT, 't1')
  })

  it('404s when task not found', () => {
    vi.mocked(taskRegistry.deleteAgentTask).mockReturnValue(false)
    expect(removeTask(AGENT, 'nope').status).toBe(404)
  })

  it('404s on unknown agent', () => {
    vi.mocked(getAgent).mockReturnValue(null)
    expect(removeTask('ghost', 't1').status).toBe(404)
    expect(taskRegistry.deleteAgentTask).not.toHaveBeenCalled()
  })
})
