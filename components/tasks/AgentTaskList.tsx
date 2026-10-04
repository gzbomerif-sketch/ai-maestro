'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
import { ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Field, Textarea } from '@/components/shell/ui'
import type { TaskStatus } from '@/types/task'
import {
  useAgentTasks, isTeamTask, normalizeSubject, orderTasks, type AgentTaskView, type AgentTaskPatch,
} from '@/hooks/useAgentTasks'

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

const PRIORITIES: { value: number; label: string }[] = [
  { value: 0, label: 'High' },
  { value: 1, label: 'Medium' },
  { value: 2, label: 'Low' },
]

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'pending', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Done' },
]

/** Select value for a priority; '' shows the placeholder (the API cannot unset a priority). */
export function priorityValue(p: number | undefined): string {
  return typeof p === 'number' ? String(p) : ''
}

export function priorityFromValue(v: string): number | undefined {
  if (v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** The draft to show: local edits win while dirty, otherwise follow the server value. */
export function nextDescDraft(current: string, remote: string, dirty: boolean): string {
  return dirty ? current : remote
}

/** Only an edited draft that differs from the server value is worth a PATCH. */
export function shouldSaveDescription(dirty: boolean, draft: string, remote: string): boolean {
  return dirty && draft !== remote
}

// Menus portal to <body>; floating windows sit at z-index 10 + stack position
const POPUP_Z = 'z-[1000]'

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function TaskRow({ task, compact, onToggle, onUpdate, onRemove }: {
  task: AgentTaskView
  compact: boolean
  onToggle: (t: AgentTaskView) => void
  onUpdate: (id: string, patch: AgentTaskPatch) => Promise<boolean>
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [desc, setDesc] = useState(task.description ?? '')
  const [dirty, setDirty] = useState(false)
  const remoteDesc = task.description ?? ''

  // Poll-delivered (or rolled-back) descriptions replace the draft unless the user is mid-edit
  useEffect(() => { setDesc(d => nextDescDraft(d, remoteDesc, dirty)) }, [remoteDesc, dirty])

  const saveDescription = async () => {
    if (!shouldSaveDescription(dirty, desc, remoteDesc)) { setDirty(false); return }
    const ok = await onUpdate(task.id, { description: desc })
    // Success: server value now equals the draft. Failure: the task reverted, so drop the rejected text too.
    setDirty(false)
    if (!ok) setDesc(remoteDesc)
  }
  const team = isTeamTask(task)
  const done = task.status === 'completed'
  const expandable = !compact
  const canMutate = !team

  const label = (
    <span className={`min-w-0 flex-1 truncate text-[14px] ${done ? 'line-through text-ink-muted' : 'text-ink'}`} title={task.subject}>
      {task.subject}
    </span>
  )

  const checkbox = (
    <Checkbox
      checked={done}
      disabled={team}
      onCheckedChange={() => onToggle(task)}
      aria-label={`${done ? 'Reopen' : 'Complete'} ${task.subject}`}
    />
  )

  return (
    <li className="border-b border-hairline/60 last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-2 group">
        {team ? (
          <Tooltip>
            {/* span wrapper: a disabled button does not fire pointer events */}
            <TooltipTrigger asChild><span className="grid place-items-center" tabIndex={0}>{checkbox}</span></TooltipTrigger>
            <TooltipContent className={POPUP_Z}>Managed on the team kanban</TooltipContent>
          </Tooltip>
        ) : checkbox}
        {label}
        {team && (
          <span className="shrink-0 rounded-full border border-hairline px-1.5 text-[11px] leading-[18px] text-ink-muted">team</span>
        )}
        {expandable && canMutate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`Task actions for ${task.subject}`}
                className="grid place-items-center w-6 h-6 rounded-md text-ink-muted hover:text-ink hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={POPUP_Z}>
              <DropdownMenuItem onSelect={() => onRemove(task.id)} className="text-danger focus:text-danger">
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {expandable && (
          <button type="button" aria-label={open ? 'Collapse task' : 'Expand task'} aria-expanded={open}
            onClick={() => setOpen(o => !o)}
            className="grid place-items-center w-6 h-6 rounded-md text-ink-muted hover:text-ink hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fill">
            <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {expandable && open && (
        <div className="px-4 pb-3 pl-10 flex flex-col gap-2">
          {team ? (
            <p className="text-[13px] text-ink-muted whitespace-pre-wrap">{task.description || 'No description.'}</p>
          ) : (
            <Textarea
              value={desc}
              placeholder="Description"
              aria-label="Description"
              onChange={e => { setDesc(e.target.value); setDirty(true) }}
              onBlur={() => void saveDescription()}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={task.status} disabled={team} onValueChange={v => onUpdate(task.id, { status: v as TaskStatus })}>
              <SelectTrigger aria-label="Status" className="h-8 w-[140px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent className={POPUP_Z}>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityValue(task.priority)} disabled={team}
              onValueChange={v => { const p = priorityFromValue(v); if (p !== undefined) onUpdate(task.id, { priority: p }) }}>
              <SelectTrigger aria-label="Priority" className="h-8 w-[140px] text-[13px]"><SelectValue placeholder="No priority" /></SelectTrigger>
              <SelectContent className={POPUP_Z}>
                {typeof task.priority === 'number' && !PRIORITIES.some(p => p.value === task.priority) && (
                  <SelectItem value={String(task.priority)}>Priority {task.priority}</SelectItem>
                )}
                {PRIORITIES.map(p => <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

/**
 * One agent's tasks: personal todos (editable) plus team tasks assigned to it
 * (read-only here, they live on the team kanban). `compact` is the profile
 * card variant: quick-add and checkboxes only. `hostUrl` is the agent's base URL (getAgentBaseUrl).
 */
export default function AgentTaskList({ agentId, compact = false, hostUrl = '' }: { agentId: string | null; compact?: boolean; hostUrl?: string }) {
  const { tasks, loading, add, toggle, update, remove } = useAgentTasks(agentId, hostUrl)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** Runs a mutation, surfacing failures; resolves true when it succeeded. */
  const run = async (fn: () => Promise<void>): Promise<boolean> => {
    setError(null)
    try { await fn(); return true } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); return false }
  }

  const submit = () => {
    const subject = normalizeSubject(draft)
    if (!subject) return
    setDraft('')
    void run(async () => {
      try { await add(subject) } catch (e) { setDraft(subject); throw e }
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
  }

  const ordered = orderTasks(tasks)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col">
        <div className="px-4 py-2">
          <Field
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!agentId}
            placeholder="Add a task and press Enter"
            aria-label="Add a task"
            className="w-full"
          />
        </div>
        {error && <p role="alert" className="px-4 pb-1 text-[13px] text-danger">{error}</p>}
        {ordered.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-ink-muted">{loading ? 'Loading tasks…' : 'No tasks yet.'}</p>
        ) : (
          <ul>
            {ordered.map(t => (
              <TaskRow
                key={`${t.source}:${t.id}`}
                task={t}
                compact={compact}
                onToggle={task => void run(() => toggle(task))}
                onUpdate={(id, patch) => run(() => update(id, patch))}
                onRemove={id => void run(() => remove(id))}
              />
            ))}
          </ul>
        )}
      </div>
    </TooltipProvider>
  )
}
