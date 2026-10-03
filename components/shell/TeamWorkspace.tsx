'use client'

import { useState } from 'react'
import type { Agent } from '@/types/agent'
import type { Team, Meeting } from '@/types/team'
import type { LayoutAction, LayoutState } from '@/lib/panel-layout'
import { activeMeetingFor } from '@/lib/team-panels'
import { useTeam } from '@/hooks/useTeam'
import { Notice } from './ui'
import WorkArea from './WorkArea'
import TeamTopBar from './TeamTopBar'
import TeamChat from './TeamChat'
import TeamPanelDock from './TeamPanelDock'

export default function TeamWorkspace({ teamId, layout, dispatch, allAgents, onlineAgents, meetings, startMeeting, endMeeting, wakingAgentId, onWake, onShowProfile, now }: {
  teamId: string
  layout: LayoutState
  dispatch: React.Dispatch<LayoutAction>
  allAgents: Agent[]
  onlineAgents: Agent[]
  meetings: Meeting[]
  startMeeting: (t: Team) => Promise<boolean>
  endMeeting: (id: string) => Promise<boolean>
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
  now: number
}) {
  const { team, updateTeam, error } = useTeam(teamId)
  const [starting, setStarting] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  if (!team) {
    return <div className="flex-1 grid place-items-center">{error ? <Notice tone="error">Team not found.</Notice> : <Notice>Loading team…</Notice>}</div>
  }
  const members = team.agentIds.map(id => allAgents.find(a => a.id === id)).filter((a): a is Agent => !!a)
  const meeting = activeMeetingFor(team.id, meetings)
  const start = async () => {
    setStarting(true); setFailure(null)
    try { if (!(await startMeeting(team))) setFailure('Could not start the meeting. Try again.') } finally { setStarting(false) }
  }
  const end = async () => {
    if (!meeting) return
    setFailure(null)
    if (!(await endMeeting(meeting.id))) setFailure('Could not end the meeting. Try again.')
  }

  return (
    <WorkArea layout={layout} dispatch={dispatch} depKey={team.id}
      top={<TeamTopBar team={team} meeting={meeting} members={members} now={now} starting={starting} onStart={start}
        onEnd={end}
        panelOpen={layout.panel.open} onTogglePanel={() => dispatch({ type: 'toggle', scope: 'team' })}
        sidebarCollapsed={layout.sidebarCollapsed} onToggleSidebar={() => dispatch({ type: 'toggleSidebar' })} />}
      center={
        <div className="flex-1 min-w-0 flex flex-col">
          {failure && <div className="px-8 pt-3"><Notice tone="error">{failure}</Notice></div>}
          <TeamChat key={team.id} team={team} meeting={meeting} members={members} onStart={start} starting={starting} />
        </div>
      }
      dock={<TeamPanelDock layout={layout} dispatch={dispatch} team={team} members={members} allAgents={allAgents} onlineAgents={onlineAgents}
        updateTeam={updateTeam} wakingAgentId={wakingAgentId} onWake={onWake} onShowProfile={onShowProfile} />}
    />
  )
}
