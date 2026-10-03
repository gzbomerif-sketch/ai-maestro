'use client'

import { useEffect, useMemo, useState } from 'react'
import { PanelLeft } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { groupByStatus, type StatusEntry } from '@/lib/agent-status'
import { getRuntimeMode } from '@/lib/runtime-mode'
import { resolveAgentTab } from '@/lib/shell-tabs'
import { useLayout } from '@/hooks/useLayout'
import { useTeams, useActiveMeetings } from '@/hooks/useTeams'
import { LIMITS } from '@/lib/panel-layout'
import AgentCreationWizard from '@/components/AgentCreationWizard'
import StatusSidebar from './StatusSidebar'
import AgentTopBar from './AgentTopBar'
import ResizeHandle from './ResizeHandle'
import PanelDock from './PanelDock'
import WorkArea from './WorkArea'
import TeamWorkspace from './TeamWorkspace'
import { IconButton } from './ui'
import HomeScreen from './HomeScreen'
import CommandPalette from './CommandPalette'
import AgentTabContent, { type AgentTab } from './AgentTabContent'

export interface AppShellProps {
  agents: Agent[]
  onlineAgents: Agent[]
  error: string | null
  onRetry: () => void
  activeAgentId: string | null
  onSelectAgent: (agent: Agent) => void
  onSelectHome: () => void
  activeTab: AgentTab
  setActiveTab: (t: AgentTab) => void
  wakingAgentId: string | null
  onWake: (agent: Agent) => void
  onSleep: (agent: Agent) => Promise<void>
  onShowProfile: (agent: Agent) => void
  onAgentsChanged: () => void
  onSwitchClassic: () => void
}

const LABEL: Record<string, string> = { 'needs-you': 'Needs you', working: 'Working', idle: 'Idle', asleep: 'Asleep', offline: 'Offline' }

/** Command-center desktop layout: sidebar · agent workspace · inbox, or Home when no agent is open. */
export default function AppShell(p: AppShellProps) {
  const { getSessionActivity, connected } = useSessionActivity()
  const unread = useUnreadCounts(p.agents)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  const groups = useMemo(() => groupByStatus(p.agents, a => getSessionActivity(a.name, a.id)), [p.agents, getSessionActivity])
  const entryById = useMemo(() => {
    const m: Record<string, StatusEntry> = {}
    for (const e of [...groups.needsYou, ...groups.working, ...groups.idle, ...groups.asleep]) m[e.agent.id] = e
    return m
  }, [groups])

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [sleepingId, setSleepingId] = useState<string | null>(null)

  const agent = p.activeAgentId ? p.agents.find(a => a.id === p.activeAgentId) : undefined
  const sleep = async (a: Agent) => { setSleepingId(a.id); try { await p.onSleep(a) } finally { setSleepingId(null) } }

  const [teamId, setTeamId] = useState<string | null>(null)
  const { teams, createTeam } = useTeams()
  const { meetings, startMeeting, endMeeting } = useActiveMeetings()
  const { layout, dispatch } = useLayout(teamId ? 'team' : 'agent')
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('team')
    if (id) { setTeamId(id); p.onSelectHome(); window.history.replaceState(null, '', '/') }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const selectAgent = (a: Agent) => { setTeamId(null); p.onSelectAgent(a) }
  const selectHome = () => { setTeamId(null); p.onSelectHome() }
  const selectTeam = (id: string) => { setTeamId(id); p.onSelectHome() }

  return (
    <div className="fixed inset-0 flex bg-sunken text-ink overflow-hidden">
      {!layout.sidebarCollapsed && (
        <>
          <StatusSidebar
            width={layout.sidebarW} onCollapse={() => dispatch({ type: 'toggleSidebar' })}
            teams={teams} meetings={meetings} activeTeamId={teamId} onSelectTeam={selectTeam} onCreateTeam={createTeam}
            agents={p.agents} groups={groups} activeAgentId={teamId ? null : agent ? agent.id : null} unread={unread} now={now}
            statusConnected={connected} error={p.error} onRetry={p.onRetry}
            onSelectAgent={selectAgent} onSelectHome={selectHome}
            onOpenPalette={() => setPaletteOpen(true)} onNewAgent={() => setWizardOpen(true)}
          />
          <ResizeHandle orientation="vertical" label="Drag to resize sidebar" value={layout.sidebarW}
            min={LIMITS.sidebar.min} max={LIMITS.sidebar.max}
            onResize={w => dispatch({ type: 'resizeSidebar', width: w })}
            onReset={() => dispatch({ type: 'resizeSidebar', width: LIMITS.sidebar.def })} />
        </>
      )}

      {teamId ? (
        <TeamWorkspace key={teamId} teamId={teamId} layout={layout} dispatch={dispatch} allAgents={p.agents} onlineAgents={p.onlineAgents}
          meetings={meetings} startMeeting={startMeeting} endMeeting={endMeeting}
          wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} now={now} />
      ) : agent ? (
        <WorkArea layout={layout} dispatch={dispatch} depKey={agent.id}
          top={
            <AgentTopBar
              agent={agent} entry={entryById[agent.id]} now={now}
              busy={p.wakingAgentId === agent.id || sleepingId === agent.id}
              onSleep={() => sleep(agent)} onWake={() => p.onWake(agent)}
              onProfile={() => p.onShowProfile(agent)} onExport={() => dispatch({ type: 'open', panel: 'export' })}
              panelOpen={layout.panel.open} onTogglePanel={() => dispatch({ type: 'toggle', scope: 'agent' })}
              sidebarCollapsed={layout.sidebarCollapsed} onToggleSidebar={() => dispatch({ type: 'toggleSidebar' })}
            />
          }
          center={
            <AgentTabContent agent={agent} activeTab={resolveAgentTab('chat', getRuntimeMode(agent.id))} setActiveTab={p.setActiveTab}
              onlineAgents={p.onlineAgents} wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile}
              hideHeaders chatVariant="ink" />
          }
          dock={
            <PanelDock layout={layout} dispatch={dispatch} agent={agent} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0}
              wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} />
          }
        />
      ) : (
        <HomeScreen groups={groups} agents={p.agents} unread={unread} now={now} onSelectAgent={selectAgent} onNewAgent={() => setWizardOpen(true)} />
      )}

      {layout.sidebarCollapsed && !agent && (
        <div className="absolute top-3 left-3 z-10">
          <IconButton label="Expand sidebar (⌘B)" onClick={() => dispatch({ type: 'toggleSidebar' })}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      )}

      <CommandPalette
        open={paletteOpen} onOpenChange={setPaletteOpen} agents={p.agents}
        statusOf={a => LABEL[entryById[a.id]?.status ?? 'offline']}
        onSelectAgent={selectAgent} onSelectHome={selectHome} onSwitchClassic={p.onSwitchClassic}
        teams={teams} onSelectTeam={selectTeam}
      />
      {wizardOpen && <AgentCreationWizard onClose={() => setWizardOpen(false)} onComplete={() => { setWizardOpen(false); p.onAgentsChanged() }} />}
    </div>
  )
}
