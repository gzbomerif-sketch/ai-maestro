'use client'

import { useEffect } from 'react'
import { Columns3, ListChecks, FileText, ScrollText, Users, SquareTerminal, type LucideIcon } from 'lucide-react'
import type { Agent } from '@/types/agent'
import type { Team } from '@/types/team'
import type { LayoutAction, LayoutState } from '@/lib/panel-layout'
import { TEAM_TOOLS, termAgentId, termTab, teamTabLabel, type TeamTool } from '@/lib/team-panels'
import { displayName } from '@/lib/agent-status'
import { useTasks } from '@/hooks/useTasks'
import { useDocuments } from '@/hooks/useDocuments'
import TaskKanbanBoard from '@/components/team-meeting/TaskKanbanBoard'
import TaskPanel from '@/components/team-meeting/TaskPanel'
import TeamDocumentsSection from '@/components/teams/TeamDocumentsSection'
import TeamInstructionsSection from '@/components/teams/TeamInstructionsSection'
import TeamOverviewSection from '@/components/teams/TeamOverviewSection'
import AgentTabContent from './AgentTabContent'
import DockFrame from './DockFrame'

const TOOL_ICONS: Record<TeamTool, LucideIcon> = { kanban: Columns3, tasks: ListChecks, documents: FileText, instructions: ScrollText, members: Users }
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

/** Team tool panel: Kanban, Tasks, Documents, Instructions, Members, and member terminals. */
export default function TeamPanelDock({ layout, dispatch, team, members, allAgents, onlineAgents, updateTeam, wakingAgentId, onWake, onShowProfile }: {
  layout: LayoutState
  dispatch: React.Dispatch<LayoutAction>
  team: Team
  members: Agent[]
  allAgents: Agent[]
  onlineAgents: Agent[]
  updateTeam: UpdateTeam
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
}) {
  const p = layout.panel
  const memberKey = team.agentIds.join(',')
  useEffect(() => { dispatch({ type: 'pruneTeam', memberIds: team.agentIds }) }, [memberKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const nameOf = (id: string) => { const a = allAgents.find(x => x.id === id); return a ? displayName(a) : undefined }
  const iconOf = (tab: string): LucideIcon => termAgentId(tab) ? SquareTerminal : TOOL_ICONS[tab as TeamTool]
  const menuItems = [
    ...TEAM_TOOLS.map(t => ({ id: t.id, label: t.label, key: t.key, icon: TOOL_ICONS[t.id], section: 'Team' })),
    ...members.map((m, i) => ({ id: termTab(m.id), label: displayName(m), key: i < 9 ? String(i + 1) : undefined, icon: SquareTerminal, section: 'Member terminals' })),
  ]

  const active = p.teamActive
  const body = (() => {
    if (!active) return null
    const agentId = termAgentId(active)
    if (agentId) {
      const agent = allAgents.find(a => a.id === agentId)
      if (!agent) return null
      return <AgentTabContent key={active} agent={agent} activeTab="terminal" setActiveTab={() => {}} onlineAgents={onlineAgents}
        wakingAgentId={wakingAgentId} onWake={onWake} onShowProfile={onShowProfile} hideHeaders chatVariant="ink" />
    }
    switch (active) {
      case 'kanban': return <KanbanBody key={team.id} team={team} members={members} />
      case 'tasks': return <TasksBody key={team.id} team={team} members={members} />
      case 'documents': return <div key={team.id} className="flex-1 min-w-0 overflow-auto p-4"><TeamDocumentsSection teamId={team.id} /></div>
      case 'instructions': return <div key={team.id} className="flex-1 min-w-0 overflow-auto p-4"><TeamInstructionsSection instructions={team.instructions || ''} onSave={s => updateTeam({ instructions: s })} /></div>
      case 'members': return <MembersBody key={team.id} team={team} allAgents={allAgents} updateTeam={updateTeam} />
      default: return null
    }
  })()

  return (
    <DockFrame
      panel={p} dispatch={dispatch} scope="team"
      tabs={p.teamTabs.map(t => ({ id: t, label: teamTabLabel(t, nameOf), icon: iconOf(t) }))}
      active={active}
      onActivate={id => dispatch({ type: 'activateTeam', tab: id })}
      onClose={id => dispatch({ type: 'closeTeam', tab: id })}
      menuItems={menuItems}
      onPick={id => dispatch({ type: 'openTeam', tab: id })}
      emptyHint="Use ＋ for Kanban, Tasks, Documents, Instructions, Members or a member's terminal."
    >
      {body}
    </DockFrame>
  )
}
