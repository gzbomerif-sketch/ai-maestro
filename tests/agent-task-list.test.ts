import { describe, it, expect } from 'vitest'
import {
  isTeamTask, nextToggleStatus, normalizeSubject, applyTaskPatch,
  applyOptimisticToggle, removeTaskFromList, orderTasks, isCurrentEpoch, agentTasksUrl, type AgentTaskView,
} from '@/hooks/useAgentTasks'
import { priorityValue, priorityFromValue, nextDescDraft, shouldSaveDescription } from '@/components/tasks/AgentTaskList'

const t = (o: Partial<AgentTaskView> = {}): AgentTaskView => ({
  id: 't1', subject: 'Do it', status: 'pending', blockedBy: [], createdAt: '', updatedAt: '', source: 'personal', ...o,
})

describe('normalizeSubject', () => {
  it('trims', () => expect(normalizeSubject('  ship it  ')).toBe('ship it'))
  it('empty and whitespace-only do nothing', () => {
    expect(normalizeSubject('')).toBeNull()
    expect(normalizeSubject('   \n\t ')).toBeNull()
  })
})

describe('nextToggleStatus', () => {
  it('completed <-> pending', () => {
    expect(nextToggleStatus('completed')).toBe('pending')
    expect(nextToggleStatus('pending')).toBe('completed')
  })
  it('any open status completes', () => {
    for (const s of ['backlog', 'in_progress', 'review'] as const) expect(nextToggleStatus(s)).toBe('completed')
  })
})

describe('applyOptimisticToggle', () => {
  it('flips only the target personal task and does not mutate the input', () => {
    const list = [t({ id: 'a' }), t({ id: 'b', status: 'completed' })]
    const out = applyOptimisticToggle(list, 'a')
    expect(out.map(x => x.status)).toEqual(['completed', 'completed'])
    expect(list[0].status).toBe('pending')
    expect(applyOptimisticToggle(out, 'b').find(x => x.id === 'b')?.status).toBe('pending')
  })
  it('never touches team rows', () => {
    const list = [t({ id: 'a', source: 'team' })]
    expect(applyOptimisticToggle(list, 'a')).toEqual(list)
  })
  it('rollback is restoring the snapshot', () => {
    const snapshot = [t({ id: 'a' })]
    applyOptimisticToggle(snapshot, 'a')
    expect(snapshot[0].status).toBe('pending')
  })
})

describe('applyTaskPatch / removeTaskFromList', () => {
  it('patches by id, skipping team rows', () => {
    const list = [t({ id: 'a' }), t({ id: 'a', source: 'team' }), t({ id: 'b' })]
    const out = applyTaskPatch(list, 'a', { subject: 'New' })
    expect(out[0].subject).toBe('New')
    expect(out[1].subject).toBe('Do it')
    expect(out[2].subject).toBe('Do it')
  })
  it('removes personal task only', () => {
    const list = [t({ id: 'a' }), t({ id: 'a', source: 'team' })]
    expect(removeTaskFromList(list, 'a')).toEqual([list[1]])
  })
})

describe('isTeamTask / orderTasks', () => {
  it('detects team source', () => {
    expect(isTeamTask(t({ source: 'team' }))).toBe(true)
    expect(isTeamTask(t())).toBe(false)
  })
  it('puts completed last, otherwise stable', () => {
    const list = [t({ id: 'a', status: 'completed' }), t({ id: 'b' }), t({ id: 'c', status: 'completed' }), t({ id: 'd', status: 'in_progress' })]
    expect(orderTasks(list).map(x => x.id)).toEqual(['b', 'd', 'a', 'c'])
  })
})

describe('priority select mapping', () => {
  it('round-trips', () => {
    expect(priorityValue(undefined)).toBe('')
    expect(priorityValue(0)).toBe('0')
    expect(priorityFromValue('2')).toBe(2)
    expect(priorityFromValue('')).toBeUndefined()
  })
})

describe('isCurrentEpoch (rollback / inflight guard)', () => {
  it('applies only while the agent epoch is unchanged', () => {
    expect(isCurrentEpoch(3, 3)).toBe(true)
    expect(isCurrentEpoch(4, 3)).toBe(false) // agent switched mid-flight: skip rollback + decrement
    expect(isCurrentEpoch(5, 3)).toBe(false) // A -> B -> A is still a different epoch
  })
})

describe('description draft sync', () => {
  it('follows the server value when not dirty', () => {
    expect(nextDescDraft('old', 'fresh from poll', false)).toBe('fresh from poll')
  })
  it('keeps local edits while dirty', () => {
    expect(nextDescDraft('typing', 'fresh from poll', true)).toBe('typing')
  })
  it('focus + blur without typing sends nothing', () => {
    expect(shouldSaveDescription(false, 'stale', 'fresh')).toBe(false)
  })
  it('saves only a dirty draft that differs', () => {
    expect(shouldSaveDescription(true, 'new', 'old')).toBe(true)
    expect(shouldSaveDescription(true, 'same', 'same')).toBe(false)
  })
})

describe('agentTasksUrl', () => {
  it('is same-origin for local agents', () => expect(agentTasksUrl('a 1')).toBe('/api/agents/a%201/tasks'))
  it('targets the agent host for remote agents', () =>
    expect(agentTasksUrl('a1', 'http://mini:23000')).toBe('http://mini:23000/api/agents/a1/tasks'))
})
