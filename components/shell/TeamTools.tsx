'use client'

import type { ReactNode } from 'react'
import type { Agent } from '@/types/agent'
import type { Team } from '@/types/team'
import { termAgentId } from '@/lib/team-panels'
import type { WindowTool } from '@/lib/window-manager'
import { useTasks } from '@/hooks/useTasks'
import { useDocuments } from '@/hooks/useDocuments'
import TaskKanbanBoard from '@/components/team-meeting/TaskKanbanBoard'
import TaskPanel from '@/components/team-meeting/TaskPanel'
import TeamDocumentsSection from '@/components/teams/TeamDocumentsSection'
import TeamInstructionsSection from '@/components/teams/TeamInstructionsSection'
import TeamOverviewSection from '@/components/teams/TeamOverviewSection'
import AgentTabContent from './AgentTabContent'
import BrowserPanel from './BrowserPanel'
import type { ToolEnv } from './PanelBody'

type UpdateTeam = (u: { name?: string; description?: string; agentIds?: string[]; instructions?: string }) => Promise<void>

function KanbanBody({ team, members }: { team: Team; members: Agent[] }) {
  const t = useTasks(team.id)
  return <div className="flex-1 min-w-0 overflow-auto"><TaskKanbanBoard agents={members} tasks={t.tasks} tasksByStatus={t.tasksByStatus}
    onUpdateTask={t.updateTask} onDeleteTask={t.deleteTask} onCreateTask={t.createTask} teamName={team.name} /></div>
}
function TasksBody({ team, members }: { team: Team; members: Agent[] }) {
  const t = useTasks(team.id)
  return <div className="flex-1 min-w-0 overflow-auto"><TaskPanel agents={members} tasks={t.tasks} pendingTasks={t.pendingTasks}
    inProgressTasks={t.inProgressTasks} completedTasks={t.completedTasks} onCreateTask={t.createTask} onUpdateTask={t.updateTask} onDeleteTask={t.deleteTask} /></div>
}
function MembersBody({ team, allAgents, updateTeam }: { team: Team; allAgents: Agent[]; updateTeam: UpdateTeam }) {
  const t = useTasks(team.id)
  const d = useDocuments(team.id)
  return <div className="flex-1 min-w-0 overflow-auto p-4"><TeamOverviewSection team={team} agents={allAgents} taskCount={t.tasks.length} docCount={d.documents.length} onUpdateTeam={updateTeam} /></div>
}

export interface TeamToolData {
  team: Team
  members: Agent[]
  allAgents: Agent[]
  updateTeam: UpdateTeam
}

/** One team tool's content inside a window: Kanban, Tasks, Documents, Instructions, Members, Browser, or a member's terminal. */
export function renderTeamTool(tool: WindowTool, d: TeamToolData, env: ToolEnv): ReactNode {
  const { team } = d
  const memberId = termAgentId(tool)
  if (memberId) {
    const agent = d.allAgents.find(a => a.id === memberId)
    if (!agent) return null
    return <AgentTabContent agent={agent} activeTab="terminal" setActiveTab={() => {}} onlineAgents={env.onlineAgents}
      wakingAgentId={env.wakingAgentId} onWake={env.onWake} onShowProfile={env.onShowProfile} hideHeaders chatVariant="ink" />
  }
  switch (tool) {
    case 'kanban': return <KanbanBody team={team} members={d.members} />
    case 'tasks': return <TasksBody team={team} members={d.members} />
    case 'documents': return <div className="flex-1 min-w-0 overflow-auto p-4"><TeamDocumentsSection teamId={team.id} /></div>
    case 'instructions': return <div className="flex-1 min-w-0 overflow-auto p-4"><TeamInstructionsSection instructions={team.instructions || ''} onSave={s => d.updateTeam({ instructions: s })} /></div>
    case 'members': return <MembersBody team={team} allAgents={d.allAgents} updateTeam={d.updateTeam} />
    case 'browser': return <BrowserPanel />
    default: return null
  }
}
