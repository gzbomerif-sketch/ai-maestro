'use client'

import { Archive, Circle, PlayCircle, Eye, CheckCircle2, Lock } from 'lucide-react'
import type { TaskWithDeps, TaskStatus } from '@/types/task'
import type { Agent } from '@/types/agent'
import { findAgentByRef } from '@/lib/agent-lookup'
import AgentAvatar from '@/components/AgentAvatar'

interface KanbanCardProps {
  task: TaskWithDeps
  onSelect: (task: TaskWithDeps) => void
  /** Agents in scope, so the assignee's real avatar can be shown */
  agents?: Agent[]
}

const statusIcon: Record<TaskStatus, typeof Circle> = {
  backlog: Archive,
  pending: Circle,
  in_progress: PlayCircle,
  review: Eye,
  completed: CheckCircle2,
}

export default function KanbanCard({ task, onSelect, agents }: KanbanCardProps) {
  const Icon = statusIcon[task.status]

  const handleDragStart = (e: React.DragEvent) => {
    if (task.isBlocked) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable={!task.isBlocked}
      onDragStart={handleDragStart}
      onClick={() => onSelect(task)}
      className={`
        group px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200
        bg-gray-800/80 border border-gray-700/50 hover:border-gray-600/80 hover:bg-gray-800
        ${task.isBlocked ? 'opacity-60 cursor-not-allowed' : 'active:opacity-50'}
      `}
    >
      {/* Subject */}
      <p className={`text-xs leading-snug line-clamp-2 ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
        {task.subject}
      </p>

      {/* Footer row */}
      <div className="flex items-center gap-2 mt-2">
        {task.isBlocked ? (
          <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
        ) : (
          <Icon className="w-3 h-3 text-gray-500 flex-shrink-0" />
        )}

        {task.assigneeName && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500 truncate">
            <AgentAvatar agent={findAgentByRef(agents ?? [], task.assigneeAgentId, task.assigneeName) ?? { id: task.assigneeAgentId ?? task.id, name: task.assigneeName }} size="xs" />
            {task.assigneeName}
          </span>
        )}

        <div className="flex-1" />

        {task.blockedBy.length > 0 && (
          <span className="text-[10px] text-amber-500/70 flex-shrink-0">
            {task.blockedBy.length} dep{task.blockedBy.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
