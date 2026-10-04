'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PanelLeft, Plus } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { groupByStatus, type StatusEntry } from '@/lib/agent-status'
import { getRuntimeMode } from '@/lib/runtime-mode'
import { resolveAgentTab } from '@/lib/shell-tabs'
import { useLayout } from '@/hooks/useLayout'
import { useTeams, useActiveMeetings } from '@/hooks/useTeams'
import { LIMITS } from '@/lib/panel-layout'
import { AGENT_TOOLS, agentToolForKey, toolLabel } from '@/lib/window-tools'
import type { ManagedWindow, WindowTool } from '@/lib/window-manager'
import AgentCreationWizard from '@/components/AgentCreationWizard'
import StatusSidebar from './StatusSidebar'
import AgentTopBar from './AgentTopBar'
import ResizeHandle from './ResizeHandle'
import ColonyHost, { ColonyFrame } from './ColonyHost'
import { ColonyCardEnvContext, type ColonyCardEnv } from './ColonyProfileCard'
import WorkArea, { type WorkAreaApi } from './WorkArea'
import TeamWorkspace from './TeamWorkspace'
import MiniPreview from './MiniPreview'
import { renderTool } from './PanelBody'
import { iconForTool, type MenuItem } from './PanelMenu'
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

const AGENT_MENU: MenuItem[] = AGENT_TOOLS.map(t => ({ id: t.id, label: t.label, key: t.key, icon: iconForTool(t.id) }))
const windowIcon = (w: ManagedWindow) => { const Icon = iconForTool(w.tool); return <Icon strokeWidth={1.5} className="w-3.5 h-3.5" /> }

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
  const { layout, dispatch } = useLayout()
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('team')
    if (id) { setTeamId(id); p.onSelectHome(); window.history.replaceState(null, '', '/') }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // A tool queued for an agent that is about to open (colony card) is dropped by any selection of someone else
  const [pendingTool, setPendingTool] = useState<{ tool: WindowTool; agentId: string } | null>(null)
  const selectAgent = (a: Agent) => { setPendingTool(cur => (cur && cur.agentId === a.id ? cur : null)); setTeamId(null); p.onSelectAgent(a) }
  const selectHome = () => { setPendingTool(null); setTeamId(null); p.onSelectHome() }
  const selectTeam = (id: string) => { setPendingTool(null); setTeamId(id); p.onSelectHome() }

  // Colony profile card actions. A tool opens in the workspace of the agent it is for, so for any
  // other agent we select it first and open the tool once its workspace (and its window API) is up.
  const workApi = useRef<WorkAreaApi | null>(null)
  const openToolFor = (tool: WindowTool, a: Agent) => {
    if (!teamId && agent?.id === a.id && workApi.current) { workApi.current.openTool(tool); return }
    selectAgent(a)
    setPendingTool({ tool, agentId: a.id })
  }
  // Backstop: a select the page rejects never activates the agent, so a stale request expires
  useEffect(() => {
    if (!pendingTool) return
    const t = setTimeout(() => setPendingTool(null), 3000)
    return () => clearTimeout(t)
  }, [pendingTool])
  useEffect(() => {
    if (!pendingTool || teamId || agent?.id !== pendingTool.agentId || !workApi.current) return
    workApi.current.openTool(pendingTool.tool)
    setPendingTool(null)
  }, [pendingTool, teamId, agent?.id])
  // Same rule as the top bar's Wake button: not online (asleep or offline) means wake it
  const needsWake = (a: Agent) => { const st = entryById[a.id]?.status ?? 'offline'; return st === 'asleep' || st === 'offline' }
  const colonyCard: ColonyCardEnv = {
    agents: p.agents, unread, wakingAgentId: p.wakingAgentId,
    onOpenWorkspace: selectAgent,
    onOpenTerminal: a => openToolFor('terminal', a),
    onOpenSkills: a => openToolFor('skills', a),
    needsWake,
    // Asleep/offline: a fresh session (New conversation). Online: just open its chat (Open chat).
    onNewConversation: a => {
      selectAgent(a)
      if (needsWake(a)) p.onWake(a)
    },
    onAgentsChanged: p.onAgentsChanged,
  }

  return (
    <ColonyHost agents={p.agents} onSelectAgent={selectAgent}>
    <ColonyCardEnvContext.Provider value={colonyCard}>
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
        <TeamWorkspace key={teamId} teamId={teamId} sidebarCollapsed={layout.sidebarCollapsed} onToggleSidebar={() => dispatch({ type: 'toggleSidebar' })} allAgents={p.agents} onlineAgents={p.onlineAgents}
          meetings={meetings} startMeeting={startMeeting} endMeeting={endMeeting}
          wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} now={now} />
      ) : agent ? (
        <WorkArea
          scopeId={agent.id} keyToTool={agentToolForKey} iconFor={windowIcon}
          titleFor={w => {
            const label = toolLabel(w.tool)
            const n = w.tool === 'inbox' ? unread[agent.id] ?? 0 : 0
            return n > 0 ? `${label} (${n})` : label
          }}
          renderContent={w => renderTool(w.tool, {
            agent, onlineAgents: p.onlineAgents, wakingAgentId: p.wakingAgentId, onWake: p.onWake, onShowProfile: p.onShowProfile, minimized: w.minimized, z: w.z,
          })}
          overlay={api => <MiniPreview hidden={api.isShowing('browser')} onOpen={() => api.openTool('browser')} />}
          top={api => {
            workApi.current = api
            return <AgentTopBar
              agent={agent} entry={entryById[agent.id]} now={now}
              busy={p.wakingAgentId === agent.id || sleepingId === agent.id}
              onSleep={() => sleep(agent)} onWake={() => p.onWake(agent)}
              onProfile={() => p.onShowProfile(agent)} onExport={() => api.openTool('export')}
              tools={AGENT_MENU} openToolIds={api.windows.map(w => w.tool)} onOpenTool={id => api.openTool(id as WindowTool)}
              hasWindows={api.windows.length > 0} allMinimized={api.allMinimized} onToggleAll={api.toggleAll}
              sidebarCollapsed={layout.sidebarCollapsed} onToggleSidebar={() => dispatch({ type: 'toggleSidebar' })}
            />
          }}
          center={
            <AgentTabContent agent={agent} activeTab={resolveAgentTab('chat', getRuntimeMode(agent.id))} setActiveTab={p.setActiveTab}
              onlineAgents={p.onlineAgents} wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile}
              hideHeaders chatVariant="ink" />
          }
        />
      ) : (
        <HomeScreen groups={groups} agents={p.agents} unread={unread} now={now} onSelectAgent={selectAgent} onNewAgent={() => setWizardOpen(true)} />
      )}

      {/* Fixed slot, after the workspace: the frame ties with its own window's z and must paint over it */}
      <ColonyFrame />

      {layout.sidebarCollapsed && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <IconButton label="Expand sidebar (⌘B)" onClick={() => dispatch({ type: 'toggleSidebar' })}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>
          <IconButton label="New agent" onClick={() => setWizardOpen(true)}><Plus strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      )}

      <CommandPalette
        open={paletteOpen} onOpenChange={setPaletteOpen} agents={p.agents}
        statusOf={a => LABEL[entryById[a.id]?.status ?? 'offline']}
        onSelectAgent={selectAgent} onSelectHome={selectHome} onSwitchClassic={p.onSwitchClassic}
        onCreateAgent={() => setWizardOpen(true)}
        teams={teams} onSelectTeam={selectTeam}
      />
      {wizardOpen && <AgentCreationWizard onClose={() => setWizardOpen(false)} onComplete={() => {
        setWizardOpen(false); p.onAgentsChanged()
        // The colony hears this and rescans at once — the new bot walks out right away
        window.dispatchEvent(new CustomEvent('aimaestro:colony-refresh'))
      }} />}
    </div>
    </ColonyCardEnvContext.Provider>
    </ColonyHost>
  )
}
