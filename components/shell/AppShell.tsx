'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PanelLeft } from 'lucide-react'
import type { Agent } from '@/types/agent'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { groupByStatus, type StatusEntry } from '@/lib/agent-status'
import { getRuntimeMode } from '@/lib/runtime-mode'
import { resolveAgentTab } from '@/lib/shell-tabs'
import { useLayout } from '@/hooks/useLayout'
import { LIMITS, panelLimits, panelOverlays, shouldRestoreOnEscape, shownSize } from '@/lib/panel-layout'
import AgentCreationWizard from '@/components/AgentCreationWizard'
import StatusSidebar from './StatusSidebar'
import AgentTopBar from './AgentTopBar'
import ResizeHandle from './ResizeHandle'
import PanelDock from './PanelDock'
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

  const { layout, dispatch } = useLayout()
  const workRef = useRef<HTMLDivElement>(null)
  const [work, setWork] = useState({ w: 1200, h: 800 })
  useEffect(() => {
    const el = workRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWork({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [agent?.id])
  const P = layout.panel
  const container = P.position === 'right' ? work.w : work.h
  const lim = panelLimits(P.position, container)
  const shownRight = shownSize(P.rightW, lim)
  const shownBottom = shownSize(P.bottomH, lim)
  const overlay = P.position === 'right' && panelOverlays(work.w, shownRight)
  useEffect(() => {
    if (!P.maximized) return
    const onKey = (e: KeyboardEvent) => { if (shouldRestoreOnEscape({ key: e.key, defaultPrevented: e.defaultPrevented, target: e.target as Element | null })) dispatch({ type: 'restore' }) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [P.maximized, dispatch])

  return (
    <div className="fixed inset-0 flex bg-sunken text-ink overflow-hidden">
      {!layout.sidebarCollapsed && (
        <>
          <StatusSidebar
            width={layout.sidebarW} onCollapse={() => dispatch({ type: 'toggleSidebar' })}
            agents={p.agents} groups={groups} activeAgentId={agent ? agent.id : null} unread={unread} now={now}
            statusConnected={connected} error={p.error} onRetry={p.onRetry}
            onSelectAgent={p.onSelectAgent} onSelectHome={p.onSelectHome}
            onOpenPalette={() => setPaletteOpen(true)} onNewAgent={() => setWizardOpen(true)}
          />
          <ResizeHandle orientation="vertical" label="Drag to resize sidebar" value={layout.sidebarW}
            min={LIMITS.sidebar.min} max={LIMITS.sidebar.max}
            onResize={w => dispatch({ type: 'resizeSidebar', width: w })}
            onReset={() => dispatch({ type: 'resizeSidebar', width: LIMITS.sidebar.def })} />
        </>
      )}

      {agent ? (
        <div ref={workRef} className="flex-1 min-w-0 flex relative">
          {P.open && P.maximized ? (
            <PanelDock layout={layout} dispatch={dispatch} agent={agent} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0}
              wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} />
          ) : (
            <>
              <section className="flex-1 min-w-0 flex flex-col">
                <AgentTopBar
                  agent={agent} entry={entryById[agent.id]} now={now}
                  busy={p.wakingAgentId === agent.id || sleepingId === agent.id}
                  onSleep={() => sleep(agent)} onWake={() => p.onWake(agent)}
                  onProfile={() => p.onShowProfile(agent)} onExport={() => dispatch({ type: 'open', panel: 'export' })}
                  panelOpen={P.open} onTogglePanel={() => dispatch({ type: 'toggle' })}
                  sidebarCollapsed={layout.sidebarCollapsed} onToggleSidebar={() => dispatch({ type: 'toggleSidebar' })}
                />
                <div className="flex-1 min-h-0 flex relative border-t border-hairline/70">
                  <AgentTabContent agent={agent} activeTab={resolveAgentTab('chat', getRuntimeMode(agent.id))} setActiveTab={p.setActiveTab}
                    onlineAgents={p.onlineAgents} wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile}
                    hideHeaders chatVariant="ink" />
                </div>
                {P.open && P.position === 'bottom' && (
                  <>
                    <ResizeHandle orientation="horizontal" invert label="Drag to resize panel" value={shownBottom} min={lim.min} max={lim.max}
                      onResize={h => dispatch({ type: 'resizePanel', size: h, container })}
                      onReset={() => dispatch({ type: 'resizePanel', size: LIMITS.bottom.def, container })} />
                    <div style={{ height: shownBottom }} className="flex-none flex min-h-0">
                      <PanelDock layout={layout} dispatch={dispatch} agent={agent} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0}
                        wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} />
                    </div>
                  </>
                )}
              </section>
              {P.open && P.position === 'right' && (
                <div className={overlay ? 'absolute inset-y-0 right-0 z-20 flex' : 'flex flex-none'}>
                  <ResizeHandle orientation="vertical" invert label="Drag to resize panel" value={shownRight} min={lim.min} max={lim.max}
                    onResize={w => dispatch({ type: 'resizePanel', size: w, container })}
                    onReset={() => dispatch({ type: 'resizePanel', size: LIMITS.right.def, container })} />
                  <div style={{ width: overlay ? Math.min(shownRight, work.w - 40) : shownRight }} className="flex min-w-0">
                    <PanelDock layout={layout} dispatch={dispatch} agent={agent} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0}
                      wakingAgentId={p.wakingAgentId} onWake={p.onWake} onShowProfile={p.onShowProfile} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <HomeScreen groups={groups} agents={p.agents} unread={unread} now={now} onSelectAgent={p.onSelectAgent} onNewAgent={() => setWizardOpen(true)} />
      )}

      {layout.sidebarCollapsed && !agent && (
        <div className="absolute top-3 left-3 z-10">
          <IconButton label="Expand sidebar (⌘B)" onClick={() => dispatch({ type: 'toggleSidebar' })}><PanelLeft strokeWidth={1.5} className="w-4 h-4" /></IconButton>
        </div>
      )}

      <CommandPalette
        open={paletteOpen} onOpenChange={setPaletteOpen} agents={p.agents}
        statusOf={a => LABEL[entryById[a.id]?.status ?? 'offline']}
        onSelectAgent={p.onSelectAgent} onSelectHome={p.onSelectHome} onSwitchClassic={p.onSwitchClassic}
      />
      {wizardOpen && <AgentCreationWizard onClose={() => setWizardOpen(false)} onComplete={() => { setWizardOpen(false); p.onAgentsChanged() }} />}
    </div>
  )
}
