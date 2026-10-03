'use client'

import MessageCenter from '@/components/MessageCenter'
import ErrorBoundary from '@/components/ErrorBoundary'
import { agentToSession, getAgentBaseUrl } from '@/lib/agent-utils'
import type { Agent } from '@/types/agent'
import type { PanelType } from '@/lib/panel-layout'
import AgentTabContent, { type AgentTab } from './AgentTabContent'
import BrowserPanel from './BrowserPanel'

const TAB_FOR: Record<Exclude<PanelType, 'inbox' | 'browser'>, AgentTab> = {
  terminal: 'terminal', files: 'worktree', memory: 'memory', graph: 'graph', docs: 'docs',
  canvas: 'canvas', search: 'search', playback: 'playback', export: 'export',
}

/** Same recipient shape the classic Messages tab passes to MessageCenter. */
function toRecipients(onlineAgents: Agent[]) {
  return onlineAgents.map(a => ({
    id: a.id,
    name: a.name || a.alias || a.id,
    alias: a.label || a.name || a.alias || a.id,
    tmuxSessionName: a.session?.tmuxSessionName,
    hostId: a.hostId,
  }))
}

/** One tool's content inside the panel dock. */
export default function PanelBody({ type, agent, onlineAgents, wakingAgentId, onWake, onShowProfile }: {
  type: PanelType
  agent: Agent
  onlineAgents: Agent[]
  wakingAgentId: string | null
  onWake: (a: Agent) => void
  onShowProfile: (a: Agent) => void
}) {
  if (type === 'browser') return <BrowserPanel />
  if (type === 'inbox') {
    return (
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <ErrorBoundary fallbackLabel="Inbox">
          <MessageCenter sessionName={agentToSession(agent).id} agentId={agent.id} allAgents={toRecipients(onlineAgents)}
            hostUrl={getAgentBaseUrl(agent)} isActive={true} compact />
        </ErrorBoundary>
      </div>
    )
  }
  return (
    <AgentTabContent agent={agent} activeTab={TAB_FOR[type]} setActiveTab={() => {}} onlineAgents={onlineAgents}
      wakingAgentId={wakingAgentId} onWake={onWake} onShowProfile={onShowProfile} hideHeaders chatVariant="ink" />
  )
}
