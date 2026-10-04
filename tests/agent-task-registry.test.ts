/**
 * Tests for the per-agent (personal) task registry in lib/task-registry.ts.
 *
 * Storage: ~/.aimaestro/agents/<agentId>/tasks.json. os.homedir() is spied to a
 * temp dir per test so the real ~/.aimaestro is never touched (the agent path is
 * resolved at call time, so the spy takes effect without re-importing).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  loadAgentTasks,
  saveAgentTasks,
  createAgentTask,
  updateAgentTask,
  deleteAgentTask,
} from '@/lib/task-registry'

let home: string
let homeSpy: ReturnType<typeof vi.spyOn>

const agentDir = (id: string) => path.join(home, '.aimaestro', 'agents', id)

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tasks-'))
  homeSpy = vi.spyOn(os, 'homedir').mockReturnValue(home)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  homeSpy.mockRestore()
  vi.restoreAllMocks()
  fs.rmSync(home, { recursive: true, force: true })
})

describe('agent task registry', () => {
  it('returns [] for a missing or corrupt tasks file', () => {
    expect(loadAgentTasks('nonexistent-agent')).toEqual([])
    fs.mkdirSync(agentDir('bad'), { recursive: true })
    fs.writeFileSync(path.join(agentDir('bad'), 'tasks.json'), '{broken', 'utf-8')
    expect(loadAgentTasks('bad')).toEqual([])
  })

  it('creates, updates and completes a personal task', () => {
    const t = createAgentTask({ agentId: 'a1', subject: 'Write docs' })
    expect(t).toMatchObject({ agentId: 'a1', subject: 'Write docs', status: 'pending', blockedBy: [] })
    expect(t.teamId).toBeUndefined()
    const done = updateAgentTask('a1', t.id, { status: 'completed' })!
    expect(done.completedAt).toBeTruthy()
    expect(loadAgentTasks('a1')).toHaveLength(1)
  })

  it('deletes and reports missing ids', () => {
    const t = createAgentTask({ agentId: 'a1', subject: 'x' })
    expect(deleteAgentTask('a1', t.id)).toBe(true)
    expect(deleteAgentTask('a1', 'nope')).toBe(false)
  })

  it('a corrupt file still accepts new tasks', () => {
    fs.mkdirSync(agentDir('a2'), { recursive: true })
    fs.writeFileSync(path.join(agentDir('a2'), 'tasks.json'), '{broken', 'utf-8')
    const t = createAgentTask({ agentId: 'a2', subject: 'recover' })
    expect(loadAgentTasks('a2')).toEqual([expect.objectContaining({ id: t.id })])
  })

  it('persists in the TasksFile format under the agent directory', () => {
    const t = createAgentTask({ agentId: 'a3', subject: 'persist', priority: 1, teamId: 'team-9' })
    const raw = JSON.parse(fs.readFileSync(path.join(agentDir('a3'), 'tasks.json'), 'utf-8'))
    expect(raw.version).toBe(1)
    expect(raw.tasks[0]).toMatchObject({ id: t.id, agentId: 'a3', teamId: 'team-9', priority: 1 })
  })

  it('sets startedAt on in_progress/review and keeps it on later updates', () => {
    const t = createAgentTask({ agentId: 'a4', subject: 'work' })
    const started = updateAgentTask('a4', t.id, { status: 'in_progress' })!
    expect(started.startedAt).toBeTruthy()
    const reviewed = updateAgentTask('a4', t.id, { status: 'review' })!
    expect(reviewed.startedAt).toBe(started.startedAt)
  })

  it('ignores undefined updates and returns null for unknown task', () => {
    const t = createAgentTask({ agentId: 'a5', subject: 'keep', description: 'desc' })
    const updated = updateAgentTask('a5', t.id, { subject: undefined, description: 'new' })!
    expect(updated.subject).toBe('keep')
    expect(updated.description).toBe('new')
    expect(updateAgentTask('a5', 'nope', { status: 'completed' })).toBeNull()
  })

  it('saveAgentTasks round-trips and reports success', () => {
    const t = createAgentTask({ agentId: 'a6', subject: 'one' })
    expect(saveAgentTasks('a6', [t, { ...t, id: 'second' }])).toBe(true)
    expect(loadAgentTasks('a6').map(x => x.id)).toEqual([t.id, 'second'])
  })
})
