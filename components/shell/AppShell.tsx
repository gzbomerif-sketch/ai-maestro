'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Agent } from '@/types/agent'
import { useSessionActivity } from '@/hooks/useSessionActivity'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { groupByStatus, type StatusEntry } from '@/lib/agent-status'
import { getRuntimeMode } from '@/lib/runtime-mode'
import { resolveAgentTab } from '@/lib/shell-tabs'
import { readBool, writePref, INBOX_KEY } from '@/lib/safe-storage'
import AgentCreationWizard from '@/components/AgentCreationWizard'
import StatusSidebar from './StatusSidebar'
import AgentTopBar from './AgentTopBar'
import TabBar from './TabBar'
import InboxPanel from './InboxPanel'
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

  const [inboxCollapsed, setInboxCollapsed] = useState(() => readBool(INBOX_KEY, false))
  const toggleInbox = () => setInboxCollapsed(c => { writePref(INBOX_KEY, String(!c)); return !c })
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [sleepingId, setSleepingId] = useState<string | null>(null)

  const agent = p.activeAgentId ? p.agents.find(a => a.id === p.activeAgentId) : undefined
  const sleep = async (a: Agent) => { setSleepingId(a.id); try { await p.onSleep(a) } finally { setSleepingId(null) } }

  return (
    <div className="fixed inset-0 flex bg-sunken text-ink overflow-hidden">
      <StatusSidebar
        agents={p.agents} groups={groups} activeAgentId={agent ? agent.id : null} unread={unread} now={now}
        statusConnected={connected} error={p.error} onRetry={p.onRetry}
        onSelectAgent={p.onSelectAgent} onSelectHome={p.onSelectHome}
        onOpenPalette={() => setPaletteOpen(true)} onNewAgent={() => setWizardOpen(true)}
      />

      {agent ? (
        <>
          <section className="flex-1 min-w-0 flex flex-col">
            <AgentTopBar
              agent={agent} entry={entryById[agent.id]} now={now}
              busy={p.wakingAgentId === agent.id || sleepingId === agent.id}
              onSleep={() => sleep(agent)} onWake={() => p.onWake(agent)}
              onProfile={() => p.onShowProfile(agent)} onExport={() => p.setActiveTab('export')}
              onToggleInbox={toggleInbox} inboxCollapsed={inboxCollapsed}
            />
            <TabBar activeTab={p.activeTab} onChange={p.setActiveTab} streaming={getRuntimeMode(agent.id) === 'streaming'} />
            <div className="flex-1 min-h-0 flex relative">
              <AgentTabContent
                agent={agent}
                activeTab={resolveAgentTab(p.activeTab, getRuntimeMode(agent.id))}
                setActiveTab={p.setActiveTab}
                onlineAgents={p.onlineAgents}
                wakingAgentId={p.wakingAgentId}
                onWake={p.onWake}
                onShowProfile={p.onShowProfile}
                hideHeaders
                chatVariant="ink"
              />
            </div>
          </section>
          {!inboxCollapsed && <InboxPanel agent={agent} onlineAgents={p.onlineAgents} unread={unread[agent.id] ?? 0} onCollapse={toggleInbox} />}
        </>
      ) : (
        <HomeScreen groups={groups} agents={p.agents} unread={unread} now={now} onSelectAgent={p.onSelectAgent} onNewAgent={() => setWizardOpen(true)} />
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
