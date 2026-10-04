'use client'

import { useCallback, useState } from 'react'
import type { Agent } from '@/types/agent'
import type { Team, Meeting } from '@/types/team'
import { TEAM_TOOLS, activeMeetingFor, teamScope, teamTabForKey, termAgentId, termTab } from '@/lib/team-panels'
import type { ManagedWindow, WindowTool } from '@/lib/window-manager'
import { toolLabel } from '@/lib/window-tools'
import { displayName } from '@/lib/agent-status'
import { useTeam } from '@/hooks/useTeam'
import { Notice } from './ui'
import WorkArea from './WorkArea'
import TeamTopBar from './TeamTopBar'
import TeamChat from './TeamChat'
import MiniPreview from './MiniPreview'
import { renderTool } from './PanelBody'
import { iconForTool, type MenuItem } from './PanelMenu'
import { SquareTerminal } from 'lucide-react'

export default function TeamWorkspace({ teamId, sidebarCollapsed, onToggleSidebar, allAgents, onlineAgents, meetings, startMeeting, endMeeting, wakingAgentId, onWake, onShowProfile, now }: {
  teamId: string
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
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
  const memberKey = team?.agentIds.join(',') ?? ''
  // A member who left the team takes their terminal window with them (the team record is the source of truth, not the loaded agents)
  const isStale = useCallback((w: ManagedWindow) => {
    const member = termAgentId(w.tool)
    return !!member && w.agentId === teamScope(teamId) && !memberKey.split(',').includes(member)
  }, [teamId, memberKey])
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

  const scope = teamScope(team.id)
  const nameOf = (id: string) => { const a = allAgents.find(x => x.id === id); return a ? displayName(a) : undefined }
  const menu: MenuItem[] = [
    ...TEAM_TOOLS.map(t => ({ id: t.id, label: t.label, key: t.key, icon: iconForTool(t.id), section: 'Team' })),
    ...members.map((m, i) => ({ id: termTab(m.id), label: displayName(m), key: i < 9 ? String(i + 1) : undefined, icon: SquareTerminal, section: 'Member terminals' })),
  ]

  return (
    <WorkArea
      scopeId={scope} isStale={isStale}
      keyToTool={key => teamTabForKey(key, team.agentIds)}
      titleFor={w => toolLabel(w.tool, nameOf)}
      iconFor={w => { const Icon = iconForTool(w.tool); return <Icon strokeWidth={1.5} className="w-3.5 h-3.5" /> }}
      renderContent={w => renderTool(w.tool, {
        agent: null, onlineAgents, wakingAgentId, onWake, onShowProfile, minimized: w.minimized,
        team: { team, members, allAgents, updateTeam },
      })}
      overlay={api => <MiniPreview hidden={api.isShowing('browser')} onOpen={() => api.openTool('browser')} />}
      top={api => <TeamTopBar team={team} meeting={meeting} members={members} now={now} starting={starting} onStart={start}
        onEnd={end}
        tools={menu} openToolIds={api.windows.map(w => w.tool)} onOpenTool={id => api.openTool(id as WindowTool)}
        hasWindows={api.windows.length > 0} allMinimized={api.allMinimized} onToggleAll={api.toggleAll}
        sidebarCollapsed={sidebarCollapsed} onToggleSidebar={onToggleSidebar} />}
      center={
        <div className="flex-1 min-w-0 flex flex-col">
          {failure && <div className="px-8 pt-3"><Notice tone="error">{failure}</Notice></div>}
          <TeamChat key={team.id} team={team} meeting={meeting} members={members} onStart={start} starting={starting} />
        </div>
      }
    />
  )
}
